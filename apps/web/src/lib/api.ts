import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token from localStorage
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const api = {
  // Auth
  async verifyTelegram(initData: string) {
    const { data } = await apiClient.post('/auth/telegram/verify', { initData });
    if (data.accessToken) {
      localStorage.setItem('token', data.accessToken);
    }
    return data;
  },

  async register(phone: string, password: string, firstName: string, lastName?: string) {
    const { data } = await apiClient.post('/auth/register', { phone, password, firstName, lastName });
    if (data.accessToken) {
      localStorage.setItem('token', data.accessToken);
    }
    return data;
  },

  async login(phone: string, password: string) {
    const { data } = await apiClient.post('/auth/login', { phone, password });
    if (data.accessToken) {
      localStorage.setItem('token', data.accessToken);
    }
    return data;
  },

  async logout() {
    localStorage.removeItem('token');
  },

  async getMe() {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  // Listings
  async getListings(params: {
    search?: string;
    category?: string;
    categories?: string[];
    tags?: string[];
    cursor?: string;
  }) {
    const { data } = await apiClient.get('/listings', {
      params: {
        ...params,
        categories: params.categories?.join(','),
        tags: params.tags?.join(','),
      },
    });
    return data;
  },

  async getListing(id: string) {
    const { data } = await apiClient.get(`/listings/${id}`);
    return data;
  },

  async getPinnedListing() {
    const { data } = await apiClient.get('/listings/pinned');
    return data;
  },

  async addComment(listingId: string, text: string, parentId?: string) {
    const { data } = await apiClient.post(`/listings/${listingId}/comments`, {
      text,
      parentId,
    });
    return data;
  },

  async createListing(listing: any) {
    const { data } = await apiClient.post('/listings', listing);
    return data;
  },

  async getFilters() {
    const { data } = await apiClient.get('/listings/filters');
    return data;
  },

  async getPresignedUrl(filename: string, contentType: string) {
    const { data } = await apiClient.post('/listings/upload/presigned', {
      filename,
      contentType,
    });
    return data;
  },

  async getMyListings() {
    const { data } = await apiClient.get('/listings/my');
    return data;
  },

  async updateListing(id: string, listing: any) {
    const { data } = await apiClient.put(`/listings/${id}`, listing);
    return data;
  },

  async deleteListing(id: string) {
    const { data } = await apiClient.delete(`/listings/${id}`);
    return data;
  },

  // Search
  async search(params: { q: string; type?: string; limit?: number }) {
    const { data } = await apiClient.get('/search', { params });
    return data;
  },

  // Admin
  async getAllUsers() {
    const { data } = await apiClient.get('/admin/users');
    return data;
  },

  async updateUser(id: string, updates: { isBanned?: boolean; role?: string }) {
    const { data } = await apiClient.patch(`/admin/users/${id}`, updates);
    return data;
  },

  async deleteUser(id: string) {
    const { data } = await apiClient.delete(`/admin/users/${id}`);
    return data;
  },

  async getAllListingsAdmin() {
    const { data } = await apiClient.get('/admin/listings/all');
    return data;
  },

  async getPendingListings() {
    const { data } = await apiClient.get('/admin/listings');
    return data;
  },

  async moderateListing(id: string, status: 'approved' | 'rejected', reason?: string) {
    const { data } = await apiClient.patch(`/admin/listings/${id}`, { status, reason });
    return data;
  },

  async deleteListingAdmin(id: string) {
    const { data } = await apiClient.delete(`/admin/listings/${id}`);
    return data;
  },

  async setPinnedListing(id: string, isPinned: boolean) {
    const { data } = await apiClient.patch(`/admin/listings/${id}/pin`, { isPinned });
    return data;
  },
};
