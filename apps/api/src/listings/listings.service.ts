import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@kavbot/database';
import { encodeCursor, decodeCursor, slugify } from '@kavbot/shared';

export type ListingsFeedResponse = {
  items: any[];
  nextCursor: string | null;
  hasMore: boolean;
};

@Injectable()
export class ListingsService {
  private serializeListing(listing: any) {
    const {
      _count,
      tags: tagRelations = [],
      user,
      price,
      pinnedAt,
      commentCount,
      ...rest
    } = listing;

    const tags = tagRelations.map((tagRelation: any) => tagRelation.tag ?? tagRelation);

    return {
      ...rest,
      price: price ? parseFloat(price.toString()) : null,
      pinnedAt: pinnedAt ? pinnedAt.toISOString() : null,
      user: user
        ? {
            ...user,
            tgUserId: user.tgUserId ? user.tgUserId.toString() : null,
          }
        : undefined,
      tags,
      commentCount: commentCount ?? _count?.comments ?? 0,
    };
  }
  async getListings(query: {
    search?: string;
    category?: string;
    tags?: string[];
    cursor?: string;
    limit?: number;
  }): Promise<ListingsFeedResponse> {
    const limit = query.limit || 20;
    const where: any = {
      status: 'approved',
      publishedAt: { not: null },
    };

    if (query.category) {
      const category = await prisma.category.findUnique({
        where: { slug: query.category },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            slug: { in: query.tags },
          },
        },
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let cursorCondition = {};
    if (query.cursor) {
      const decodedCursor = decodeCursor(query.cursor);
      if (decodedCursor?.publishedAt) {
        cursorCondition = {
          publishedAt: {
            lt: new Date(decodedCursor.publishedAt),
          },
        };
      }
    }

    const listings = await prisma.listing.findMany({
      where: { ...where, ...cursorCondition },
      include: {
        user: {
          select: {
            id: true,
            tgUserId: true,
            username: true,
            firstName: true,
          },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        photos: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit + 1,
    });

    const hasMore = listings.length > limit;
    const items = hasMore ? listings.slice(0, limit) : listings;

    const nextCursor =
      hasMore && items[items.length - 1]
        ? encodeCursor({ publishedAt: items[items.length - 1].publishedAt })
        : null;

    return {
      items: items.map((listing) => this.serializeListing(listing)),
      nextCursor,
      hasMore,
    };
  }

  async getListing(id: string): Promise<any> {
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            tgUserId: true,
            username: true,
            firstName: true,
          },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        photos: {
          orderBy: { order: 'asc' },
        },
        comments: {
          where: { parentId: null },
          include: {
            user: {
              select: {
                id: true,
                tgUserId: true,
                username: true,
                firstName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Объявление не найдено');
    }

    return this.serializeListing({
      ...listing,
      _count: { comments: listing.comments.length },
      comments: listing.comments.map((comment) => ({
        ...comment,
        user: {
          ...comment.user,
          tgUserId: comment.user.tgUserId ? comment.user.tgUserId.toString() : null,
        },
      })),
    });
  }

  async getPinnedListing(): Promise<any | null> {
    const listing = (await prisma.listing.findFirst({
      where: { status: 'approved', isPinned: true } as any,
      include: {
        user: {
          select: {
            id: true,
            tgUserId: true,
            username: true,
            firstName: true,
          },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        photos: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: ([{ pinnedAt: 'desc' }, { publishedAt: 'desc' }] as any),
    } as any)) as any;

    if (!listing) {
      return null;
    }

    return this.serializeListing(listing);
  }

  async createListing(userId: string, data: any): Promise<any> {
    // Find or create tags
    const tagIds = await Promise.all(
      data.tags.map(async (tagName: string) => {
        const slug = slugify(tagName);
        const tag = await prisma.tag.upsert({
          where: { slug },
          create: { slug, name: tagName },
          update: {},
        });
        return tag.id;
      }),
    );
    const uniqueTagIds = Array.from(new Set(tagIds));

    const listing = await prisma.listing.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        price: data.price ?? null,
        contacts: data.contacts,
        status: 'approved',
        publishedAt: new Date(),
        tags: {
          create: uniqueTagIds.map((tagId) => ({
            tagId,
          })),
        },
        photos: data.photos?.length
          ? {
              create: data.photos.map((photo: any, index: number) => ({
                s3Key: photo.s3Key,
                width: photo.width,
                height: photo.height,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        photos: true,
      },
    });

    return this.serializeListing(listing);
  }

  async updateListing(listingId: string, userId: string, data: any): Promise<any> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Объявление не найдено');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('Вы можете редактировать только свои объявления');
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        photos: true,
      },
    });

    return this.serializeListing(updated);
  }

  async deleteListing(listingId: string, userId: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Объявление не найдено');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('Вы можете удалять только свои объявления');
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'archived' },
    });

    return { success: true };
  }

  async getOrCreateGuestUser(): Promise<string> {
    const guestTgId = BigInt(999999999);
    let guest = await prisma.user.findUnique({
      where: { tgUserId: guestTgId },
    });

    if (!guest) {
      guest = await prisma.user.create({
        data: {
          tgUserId: guestTgId,
          username: 'guest',
          firstName: 'Гость',
          role: 'user',
        },
      });
    }

    return guest.id;
  }

  async addComment(listingId: string, userId: string, text: string, parentId?: string) {
    const comment = await prisma.comment.create({
      data: {
        listingId,
        userId,
        text,
        parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            tgUserId: true,
            username: true,
            firstName: true,
          },
        },
      },
    });

    return {
      ...comment,
      user: {
        ...comment.user,
        tgUserId: comment.user.tgUserId ? comment.user.tgUserId.toString() : null,
      },
    };
  }

  async getCategories() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getPopularTags(limit = 20) {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { listings: true },
        },
      },
      orderBy: {
        listings: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return tags.map((tag) => ({
      ...tag,
      count: tag._count.listings,
    }));
  }

  async getUserListings(userId: string): Promise<any> {
    return prisma.listing.findMany({
      where: {
        userId,
        status: { not: 'archived' },
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        photos: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
