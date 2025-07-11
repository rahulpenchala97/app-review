import api from './api';
import { User } from './auth';

export interface Review {
  id: number;
  app: number;
  app_name: string;
  user: User | null;
  username?: string;
  title: string | null;
  content: string;
  rating: number;
  tags?: string[];
  status?: 'pending' | 'approved' | 'rejected' | 'conflict'; // Optional since pending reviews don't include this
  created_at: string;
  updated_at?: string;
  reviewed_by?: User;
  reviewed_at?: string;
  rejection_reason?: string;
  approval_summary?: {
    total_supervisors: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  required_approvals?: number;
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
  average_rating: number | null;
}

export interface ModerateReviewData {
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

class ReviewService {
  async createReview(data: CreateReviewData): Promise<Review> {
    const response = await api.post('/api/reviews/create/', data);
    return response.data;
  }

  async getMyReviews(): Promise<Review[]> {
    const response = await api.get('/api/reviews/my-reviews/');
    // Handle both paginated and non-paginated responses
    return response.data.results || response.data.reviews || [];
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
    const response = await api.post(`/api/reviews/${reviewId}/moderate/`, data);
    return response.data;
  }

  async getReviewStats(): Promise<ReviewStats> {
    const response = await api.get('/api/reviews/stats/');
    return response.data;
  }

  async updateReview(reviewId: number, data: CreateReviewData): Promise<Review> {
    const response = await api.put(`/api/reviews/${reviewId}/`, data);
    return response.data;
  }

  async deleteReview(reviewId: number): Promise<void> {
    await api.delete(`/api/reviews/${reviewId}/`);
  }

  async getReviewSupervisorDecisions(reviewId: number): Promise<any> {
    const response = await api.get(`/api/reviews/${reviewId}/supervisor-decisions/`);
    return response.data;
  }

  async adminOverrideReview(reviewId: number, status: 'approved' | 'rejected' | 'pending', rejectionReason?: string): Promise<Review> {
    const response = await api.post(`/api/reviews/${reviewId}/admin-override/`, {
      status,
      rejection_reason: rejectionReason
    });
    // The response includes both message and the full review data
    return response.data;
  }
}

const reviewService = new ReviewService();
export default reviewService;
