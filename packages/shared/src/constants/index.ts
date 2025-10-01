// Region defaults
export const DEFAULT_LOCATION = {
  city: 'Кавалерово',
  region: 'Приморский край',
  country: 'Россия',
  coords: {
    lat: 44.2667,
    lon: 135.0667,
  },
};

// Rate limiting
export const RATE_LIMITS = {
  BOT_MESSAGE_PER_USER: {
    window: 60 * 1000, // 1 minute
    max: 20,
  },
  API_REQUEST_PER_IP: {
    window: 60 * 1000,
    max: 100,
  },
  API_REQUEST_PER_USER: {
    window: 60 * 1000,
    max: 200,
  },
};

// Auth
export const JWT_EXPIRATION = 30 * 60; // 30 minutes in seconds
export const TELEGRAM_INIT_DATA_MAX_AGE = 120; // 120 seconds

// File uploads
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_PHOTOS_PER_LISTING = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Search & RAG
export const EMBEDDING_DIMENSION = 768;
export const SEARCH_TOP_K = 50;
export const RERANK_TOP_K = 5;
export const DEFAULT_SEARCH_LIMIT = 20;

// Cache TTL
export const CACHE_TTL = {
  SEARCH_RESULT: 60 * 60, // 1 hour
  USER_PROFILE: 5 * 60, // 5 minutes
  CATEGORIES: 24 * 60 * 60, // 24 hours
  TAGS: 60 * 60, // 1 hour
};

// Queue names
export const QUEUES = {
  EMBEDDINGS: 'embeddings',
  LLM_TASKS: 'llm-tasks',
  NOTIFICATIONS: 'notifications',
  IMAGE_PROCESSING: 'image-processing',
};

// Intent keywords (for simple intent routing)
export const INTENT_KEYWORDS = {
  news: ['новости', 'новость', 'что нового', 'последние новости'],
  outage: ['отключение', 'отключения', 'электричество', 'свет', 'вода', 'газ'],
  event: ['мероприятие', 'мероприятия', 'событие', 'события', 'куда сходить'],
  training: ['тренировка', 'секция', 'кружок', 'спорт', 'занятия'],
  ads: ['объявление', 'объявления', 'продам', 'куплю', 'услуги'],
};