import { NextRequest, NextResponse } from 'next/server';

const MINIO_ENDPOINT = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'http://localhost:9000';
const MINIO_BUCKET = process.env.NEXT_PUBLIC_MINIO_BUCKET || 'kavbot';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const s3Key = params.path.join('/');
    const url = `${MINIO_ENDPOINT}/${MINIO_BUCKET}/${s3Key}`;

    console.log('[Photo Proxy] Request path:', params.path);
    console.log('[Photo Proxy] S3 Key:', s3Key);
    console.log('[Photo Proxy] Fetching from:', url);

    const response = await fetch(url, {
      cache: 'no-store',
    });

    console.log('[Photo Proxy] Response status:', response.status);

    if (!response.ok) {
      console.error('[Photo Proxy] Failed to fetch:', response.status, response.statusText);
      return new NextResponse('Image not found', { status: 404 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    console.log('[Photo Proxy] Success, Content-Type:', contentType, 'Size:', imageBuffer.byteLength);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Photo Proxy] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
