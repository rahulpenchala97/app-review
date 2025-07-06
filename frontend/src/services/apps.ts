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
  average_rating: number | null;
  total_ratings: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  approved_reviews_count?: number;
  approved_reviews?: any[];
  // Full-text search specific fields
  rank?: number;
  max_similarity?: number;
}

export interface AppSuggestion {
  id: number;
  name: string;
  developer: string;
  category: string;
  average_rating: number | null;
  total_ratings: number;
  created_at: string;
}

export interface SearchResponse {
  results: App[];
  count: number;
  total_count: number;
  current_page: number;
  total_pages: number;
  page_size: number;
  next?: string;
  previous?: string;
  query: string;
  category?: string;
  search_type: 'fulltext' | 'fuzzy' | 'category_filter' | 'fallback' | 'no_query' | 'basic';
  search_engine?: string;
  parameters?: {
    min_rank: number;
    min_similarity: number;
    fuzzy_enabled: boolean;
  };
}

class AppService {
  async getApps(category?: string): Promise<App[]> {
    const params: any = {};
    if (category) {
      params.category = category;
    }
    const response = await api.get('/api/apps/', { params });
    return response.data.results || [];
  }

  async getApp(id: number): Promise<App> {
    const response = await api.get(`/api/apps/${id}/`);
    return response.data;
  }

  async searchApps(query: string, category?: string, page?: number, pageSize?: number): Promise<App[]> {
    const params: any = {};
    
    if (query.trim()) {
      params.q = query.trim();
    }
    
    if (category) {
      params.category = category;
    }
    
    if (page) {
      params.page = page;
    }

    if (pageSize) {
      params.page_size = pageSize;
    }

    // If no query and no category, return empty results
    if (!params.q && !params.category) {
      return [];
    }
    
    const response = await api.get('/api/apps/search/', { params });
    return response.data.results || [];
  }

  async searchAppsAdvanced(
    query: string,
    options?: {
      category?: string;
      minRank?: number;
      minSimilarity?: number;
      fuzzy?: boolean;
      page?: number;
      pageSize?: number;
    }
  ): Promise<SearchResponse> {
    const params: any = {};

    if (query.trim()) {
      params.q = query.trim();
    }

    if (options?.category) {
      params.category = options.category;
    }

    if (options?.minRank !== undefined) {
      params.min_rank = options.minRank;
    }

    if (options?.minSimilarity !== undefined) {
      params.min_similarity = options.minSimilarity;
    }

    if (options?.fuzzy !== undefined) {
      params.fuzzy = options.fuzzy.toString();
    }

    if (options?.page) {
      params.page = options.page;
    }

    if (options?.pageSize) {
      params.page_size = options.pageSize;
    }

    const response = await api.get('/api/apps/search/advanced/', { params });

    // Calculate pagination info if not provided by backend
    const data = response.data;
    if (!data.total_pages && data.count) {
      const pageSize = options?.pageSize || 20;
      const totalPages = Math.ceil(data.count / pageSize);
      const currentPage = options?.page || 1;

      return {
        ...data,
        total_count: data.count,
        current_page: currentPage,
        total_pages: totalPages,
        page_size: pageSize
      };
    }

    return data;
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
