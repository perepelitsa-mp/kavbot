import { prisma } from '@kavbot/database';
import axios from 'axios';

export async function handleEmbeddingJob(data: { id: string; type: 'document' | 'listing' }) {
  const { id, type } = data;

  let text = '';

  if (type === 'document') {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return;
    text = `${doc.title} ${doc.text}`.slice(0, 512);
  } else if (type === 'listing') {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return;
    text = `${listing.title} ${listing.description}`.slice(0, 512);
  }

  // Call Python ingest service to generate embedding
  const response = await axios.post(`${process.env.INGEST_SERVICE_URL}/embed`, {
    text,
  });

  const embedding = response.data.embedding;

  // Update record with embedding
  if (type === 'document') {
    await prisma.$executeRaw`
      UPDATE documents
      SET embedding = ${embedding}::vector
      WHERE id = ${id}
    `;
  } else if (type === 'listing') {
    await prisma.$executeRaw`
      UPDATE listings
      SET embedding = ${embedding}::vector
      WHERE id = ${id}
    `;
  }
}