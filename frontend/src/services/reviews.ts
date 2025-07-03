import api from './api';
import { User } from './auth';

export interface Review {
  id: number;
  app: number;
  app_name: string;
  user: User;
  title: string;
  content: string;
  rating: number;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  moderated_by?: User;
  moderated_at?: string;
  moderation_notes?: string;
}

export interface CreateReviewData {
  app: number;
  title: string;
  content: string;
  rating: number;
  tags: string[];
}

export interface ReviewStats {
  total_reviews: number;
  pending_reviews: number;
  approved_reviews: number;
  rejected_reviews: number;
  average_rating: number;
}

export interface ModerateReviewData {
  status: 'approved' | 'rejected';
  moderation_notes?: string;
}

class ReviewService {
  async createReview(data: CreateReviewData): Promise<Review> {
    const response = await api.post('/api/reviews/create/', data);
    return response.data;
  }

  async getMyReviews(): Promise<Review[]> {
    const response = await api.get('/api/reviews/my-reviews/');
    return response.data.reviews || [];
  }

  async getAppReviews(appId: number): Promise<Review[]> {
    // Get reviews from the app detail endpoint which includes approved reviews
    const response = await api.get(`/api/apps/${appId}/`);
    return response.data.approved_reviews || [];
  }

  async getPendingReviews(): Promise<Review[]> {
    const response = await api.get('/api/reviews/pending/');
    return response.data.pending_reviews || [];
  }

  async moderateReview(reviewId: number, data: ModerateReviewData): Promise<Review> {
    const response = await api.put(`/api/reviews/${reviewId}/moderate/`, data);
    return response.data;
  }

  async getReviewStats(): Promise<ReviewStats> {
    const response = await api.get('/api/reviews/stats/');
    return response.data;
  }

  async deleteReview(reviewId: number): Promise<void> {
    await api.delete(`/api/reviews/${reviewId}/`);
  }
}

const reviewService = new ReviewService();
export default reviewService;
