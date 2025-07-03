import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import reviewService, { Review } from '../services/reviews';
import ReviewCard from '../components/ReviewCard';
import toast from 'react-hot-toast';

const MyReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const reviewsData = await reviewService.getMyReviews();
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Reviews</h1>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      {getStatusCount('pending') > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Review Status Information
          </h3>
          <p className="text-yellow-700">
            Your pending reviews are being reviewed by our moderation team. This process typically 
            takes 24-48 hours. Approved reviews will be visible to other users on the app's detail page.
          </p>
        </div>
      )}
    </div>
  );
};

export default MyReviewsPage;
