import { z } from 'zod';

// Auth schemas
export const telegramInitDataSchema = z.object({
  query_id: z.string().optional(),
  user: z
    .string()
    .transform((str) => JSON.parse(str))
    .pipe(
      z.object({
        id: z.number(),
        first_name: z.string(),
        last_name: z.string().optional(),
        username: z.string().optional(),
        language_code: z.string().optional(),
      }),
    ),
  auth_date: z.string().transform((str) => parseInt(str, 10)),
  hash: z.string(),
});

export const authVerifySchema = z.object({
  initData: z.string(),
});

// Listing schemas
export const createListingSchema = z.object({
  title: z
    .string({ required_error: 'Укажите название объявления' })
    .min(3, { message: 'Название должно содержать минимум 3 символа' })
    .max(200, { message: 'Название не может быть длиннее 200 символов' }),
  description: z
    .string({ required_error: 'Укажите описание объявления' })
    .min(10, { message: 'Описание должно содержать минимум 10 символов' })
    .max(5000, { message: 'Описание не может быть длиннее 5000 символов' }),
  categoryId: z
    .string({ required_error: 'Выберите категорию' })
    .uuid({ message: 'Некорректный идентификатор категории' }),
  tags: z
    .array(
      z
        .string({ required_error: 'Тег не может быть пустым' })
        .min(1, { message: 'Тег не может быть пустым' })
        .max(50, { message: 'Тег не может быть длиннее 50 символов' }),
    )
    .min(1, { message: 'Добавьте хотя бы один тег' })
    .max(10, { message: 'Можно добавить не более 10 тегов' }),
  price: z
    .number({ invalid_type_error: 'Цена должна быть числом' })
    .min(0, { message: 'Цена не может быть отрицательной' })
    .max(99999999.99, { message: 'Цена не может превышать 99 999 999.99 ₽' })
    .optional(),
  photos: z
    .array(
      z.object({
        s3Key: z.string({ required_error: 'Не удалось определить файл фотографии' }),
        width: z
          .number({ invalid_type_error: 'Ширина изображения должна быть числом' })
          .int({ message: 'Ширина изображения должна быть целым числом' })
          .positive({ message: 'Ширина изображения должна быть положительной' }),
        height: z
          .number({ invalid_type_error: 'Высота изображения должна быть числом' })
          .int({ message: 'Высота изображения должна быть целым числом' })
          .positive({ message: 'Высота изображения должна быть положительной' }),
      }),
    )
    .max(10, { message: 'Можно загрузить не более 10 фотографий' }),
  contacts: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    telegram: z.string().optional(),
    whatsapp: z.string().optional(),
  }),
});

export const updateListingSchema = createListingSchema.partial();

export const listingQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cursor: z.string().optional(),
  limit: z
    .number({ invalid_type_error: 'Лимит должен быть числом' })
    .int({ message: 'Лимит должен быть целым числом' })
    .min(1, { message: 'Лимит не может быть меньше 1' })
    .max(100, { message: 'Лимит не может превышать 100' })
    .default(20),
});

// Comment schema
export const createCommentSchema = z.object({
  text: z
    .string({ required_error: 'Комментарий не может быть пустым' })
    .min(1, { message: 'Комментарий не может быть пустым' })
    .max(1000, { message: 'Комментарий не может быть длиннее 1000 символов' }),
  parentId: z
    .string({ invalid_type_error: 'Некорректный идентификатор родительского комментария' })
    .uuid({ message: 'Некорректный идентификатор родительского комментария' })
    .optional(),
});

// Search schema
export const searchQuerySchema = z.object({
  q: z
    .string({ required_error: 'Поисковый запрос не может быть пустым' })
    .min(1, { message: 'Поисковый запрос не может быть пустым' }),
  type: z
    .enum(['news', 'event', 'outage', 'training', 'ads', 'all'], {
      errorMap: () => ({ message: 'Недопустимый тип поиска' }),
    })
    .optional(),
  since: z
    .string({ invalid_type_error: 'Дата начала указана неверно' })
    .datetime({ message: 'Дата начала указана неверно' })
    .optional(),
  until: z
    .string({ invalid_type_error: 'Дата окончания указана неверно' })
    .datetime({ message: 'Дата окончания указана неверно' })
    .optional(),
  geo: z.string().optional(),
  limit: z
    .number({ invalid_type_error: 'Лимит должен быть числом' })
    .int({ message: 'Лимит должен быть целым числом' })
    .min(1, { message: 'Лимит не может быть меньше 1' })
    .max(100, { message: 'Лимит не может превышать 100' })
    .default(20),
  offset: z
    .number({ invalid_type_error: 'Смещение должно быть числом' })
    .int({ message: 'Смещение должно быть целым числом' })
    .min(0, { message: 'Смещение не может быть отрицательным' })
    .default(0),
});

// Admin schemas
export const moderateListingSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Недопустимый статус модерации' }),
  }),
  reason: z.string().optional(),
});

export const broadcastSchema = z.object({
  message: z
    .string({ required_error: 'Текст сообщения не может быть пустым' })
    .min(1, { message: 'Текст сообщения не может быть пустым' })
    .max(4096, { message: 'Текст сообщения не может превышать 4096 символов' }),
  targetRole: z
    .enum(['user', 'moderator', 'admin'], {
      errorMap: () => ({ message: 'Недопустимая роль получателя' }),
    })
    .optional(),
  targetUsers: z.array(z.string()).optional(),
});

// Category & Tag schemas
export const createCategorySchema = z.object({
  slug: z
    .string({ required_error: 'Укажите слаг категории' })
    .regex(/^[a-z0-9-]+$/u, {
      message: 'Слаг может содержать только строчные латинские буквы, цифры и дефис',
    }),
  name: z
    .string({ required_error: 'Укажите название категории' })
    .min(2, { message: 'Название категории должно содержать минимум 2 символа' })
    .max(50, { message: 'Название категории не может быть длиннее 50 символов' }),
});

export const createTagSchema = z.object({
  slug: z
    .string({ required_error: 'Укажите слаг тега' })
    .regex(/^[a-z0-9-]+$/u, {
      message: 'Слаг тега может содержать только строчные латинские буквы, цифры и дефис',
    }),
  name: z
    .string({ required_error: 'Укажите название тега' })
    .min(2, { message: 'Название тега должно содержать минимум 2 символа' })
    .max(30, { message: 'Название тега не может быть длиннее 30 символов' }),
});

export type TelegramInitData = z.infer<typeof telegramInitDataSchema>;
export type AuthVerifyInput = z.infer<typeof authVerifySchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type ModerateListingInput = z.infer<typeof moderateListingSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
