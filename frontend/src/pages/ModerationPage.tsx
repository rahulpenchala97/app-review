import React, { useState, useEffect } from 'react';
import reviewService, { Review } from '../services/reviews';
import ReviewCard from '../components/ReviewCard';
import toast from 'react-hot-toast';

const ModerationPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [moderatingId, setModeratingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    setIsLoading(true);
    try {
      const reviewsData = await reviewService.getPendingReviews();
      setReviews(reviewsData);
    } catch (error) {
      console.error('Failed to fetch pending reviews:', error);
      toast.error('Failed to load pending reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModerate = async (reviewId: number, status: 'approved' | 'rejected', notes?: string) => {
    setModeratingId(reviewId);
    
    try {
      await reviewService.moderateReview(reviewId, {
        status,
        moderation_notes: notes,
      });
      
      toast.success(`Review ${status} successfully`);
      
      // Remove the moderated review from the list
      setReviews(reviews.filter(review => review.id !== reviewId));
    } catch (error: any) {
      console.error('Failed to moderate review:', error);
      toast.error(error.response?.data?.detail || 'Failed to moderate review');
    } finally {
      setModeratingId(null);
    }
  };

  const handleModerationWithNotes = (reviewId: number, status: 'approved' | 'rejected') => {
    const notes = status === 'rejected' 
      ? prompt('Please provide a reason for rejection (optional):')
      : undefined;
    
    handleModerate(reviewId, status, notes || undefined);
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Moderation</h1>
            <p className="text-gray-600">
              Review and moderate pending user reviews
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600">{reviews.length}</div>
            <div className="text-sm text-gray-600">Pending Reviews</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Moderation Guidelines
        </h3>
        <ul className="text-blue-700 space-y-1 text-sm">
          <li>• Approve reviews that provide helpful, constructive feedback</li>
          <li>• Reject reviews containing spam, inappropriate content, or false information</li>
          <li>• Consider the review's relevance to the app and usefulness to other users</li>
          <li>• Provide clear reasons when rejecting reviews to help users improve</li>
        </ul>
      </div>

      {/* Pending Reviews */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No pending reviews to moderate</p>
            <p className="text-gray-400 mt-2">All reviews have been processed!</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Pending Reviews ({reviews.length})
            </h2>
            
            {reviews.map((review) => (
              <div key={review.id} className="border border-gray-200 rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Review for: {review.app_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Submitted {new Date(review.created_at).toLocaleDateString()} at{' '}
                    {new Date(review.created_at).toLocaleTimeString()}
                  </p>
                </div>
                
                <ReviewCard
                  review={review}
                  showModerationActions={true}
                  onModerate={handleModerationWithNotes}
                />
                
                {moderatingId === review.id && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                      <span className="text-sm text-gray-600">Processing...</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {reviews.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to approve all pending reviews?')) {
                  reviews.forEach(review => handleModerate(review.id, 'approved'));
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Approve All
            </button>
            <button
              onClick={fetchPendingReviews}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Refresh List
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationPage;
