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
    @Query('categories') categories?: string,
    @Query('tags') tags?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<ListingsFeedResponse> {
    return this.listingsService.getListings({
      search,
      category,
      categories: categories ? categories.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined,
      cursor,
      limit,
    });
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get available categories and popular tags' })
  async getFilters() {
    const [categories, tags, totalUsers] = await Promise.all([
      this.listingsService.getCategories(),
      this.listingsService.getPopularTags(),
      this.listingsService.getTotalUsers(),
    ]);
    return { categories, tags, totalUsers };
  }

  @Get('pinned')
  @ApiOperation({ summary: 'Get pinned listing' })
  async getPinnedListing() {
    return this.listingsService.getPinnedListing();
  }

  @Get('pinned/all')
  @ApiOperation({ summary: 'Get all pinned listings (up to 3)' })
  async getPinnedListings() {
    return this.listingsService.getPinnedListings();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user listings' })
  async getMyListings(@CurrentUser() user: any): Promise<any> {
    return this.listingsService.getUserListings(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing details' })
  async getListing(@Param('id') id: string): Promise<any> {
    return this.listingsService.getListing(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new listing' })
  async createListing(@CurrentUser() user: any, @Body() data: any): Promise<any> {
    return this.listingsService.createListing(user.sub, data);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add comment to listing' })
  async addComment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: { text: string; parentId?: string },
  ) {
    return this.listingsService.addComment(id, user.sub, data.text, data.parentId);
  }

  @Post('upload/presigned')
  @ApiOperation({ summary: 'Get presigned URL for photo upload' })
  async getPresignedUrl(@Body() data: { filename: string; contentType: string }) {
    try {
      return await this.s3Service.getPresignedUploadUrl(data.filename, data.contentType);
    } catch (error) {
      console.error('Failed to get presigned URL:', error);
      throw error;
    }
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
