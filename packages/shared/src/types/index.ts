// User types
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  tgUserId: bigint;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isBanned: boolean;
  settings?: Record<string, any>;
  createdAt: Date;
}

// Source types
export enum SourceType {
  TELEGRAM = 'telegram',
  RSS = 'rss',
  SITE = 'site',
}

export interface Source {
  id: string;
  type: SourceType;
  handleOrUrl: string;
  title: string;
  isActive: boolean;
  lastFetchedAt?: Date;
  meta?: Record<string, any>;
}

// Document types
export enum DocumentType {
  NEWS = 'news',
  EVENT = 'event',
  OUTAGE = 'outage',
  POST = 'post',
  OTHER = 'other',
}

export interface Document {
  id: string;
  sourceId: string;
  docType: DocumentType;
  title: string;
  text: string;
  url?: string;
  publishedAt?: Date;
  location?: Record<string, any>;
  embedding?: number[];
}

// Event types
export enum EventType {
  EVENT = 'event',
  OUTAGE = 'outage',
  NOTICE = 'notice',
  TRAINING = 'training',
}

export interface Event {
  id: string;
  docId: string;
  eventType: EventType;
  startsAt?: Date;
  endsAt?: Date;
  place?: string;
  contacts?: Record<string, any>;
}

// Listing types
export enum ListingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  categoryId: string;
  price?: number;
  status: ListingStatus;
  publishedAt?: Date;
  updatedAt: Date;
  embedding?: number[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export interface ListingPhoto {
  id: string;
  listingId: string;
  s3Key: string;
  width: number;
  height: number;
  order: number;
}

export interface Comment {
  id: string;
  listingId: string;
  userId: string;
  parentId?: string;
  text: string;
  createdAt: Date;
}

// Search types
export interface SearchResult {
  id: string;
  type: 'document' | 'listing';
  title: string;
  snippet: string;
  url?: string;
  publishedAt?: Date;
  score: number;
  metadata?: Record<string, any>;
}

export interface SearchQuery {
  q: string;
  type?: DocumentType | 'ads' | 'all';
  since?: Date;
  until?: Date;
  geo?: string;
  limit?: number;
  offset?: number;
}

// Intent types
export enum IntentType {
  NEWS = 'news',
  OUTAGE = 'outage',
  EVENT = 'event',
  TRAINING = 'training',
  ADS = 'ads',
  GENERAL = 'general',
}

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  entities?: Record<string, any>;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    cursor?: string;
  };
}