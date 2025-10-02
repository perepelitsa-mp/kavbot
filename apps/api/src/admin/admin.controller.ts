import { Controller, Get, Patch, Post, Delete, Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('listings')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @ApiOperation({ summary: 'Get pending listings for moderation' })
  async getPendingListings(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<any> {
    return this.adminService.getPendingListings(user.sub, limit, offset);
  }

  @Patch('listings/:id')
  @ApiOperation({ summary: 'Moderate listing (approve/reject)' })
  async moderateListing(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { status: 'approved' | 'rejected'; reason?: string },
  ): Promise<any> {
    return this.adminService.moderateListing(user.sub, id, data.status, data.reason);
  }

  @Patch('listings/:id/pin')
  @ApiOperation({ summary: 'Set listing pinned status' })
  async setPinnedStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { isPinned: boolean; pinStartsAt?: string; pinEndsAt?: string },
  ) {
    return this.adminService.setPinnedStatus(user.sub, id, data.isPinned, data.pinStartsAt, data.pinEndsAt);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Send broadcast message to users' })
  async broadcast(
    @CurrentUser() user: any,
    @Body() data: { message: string; targetRole?: string },
  ) {
    return this.adminService.broadcastMessage(user.sub, data.message, data.targetRole);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  async getUsers(@CurrentUser() user: any) {
    return this.adminService.getAllUsers(user.sub);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (ban/unban, change role)' })
  async updateUser(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { isBanned?: boolean; role?: string },
  ) {
    return this.adminService.updateUser(user.sub, id, data);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user' })
  async deleteUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.deleteUser(user.sub, id);
  }

  @Get('listings/all')
  @ApiOperation({ summary: 'Get all listings (including unpublished)' })
  async getAllListings(@CurrentUser() user: any) {
    return this.adminService.getAllListings(user.sub);
  }

  @Delete('listings/:id')
  @ApiOperation({ summary: 'Delete listing' })
  async deleteListing(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.deleteListing(user.sub, id);
  }
}
