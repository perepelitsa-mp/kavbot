'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import Image from 'next/image';

interface ListingCardProps {
  listing: any;
  onClick?: () => void;
}

export function ListingCard({ listing, onClick }: ListingCardProps) {
  const photo = listing.photos?.[0];

  return (
    <motion.div
      onClick={onClick}
      className="bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {photo ? (
        <div className="relative w-full h-48 bg-muted">
          <Image
            src={`/api/photos/${photo.s3Key}`}
            alt={listing.title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-muted flex items-center justify-center">
          <span className="text-4xl">📦</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg line-clamp-2">{listing.title}</h3>
          {listing.price && (
            <span className="font-bold text-primary whitespace-nowrap ml-2">
              {listing.price} ₽
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full">
            {listing.category?.name}
          </span>
          {listing.tags?.slice(0, 2).map((tag: any) => (
            <span
              key={tag.id}
              className="inline-block px-2 py-1 text-xs border border-border rounded-full"
            >
              {tag.name}
            </span>
          ))}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{listing.commentCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{new Date(listing.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}