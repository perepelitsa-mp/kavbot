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
import { ServicesService, ServicesFeedResponse } from './services.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get services feed' })
  async getServices(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('categories') categories?: string,
    @Query('tags') tags?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<ServicesFeedResponse> {
    return this.servicesService.getServices({
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
    const [categories, tags] = await Promise.all([
      this.servicesService.getCategories(),
      this.servicesService.getPopularTags(),
    ]);
    return { categories, tags };
  }

  @Get('pinned')
  @ApiOperation({ summary: 'Get pinned service' })
  async getPinnedService() {
    return this.servicesService.getPinnedService();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user services' })
  async getMyServices(@CurrentUser() user: any): Promise<any> {
    return this.servicesService.getUserServices(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service details' })
  async getService(@Param('id') id: string): Promise<any> {
    return this.servicesService.getService(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new service' })
  async createService(@CurrentUser() user: any, @Body() data: any): Promise<any> {
    const userId = user?.sub || (await this.servicesService.getOrCreateGuestUser());
    return this.servicesService.createService(userId, data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service' })
  async updateService(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: any,
  ): Promise<any> {
    return this.servicesService.updateService(id, user.sub, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete service' })
  async deleteService(@CurrentUser() user: any, @Param('id') id: string) {
    return this.servicesService.deleteService(id, user.sub);
  }
}
