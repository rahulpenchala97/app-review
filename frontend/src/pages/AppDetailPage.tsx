import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import appService, { App } from '../services/apps';
import reviewService, { Review } from '../services/reviews';
import ReviewForm from '../components/ReviewForm'
import ReviewCard from '../components/ReviewCard';
import toast from 'react-hot-toast';

const AppDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [app, setApp] = useState<App | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const [appData, reviewsData] = await Promise.all([
          appService.getApp(parseInt(id)),
          reviewService.getAppReviews(parseInt(id)),
        ]);
        
        setApp(appData);
        setReviews(reviewsData);
      } catch (error) {
        console.error('Failed to fetch app data:', error);
        toast.error('Failed to load app details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleReviewSubmit = async (reviewData: any) => {
    if (!app) return;
    
    try {
      const newReview = await reviewService.createReview({
        ...reviewData,
        app: app.id,
      });
      
      toast.success('Review submitted successfully! It will be reviewed by our moderators.');
      setShowReviewForm(false);
      
      // Refresh reviews if the new review is already approved
      if (newReview.status === 'approved') {
        const updatedReviews = await reviewService.getAppReviews(app.id);
        setReviews(updatedReviews);
      }
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">App Not Found</h1>
        <p className="text-gray-600 mb-6">The app you're looking for doesn't exist.</p>
        <Link to="/search" className="text-primary-600 hover:text-primary-700 font-medium">
          Browse all apps
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* App Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start space-x-6">
          
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{app.name}</h1>
            <p className="text-lg text-gray-600 mb-3">{app.developer}</p>
            
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center">
                <span className="text-yellow-400 text-xl">★</span>
                <span className="text-lg font-semibold text-gray-900 ml-1">
                  {app.average_rating != null ? app.average_rating.toFixed(1) : '0.0'}
                </span>
                <span className="text-gray-500 ml-1">
                  ({app.total_ratings} reviews)
                </span>
              </div>
              
              <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                {app.category}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Version:</span> {app.version}
              </div>
              <div>
                <span className="font-medium">Size:</span> {app.size_mb} MB
              </div>
              <div>
                <span className="font-medium">Updated:</span>{' '}
                {new Date(app.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
          {app.description}
        </p>
      </div>

      {/* Tags */}
      {app.tags && app.tags.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {app.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Reviews ({reviews.length})
          </h2>
          
          {isAuthenticated && (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {showReviewForm ? 'Cancel' : 'Write Review'}
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div className="mb-8">
            <ReviewForm
              onSubmit={handleReviewSubmit}
              onCancel={() => setShowReviewForm(false)}
            />
          </div>
        )}

        {/* Review List */}
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No reviews yet. Be the first to review this app!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <ReviewCard 
                key={review.id} 
                review={review} 
                showStatusBadge={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppDetailPage;
