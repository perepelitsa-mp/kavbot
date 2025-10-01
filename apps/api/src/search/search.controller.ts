import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search documents and listings' })
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('geo') geo?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.search({
      q,
      type,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
      geo,
      limit: limit ? parseInt(limit.toString()) : undefined,
      offset: offset ? parseInt(offset.toString()) : undefined,
    });
  }

  @Get('intent')
  @ApiOperation({ summary: 'Classify query intent' })
  classifyIntent(@Query('q') q: string) {
    const intent = this.searchService.classifyIntent(q);
    return { query: q, intent };
  }
}