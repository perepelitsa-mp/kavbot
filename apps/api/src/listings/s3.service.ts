import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3: S3;
  private bucket: string;

  constructor() {
    this.s3 = new S3({
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
    this.bucket = process.env.S3_BUCKET || 'kavbot';
  }

  async getPresignedUploadUrl(filename: string, contentType: string) {
    const key = `listings/${uuidv4()}-${filename}`;
    const url = await this.s3.getSignedUrlPromise('putObject', {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Expires: 300, // 5 minutes
    });

    return {
      uploadUrl: url,
      s3Key: key,
    };
  }

  async getPresignedDownloadUrl(key: string) {
    const url = await this.s3.getSignedUrlPromise('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: 3600, // 1 hour
    });

    return url;
  }
}