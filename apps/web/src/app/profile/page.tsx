'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LogOut,
  Trash2,
  Eye,
  ShieldCheck,
  Sparkles,
  Plus,
  Clock,
  CheckCircle2,
  CircleDashed,
  ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CreateListingDialog } from '@/components/create-listing-dialog';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  chipClass: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  approved: {
    label: 'Опубликовано',
    icon: CheckCircle2,
    chipClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30',
  },
  pending: {
    label: 'На модерации',
    icon: Clock,
    chipClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30',
  },
  rejected: {
    label: 'Отклонено',
    icon: ShieldAlert,
    chipClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-500/30',
  },
  draft: {
    label: 'Черновик',
    icon: CircleDashed,
    chipClass: 'bg-slate-100 text-slate-600 ring-1 ring-slate-400/30',
  },
};

const getStatusMeta = (status?: string): StatusMeta => {
  if (!status) {
    return STATUS_META.draft;
  }
  return STATUS_META[status] ?? STATUS_META.draft;
};

const getFormattedPrice = (price: unknown): string | null => {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return currencyFormatter.format(price);
  }
  if (typeof price === 'string') {
    const numericPrice = Number(price);
    if (Number.isFinite(numericPrice)) {
      return currencyFormatter.format(numericPrice);
    }
    return price;
  }
  return null;
};

const formatListingDate = (date?: string): string => {
  if (!date) {
    return 'Дата уточняется';
  }
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Дата уточняется';
  }
  return dateFormatter.format(parsedDate);
};

const getInitials = (first?: string | null, last?: string | null): string => {
  const firstInitial = first?.trim().charAt(0);
  const lastInitial = last?.trim().charAt(0);
  const initials = `${firstInitial ?? ''}${lastInitial ?? ''}`.toUpperCase();
  return initials || 'KB';
};

const pluralize = (value: number, forms: [string, string, string]) => {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return forms[1];
  }
  return forms[2];
};

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: api.getMe,
    retry: false,
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['myListings'],
    queryFn: api.getMyListings,
    enabled: !!user,
  });

  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
    }
  };

  const handleCreateClick = () => {
    setIsCreateOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
    },
  });

  const handleLogout = () => {
    api.logout();
    router.push('/');
    router.refresh();
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="h-12 w-12 rounded-full border-4 border-primary/70 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  const isAdmin = user.role === 'admin' || user.role === 'moderator';
  const totalListings = listings?.length ?? 0;
  const approvedListings = listings ? listings.filter((item: any) => item.status === 'approved').length : 0;
  const pendingListings = listings ? listings.filter((item: any) => item.status === 'pending').length : 0;
  const rejectedListings = listings ? listings.filter((item: any) => item.status === 'rejected').length : 0;
  const draftListings = Math.max(totalListings - approvedListings - pendingListings - rejectedListings, 0);

  const stats = [
    {
      label: 'Всего объявлений',
      value: totalListings,
      description: totalListings
        ? 'Ваше портфолио активных, проверяемых и черновиков'
        : 'Пока пусто — самое время о себе заявить',
      icon: Sparkles,
      accent: 'from-white/20 via-white/0 to-transparent',
    },
    {
      label: 'Опубликовано',
      value: approvedListings,
      description: approvedListings
        ? `${approvedListings} ${pluralize(approvedListings, ['активное объявление', 'активных объявления', 'активных объявлений'])}`
        : 'Запустите первое объявление и получите отклики',
      icon: ShieldCheck,
      accent: 'from-emerald-200/30 via-transparent to-transparent',
    },
    {
      label: 'На модерации',
      value: pendingListings,
      description: pendingListings
        ? 'Мы уведомим вас, как только проверка завершится'
        : 'Ни одно объявление не ждёт проверки',
      icon: Clock,
      accent: 'from-amber-200/30 via-transparent to-transparent',
    },
    {
      label: 'Черновики',
      value: draftListings + rejectedListings,
      description: draftListings + rejectedListings
        ? 'Доработайте и опубликуйте объявления, чтобы их увидели'
        : 'Все черновики и отклонения закрыты',
      icon: CircleDashed,
      accent: 'from-slate-300/30 via-transparent to-transparent',
    },
  ];

  const heroSubtitle = approvedListings
    ? `На площадке сейчас ${approvedListings} ${pluralize(approvedListings, [
        'активное объявление',
        'активных объявления',
        'активных объявлений',
      ])}`
    : 'Создайте своё первое объявление и расскажите сообществу о себе';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/60 to-background pb-16">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-sky-600 to-indigo-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.35),_transparent_55%)] opacity-60" />
        <div className="relative container mx-auto px-4 py-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/25 bg-white/15 text-3xl font-semibold uppercase backdrop-blur-sm">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <span className="absolute -bottom-3 left-1/2 w-max -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/80 backdrop-blur">
                    {isAdmin ? 'Администратор' : 'Проверенный пользователь'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/60">Личный кабинет</p>
                  <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
                    Привет, {user.firstName || 'друг'}!
                  </h1>
                  <p className="mt-4 max-w-xl text-base text-white/75">{heroSubtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="secondary"
                    className="bg-white text-primary hover:bg-white/90"
                    onClick={handleCreateClick}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Разместить объявление
                  </Button>
                </motion.div>
                {isAdmin && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                      onClick={() => router.push('/admin')}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Панель модерации
                    </Button>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                    onClick={() => router.push('/')}
                  >
                    На главную
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="destructive" className="bg-white/15 text-white hover:bg-white/25" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Выйти
                  </Button>
                </motion.div>
              </div>
            </div>
            <div className="grid w-full max-w-sm gap-3 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
              <div className="flex items-center justify-between text-sm text-white/80">
                <span>Статус профиля</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isAdmin ? 'Супердоступ' : 'Сообщество'}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-2xl font-semibold">
                  <span>{totalListings}</span>
                  <span className="text-white/70 text-base font-normal">
                    {pluralize(totalListings, ['объявление', 'объявления', 'объявлений'])}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-white/70">
                  <div className="flex justify-between">
                    <span>Опубликовано</span>
                    <span>{approvedListings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>На модерации</span>
                    <span>{pendingListings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Черновики</span>
                    <span>{draftListings + rejectedListings}</span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-white via-sky-200 to-emerald-200"
                    style={{
                      width: `${Math.min(100, totalListings ? Math.max(10, (approvedListings / totalListings) * 100) : 0)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-white/70">
                  Продолжайте добавлять объявления, чтобы оставаться на виду у покупателей.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="relative -mt-10">
        <div className="container mx-auto px-4">
          <motion.section
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -4 }}
                className={`relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[0_20px_30px_-24px_rgba(15,23,42,0.45)] ${
                  listingsLoading ? 'animate-pulse' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.accent}`} />
                <div className="relative flex h-full flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-semibold text-foreground">{stat.value}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground/70">{stat.label}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{stat.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.section>

          <section className="mt-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-foreground">Ваши объявления</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Управляйте карточками, отслеживайте статус модерации и быстро обновляйте информацию.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {approvedListings} опубликовано
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100/60 px-3 py-1 text-amber-700">
                  <Clock className="h-4 w-4" />
                  {pendingListings} на проверке
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  <CircleDashed className="h-4 w-4" />
                  {draftListings + rejectedListings} черновиков
                </span>
              </div>
            </div>

            {listingsLoading ? (
              <div className="mt-12 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full border-4 border-primary/70 border-t-transparent animate-spin" />
              </div>
            ) : listings && listings.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing: any) => {
                  const statusMeta = getStatusMeta(listing.status);
                  const formattedPrice = getFormattedPrice(listing.price);

                  return (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      whileHover={{ translateY: -6 }}
                      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[0_32px_45px_-28px_rgba(15,23,42,0.35)] transition-shadow hover:shadow-[0_28px_55px_-24px_rgba(15,23,42,0.45)]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {listing.photos && listing.photos.length > 0 ? (
                          <img
                            src={`/api/photos/${listing.photos[0].s3Key}`}
                            alt={listing.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent text-primary">
                            <Sparkles className="h-8 w-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      </div>

                      <div className="flex flex-1 flex-col gap-5 p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {listing.category?.name && (
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                {listing.category.name}
                              </span>
                            )}
                            <h3 className="mt-3 text-xl font-semibold leading-tight text-foreground">
                              {listing.title}
                            </h3>
                          </div>
                          {formattedPrice && (
                            <div className="rounded-2xl bg-primary/10 px-3 py-1 text-right text-sm font-semibold text-primary">
                              {formattedPrice}
                            </div>
                          )}
                        </div>

                        {listing.description && (
                          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                            {listing.description}
                          </p>
                        )}

                        {listing.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {listing.tags.slice(0, 3).map((tag: any) => (
                              <span
                                key={tag.id ?? tag.name}
                                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                              >
                                #{tag.name}
                              </span>
                            ))}
                            {listing.tags.length > 3 && (
                              <span className="rounded-full border border-dashed border-primary/40 px-3 py-1 text-xs text-primary/70">
                                +{listing.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-auto space-y-4">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{formatListingDate(listing.updatedAt || listing.createdAt)}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.chipClass}`}>
                              <statusMeta.icon className="h-3.5 w-3.5" />
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-primary/40 text-primary hover:bg-primary/10"
                              onClick={() => {
                                window.open(`/?listing=${listing.id}`, '_blank');
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Открыть карточку
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => {
                                if (confirm('Удалить объявление?')) {
                                  deleteMutation.mutate(listing.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 overflow-hidden rounded-3xl border border-dashed border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background p-12 text-center shadow-[0_24px_45px_-28px_rgba(15,23,42,0.35)]"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-9 w-9" />
                </div>
                <h3 className="mt-6 text-2xl font-semibold text-foreground">
                  Здесь появятся ваши объявления
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Добавьте первое объявление, чтобы начать получать просмотры и отклики от сообщества.
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className="mt-8"
                    onClick={handleCreateClick}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить объявление
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </section>
        </div>
      </main>

      <AnimatePresence>
        {isCreateOpen && (
          <CreateListingDialog onOpenChange={handleCreateDialogChange} />
        )}
      </AnimatePresence>
    </div>
  );
}
