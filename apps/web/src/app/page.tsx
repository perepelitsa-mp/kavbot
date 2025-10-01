'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, User, LogIn } from 'lucide-react';
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
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // Check URL params for listing ID on mount
  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (listingId) {
      setSelectedListingId(listingId);
    }
  }, [searchParams]);

  const handleCloseListing = () => {
    setSelectedListingId(null);
    // Clean up URL params
    if (searchParams.get('listing')) {
      router.push('/');
    }
  };

  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: api.getMe,
    retry: false,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['listings', search, category, tags],
    queryFn: ({ pageParam }) =>
      api.getListings({
        search,
        category,
        tags,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const listings = data?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">🏘 Кавалерово</h1>
            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = '/profile';
                    }}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Личный кабинет
                  </Button>
                  <MotionButton
                    layoutId="create-listing"
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать
                  </MotionButton>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsAuthOpen(true)}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Вход
                  </Button>
                  <MotionButton
                    layoutId="create-listing"
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать
                  </MotionButton>
                </>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск объявлений..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <FilterBar
            selectedCategory={category}
            onCategoryChange={setCategory}
            selectedTags={tags}
            onTagsChange={setTags}
          />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Объявления не найдены</p>
          </div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {listings.map((listing, index) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ListingCard
                    listing={listing}
                    onClick={() => setSelectedListingId(listing.id)}
                  />
                </motion.div>
              ))}
            </motion.div>

            {hasNextPage && (
              <div className="mt-8 text-center">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                >
                  {isFetchingNextPage ? 'Загрузка...' : 'Показать еще'}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {isCreateOpen && (
          <CreateListingDialog onOpenChange={setIsCreateOpen} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAuthOpen && (
          <AuthDialog
            onOpenChange={setIsAuthOpen}
            onSuccess={() => refetchUser()}
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}