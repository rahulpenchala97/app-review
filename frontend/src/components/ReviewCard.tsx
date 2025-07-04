import React from 'react';
import { Review } from '../services/reviews';

interface ReviewCardProps {
  review: Review;
  showModerationActions?: boolean;
  showStatusBadge?: boolean;
  onModerate?: (reviewId: number, status: 'approved' | 'rejected', notes?: string) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ 
  review, 
  showModerationActions = false,
  showStatusBadge = true,
  onModerate 
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
            Rejected
          </span>
        );
      case 'pending':
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={index < rating ? 'text-yellow-400' : 'text-gray-300'}
      >
        ★
      </span>
    ));
  };

  const handleModerationAction = (status: 'approved' | 'rejected') => {
    if (onModerate) {
      onModerate(review.id, status);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-4">
          <div>
            <h4 className="font-semibold text-gray-900">{review.title || 'No title'}</h4>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex">{renderStars(review.rating)}</div>
              <span className="text-sm text-gray-500">
                by {review.user?.first_name && review.user?.last_name 
                  ? `${review.user.first_name} ${review.user.last_name}`
                  : review.username || review.user?.username || 'Anonymous'}
              </span>
              <span className="text-sm text-gray-400">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {showStatusBadge && review.status && getStatusBadge(review.status)}
        </div>
      </div>

      <p className="text-gray-700 mb-4 leading-relaxed">
        {review.content}
      </p>

      {review.tags && review.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {review.tags.map((tag, index) => (
            <span
              key={index}
              className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {review.reviewed_by && review.reviewed_at && (
        <div className="text-sm text-gray-500 border-t pt-3">
          <p>
            Moderated by {review.reviewed_by.first_name && review.reviewed_by.last_name
              ? `${review.reviewed_by.first_name} ${review.reviewed_by.last_name}`
              : review.reviewed_by.username || 'Unknown'} on{' '}
            {new Date(review.reviewed_at).toLocaleDateString()}
          </p>
          {review.rejection_reason && (
            <p className="mt-1 italic">"{review.rejection_reason}"</p>
          )}
        </div>
      )}

      {/* Show rejection reason for rejected reviews even without moderation info */}
      {review.status === 'rejected' && review.rejection_reason && !review.reviewed_by && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Review Rejected</h4>
              <p className="text-sm text-red-700 mt-1">
                <span className="font-medium">Reason:</span> {review.rejection_reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {showModerationActions && (
        <div className="flex space-x-3 mt-4 pt-4 border-t">
          <button
            onClick={() => handleModerationAction('approved')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => handleModerationAction('rejected')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
