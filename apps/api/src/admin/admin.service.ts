import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { prisma } from '@kavbot/database';

@Injectable()
export class AdminService {
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

    return listings.map((listing) => ({
      ...listing,
      price: listing.price ? parseFloat(listing.price.toString()) : null,
      tags: listing.tags.map((t) => t.tag),
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
