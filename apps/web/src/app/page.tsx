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

  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (listingId) {
      setSelectedListingId(listingId);
    }
  }, [searchParams]);

  const handleCloseListing = () => {
    setSelectedListingId(null);
    if (searchParams.get('listing')) {
      router.push('/');
    }
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
              <p className="text-lg font-semibold tracking-tight">KAVhub</p>
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
        <div className="container mx-auto px-4 pb-40 pt-6 text-white">
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
              <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6 backdrop-blur">
                <div className="flex items-center gap-3">
                  <p className="text-sm uppercase tracking-wide text-white/60">{heroSectionLabel}</p>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${
                      pinnedListing
                        ? 'border-amber-300/40 bg-amber-400/15 text-amber-100'
                        : 'border-white/20 bg-white/10 text-white/70'
                    }`}
                  >
                    {heroBadgeLabel}
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold leading-snug line-clamp-2">
                  {featuredListing.title}
                </h3>
                {featuredListing.description && (
                  <p className="mt-3 text-sm text-white/70 line-clamp-3">
                    {featuredListing.description}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => setSelectedListingId(featuredListing.id)}
                    className="bg-white/90 text-slate-900 hover:bg-white"
                  >
                    Открыть объявление
                  </Button>
                  {featuredListing.category?.name && (
                    <button
                      type="button"
                      onClick={() => {
                        if (featuredListing.category?.slug) {
                          setCategories([featuredListing.category.slug]);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-sm text-white/70 transition hover:text-white"
                    >
                      Перейти в категорию
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/5">
                {featuredListing.photos?.length ? (
                  <>
                    <img
                      src={`/api/photos/${featuredListing.photos[0].s3Key}`}
                      alt={featuredListing.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/30 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="flex h-full min-h-[260px] items-center justify-center bg-white/5 text-white/50">
                    Фото пока нет
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
            <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-2xl backdrop-blur overflow-visible">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Найдите то, что нужно</h2>
                  <p className="text-sm text-slate-500">
                    Отфильтруйте объявления по категориям и тегам, чтобы быстрее найти нужное
                  </p>
                </div>
                <div className="w-full max-w-xl">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="Что вы ищете? Например, iPhone 15 или ремонт квартиры"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 text-base text-slate-700 placeholder:text-slate-400 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-400"
                    />
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
          </div>

          <section className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-72 rounded-3xl border border-slate-200/60 bg-white/70 shadow animate-pulse"
                  />
                ))}
              </div>
        ) : visibleListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 py-16 text-center shadow-inner">
                <Sparkles className="h-10 w-10 text-slate-400" />
                <p className="mt-4 text-lg font-medium text-slate-700">По запросу ничего не нашлось</p>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Попробуйте изменить фильтры или создайте новое объявление — возможно, именно его здесь ищут.
                </p>
              </div>
            ) : (
              <>
                <motion.div
                  className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {visibleListings.map((listing, index) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <ListingCard
                        listing={listing}
                        onClick={() => setSelectedListingId(listing.id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {hasNextPage && (
                  <div className="mt-10 text-center">
                    <MotionButton
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      variant="outline"
                      className="border-slate-300 bg-white/80 text-slate-700 transition hover:bg-white"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      {isFetchingNextPage ? 'Загружаем ещё…' : 'Показать ещё объявления'}
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








