import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3: S3;
  private bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;

    if (!endpoint) {
      throw new Error('S3_ENDPOINT is not set in environment variables');
    }
    if (!accessKeyId) {
      throw new Error('S3_ACCESS_KEY is not set in environment variables');
    }
    if (!secretAccessKey) {
      throw new Error('S3_SECRET_KEY is not set in environment variables');
    }

    console.log('S3 Configuration:', {
      endpoint,
      accessKeyId,
      bucket: process.env.S3_BUCKET || 'kavbot',
    });

    this.s3 = new S3({
      endpoint,
      accessKeyId,
      secretAccessKey,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });
    this.bucket = process.env.S3_BUCKET || 'kavbot';
  }

  async getPresignedUploadUrl(filename: string, contentType: string) {
    try {
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
    } catch (error) {
      console.error('S3 getPresignedUploadUrl error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate presigned URL: ${message}`);
    }
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