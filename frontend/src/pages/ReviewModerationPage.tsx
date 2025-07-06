import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import reviewService from '../services/reviews';
import Pagination from '../components/Pagination';

interface Review {
  id: number;
  content: string;
  rating: number;
  app_name: string;
  author: string;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'conflicted' | 'escalated';
  required_approvals: number;
  approval_summary: {
    total_supervisors: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  my_decision?: 'approved' | 'rejected' | 'pending';
  supervisor_decisions?: {
    supervisor_name: string;
    decision: 'approved' | 'rejected';
    comments: string;
    created_at: string;
  }[];
}

const ReviewModerationPage: React.FC = () => {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'conflicted'>('pending');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [decisionComments, setDecisionComments] = useState('');
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
    fetchReviewsForModeration(1);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReviewsForModeration = async (page: number = currentPage) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        toast.error('Authentication token missing. Please login again.');
        return;
      }
      
      const response = await api.get(`/api/reviews/moderation/?filter=${filter}&page=${page}&page_size=${pageSize}`);

      // Handle paginated response
      if (response.data.reviews) {
        setReviews(response.data.reviews);
        setTotalCount(response.data.count || 0);
        setTotalPages(response.data.total_pages || 1);
        setCurrentPage(response.data.current_page || page);
      } else {
        // Fallback for non-paginated response
        setReviews(response.data.reviews || []);
        setTotalCount(response.data.count || 0);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (error: any) {
      console.error('Failed to fetch reviews:', error);
      
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.');
      } else {
        toast.error('Failed to load reviews for moderation');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const makeDecision = async (reviewId: number, decision: 'approved' | 'rejected', comments: string = '') => {
    setActionLoading(reviewId);
    try {
      const response = await api.post(`/api/reviews/${reviewId}/supervisor-decision/`, {
        decision,
        comments,
      });

      toast.success(response.data.message);
      fetchReviewsForModeration(currentPage);
      setShowDecisionModal(false);
      setDecisionComments('');
    } catch (error: any) {
      console.error('Failed to submit decision:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit decision';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchReviewsForModeration(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    fetchReviewsForModeration(1);
  };

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleAdminOverride = async (reviewId: number, status: 'approved' | 'rejected' | 'pending', rejectionReason?: string) => {
    setActionLoading(reviewId);

    try {
      await reviewService.adminOverrideReview(reviewId, status, rejectionReason);

      toast.success(`Review overridden to ${status} successfully`);

      // Refresh the reviews list to reflect changes
      fetchReviewsForModeration();
    } catch (error: any) {
      console.error('Failed to override review:', error);
      toast.error(error.response?.data?.detail || error.response?.data?.error || 'Failed to override review');
    } finally {
      setActionLoading(null);
    }
  };

  const openDecisionModal = (review: Review, decision: 'approved' | 'rejected') => {
    setSelectedReview(review);
    setDecisionType(decision);
    setShowDecisionModal(true);
    setDecisionComments('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'conflicted':
        return 'bg-orange-100 text-orange-800';
      case 'escalated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  // Only allow supervisors and superusers to access this page
  if (!user?.is_supervisor && !user?.is_superuser) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-600 text-lg font-medium">Access Denied</p>
          <p className="text-red-500 mt-2">Only supervisors can access review moderation.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Review Moderation</h1>
        <p className="opacity-90">Review and approve/reject user submissions</p>
        
        {/* Filter Tabs */}
        <div className="flex space-x-4 mt-4">
          {[
            { key: 'pending', label: 'Pending', count: reviews.filter((r: Review) => r.approval_status === 'pending').length },
            { key: 'conflicted', label: 'Conflicted', count: reviews.filter((r: Review) => r.approval_status === 'conflicted').length },
            { key: 'approved', label: 'Approved', count: reviews.filter((r: Review) => r.approval_status === 'approved').length },
            { key: 'rejected', label: 'Rejected', count: reviews.filter((r: Review) => r.approval_status === 'rejected').length },
            { key: 'all', label: 'All', count: reviews.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key as typeof filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-blue-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {tab.label} {tab.count > 0 && <span className="ml-1">({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500">
              {filter === 'pending' ? 'No reviews are pending your approval.' : `No ${filter} reviews found.`}
            </p>
          </div>
        ) : (
          reviews.map((review: Review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{review.app_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.approval_status)}`}>
                      {review.approval_status.charAt(0).toUpperCase() + review.approval_status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <span>By: {review.author}</span>
                    <span>•</span>
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <span>Rating:</span>
                      {getRatingStars(review.rating)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-800 leading-relaxed">{review.content}</p>
              </div>

              {/* Approval Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Approval Status</h4>
                  <div className="text-sm text-gray-600">
                    {review.approval_summary.approved + review.approval_summary.rejected} / {review.approval_summary.total_supervisors} supervisors voted
                  </div>
                </div>

                {/* Progress Bar for Majority */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress to Majority ({review.required_approvals} needed)</span>
                    <span>{Math.max(review.approval_summary.approved, review.approval_summary.rejected)} / {review.required_approvals}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${review.approval_summary.approved >= review.approval_summary.rejected
                        ? 'bg-green-500'
                        : 'bg-red-500'
                        }`}
                      style={{
                        width: `${Math.min(100, (Math.max(review.approval_summary.approved, review.approval_summary.rejected) / review.required_approvals) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{review.approval_summary.approved}</div>
                    <div className="text-gray-600">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{review.approval_summary.rejected}</div>
                    <div className="text-gray-600">Rejected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{review.approval_summary.pending}</div>
                    <div className="text-gray-600">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{review.required_approvals}</div>
                    <div className="text-gray-600">Required</div>
                  </div>
                </div>
              </div>

              {/* Detailed Supervisor Decisions */}
              {review.supervisor_decisions && review.supervisor_decisions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Supervisor Decisions</h4>
                  <div className="space-y-3">
                    {review.supervisor_decisions.map((decision, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${decision.decision === 'approved' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">{decision.supervisor_name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${decision.decision === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}>
                              {decision.decision.charAt(0).toUpperCase() + decision.decision.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(decision.created_at).toLocaleDateString()} at {new Date(decision.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          {decision.comments && (
                            <p className="text-sm text-gray-700 mt-1">{decision.comments}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {review.approval_status === 'pending' && (review.my_decision === 'pending' || !review.my_decision) ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openDecisionModal(review, 'approved')}
                    disabled={actionLoading === review.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => openDecisionModal(review, 'rejected')}
                    disabled={actionLoading === review.id}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>Reject</span>
                  </button>
                </div>
              ) : review.approval_status !== 'pending' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <p className="text-sm text-gray-600 text-center">
                    This review has already been {review.approval_status}. No further action needed.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-700 text-center font-medium">
                    You have already voted on this review: {review.my_decision}
                  </p>
                </div>
              )}

              {/* Admin Override Section */}
              {user?.is_superuser && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <p className="text-sm text-blue-700 font-medium mb-2">Admin Override</p>
                    <p className="text-xs text-blue-600 mb-3">
                      As an admin, you can override any review status, bypassing the supervisor workflow.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleAdminOverride(review.id, 'approved')}
                        disabled={actionLoading === review.id}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Override → Approved
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Please provide a rejection reason:');
                          if (reason !== null) {
                            handleAdminOverride(review.id, 'rejected', reason);
                          }
                        }}
                        disabled={actionLoading === review.id}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Override → Rejected
                      </button>
                      <button
                        onClick={() => handleAdminOverride(review.id, 'pending')}
                        disabled={actionLoading === review.id}
                        className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Override → Pending
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Decision Modal */}
      {showDecisionModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {decisionType === 'approved' ? 'Approve' : 'Reject'} Review
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Review content:</p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-800">{selectedReview?.content}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (optional)
                </label>
                <textarea
                  value={decisionComments}
                  onChange={(e) => setDecisionComments(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any comments about your decision..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => selectedReview && makeDecision(selectedReview.id, decisionType, decisionComments)}
                  disabled={!selectedReview || actionLoading === selectedReview.id}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    decisionType === 'approved'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                  } text-white`}
                >
                  {selectedReview && actionLoading === selectedReview.id ? 'Submitting...' : `Confirm ${decisionType === 'approved' ? 'Approval' : 'Rejection'}`}
                </button>
                <button
                  onClick={() => setShowDecisionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewModerationPage;
