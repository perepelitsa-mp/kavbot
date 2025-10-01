import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { S3Service } from './s3.service';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, S3Service],
  exports: [ListingsService],
})
export class ListingsModule {}