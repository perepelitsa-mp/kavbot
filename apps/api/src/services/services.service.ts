import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@kavbot/database';
import { encodeCursor, decodeCursor } from '@kavbot/shared';

export type ServicesFeedResponse = {
  items: any[];
  nextCursor: string | null;
  hasMore: boolean;
};

@Injectable()
export class ServicesService {
  private serializeService(service: any) {
    const {
      _count,
      tags: tagRelations = [],
      user,
      latitude,
      longitude,
      pinnedAt,
      ...rest
    } = service;

    const tags = tagRelations.map((tagRelation: any) => tagRelation.tag ?? tagRelation);

    return {
      ...rest,
      latitude: latitude ? parseFloat(latitude.toString()) : null,
      longitude: longitude ? parseFloat(longitude.toString()) : null,
      pinnedAt: pinnedAt ? pinnedAt.toISOString() : null,
      user: user
        ? {
            ...user,
            tgUserId: user.tgUserId ? user.tgUserId.toString() : null,
          }
        : undefined,
      tags,
    };
  }

  async getServices(query: {
    search?: string;
    category?: string;
    categories?: string[];
    tags?: string[];
    cursor?: string;
    limit?: number;
  }): Promise<ServicesFeedResponse> {
    const limit = query.limit || 20;
    const where: any = {
      status: 'approved',
      publishedAt: { not: null },
    };

    if (query.categories && query.categories.length > 0) {
      const categories = await prisma.serviceCategory.findMany({
        where: { slug: { in: query.categories } },
      });
      if (categories.length > 0) {
        where.categoryId = { in: categories.map(c => c.id) };
      }
    } else if (query.category) {
      const category = await prisma.serviceCategory.findUnique({
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
        { name: { contains: query.search, mode: 'insensitive' } },
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

    const services = await prisma.service.findMany({
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
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit + 1,
    });

    const hasMore = services.length > limit;
    const items = hasMore ? services.slice(0, limit) : services;

    const nextCursor =
      hasMore && items[items.length - 1]
        ? encodeCursor({ publishedAt: items[items.length - 1].publishedAt })
        : null;

    return {
      items: items.map((service) => this.serializeService(service)),
      nextCursor,
      hasMore,
    };
  }

  async getService(id: string): Promise<any> {
    const service = await prisma.service.findUnique({
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
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return this.serializeService(service);
  }

  async createService(userId: string, data: any): Promise<any> {
    const { categorySlug, tags = [], photos = [], ...serviceData } = data;

    const category = await prisma.serviceCategory.findUnique({
      where: { slug: categorySlug },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const service = await prisma.service.create({
      data: {
        ...serviceData,
        userId,
        categoryId: category.id,
        status: 'pending',
        tags: {
          create: await Promise.all(
            tags.map(async (tagSlug: string) => {
              let tag = await prisma.serviceTag.findUnique({
                where: { slug: tagSlug },
              });

              if (!tag) {
                tag = await prisma.serviceTag.create({
                  data: {
                    slug: tagSlug,
                    name: tagSlug.charAt(0).toUpperCase() + tagSlug.slice(1),
                  },
                });
              }

              return { tagId: tag.id };
            }),
          ),
        },
        photos: {
          create: photos.map((photo: any, index: number) => ({
            s3Key: photo.s3Key,
            width: photo.width,
            height: photo.height,
            order: index,
          })),
        },
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

    return this.serializeService(service);
  }

  async updateService(id: string, userId: string, data: any): Promise<any> {
    const service = await prisma.service.findUnique({ where: { id } });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.userId !== userId) {
      throw new ForbiddenException('You can only update your own services');
    }

    const { categorySlug, tags, photos, ...serviceData } = data;
    const updateData: any = { ...serviceData };

    if (categorySlug) {
      const category = await prisma.serviceCategory.findUnique({
        where: { slug: categorySlug },
      });
      if (category) {
        updateData.categoryId = category.id;
      }
    }

    if (tags) {
      await prisma.serviceTagRelation.deleteMany({
        where: { serviceId: id },
      });

      updateData.tags = {
        create: await Promise.all(
          tags.map(async (tagSlug: string) => {
            let tag = await prisma.serviceTag.findUnique({
              where: { slug: tagSlug },
            });

            if (!tag) {
              tag = await prisma.serviceTag.create({
                data: {
                  slug: tagSlug,
                  name: tagSlug.charAt(0).toUpperCase() + tagSlug.slice(1),
                },
              });
            }

            return { tagId: tag.id };
          }),
        ),
      };
    }

    if (photos) {
      await prisma.servicePhoto.deleteMany({
        where: { serviceId: id },
      });

      updateData.photos = {
        create: photos.map((photo: any, index: number) => ({
          s3Key: photo.s3Key,
          width: photo.width,
          height: photo.height,
          order: index,
        })),
      };
    }

    const updated = await prisma.service.update({
      where: { id },
      data: updateData,
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

    return this.serializeService(updated);
  }

  async deleteService(id: string, userId: string): Promise<void> {
    const service = await prisma.service.findUnique({ where: { id } });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.userId !== userId) {
      throw new ForbiddenException('You can only delete your own services');
    }

    await prisma.service.delete({ where: { id } });
  }

  async getCategories() {
    return prisma.serviceCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getPopularTags() {
    const tags = await prisma.serviceTag.findMany({
      include: {
        _count: {
          select: { services: true },
        },
      },
      orderBy: {
        services: {
          _count: 'desc',
        },
      },
      take: 20,
    });

    return tags.map(({ _count, ...tag }) => tag);
  }

  async getPinnedService() {
    const service = await prisma.service.findFirst({
      where: {
        status: 'approved',
        isPinned: true,
        publishedAt: { not: null },
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
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        photos: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: {
        pinnedAt: 'desc',
      },
    });

    return service ? this.serializeService(service) : null;
  }

  async getUserServices(userId: string) {
    const services = await prisma.service.findMany({
      where: { userId },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return services.map((service) => this.serializeService(service));
  }

  async getOrCreateGuestUser(): Promise<string> {
    const guestUser = await prisma.user.findFirst({
      where: { username: 'guest' },
    });

    if (guestUser) {
      return guestUser.id;
    }

    const newGuest = await prisma.user.create({
      data: {
        username: 'guest',
        firstName: 'Guest',
        role: 'user',
      },
    });

    return newGuest.id;
  }
}
