import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ListingsService, ListingsFeedResponse } from './listings.service';
import { S3Service } from './s3.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(
    private listingsService: ListingsService,
    private s3Service: S3Service,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get listings feed' })
  async getListings(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<ListingsFeedResponse> {
    return this.listingsService.getListings({
      search,
      category,
      tags: tags ? tags.split(',') : undefined,
      cursor,
      limit,
    });
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get available categories and popular tags' })
  async getFilters() {
    const [categories, tags] = await Promise.all([
      this.listingsService.getCategories(),
      this.listingsService.getPopularTags(),
    ]);
    return { categories, tags };
  }

  @Get('pinned')
  @ApiOperation({ summary: 'Get pinned listing' })
  async getPinnedListing() {
    return this.listingsService.getPinnedListing();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing details' })
  async getListing(@Param('id') id: string): Promise<any> {
    return this.listingsService.getListing(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new listing' })
  async createListing(@CurrentUser() user: any, @Body() data: any): Promise<any> {
    const userId = user?.sub || (await this.listingsService.getOrCreateGuestUser());
    return this.listingsService.createListing(userId, data);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to listing' })
  async addComment(
    @Param('id') id: string,
    @Body() data: { text: string; parentId?: string; userId?: string },
  ) {
    // В dev режиме используем тестового пользователя если не авторизован
    const userId = data.userId || (await this.listingsService.getOrCreateGuestUser());
    return this.listingsService.addComment(id, userId, data.text, data.parentId);
  }

  @Post('upload/presigned')
  @ApiOperation({ summary: 'Get presigned URL for photo upload' })
  async getPresignedUrl(@Body() data: { filename: string; contentType: string }) {
    return this.s3Service.getPresignedUploadUrl(data.filename, data.contentType);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user listings' })
  async getMyListings(@CurrentUser() user: any): Promise<any> {
    return this.listingsService.getUserListings(user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update listing' })
  async updateListing(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: any,
  ): Promise<any> {
    return this.listingsService.updateListing(id, user.sub, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete listing' })
  async deleteListing(@CurrentUser() user: any, @Param('id') id: string) {
    return this.listingsService.deleteListing(id, user.sub);
  }
}
