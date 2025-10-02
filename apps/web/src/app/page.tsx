'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Plus,
  User,
  LogIn,
  Sparkles,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ListingCard } from '@/components/listing-card';
import { FilterBar } from '@/components/filter-bar';
import { CreateListingDialog } from '@/components/create-listing-dialog';
import { ListingDetailModal } from '@/components/listing-detail-modal';
import { AuthDialog } from '@/components/auth-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MotionButton = motion(Button);

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (listingId) {
      setSelectedListingId(listingId);
    }
  }, [searchParams]);

  const handleCloseListing = () => {
    setSelectedListingId(null);
    setClickPosition(null);
    if (searchParams.get('listing')) {
      router.push('/');
    }
  };

  const handleListingClick = (listingId: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setClickPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setSelectedListingId(listingId);
  };


  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: api.getMe,
    retry: false,
  });

  const handleCreateClick = () => {
    if (currentUser) {
      setIsCreateOpen(true);
    } else {
      setIsAuthOpen(true);
    }
  };

  const { data: filtersData } = useQuery({
    queryKey: ['filters'],
    queryFn: api.getFilters,
  });

  const { data: pinnedListingData } = useQuery({
    queryKey: ['pinnedListing'],
    queryFn: api.getPinnedListing,
    staleTime: 1000 * 60,
  });

  const pinnedListing = pinnedListingData ?? null;

  const { data: featuredListingData } = useQuery({
    queryKey: ['featuredListing'],
    queryFn: () => api.getListings({ cursor: undefined }),
    staleTime: 1000 * 60,
    enabled: !pinnedListing,
  });

  const { data: totalListingsData } = useQuery({
    queryKey: ['totalListings'],
    queryFn: () => api.getListings({ cursor: undefined }),
    staleTime: 1000 * 60,
  });

  const allCategories = filtersData?.categories ?? [];
  const totalCategories = allCategories.length;
  const totalTags = filtersData?.tags?.length ?? 0;
  const totalListings = totalListingsData?.items?.length ?? 0;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['listings', search, categories, tags],
    queryFn: ({ pageParam }) =>
      api.getListings({
        search,
        categories,
        tags,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const listings = data?.pages.flatMap((page) => page.items) || [];
  const featuredListing = pinnedListing ?? featuredListingData?.items?.[0] ?? null;
  const visibleListings = useMemo(
    () => {
      if (!featuredListing) return listings;
      return listings.filter((listing) => listing.id !== featuredListing.id);
    },
    [listings, featuredListing?.id],
  );
  const heroSectionLabel = pinnedListing ? 'Закреплённое объявление' : 'Объявление дня';
  const heroBadgeLabel = pinnedListing ? 'Проверено командой' : 'Новинка недели';

  const stats = useMemo(
    () => [
      {
        label: 'Всего объявлений',
        value: new Intl.NumberFormat('ru-RU').format(totalListings),
      },
      {
        label: 'Категорий на площадке',
        value: new Intl.NumberFormat('ru-RU').format(totalCategories),
      },
      {
        label: 'Доступных тегов',
        value: new Intl.NumberFormat('ru-RU').format(totalTags),
      },
    ],
    [totalListings, totalCategories, totalTags],
  );

  return (

    <div className="relative isolate min-h-screen overflow-x-hidden bg-slate-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-[-320px] -z-10 h-[720px] bg-gradient-to-b from-indigo-500/60 via-purple-500/30 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-24 -z-10 h-80 w-80 rounded-full bg-sky-500/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-20 -z-10 h-[340px] w-[340px] rounded-full bg-fuchsia-500/25 blur-3xl"
        aria-hidden
      />

      <header className="relative z-30">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-6 text-white">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">KavalHub</p>
              <p className="text-sm text-white/60">Онлайн-сердце Кавалерово</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push('/profile')}
                  className="border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                >
                  <User className="mr-2 h-4 w-4" />
                  Личный кабинет
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsAuthOpen(true)}
                  className="border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Войти
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative z-20">
        <div className="container mx-auto px-4 pb-56 pt-6 text-white">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-3xl space-y-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-sm text-white/80 backdrop-blur">
              <Sparkles className="h-4 w-4 text-white" />
              Добро пожаловать в местное комьюнити
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Находите и делитесь лучшими объявлениями в Кавалерово
            </h1>
            <p className="text-lg text-white/70 sm:text-xl">
              Локальные услуги, работа, товары и события — всё, что важно вашему району, в одном месте.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
            className="mt-10"
          >
            <MotionButton
              layoutId="create-listing-hero"
              onClick={handleCreateClick}
              className="h-14 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 px-8 text-base font-semibold text-white shadow-lg shadow-rose-500/40 transition hover:shadow-rose-500/50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Разместить объявление
            </MotionButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-10 grid gap-4 sm:grid-cols-3"
          >
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur"
              >
                <p className="text-sm uppercase tracking-wide text-white/60">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold">{item.value}</p>
              </div>
            ))}
          </motion.div>

          {featuredListing && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_minmax(0,0.9fr)]"
            >
              <div className="group relative overflow-hidden rounded-3xl border-2 border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-8 backdrop-blur-lg shadow-2xl">
                {/* Decorative gradient orbs */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/30 to-orange-500/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                      <Flame className="h-4 w-4 text-amber-300" />
                      <p className="text-xs font-bold uppercase tracking-wider text-white/90">{heroSectionLabel}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${
                        pinnedListing
                          ? 'border-amber-300/50 bg-gradient-to-r from-amber-400/20 to-orange-400/20 text-amber-100 shadow-lg shadow-amber-500/20'
                          : 'border-white/30 bg-white/10 text-white/90'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {heroBadgeLabel}
                    </span>
                  </div>
                  <h3 className="mt-4 text-3xl font-bold leading-tight line-clamp-2 text-white">
                    {featuredListing.title}
                  </h3>
                  {featuredListing.description && (
                    <p className="mt-4 text-base text-white/80 line-clamp-3 leading-relaxed">
                      {featuredListing.description}
                    </p>
                  )}
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => setSelectedListingId(featuredListing.id)}
                      className="group/btn bg-white text-slate-900 hover:bg-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-white/20 hover:shadow-xl hover:shadow-white/30 transition-all"
                    >
                      <span>Открыть объявление</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                    {featuredListing.category?.name && (
                      <button
                        type="button"
                        onClick={() => {
                          if (featuredListing.category?.slug) {
                            setCategories([featuredListing.category.slug]);
                          }
                        }}
                        className="group/link inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white/80 transition-all hover:text-white hover:bg-white/10"
                      >
                        Перейти в категорию
                        <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border-2 border-white/20 bg-white/5 shadow-2xl">
                {featuredListing.photos?.length ? (
                  <>
                    <img
                      src={`/api/photos/${featuredListing.photos[0].s3Key}`}
                      alt={featuredListing.title}
                      className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/40 via-transparent to-transparent" />

                    {/* Shine effect */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_3s_infinite]" />
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                    <div className="relative">
                      <div className="absolute inset-0 blur-2xl bg-gradient-to-br from-indigo-400/20 via-purple-400/20 to-pink-400/20" />
                      <span className="relative text-6xl opacity-50">📦</span>
                    </div>
                    <p className="mt-4 text-sm font-medium text-white/50">Фото пока нет</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <main className="relative z-30 mt-[-140px] rounded-t-[48px] bg-background pb-20 text-slate-900 shadow-[0_-40px_90px_-50px_rgba(30,41,59,0.6)]">
        <div className="container mx-auto px-4">
          <div className="relative -top-16 z-40">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group relative rounded-3xl border-2 border-slate-200/80 bg-white p-6 shadow-2xl backdrop-blur-sm overflow-visible"
            >
              {/* Decorative gradient background */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 opacity-60" />

              {/* Subtle glow effect */}
              <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                      <h2 className="text-xl font-bold text-slate-900">Найдите то, что нужно</h2>
                    </div>
                    <p className="text-sm text-slate-600 ml-3">
                      Отфильтруйте объявления по категориям и тегам
                    </p>
                  </div>
                  <div className="w-full max-w-xl">
                    <div className="relative group/search">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
                      <Input
                        type="search"
                        placeholder="iPhone 15, ремонт квартиры, репетитор..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base text-slate-700 placeholder:text-slate-400 shadow-sm focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-100 transition-all"
                      />
                      {/* Search icon animation on focus */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within/search:opacity-100 transition-opacity">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <ArrowRight className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <FilterBar
                  selectedCategories={categories}
                  onCategoriesChange={setCategories}
                  selectedTags={tags}
                  onTagsChange={setTags}
                />
              </div>
            </motion.div>
          </div>

          <section className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="relative bg-white rounded-3xl overflow-hidden border border-slate-200/60 shadow-sm"
                  >
                    {/* Image skeleton */}
                    <div className="w-full h-56 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 animate-pulse" />

                    {/* Content skeleton */}
                    <div className="p-5 space-y-4">
                      {/* Tags skeleton */}
                      <div className="flex gap-2">
                        <div className="h-6 w-20 bg-slate-100 rounded-full animate-pulse" />
                        <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                      </div>

                      {/* Title skeleton */}
                      <div className="space-y-2">
                        <div className="h-6 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-6 bg-slate-100 rounded-lg w-3/4 animate-pulse" />
                      </div>

                      {/* Description skeleton */}
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-50 rounded animate-pulse" />
                        <div className="h-4 bg-slate-50 rounded w-5/6 animate-pulse" />
                      </div>

                      {/* Footer skeleton */}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>

                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  </div>
                ))}
              </div>
        ) : visibleListings.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/50 to-white py-20 text-center shadow-sm"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 mb-4">
                    <Sparkles className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="mt-4 text-xl font-semibold text-slate-700">По запросу ничего не нашлось</p>
                  <p className="mt-2 max-w-md mx-auto text-sm text-slate-500 leading-relaxed">
                    Попробуйте изменить фильтры или создайте новое объявление — возможно, именно его здесь ищут.
                  </p>
                </div>
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {visibleListings.map((listing, index) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onClick={(e) => handleListingClick(listing.id, e)}
                    />
                  ))}
                </div>

                {hasNextPage && (
                  <div className="mt-12 text-center">
                    <MotionButton
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="group relative px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <span className="relative flex items-center gap-2">
                        {isFetchingNextPage ? (
                          <>
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            Загружаем ещё…
                          </>
                        ) : (
                          <>
                            Показать ещё объявления
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </span>
                    </MotionButton>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <AnimatePresence>
        {isCreateOpen && <CreateListingDialog onOpenChange={setIsCreateOpen} />}
      </AnimatePresence>

      <AnimatePresence>
        {isAuthOpen && (
          <AuthDialog
            onOpenChange={setIsAuthOpen}
            onSuccess={() => {
              refetchUser();
              setIsAuthOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {selectedListingId && (
        <ListingDetailModal
          listingId={selectedListingId}
          open={!!selectedListingId}
          onClose={handleCloseListing}
          originPosition={clickPosition}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-transparent" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}








