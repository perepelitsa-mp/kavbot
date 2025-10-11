'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MessageCircle, User, Calendar, Tag, DollarSign, Phone, Mail,
  MapPin, Send, ChevronLeft, ChevronRight, Sparkles, Clock, Reply
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface CommentProps {
  comment: any;
  depth?: number;
  onReply: (id: string, userName: string) => void;
}

function Comment({ comment, depth = 0, onReply }: CommentProps) {
  const maxDepth = 8;
  const isDeep = depth >= maxDepth;

  return (
    <div className={depth === 0 ? 'bg-slate-50 rounded-lg p-3' : ''}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={depth > 0 ? 'ml-8 pb-3' : ''}
      >
        <div className="flex items-start gap-2">
          <div
            className={`flex-shrink-0 rounded-full flex items-center justify-center ${
              depth === 0
                ? 'w-8 h-8 bg-indigo-100'
                : 'w-7 h-7 bg-purple-100'
            }`}
          >
            <User
              className={`${
                depth === 0
                  ? 'w-4 h-4 text-indigo-600'
                  : 'w-3.5 h-3.5 text-purple-600'
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className={`font-semibold text-slate-900 truncate ${depth >= 2 ? 'text-xs' : 'text-sm'}`}>
                {comment.user.firstName} {comment.user.lastName || ''}
              </p>
              <span className="text-xs text-slate-500 flex-shrink-0">
                {new Date(comment.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
            <p className={`text-slate-700 mt-1 ${depth >= 2 ? 'text-xs' : 'text-sm'}`}>
              {comment.parentUser ? (
                <span className="inline-flex items-center gap-1 text-indigo-600 font-bold mr-2 bg-indigo-50 px-2 py-0.5 rounded">
                  <Reply className="w-3.5 h-3.5" />
                  @{comment.parentUser.firstName}
                </span>
              ) : null}
              {comment.text}
            </p>
            {!isDeep && (
              <button
                onClick={() => onReply(comment.id, comment.user.firstName)}
                className={`mt-2 flex items-center gap-1 font-medium ${
                  depth === 0
                    ? 'text-xs text-indigo-600 hover:text-indigo-700'
                    : 'text-xs text-purple-600 hover:text-purple-700'
                }`}
              >
                <Reply className="w-3 h-3" />
                Ответить
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recursive replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={depth === 0 ? 'mt-3 border-l-2 border-slate-200 pl-2' : ''}>
          {comment.replies.map((reply: any) => (
            <Comment key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ListingDetailModalProps {
  listingId: string;
  open: boolean;
  onClose: () => void;
  originPosition?: { x: number; y: number } | null;
}

export function ListingDetailModal({ listingId, open, onClose, originPosition }: ListingDetailModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => api.getListing(listingId),
    enabled: open && !!listingId,
  });

  const commentMutation = useMutation({
    mutationFn: ({ text, parentId }: { text: string; parentId?: string | null }) =>
      api.addComment(listingId, text, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      setCommentText('');
      setReplyingTo(null);
    },
  });

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      commentMutation.mutate({
        text: commentText,
        parentId: replyingTo?.id
      });
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageFullscreen) {
          setIsImageFullscreen(false);
        } else if (open) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose, isImageFullscreen]);

  // Prevent body scroll when modal or fullscreen image is open
  useEffect(() => {
    if (open || isImageFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open, isImageFullscreen]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={
            originPosition
              ? {
                  opacity: 0,
                  scale: 0.3,
                  x: originPosition.x - (typeof window !== 'undefined' ? window.innerWidth / 2 : 0),
                  y: originPosition.y - (typeof window !== 'undefined' ? window.innerHeight / 2 : 0),
                }
              : { opacity: 0, scale: 0.8, y: 100 }
          }
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 280,
            mass: 0.8
          }}
          className="relative w-full sm:max-w-3xl"
        >
          {/* Animated gradient border glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 sm:rounded-2xl opacity-20 blur transition-opacity duration-300 animate-pulse" />

          {/* Modal content */}
          <div className="relative bg-white sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden">

            {/* Close button */}
            <button
              onClick={onClose}
              className="sticky top-4 right-4 z-50 ml-auto mr-4 flex items-center justify-center w-10 h-10 rounded-full bg-white/95 hover:bg-white shadow-lg border border-slate-200 transition-all"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 mx-auto border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="mt-3 text-slate-600">Загрузка...</p>
            </div>
          ) : listing ? (
            <div className="-mt-14">
              {/* Photo Gallery */}
              {listing.photos && listing.photos.length > 0 ? (
                <div className="relative w-full h-80 sm:h-96 bg-slate-100">
                  <img
                    src={`/api/photos/${listing.photos[currentPhotoIndex].s3Key}`}
                    alt={listing.title}
                    className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setIsImageFullscreen(true)}
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
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/90 hover:bg-white shadow-md"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-700" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPhotoIndex((prev) =>
                            prev === listing.photos.length - 1 ? 0 : prev + 1,
                          )
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/90 hover:bg-white shadow-md"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-700" />
                      </button>

                      {/* Photo counter */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-medium">
                        {currentPhotoIndex + 1}/{listing.photos.length}
                      </div>

                      {/* Photo indicators */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {listing.photos.map((_: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPhotoIndex(index)}
                            className={`h-1 rounded-full transition-all ${
                              index === currentPhotoIndex
                                ? 'bg-white w-6'
                                : 'bg-white/60 w-1'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-80 sm:h-96 bg-slate-100 flex items-center justify-center">
                  <span className="text-5xl">📦</span>
                </div>
              )}

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-5">
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                      {listing.title}
                    </h2>
                    {listing.price && (
                      <div className="flex-shrink-0 text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-indigo-600">
                          {listing.price} ₽
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{listing.user.firstName} {listing.user.lastName || ''}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {listing.publishedAt
                          ? new Date(listing.publishedAt).toLocaleDateString('ru-RU')
                          : new Date(listing.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>

                  {/* Category and tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-full">
                      {listing.category?.name}
                    </span>
                    {listing.tags?.map((tag: any) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 text-slate-600 rounded-full"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="border-t pt-4">
                  <h3 className="text-base font-bold text-slate-900 mb-2">Описание</h3>
                  <p className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed">
                    {listing.description}
                  </p>
                </div>

                {/* Contacts Section */}
                {listing.contacts && (
                  listing.contacts.phone ||
                  listing.contacts.email ||
                  listing.contacts.address ||
                  listing.contacts.telegram ||
                  listing.contacts.whatsapp
                ) && (
                  <div className="border-t pt-4">
                    <h3 className="text-base font-bold text-slate-900 mb-3">Контакты</h3>
                    <div className="space-y-2">
                      {listing.contacts.phone && (
                        <a
                          href={`tel:${listing.contacts.phone}`}
                          className="flex items-center gap-3 p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <Phone className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-indigo-600 font-medium">Телефон</p>
                            <p className="font-semibold text-slate-900 truncate">{listing.contacts.phone}</p>
                          </div>
                        </a>
                      )}
                      {listing.contacts.email && (
                        <a
                          href={`mailto:${listing.contacts.email}`}
                          className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <Mail className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-purple-600 font-medium">Email</p>
                            <p className="font-semibold text-slate-900 truncate">{listing.contacts.email}</p>
                          </div>
                        </a>
                      )}
                      {listing.contacts.address && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <MapPin className="w-4 h-4 text-slate-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-600 font-medium">Адрес</p>
                            <p className="font-semibold text-slate-900">{listing.contacts.address}</p>
                          </div>
                        </div>
                      )}
                      {listing.contacts.telegram && (
                        <a
                          href={listing.contacts.telegram.startsWith('http') ? listing.contacts.telegram : `https://t.me/${listing.contacts.telegram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Send className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-blue-600 font-medium">Telegram</p>
                            <p className="font-semibold text-slate-900 truncate">{listing.contacts.telegram}</p>
                          </div>
                        </a>
                      )}
                      {listing.contacts.whatsapp && (
                        <a
                          href={listing.contacts.whatsapp.startsWith('http') ? listing.contacts.whatsapp : `https://wa.me/${listing.contacts.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-green-600 font-medium">WhatsApp</p>
                            <p className="font-semibold text-slate-900 truncate">{listing.contacts.whatsapp}</p>
                          </div>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">
                      Комментарии ({listing.comments?.length || 0})
                    </h3>
                  </div>

                  {/* Comment form */}
                  <div className="space-y-2">
                    {replyingTo && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
                        <Reply className="w-4 h-4" />
                        <span>Ответ для {replyingTo.userName}</span>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="ml-auto text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder={replyingTo ? `Ответить ${replyingTo.userName}...` : "Написать комментарий..."}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && commentText.trim()) {
                            handleSubmitComment();
                          }
                        }}
                        disabled={commentMutation.isPending}
                        className="flex-1 h-10 text-sm"
                      />
                      <Button
                        onClick={handleSubmitComment}
                        disabled={!commentText.trim() || commentMutation.isPending}
                        className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700"
                        size="sm"
                      >
                        <Send className="w-3.5 h-3.5 sm:mr-2" />
                        <span className="hidden sm:inline">
                          {commentMutation.isPending ? 'Отправка...' : 'Отправить'}
                        </span>
                      </Button>
                    </div>
                  </div>

                  {/* Comments list */}
                  <div className="space-y-3">
                    {listing.comments?.map((comment: any) => (
                      <Comment
                        key={comment.id}
                        comment={comment}
                        onReply={(id, userName) => setReplyingTo({ id, userName })}
                      />
                    ))}

                    {(!listing.comments || listing.comments.length === 0) && (
                      <div className="text-center py-8">
                        <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          Комментариев пока нет. Будьте первым!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <X className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700 mb-1">Объявление не найдено</p>
              <p className="text-sm text-slate-500">Возможно, оно было удалено</p>
            </div>
          )}
          </div>
        </motion.div>
      </div>

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {isImageFullscreen && listing?.photos?.[currentPhotoIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setIsImageFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-[95vw] max-h-[95vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`/api/photos/${listing.photos[currentPhotoIndex].s3Key}`}
                alt={listing.title}
                className="max-w-full max-h-[95vh] object-contain"
              />
              <button
                onClick={() => setIsImageFullscreen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              {listing.photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex((prev) =>
                        prev === 0 ? listing.photos.length - 1 : prev - 1
                      );
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex((prev) =>
                        prev === listing.photos.length - 1 ? 0 : prev + 1
                      );
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm">
                    {currentPhotoIndex + 1} / {listing.photos.length}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}