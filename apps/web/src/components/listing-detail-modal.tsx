'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, User, Calendar, Tag, DollarSign, Phone, Mail, MapPin, Send } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ListingDetailModalProps {
  listingId: string;
  open: boolean;
  onClose: () => void;
}

export function ListingDetailModal({ listingId, open, onClose }: ListingDetailModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const queryClient = useQueryClient();

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => api.getListing(listingId),
    enabled: open && !!listingId,
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => api.addComment(listingId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      setCommentText('');
    },
  });

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      commentMutation.mutate(commentText);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl mx-4"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-muted-foreground">Загрузка...</p>
            </div>
          ) : listing ? (
            <div>
              {/* Photo Gallery */}
              {listing.photos && listing.photos.length > 0 ? (
                <div className="relative w-full h-96 bg-muted">
                  <Image
                    src={`/api/photos/${listing.photos[currentPhotoIndex].s3Key}`}
                    alt={listing.title}
                    fill
                    className="object-contain"
                    priority
                  />

                  {/* Photo navigation */}
                  {listing.photos.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentPhotoIndex((prev) =>
                            prev === 0 ? listing.photos.length - 1 : prev - 1,
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
                      >
                        ←
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPhotoIndex((prev) =>
                            prev === listing.photos.length - 1 ? 0 : prev + 1,
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
                      >
                        →
                      </button>

                      {/* Photo indicators */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {listing.photos.map((_: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPhotoIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentPhotoIndex
                                ? 'bg-primary w-6'
                                : 'bg-background/60 hover:bg-background/80'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-96 bg-muted flex items-center justify-center">
                  <span className="text-6xl">📦</span>
                </div>
              )}

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-3xl font-bold">{listing.title}</h2>
                    {listing.price && (
                      <div className="flex items-center gap-2 text-2xl font-bold text-primary whitespace-nowrap">
                        <DollarSign className="w-6 h-6" />
                        {listing.price} ₽
                      </div>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>
                        {listing.user.firstName} {listing.user.lastName || ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {listing.publishedAt
                          ? new Date(listing.publishedAt).toLocaleDateString('ru-RU')
                          : new Date(listing.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>

                  {/* Category and tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block px-3 py-1 text-sm font-medium bg-accent text-accent-foreground rounded-full">
                      {listing.category?.name}
                    </span>
                    {listing.tags?.map((tag: any) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm border border-border rounded-full"
                      >
                        <Tag className="w-3 h-3" />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold mb-2">Описание</h3>
                  <p className="whitespace-pre-wrap text-foreground">{listing.description}</p>
                </div>

                {/* Contacts Section */}
                {listing.contacts && (
                  listing.contacts.phone ||
                  listing.contacts.email ||
                  listing.contacts.address ||
                  listing.contacts.telegram ||
                  listing.contacts.whatsapp
                ) && (
                  <div className="space-y-3 border-t pt-6">
                    <h3 className="text-lg font-semibold mb-3">Контакты</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {listing.contacts.phone && (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Телефон</p>
                            <a href={`tel:${listing.contacts.phone}`} className="font-medium hover:text-primary">
                              {listing.contacts.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {listing.contacts.email && (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <a href={`mailto:${listing.contacts.email}`} className="font-medium hover:text-primary break-all">
                              {listing.contacts.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {listing.contacts.address && (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Адрес</p>
                            <p className="font-medium">{listing.contacts.address}</p>
                          </div>
                        </div>
                      )}
                      {listing.contacts.telegram && (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Send className="w-5 h-5 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Telegram</p>
                            <a
                              href={listing.contacts.telegram.startsWith('http') ? listing.contacts.telegram : `https://t.me/${listing.contacts.telegram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary break-all"
                            >
                              {listing.contacts.telegram}
                            </a>
                          </div>
                        </div>
                      )}
                      {listing.contacts.whatsapp && (
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">WhatsApp</p>
                            <a
                              href={listing.contacts.whatsapp.startsWith('http') ? listing.contacts.whatsapp : `https://wa.me/${listing.contacts.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary break-all"
                            >
                              {listing.contacts.whatsapp}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <MessageCircle className="w-5 h-5" />
                    <span>Комментарии ({listing.comments?.length || 0})</span>
                  </div>

                  {/* Comment form */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Написать комментарий..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && commentText.trim()) {
                          handleSubmitComment();
                        }
                      }}
                      disabled={commentMutation.isPending}
                    />
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || commentMutation.isPending}
                    >
                      {commentMutation.isPending ? 'Отправка...' : 'Отправить'}
                    </Button>
                  </div>

                  {/* Comments list */}
                  <div className="space-y-4">
                    {listing.comments?.map((comment: any) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-muted/50 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {comment.user.firstName} {comment.user.lastName || ''}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.text}</p>
                      </motion.div>
                    ))}

                    {(!listing.comments || listing.comments.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Комментариев пока нет. Будьте первым!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Объявление не найдено</p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}