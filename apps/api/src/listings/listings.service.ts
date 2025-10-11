import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@kavbot/database';
import { encodeCursor, decodeCursor, slugify } from '@kavbot/shared';

export type ListingsFeedResponse = {
  items: any[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
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
      pinStartsAt,
      pinEndsAt,
      commentCount,
      ...rest
    } = listing;

    const tags = tagRelations.map((tagRelation: any) => tagRelation.tag ?? tagRelation);

    return {
      ...rest,
      price: price ? parseFloat(price.toString()) : null,
      pinnedAt: pinnedAt ? pinnedAt.toISOString() : null,
      pinStartsAt: pinStartsAt ? pinStartsAt.toISOString() : null,
      pinEndsAt: pinEndsAt ? pinEndsAt.toISOString() : null,
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
    categories?: string[];
    tags?: string[];
    cursor?: string;
    limit?: number;
  }): Promise<ListingsFeedResponse> {
    const limit = query.limit || 20;
    const where: any = {
      status: 'approved',
      publishedAt: { not: null },
    };

    // Поддержка как одной категории (обратная совместимость), так и множественных
    if (query.categories && query.categories.length > 0) {
      const categories = await prisma.category.findMany({
        where: { slug: { in: query.categories } },
      });
      if (categories.length > 0) {
        where.categoryId = { in: categories.map(c => c.id) };
      }
    } else if (query.category) {
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

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
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
      }),
      prisma.listing.count({ where }),
    ]);

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
      total,
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
          include: {
            user: {
              select: {
                id: true,
                tgUserId: true,
                username: true,
                firstName: true,
                lastName: true,
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

    // Organize comments into parent-child structure recursively
    const allComments = listing.comments.map((comment) => ({
      ...comment,
      user: {
        ...comment.user,
        tgUserId: comment.user.tgUserId ? comment.user.tgUserId.toString() : null,
      },
      replies: [] as any[],
      parentUser: null as { id: string; firstName: string; lastName: string } | null,
    }));

    // Build nested structure with Map for O(1) lookups
    const commentsMap = new Map();
    const rootComments: any[] = [];

    // First pass: create map of all comments
    allComments.forEach((comment) => {
      commentsMap.set(comment.id, comment);
    });

    // Second pass: build tree structure
    allComments.forEach((comment) => {
      if (comment.parentId) {
        const parent = commentsMap.get(comment.parentId);
        if (parent) {
          // Add parent user info to reply
          comment.parentUser = {
            id: parent.user.id,
            firstName: parent.user.firstName,
            lastName: parent.user.lastName,
          };
          // Add comment to parent's replies array
          if (!parent.replies) {
            parent.replies = [];
          }
          parent.replies.push(comment);
        } else {
          // If parent not found, treat as root comment
          rootComments.push(comment);
        }
      } else {
        // Root level comment
        rootComments.push(comment);
      }
    });

    return this.serializeListing({
      ...listing,
      _count: { comments: rootComments.length },
      comments: rootComments,
    });
  }

  async getPinnedListing(): Promise<any | null> {
    const listings = await this.getPinnedListings();
    return listings.length > 0 ? listings[0] : null;
  }

  async getPinnedListings(): Promise<any[]> {
    const now = new Date();

    const listings = (await prisma.listing.findMany({
      where: {
        status: 'approved',
        isPinned: true,
        OR: [
          // Нет временных ограничений - всегда закреплено
          {
            AND: [
              { pinStartsAt: null },
              { pinEndsAt: null }
            ]
          },
          // Есть только начало, еще не началось или уже началось
          {
            AND: [
              { pinStartsAt: { lte: now } },
              { pinEndsAt: null }
            ]
          },
          // Есть только конец, еще не закончилось
          {
            AND: [
              { pinStartsAt: null },
              { pinEndsAt: { gte: now } }
            ]
          },
          // Есть и начало и конец, находится в диапазоне
          {
            AND: [
              { pinStartsAt: { lte: now } },
              { pinEndsAt: { gte: now } }
            ]
          }
        ]
      } as any,
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
      take: 3,
    } as any)) as any[];

    return listings.map(listing => this.serializeListing(listing));
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

    // Determine status: draft by default, or approved if publish is requested
    // TODO: Change to 'pending' when moderation is ready
    const status = data.publish ? 'approved' : 'draft';
    const publishedAt = data.publish ? new Date() : null;

    const listing = await prisma.listing.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        price: data.price ?? null,
        contacts: data.contacts,
        status,
        publishedAt,
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

    // Process tags if provided
    let tagIds: string[] | undefined;
    if (data.tags) {
      tagIds = await Promise.all(
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
    }

    // Delete existing tags if updating
    if (tagIds) {
      await prisma.listingTag.deleteMany({
        where: { listingId },
      });
    }

    // Delete existing photos if updating
    if (data.photos) {
      await prisma.listingPhoto.deleteMany({
        where: { listingId },
      });
    }

    // Handle status changes
    let statusUpdate = {};
    if (data.publish !== undefined) {
      if (data.publish) {
        // Publish immediately if currently draft/rejected
        // TODO: Change to 'pending' when moderation is ready
        if (listing.status === 'draft' || listing.status === 'rejected') {
          statusUpdate = {
            status: 'approved',
            publishedAt: new Date(),
          };
        }
      } else {
        // Move to draft
        statusUpdate = {
          status: 'draft',
          publishedAt: null,
        };
      }
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        categoryId: data.categoryId,
        contacts: data.contacts,
        ...statusUpdate,
        ...(tagIds && {
          tags: {
            create: tagIds.map((tagId) => ({
              tag: { connect: { id: tagId } },
            })),
          },
        }),
        ...(data.photos && {
          photos: {
            create: data.photos.map((photo: any, index: number) => ({
              s3Key: photo.s3Key,
              width: photo.width,
              height: photo.height,
              order: index,
            })),
          },
        }),
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

  async getTotalUsers() {
    return prisma.user.count();
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
