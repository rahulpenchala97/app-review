import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import reviewService, { Review } from '../services/reviews';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const MyReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'conflict'>('all');
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching my reviews...');
        const reviewsData = await reviewService.getMyReviews();
        console.log('Reviews data received:', reviewsData);
        console.log('Number of reviews:', reviewsData.length);
        setReviews(reviewsData);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
        toast.error('Failed to load your reviews');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true;
    return review.status === filter;
  });

  const getStatusCount = (status: string) => {
    return reviews.filter(review => review.status === status).length;
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
  };

  const handleUpdateReview = async (data: {
    title: string;
    content: string;
    rating: number;
    tags: string[];
  }) => {
    if (!editingReview) return;

    try {
      const updatedReview = await reviewService.updateReview(editingReview.id, {
        app: editingReview.app,
        title: data.title,
        content: data.content,
        rating: data.rating,
        tags: data.tags
      });

      // Update the review in the local state
      setReviews(reviews.map(r => r.id === updatedReview.id ? updatedReview : r));
      setEditingReview(null);

      toast.success('Review updated successfully! It will be re-reviewed by supervisors.');
    } catch (error) {
      console.error('Failed to update review:', error);
      toast.error('Failed to update review');
    }
  };

  const handleCancelEdit = () => {
    setEditingReview(null);
  };

  const handleAdminOverride = async (reviewId: number, status: 'approved' | 'rejected' | 'pending', rejectionReason?: string) => {
    try {
      const updatedReview = await reviewService.adminOverrideReview(reviewId, status, rejectionReason);
      
      // Update the review in the local state
      setReviews(reviews.map(r => r.id === updatedReview.id ? updatedReview : r));
      
      toast.success(`Review overridden to ${status} successfully`);
    } catch (error: any) {
      console.error('Failed to override review:', error);
      toast.error(error.response?.data?.detail || 'Failed to override review');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit Modal */}
      {editingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <ReviewForm
              onSubmit={handleUpdateReview}
              onCancel={handleCancelEdit}
              initialData={{
                title: editingReview.title || '',
                content: editingReview.content,
                rating: editingReview.rating,
                tags: editingReview.tags || []
              }}
              isEditing={true}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Reviews</h1>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{reviews.length}</div>
            <div className="text-sm text-gray-600">Total Reviews</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{getStatusCount('approved')}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{getStatusCount('pending')}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{getStatusCount('rejected')}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{getStatusCount('conflict')}</div>
            <div className="text-sm text-gray-600">Conflicts</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All ({reviews.length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Approved ({getStatusCount('approved')})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending ({getStatusCount('pending')})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Rejected ({getStatusCount('rejected')})
          </button>
          <button
            onClick={() => setFilter('conflict')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'conflict'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Conflicts ({getStatusCount('conflict')})
          </button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              {filter === 'all' 
                ? "You haven't written any reviews yet."
                : `No ${filter} reviews found.`
              }
            </p>
            <Link
              to="/search"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Find apps to review →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <div className="mb-3">
                  <Link
                    to={`/apps/${review.app}`}
                    className="text-lg font-semibold text-primary-600 hover:text-primary-700"
                  >
                    {review.app_name}
                  </Link>
                </div>

                {/* Multi-Supervisor Approval Status for Pending Reviews */}
                {review.status === 'pending' && review.approval_summary && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-yellow-800">Moderation Progress</h4>
                      <span className="text-sm text-yellow-700">
                        {review.approval_summary.approved + review.approval_summary.rejected} / {review.approval_summary.total_supervisors} supervisors voted
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-yellow-700 mb-1">
                        <span>Progress to Decision ({review.required_approvals} votes needed)</span>
                        <span>{Math.max(review.approval_summary.approved, review.approval_summary.rejected)} / {review.required_approvals}</span>
                      </div>
                      <div className="w-full bg-yellow-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${review.approval_summary.approved >= review.approval_summary.rejected
                            ? 'bg-green-500'
                            : 'bg-red-500'
                            }`}
                          style={{
                            width: `${Math.min(100, (Math.max(review.approval_summary.approved, review.approval_summary.rejected) / (review.required_approvals || 1)) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Vote Counts */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{review.approval_summary.approved}</div>
                        <div className="text-yellow-700">Approved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{review.approval_summary.rejected}</div>
                        <div className="text-yellow-700">Rejected</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">{review.approval_summary.pending}</div>
                        <div className="text-yellow-700">Pending</div>
                      </div>
                    </div>
                  </div>
                )}

                <ReviewCard
                  review={review}
                  showEditAction={true}
                  showAdminOverride={user?.is_superuser || false}
                  onEdit={handleEditReview}
                  onAdminOverride={handleAdminOverride}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflict Reviews Alert */}
      {getStatusCount('conflict') > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-purple-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-purple-800">
                {getStatusCount('conflict')} Review{getStatusCount('conflict') > 1 ? 's' : ''} in Conflict
              </h3>
              <p className="text-purple-700">
                {getStatusCount('conflict') > 1 ? 'These reviews have' : 'This review has'} received equal numbers of approvals and rejections from supervisors. 
                An administrator will review {getStatusCount('conflict') > 1 ? 'them' : 'it'} manually to make a final decision.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Review Management
        </h3>
        <div className="text-blue-700 space-y-2">
          <p>• <strong>Pending reviews:</strong> Being evaluated by multiple supervisors</p>
          <p>• <strong>Approved reviews:</strong> Published and visible to other users</p>
          <p>• <strong>Rejected reviews:</strong> Not published due to policy violations</p>
          <p>• <strong>Conflict reviews:</strong> Equal supervisor votes - awaiting admin resolution</p>
          <p>• <strong>Editing reviews:</strong> You can edit any of your reviews. Editing approved or rejected reviews will reset them to pending status and require re-approval.</p>
        </div>
      </div>

      {getStatusCount('pending') > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Multi-Supervisor Review Process
          </h3>
          <p className="text-yellow-700 mb-2">
            Your reviews are evaluated by multiple supervisors to ensure fair and consistent moderation.
            Each review needs approval from a majority of supervisors before being published.
          </p>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• Multiple supervisors will independently review your submission</li>
            <li>• Reviews are approved when they reach majority consensus</li>
            <li>• You can track the progress of votes above</li>
            <li>• This process typically takes 24-48 hours</li>
          </ul>
        </div>
      )}

      {/* Review Form for Editing */}
      {editingReview && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Review for {editingReview.app_name}</h2>
          <ReviewForm
            initialData={{
              title: editingReview.title || '',
              content: editingReview.content,
              rating: editingReview.rating,
              tags: editingReview.tags || []
            }}
            onSubmit={handleUpdateReview}
            onCancel={handleCancelEdit}
            isEditing={true}
          />
        </div>
      )}
    </div>
  );
};

export default MyReviewsPage;
