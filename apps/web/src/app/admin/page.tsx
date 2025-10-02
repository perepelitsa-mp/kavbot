'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Trash2,
  Ban,
  Shield,
  Eye,
  AlertCircle,
  Home,
  Flame,
  Pin
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Tab = 'users' | 'listings' | 'moderation';

interface ConfirmAction {
  title: string;
  description?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'success' | 'warning' | 'info';
  confirmText?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('moderation');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmAction | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinDialogListingId, setPinDialogListingId] = useState<string | null>(null);
  const [pinStartsAt, setPinStartsAt] = useState('');
  const [pinEndsAt, setPinEndsAt] = useState('');

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: api.getMe,
    retry: false,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: api.getAllUsers,
    enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator'),
  });

  const { data: allListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['allListings'],
    queryFn: api.getAllListingsAdmin,
    enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator'),
  });

  const { data: pendingListings, isLoading: pendingLoading } = useQuery({
    queryKey: ['pendingListings'],
    queryFn: api.getPendingListings,
    enabled: !!currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator'),
  });

  const banUserMutation = useMutation({
    mutationFn: ({ id, isBanned }: { id: string; isBanned: boolean }) =>
      api.updateUser(id, { isBanned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.updateUser(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const moderateListingMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      api.moderateListing(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingListings'] });
      queryClient.invalidateQueries({ queryKey: ['allListings'] });
    },
  });

  const deleteListingMutation = useMutation({
    mutationFn: (id: string) => api.deleteListingAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allListings'] });
      queryClient.invalidateQueries({ queryKey: ['pendingListings'] });
    },
  });

  const pinnedListingMutation = useMutation({
    mutationFn: ({
      id,
      isPinned,
      pinStartsAt,
      pinEndsAt,
    }: {
      id: string;
      isPinned: boolean;
      pinStartsAt?: string;
      pinEndsAt?: string;
    }) => api.setPinnedListing(id, isPinned, pinStartsAt, pinEndsAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allListings'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedListing'] });
      setPinDialogOpen(false);
      setPinStartsAt('');
      setPinEndsAt('');
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
    router.push('/');
    return null;
  }

  const isAdmin = currentUser.role === 'admin';

  // Получить объявления требующие модерации из API
  const needsModeration = pendingListings?.items || [];
  const currentPinnedListing = allListings?.find((listing: any) => listing.isPinned) || null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="w-8 h-8" />
                Админ-панель
              </h1>
              <p className="mt-1 opacity-90">
                {currentUser.firstName} {currentUser.lastName} ({currentUser.role})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => router.push('/profile')}
              >
                Личный кабинет
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push('/')}
              >
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('moderation')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'moderation'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertCircle className="w-5 h-5" />
              Модерация
              {needsModeration.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {needsModeration.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'listings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-5 h-5" />
              Объявления ({allListings?.length || 0})
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-5 h-5" />
                Пользователи ({users?.length || 0})
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Требуется модерация ({needsModeration.length})
            </h2>
            {pendingLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : needsModeration.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {needsModeration.map((listing: any) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-lg border-2 border-red-200 p-6 shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-xl mb-2">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Пользователь: {listing.user.firstName} (
                          {listing.user.phone || listing.user.username})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Категория: {listing.category.name}
                        </p>
                      </div>
                      <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium">
                        На модерации
                      </div>
                    </div>

                    {listing.photos && listing.photos.length > 0 && (
                      <img
                        src={`/api/photos/${listing.photos[0].s3Key}`}
                        alt={listing.title}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}

                    <p className="text-sm mb-4 line-clamp-3">{listing.description}</p>

                    {listing.price && (
                      <p className="text-primary font-bold text-xl mb-4">
                        {listing.price} ₽
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(`/?listing=${listing.id}`, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Просмотр
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setConfirmDialog({
                            title: 'Одобрить объявление?',
                            description: `Объявление "${listing.title}" будет опубликовано и станет доступно всем пользователям.`,
                            confirmText: 'Одобрить',
                            variant: 'success',
                            onConfirm: () => {
                              moderateListingMutation.mutate({
                                id: listing.id,
                                status: 'approved',
                              });
                            },
                          });
                        }}
                        disabled={moderateListingMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Одобрить
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setConfirmDialog({
                            title: 'Отклонить объявление?',
                            description: `Объявление "${listing.title}" будет отклонено и не будет опубликовано.`,
                            confirmText: 'Отклонить',
                            variant: 'danger',
                            onConfirm: () => {
                              moderateListingMutation.mutate({
                                id: listing.id,
                                status: 'rejected',
                              });
                            },
                          });
                        }}
                        disabled={moderateListingMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Отклонить
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Все объявления проверены!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Все объявления ({allListings?.length || 0})
            </h2>
            <div className="mb-6 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-5 text-amber-800 shadow-sm">
              {currentPinnedListing ? (
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600/90">
                      Закреплённое объявление
                    </p>
                    <p className="mt-1 text-lg font-semibold text-amber-900">
                      {currentPinnedListing.title}
                    </p>
                    <p className="text-sm text-amber-700/90">
                      Статус: {currentPinnedListing.status === 'approved' ? 'Одобрено' : currentPinnedListing.status}
                    </p>
                    {(currentPinnedListing.pinStartsAt || currentPinnedListing.pinEndsAt) && (
                      <div className="mt-2 text-xs text-amber-600/90">
                        {currentPinnedListing.pinStartsAt && (
                          <div>
                            Начало: {new Date(currentPinnedListing.pinStartsAt).toLocaleString('ru-RU')}
                          </div>
                        )}
                        {currentPinnedListing.pinEndsAt && (
                          <div>
                            Окончание: {new Date(currentPinnedListing.pinEndsAt).toLocaleString('ru-RU')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/?listing=${currentPinnedListing.id}`, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Открыть на сайте
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        pinnedListingMutation.mutate({ id: currentPinnedListing.id, isPinned: false })
                      }
                      disabled={pinnedListingMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Снять закрепление
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600/90">
                      Закреплённое объявление отсутствует
                    </p>
                    <p className="text-sm text-amber-700/90">
                      Выберите объявление в таблице ниже и закрепите его, чтобы выделить в веб-приложении.
                    </p>
                  </div>
                </div>
              )}
            </div>
            {listingsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : allListings && allListings.length > 0 ? (
              <div className="bg-card rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4">Объявление</th>
                      <th className="text-left p-4">Пользователь</th>
                      <th className="text-left p-4">Статус</th>
                      <th className="text-left p-4">Цена</th>
                      <th className="text-left p-4">Дата</th>
                      <th className="text-left p-4">Закрепление</th>
                      <th className="text-right p-4">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allListings.map((listing: any) => (
                      <tr
                        key={listing.id}
                        className={`border-t hover:bg-muted/50 ${listing.isPinned ? 'bg-amber-50/60' : ''}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {listing.photos?.[0] && (
                              <img
                                src={`/api/photos/${listing.photos[0].s3Key}`}
                                alt={listing.title}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div>
                              <div className="font-medium">{listing.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {listing.category.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            {listing.user.firstName}
                            <div className="text-muted-foreground">
                              {listing.user.phone || listing.user.username}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              listing.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : listing.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : listing.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {listing.status === 'pending' && (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {listing.status === 'pending'
                              ? 'На модерации'
                              : listing.status === 'approved'
                              ? 'Одобрено'
                              : listing.status === 'rejected'
                              ? 'Отклонено'
                              : 'Архив'}
                          </span>
                        </td>
                        <td className="p-4">
                          {listing.price ? (
                            <span className="font-medium">{listing.price} ₽</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(listing.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="p-4">
                          {listing.isPinned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              <Flame className="w-3 h-3" />
                              Закреплено
                            </span>
                          ) : listing.status !== 'approved' ? (
                            <span className="text-xs text-muted-foreground">
                              Доступно после одобрения
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setPinDialogListingId(listing.id);
                                setPinDialogOpen(true);
                              }}
                              disabled={pinnedListingMutation.isPending || currentPinnedListing?.id === listing.id}
                            >
                              <Pin className="w-4 h-4 mr-1" />
                              Закрепить
                            </Button>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                window.open(`/?listing=${listing.id}`, '_blank')
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {listing.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setConfirmDialog({
                                      title: 'Одобрить объявление?',
                                      description: `Объявление "${listing.title}" будет опубликовано.`,
                                      confirmText: 'Одобрить',
                                      variant: 'success',
                                      onConfirm: () => {
                                        moderateListingMutation.mutate({
                                          id: listing.id,
                                          status: 'approved',
                                        });
                                      },
                                    });
                                  }}
                                  disabled={moderateListingMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setConfirmDialog({
                                      title: 'Отклонить объявление?',
                                      description: `Объявление "${listing.title}" не будет опубликовано.`,
                                      confirmText: 'Отклонить',
                                      variant: 'danger',
                                      onConfirm: () => {
                                        moderateListingMutation.mutate({
                                          id: listing.id,
                                          status: 'rejected',
                                        });
                                      },
                                    });
                                  }}
                                  disabled={moderateListingMutation.isPending}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Удалить объявление?',
                                  description: `Объявление "${listing.title}" будет удалено без возможности восстановления.`,
                                  confirmText: 'Удалить',
                                  variant: 'danger',
                                  onConfirm: () => {
                                    deleteListingMutation.mutate(listing.id);
                                  },
                                });
                              }}
                              disabled={deleteListingMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border">
                <p className="text-muted-foreground">Объявления не найдены</p>
              </div>
            )}
          </div>
        )}

        {/* Users Tab (Admin Only) */}
        {activeTab === 'users' && isAdmin && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Пользователи ({users?.length || 0})
            </h2>
            {usersLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users && users.length > 0 ? (
              <div className="bg-card rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4">Пользователь</th>
                      <th className="text-left p-4">Контакт</th>
                      <th className="text-left p-4">Роль</th>
                      <th className="text-center p-4">Объявления</th>
                      <th className="text-center p-4">Комментарии</th>
                      <th className="text-left p-4">Статус</th>
                      <th className="text-right p-4">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user: any) => (
                      <tr key={user.id} className="border-t hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {user.id.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {user.phone || user.username || 'Не указан'}
                        </td>
                        <td className="p-4">
                          <select
                            value={user.role}
                            onChange={(e) => {
                              const newRole = e.target.value;
                              const roleNames: Record<string, string> = {
                                user: 'Пользователь',
                                moderator: 'Модератор',
                                admin: 'Администратор',
                              };
                              setConfirmDialog({
                                title: 'Изменить роль пользователя?',
                                description: `Роль пользователя "${user.firstName} ${user.lastName || ''}" будет изменена на "${roleNames[newRole]}".`,
                                confirmText: 'Изменить',
                                variant: 'warning',
                                onConfirm: () => {
                                  changeRoleMutation.mutate({
                                    id: user.id,
                                    role: newRole,
                                  });
                                },
                              });
                              // Reset select to current value
                              e.target.value = user.role;
                            }}
                            className="px-3 py-1 rounded border text-sm"
                            disabled={changeRoleMutation.isPending}
                          >
                            <option value="user">Пользователь</option>
                            <option value="moderator">Модератор</option>
                            <option value="admin">Админ</option>
                          </select>
                        </td>
                        <td className="p-4 text-center">{user.listingsCount}</td>
                        <td className="p-4 text-center">{user.commentsCount}</td>
                        <td className="p-4">
                          {user.isBanned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              <Ban className="w-3 h-3" />
                              Заблокирован
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Активен
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant={user.isBanned ? 'default' : 'outline'}
                              onClick={() => {
                                const action = user.isBanned
                                  ? 'Разблокировать'
                                  : 'Заблокировать';
                                const actionLower = user.isBanned
                                  ? 'разблокирован'
                                  : 'заблокирован';
                                setConfirmDialog({
                                  title: `${action} пользователя?`,
                                  description: `Пользователь "${user.firstName} ${user.lastName || ''}" будет ${actionLower}.`,
                                  confirmText: action,
                                  variant: user.isBanned ? 'success' : 'warning',
                                  onConfirm: () => {
                                    banUserMutation.mutate({
                                      id: user.id,
                                      isBanned: !user.isBanned,
                                    });
                                  },
                                });
                              }}
                              disabled={banUserMutation.isPending}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'Удалить пользователя?',
                                  description: `Пользователь "${user.firstName} ${user.lastName || ''}" и все его объявления будут удалены без возможности восстановления.`,
                                  confirmText: 'Удалить',
                                  variant: 'danger',
                                  onConfirm: () => {
                                    deleteUserMutation.mutate(user.id);
                                  },
                                });
                              }}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border">
                <p className="text-muted-foreground">Пользователи не найдены</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => {
          confirmDialog?.onConfirm();
        }}
        title={confirmDialog?.title || ''}
        description={confirmDialog?.description}
        confirmText={confirmDialog?.confirmText}
        variant={confirmDialog?.variant}
      />

      {/* Pin Listing Dialog */}
      {pinDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Закрепить объявление</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Укажите время начала и окончания закрепления (опционально). Если оставить пустым,
              объявление будет закреплено без ограничения по времени.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Начало закрепления
                </label>
                <input
                  type="datetime-local"
                  value={pinStartsAt}
                  onChange={(e) => setPinStartsAt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Оставьте пустым для немедленного закрепления"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Окончание закрепления
                </label>
                <input
                  type="datetime-local"
                  value={pinEndsAt}
                  onChange={(e) => setPinEndsAt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Оставьте пустым для бессрочного закрепления"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPinDialogOpen(false);
                  setPinStartsAt('');
                  setPinEndsAt('');
                }}
              >
                Отмена
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (pinDialogListingId) {
                    pinnedListingMutation.mutate({
                      id: pinDialogListingId,
                      isPinned: true,
                      pinStartsAt: pinStartsAt || undefined,
                      pinEndsAt: pinEndsAt || undefined,
                    });
                  }
                }}
                disabled={pinnedListingMutation.isPending}
              >
                {pinnedListingMutation.isPending ? 'Закрепление...' : 'Закрепить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
