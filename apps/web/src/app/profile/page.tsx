'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Edit, Trash2, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedListing, setSelectedListing] = useState<any>(null);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  const isAdmin = user.role === 'admin' || user.role === 'moderator';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Личный кабинет</h1>
              <p className="text-muted-foreground mt-1">
                {user.firstName} {user.lastName} {isAdmin && `(${user.role})`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin')}
                >
                  Админ-панель
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push('/')}>
                На главную
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Мои объявления</h2>
          {listingsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing: any) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-lg border p-4 hover:shadow-lg transition-shadow"
                >
                  {listing.photos && listing.photos.length > 0 && (
                    <img
                      src={`/api/photos/${listing.photos[0].s3Key}`}
                      alt={listing.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="font-semibold text-lg mb-2">{listing.title}</h3>
                  <div className="flex items-center justify-between mb-4">
                    {listing.price && (
                      <span className="text-primary font-bold">
                        {listing.price} ₽
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        listing.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : listing.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : listing.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {listing.status === 'approved'
                        ? 'Опубликовано'
                        : listing.status === 'pending'
                        ? 'На модерации'
                        : listing.status === 'rejected'
                        ? 'Отклонено'
                        : 'Архив'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        window.open(`/?listing=${listing.id}`, '_blank');
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Просмотр
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Удалить объявление?')) {
                          deleteMutation.mutate(listing.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-lg border">
              <p className="text-muted-foreground">У вас пока нет объявлений</p>
              <Button className="mt-4" onClick={() => router.push('/')}>
                Создать объявление
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
