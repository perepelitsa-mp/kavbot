import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@kavbot/database';

@Injectable()
export class AdminService {
  private formatListing(listing: any) {
    const {
      tags: tagRelations = [],
      user,
      price,
      pinnedAt,
      pinStartsAt,
      pinEndsAt,
      _count,
      commentCount,
      ...rest
    } = listing;

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
      tags: tagRelations.map((tagRelation: any) => tagRelation.tag ?? tagRelation),
      commentCount: commentCount ?? _count?.comments ?? 0,
    };
  }

  async checkAdminRole(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      throw new ForbiddenException('Требуется роль администратора или модератора');
    }
    return user;
  }

  async getPendingListings(userId: string, limit = 50, offset = 0): Promise<any> {
    await this.checkAdminRole(userId);

    const listings = await prisma.listing.findMany({
      where: { status: 'pending' },
      include: {
        user: {
          select: {
            id: true,
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
        photos: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.listing.count({
      where: { status: 'pending' },
    });

    return {
      items: listings,
      total,
      limit,
      offset,
    };
  }

  async moderateListing(
    userId: string,
    listingId: string,
    status: 'approved' | 'rejected',
    _reason?: string,
  ): Promise<any> {
    await this.checkAdminRole(userId);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Объявление не найдено');
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status,
        publishedAt: status === 'approved' ? (listing.publishedAt || new Date()) : null,
        moderatedAt: new Date(),
      },
    });

    // TODO: Send notification to user via bot

    return updated;
  }

  async setPinnedStatus(
    userId: string,
    listingId: string,
    isPinned: boolean,
    pinStartsAt?: string,
    pinEndsAt?: string
  ): Promise<any> {
    await this.checkAdminRole(userId);

    if (typeof isPinned !== 'boolean') {
      throw new BadRequestException('Укажите статус закрепления');
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        photos: true,
        user: {
          select: {
            id: true,
            tgUserId: true,
            username: true,
            firstName: true,
            phone: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Объявление не найдено');
    }

    const includeConfig = {
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
      photos: true,
      user: {
        select: {
          id: true,
          tgUserId: true,
          username: true,
          firstName: true,
          phone: true,
        },
      },
    } as const;

    if (isPinned) {
      if (listing.status !== 'approved') {
        throw new ForbiddenException('Закреплять можно только одобренные объявления');
      }

      const [, updated] = (await prisma.$transaction([
        prisma.listing.updateMany({
          where: {
            isPinned: true,
            id: { not: listingId },
          } as any,
          data: { isPinned: false, pinnedAt: null, pinStartsAt: null, pinEndsAt: null } as any,
        }),
        prisma.listing.update({
          where: { id: listingId },
          data: {
            isPinned: true,
            pinnedAt: new Date(),
            pinStartsAt: pinStartsAt ? new Date(pinStartsAt) : null,
            pinEndsAt: pinEndsAt ? new Date(pinEndsAt) : null,
          } as any,
          include: includeConfig,
        }),
      ])) as [any, any];

      return this.formatListing(updated);
    }

    const updated = (await prisma.listing.update({
      where: { id: listingId },
      data: { isPinned: false, pinnedAt: null, pinStartsAt: null, pinEndsAt: null } as any,
      include: includeConfig,
    } as any)) as any;

    return this.formatListing(updated);
  }

  async broadcastMessage(userId: string, _message: string, targetRole?: string) {
    const user = await this.checkAdminRole(userId);

    if (user.role !== 'admin') {
      throw new ForbiddenException('Только администраторы могут отправлять рассылки');
    }

    // Get target users
    const where: any = { isBanned: false };
    if (targetRole) {
      where.role = targetRole;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        tgUserId: true,
      },
    });

    // TODO: Queue broadcast job to BullMQ

    return {
      success: true,
      targetCount: users.length,
      message: 'Broadcast queued',
    };
  }

  async getAllUsers(userId: string): Promise<any> {
    await this.checkAdminRole(userId);

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: { listings: true, comments: true },
        },
      },
    });

    return users.map((user) => ({
      ...user,
      tgUserId: user.tgUserId?.toString(),
      listingsCount: user._count.listings,
      commentsCount: user._count.comments,
    }));
  }

  async updateUser(userId: string, targetUserId: string, data: { isBanned?: boolean; role?: string }): Promise<any> {
    await this.checkAdminRole(userId);

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(data.isBanned !== undefined && { isBanned: data.isBanned }),
        ...(data.role && { role: data.role as any }),
      },
    });

    return {
      ...updated,
      tgUserId: updated.tgUserId?.toString(),
    };
  }

  async deleteUser(userId: string, targetUserId: string): Promise<any> {
    await this.checkAdminRole(userId);

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    return { success: true };
  }

  async getAllListings(userId: string): Promise<any> {
    await this.checkAdminRole(userId);

    const listings = await prisma.listing.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            phone: true,
          },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        photos: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return listings.map((listing) => this.formatListing({
      ...listing,
      _count: listing._count,
      commentCount: listing._count.comments,
    }));
  }

  async deleteListing(userId: string, listingId: string): Promise<any> {
    await this.checkAdminRole(userId);

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException('Объявление не найдено');
    }

    await prisma.listing.delete({ where: { id: listingId } });

    return { success: true };
  }
}
