import api from './api';

export interface App {
  id: number;
  name: string;
  description: string;
  developer: string;
  category: string;
  version: string;
  app_store_url?: string;
  google_play_url?: string;
  release_date?: string;
  size_mb: number;
  average_rating: number;
  total_ratings: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  approved_reviews_count?: number;
  approved_reviews?: any[];
}

export interface AppSuggestion {
  id: number;
  name: string;
  developer: string;
  category: string;
  average_rating: number;
  total_ratings: number;
  created_at: string;
}

class AppService {
  async getApps(): Promise<App[]> {
    const response = await api.get('/api/apps/');
    return response.data.results || [];
  }

  async getApp(id: number): Promise<App> {
    const response = await api.get(`/api/apps/${id}/`);
    return response.data;
  }

  async searchApps(query: string): Promise<App[]> {
    const response = await api.get('/api/apps/search/', {
      params: { q: query }
    });
    return response.data.results || [];
  }

  async getSearchSuggestions(query: string): Promise<AppSuggestion[]> {
    const response = await api.get('/api/apps/search/suggestions/', {
      params: { q: query }
    });
    return response.data.suggestions || [];
  }

  async getCategories(): Promise<string[]> {
    const response = await api.get('/api/apps/categories/');
    return response.data.categories || [];
  }
}

const appService = new AppService();
export default appService;
