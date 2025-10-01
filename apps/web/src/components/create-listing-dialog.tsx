'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createListingSchema, type CreateListingInput } from '@kavbot/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';

type UploadedPhoto = {
  id: string;
  fileName: string;
  previewUrl: string;
  status: 'uploading' | 'uploaded' | 'error';
  s3Key?: string;
  width?: number;
  height?: number;
};

interface CreateListingDialogProps {
  onOpenChange: (open: boolean) => void;
}

const defaultContacts: CreateListingInput['contacts'] = {
  phone: '',
  email: '',
  address: '',
  telegram: '',
  whatsapp: '',
};

const getDefaultValues = (): CreateListingInput => ({
  title: '',
  description: '',
  categoryId: '',
  tags: [],
  price: undefined,
  photos: [],
  contacts: { ...defaultContacts },
});



const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2, 10));

const readImageDimensions = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(url);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });

export function CreateListingDialog({ onOpenChange }: CreateListingDialogProps) {
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const { data: filters } = useQuery({
    queryKey: ['filters'],
    queryFn: api.getFilters,
    staleTime: 1000 * 60 * 5,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: getDefaultValues(),
  });

  const selectedTags = watch('tags') ?? [];
  const selectedCategoryId = watch('categoryId');

  const categories = filters?.categories ?? [];
  const popularTags = filters?.tags ?? [];

  const isJobCategory = useMemo(() => {
    const category = categories.find((c: any) => c.id === selectedCategoryId);
    return category?.name === 'Работа';
  }, [selectedCategoryId, categories]);

  const priceLabel = isJobCategory ? 'Зарплата' : 'Цена';
  const pricePlaceholder = isJobCategory ? 'Например, 50000' : 'Например, 19990';

  const uploadedPhotos = useMemo(
    () =>
      photos
        .filter((photo) => photo.status === 'uploaded' && photo.s3Key && photo.width && photo.height)
        .map((photo) => ({
          s3Key: photo.s3Key!,
          width: photo.width!,
          height: photo.height!,
        })),
    [photos],
  );

  const resetForm = () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPhotos([]);
    setTagInput('');
    reset(getDefaultValues());
    setSubmitError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };


  const createMutation = useMutation({
    mutationFn: api.createListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setSubmitError(null);
      handleClose();
    },
  });

  const isUploadingPhotos = photos.some((photo) => photo.status === 'uploading');

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;

    const remainingSlots = 10 - photos.length;
    const files = Array.from(fileList).slice(0, Math.max(0, remainingSlots));

    for (const file of files) {
      const id = makeId();
      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [
        ...prev,
        {
          id,
          fileName: file.name,
          previewUrl,
          status: 'uploading',
        },
      ]);

      try {
        const [{ uploadUrl, s3Key }, { width, height }] = await Promise.all([
          api.getPresignedUrl(file.name, file.type || 'application/octet-stream'),
          readImageDimensions(file),
        ]);

        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        });

        setPhotos((prev) =>
          prev.map((photo) =>
            photo.id === id
              ? {
                  ...photo,
                  status: 'uploaded',
                  s3Key,
                  width,
                  height,
                }
              : photo,
          ),
        );
      } catch (error) {
        console.error('Failed to upload image', error);
        setPhotos((prev) =>
          prev.map((photo) =>
            photo.id === id
              ? {
                  ...photo,
                  status: 'error',
                }
              : photo,
          ),
        );
      }
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((item) => item.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleTagAdd = (tag: string) => {
    const normalized = tag.trim();
    if (!normalized) return;

    const exists = selectedTags.some((existing) => existing.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setTagInput('');
      return;
    }

    setValue('tags', [...selectedTags, normalized], { shouldValidate: true });
    setTagInput('');
  };

  const handleTagRemove = (tag: string) => {
    setValue(
      'tags',
      selectedTags.filter((existing) => existing !== tag),
      { shouldValidate: true },
    );
  };

  const onSubmit = async (values: CreateListingInput) => {
    if (isUploadingPhotos) {
      setSubmitError('Дождитесь завершения загрузки фотографий.');
      return;
    }

    const payload: CreateListingInput = {
      ...values,
      tags: values.tags.map((tag) => tag.trim()),
      price:
        typeof values.price === 'number' && !Number.isNaN(values.price) ? values.price : undefined,
      photos: uploadedPhotos,
    };

    try {
      setSubmitError(null);
      await createMutation.mutateAsync(payload);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setSubmitError('Авторизуйтесь, чтобы публиковать объявления.');
          return;
        }

        setSubmitError(error.response?.data?.message ?? 'Не удалось создать объявление. Попробуйте ещё раз.');
        return;
      }

      setSubmitError('Не удалось создать объявление. Попробуйте ещё раз.');
    }
  };

  const footerDisabled = createMutation.isPending || isUploadingPhotos;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => handleClose()}
      />

      <motion.div
        layoutId="create-listing"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative z-10 w-full max-w-4xl px-4"
      >
        <div className="relative">
          <div className="absolute -inset-1 rounded-[32px] bg-[conic-gradient(at_top,_#38bdf8,_#818cf8,_#f472b6,_#38bdf8)] opacity-60 blur-2xl animate-[spin_18s_linear_infinite]" />
          <div className="relative rounded-[28px] bg-gradient-to-br from-sky-200 via-indigo-200 to-rose-200 p-[1px] shadow-[0_0_60px_rgba(99,102,241,0.35)]">
          <div className="rounded-[26px] bg-white text-slate-700">
            <div className="flex items-start justify-between border-b border-slate-200 px-8 py-6">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Создать объявление</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Добавьте фотографии, заполните описание и контакты, чтобы пользователи быстро связались с вами.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleClose()}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="max-h-[70vh] overflow-y-auto px-8 py-6 hide-scrollbar">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Заголовок</label>
                    <Input
                      {...register('title')}
                      placeholder="Например, продам iPhone 14"
                      className="bg-slate-50 text-base text-slate-700 placeholder:text-slate-500"
                    />
                    {errors.title && (
                      <p className="text-sm text-rose-400">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Категория</label>
                    <select
                      {...register('categoryId')}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-700 outline-none transition focus:border-indigo-400"
                    >
                      <option value="" disabled>
                        Выберите категорию
                      </option>
                      {categories.map((category: any) => (
                        <option key={category.id} value={category.id} className="bg-white text-slate-700">
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && (
                      <p className="text-sm text-rose-400">{errors.categoryId.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Описание</label>
                  <textarea
                    {...register('description')}
                    placeholder="Расскажите о состоянии товара, комплектации и других важных деталях"
                    className="min-h-[140px] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 placeholder:text-slate-500 outline-none transition focus:border-indigo-400"
                  />
                  {errors.description && (
                    <p className="text-sm text-rose-400">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Фотографии</label>
                  <p className="text-xs text-slate-500">Можно загрузить до 10 изображений PNG, JPG или WebP.</p>

                  <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-indigo-400/70">
                    <UploadCloud className="h-8 w-8 text-indigo-400" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700">Перетащите файлы или выберите с устройства</p>
                      <p className="text-xs text-slate-500">Файлы до 10 МБ каждый</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => handleFiles(event.target.files)}
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className={cn(
                          'group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-indigo-400/70',
                          photo.status === 'error' && 'border-rose-500/60 bg-rose-500/10',
                        )}
                      >
                        <img
                          src={photo.previewUrl}
                          alt={photo.fileName}
                          className="aspect-video w-full rounded-xl object-cover"
                        />
                        <div className="absolute right-3 top-3 flex items-center gap-2">
                          {photo.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />}
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 rounded-full bg-white/80 text-slate-600 shadow-md opacity-0 transition group-hover:opacity-100"
                            onClick={() => removePhoto(photo.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {photo.status === 'error' && (
                          <p className="mt-3 text-xs text-rose-300">Не удалось загрузить. Попробуйте снова.</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.photos && (
                    <p className="text-sm text-rose-400">{errors.photos.message as string}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Теги</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-600"
                      >
                        #{tag}
                        <button
                          type="button"
                          className="text-indigo-500/70 transition hover:text-indigo-600"
                          onClick={() => handleTagRemove(tag)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleTagAdd(tagInput);
                        }
                      }}
                      placeholder="Введите тег и нажмите Enter"
                      className="bg-slate-50 text-slate-700 placeholder:text-slate-500"
                    />
                    <Button type="button" variant="secondary" onClick={() => handleTagAdd(tagInput)}>
                      Добавить тег
                    </Button>
                  </div>
                  {popularTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {popularTags.map((tag: any) => {
                        const name = tag.name as string;
                        const active = selectedTags.some((current) => current.toLowerCase() === name.toLowerCase());
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            className={cn(
                              'rounded-full px-3 py-1 text-sm transition',
                              active
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600',
                            )}
                            onClick={() => handleTagAdd(name)}
                          >
                            #{name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {errors.tags && <p className="text-sm text-rose-400">{errors.tags.message}</p>}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">{priceLabel}</label>
                    <Input
                      {...register('price', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={pricePlaceholder}
                      className="bg-slate-50 text-slate-700 placeholder:text-slate-500"
                    />
                    {errors.price && (
                      <p className="text-sm text-rose-400">{errors.price.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Адрес</label>
                    <Input
                      {...register('contacts.address')}
                      placeholder="Город, улица, дом"
                      className="bg-slate-50 text-slate-700 placeholder:text-slate-500"
                    />
                    {errors.contacts?.address && (
                      <p className="text-sm text-rose-400">{errors.contacts.address.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Телефон</label>
                    <Input
                      {...register('contacts.phone')}
                      placeholder="Например, +7 999 123-45-67"
                      className="bg-slate-50 text-slate-700 placeholder:text-slate-500"
                    />
                    {errors.contacts?.phone && (
                      <p className="text-sm text-rose-400">{errors.contacts.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Электронная почта</label>
                    <Input
                      {...register('contacts.email')}
                      type="email"
                      placeholder="Ваш email"
                      className="bg-slate-50 text-slate-700 placeholder:text-slate-500"
                    />
                    {errors.contacts?.email && (
                      <p className="text-sm text-rose-400">{errors.contacts.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Telegram</label>
                    <Input
                      {...register('contacts.telegram')}
                      placeholder="Ссылка на профиль"
                      className="bg-slate-50 text-slate-700 placeholder:text-slate-500"
                    />
                    {errors.contacts?.telegram && (
                      <p className="text-sm text-rose-400">{errors.contacts.telegram.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">WhatsApp</label>
                    <Input
                      {...register('contacts.whatsapp')}
                      placeholder="Ссылка на профиль"
                      className="bg-slate-50 text-slate-700 placeholder:text-slate-500"
                    />
                    {errors.contacts?.whatsapp && (
                      <p className="text-sm text-rose-400">{errors.contacts.whatsapp.message}</p>
                    )}
                  </div>
                </div>

                {(errors.contacts as any)?.message && (
                  <p className="text-sm text-rose-400">{(errors.contacts as any).message}</p>
                )}

                {submitError && (
                  <p className="text-sm text-rose-500 text-right">{submitError}</p>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => handleClose()}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={footerDisabled} className="gap-2 text-base">
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      'Создать объявление'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      </motion.div>
    </motion.div>
  );
}



