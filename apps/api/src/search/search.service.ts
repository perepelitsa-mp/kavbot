import { Injectable } from '@nestjs/common';
import { prisma } from '@kavbot/database';

@Injectable()
export class SearchService {
  /**
   * Hybrid search: Full-text search + vector similarity
   */
  async search(query: {
    q: string;
    type?: string;
    since?: Date;
    until?: Date;
    geo?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    // Simple text search for now (can be enhanced with embedding-based search)
    const whereDoc: any = {};
    const whereListing: any = { status: 'approved' };

    if (query.type && query.type !== 'all' && query.type !== 'ads') {
      whereDoc.docType = query.type;
    }

    if (query.since) {
      whereDoc.publishedAt = { gte: query.since };
      whereListing.publishedAt = { gte: query.since };
    }

    if (query.until) {
      whereDoc.publishedAt = { ...whereDoc.publishedAt, lte: query.until };
      whereListing.publishedAt = { ...whereListing.publishedAt, lte: query.until };
    }

    const searchCondition = {
      OR: [
        { title: { contains: query.q, mode: 'insensitive' as const } },
        { text: { contains: query.q, mode: 'insensitive' as const } },
      ],
    };

    const searchConditionListing = {
      OR: [
        { title: { contains: query.q, mode: 'insensitive' as const } },
        { description: { contains: query.q, mode: 'insensitive' as const } },
      ],
    };

    let documents: any[] = [];
    let listings: any[] = [];

    // Search documents if not ads-only
    if (!query.type || query.type !== 'ads') {
      documents = await prisma.document.findMany({
        where: { ...whereDoc, ...searchCondition },
        include: {
          source: {
            select: {
              title: true,
              type: true,
            },
          },
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take: limit,
        skip: offset,
      });
    }

    // Search listings if type is 'ads' or 'all'
    if (query.type === 'ads' || query.type === 'all' || !query.type) {
      listings = await prisma.listing.findMany({
        where: { ...whereListing, ...searchConditionListing },
        include: {
          category: true,
          photos: {
            take: 1,
            orderBy: { order: 'asc' },
          },
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take: limit,
        skip: offset,
      });
    }

    // Combine and format results
    const results = [
      ...documents.map((doc) => ({
        id: doc.id,
        type: 'document' as const,
        title: doc.title,
        snippet: this.truncate(doc.text, 200),
        url: doc.url,
        publishedAt: doc.publishedAt,
        docType: doc.docType,
        source: doc.source.title,
        score: 1.0, // Placeholder for actual relevance score
      })),
      ...listings.map((listing) => ({
        id: listing.id,
        type: 'listing' as const,
        title: listing.title,
        snippet: this.truncate(listing.description, 200),
        publishedAt: listing.publishedAt,
        category: listing.category.name,
        price: listing.price ? parseFloat(listing.price.toString()) : null,
        photo: listing.photos[0]?.s3Key,
        score: 1.0,
      })),
    ];

    // Sort by publishedAt desc
    results.sort((a, b) => {
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    });

    return {
      results: results.slice(0, limit),
      total: results.length,
      limit,
      offset,
    };
  }

  /**
   * Intent classification for routing
   */
  classifyIntent(query: string): string {
    const q = query.toLowerCase();

    if (
      q.includes('новост') ||
      q.includes('что нов') ||
      q.includes('последн')
    ) {
      return 'news';
    }

    if (
      q.includes('отключ') ||
      q.includes('электр') ||
      q.includes('свет') ||
      q.includes('вода')
    ) {
      return 'outage';
    }

    if (
      q.includes('мероприят') ||
      q.includes('событ') ||
      q.includes('куда сходить')
    ) {
      return 'event';
    }

    if (
      q.includes('тренир') ||
      q.includes('секци') ||
      q.includes('кружок') ||
      q.includes('спорт')
    ) {
      return 'training';
    }

    if (
      q.includes('объявлен') ||
      q.includes('продам') ||
      q.includes('куплю')
    ) {
      return 'ads';
    }

    return 'general';
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }
}