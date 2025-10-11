'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Clock, Sparkles, Tag } from 'lucide-react';

interface ListingCardProps {
  listing: any;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function ListingCard({ listing, onClick }: ListingCardProps) {
  const photo = listing.photos?.[0];

  return (
    <motion.div
      onClick={onClick}
      className="group relative bg-white rounded-3xl overflow-hidden cursor-pointer border border-slate-200/60"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
      </div>

      {/* Shadow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl opacity-0 group-hover:opacity-10 blur transition-opacity duration-300" />

      {/* Image Section */}
      <div className="relative">
        {photo ? (
          <div className="relative w-full h-56 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
            <img
              src={`/api/photos/${photo.s3Key}`}
              alt={listing.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Image overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="w-full h-56 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 opacity-20" />
              <span className="relative text-6xl">📦</span>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-400">Фото отсутствует</p>
          </div>
        )}

        {/* Pinned badge */}
        {listing.isPinned && (
          <div className="absolute top-3 right-3 z-20">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg backdrop-blur-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">Закреплено</span>
            </motion.div>
          </div>
        )}

        {/* Price badge */}
        {listing.price && (
          <div className="absolute bottom-3 left-3 z-20">
            <div className="px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-white/60">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {listing.price}
                </span>
                <span className="text-sm font-semibold text-slate-600">₽</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="relative p-5">
        {/* Category & Tags */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full border border-indigo-100">
            <Tag className="w-3 h-3" />
            {listing.category?.name}
          </div>
          {listing.tags?.slice(0, 2).map((tag: any) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-slate-50 text-slate-600 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              {tag.name}
            </span>
          ))}
          {listing.tags?.length > 2 && (
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-slate-50 text-slate-500 rounded-full border border-slate-200">
              +{listing.tags.length - 2}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-xl text-slate-900 line-clamp-2 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
          {listing.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {listing.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="font-medium">{listing.commentCount || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span className="text-xs">{new Date(listing.createdAt).toLocaleDateString('ru-RU')}</span>
            </div>
          </div>

          {/* View button on hover */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg">
              Открыть →
            </div>
          </motion.div>
        </div>
      </div>

      {/* Corner decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </motion.div>
  );
}
