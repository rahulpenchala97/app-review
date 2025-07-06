import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ConflictedReview {
  id: number;
  content: string;
  rating: number;
  app_name: string;
  author: string;
  created_at: string;
  status: 'conflicted' | 'escalated';
  summary: {
    total_supervisors: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  decisions: Array<{
    supervisor: string;
    decision: string;
    comments: string;
    timestamp: string;
  }>;
}

const ConflictResolutionPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [conflictedReviews, setConflictedReviews] = useState<ConflictedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<ConflictedReview | null>(null);
  const [finalDecision, setFinalDecision] = useState<'approved' | 'rejected'>('approved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolutionModal, setShowResolutionModal] = useState(false);

  useEffect(() => {
    fetchConflictedReviews();
  }, []);

  const fetchConflictedReviews = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reviews/conflicted/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const data = await response.json();
      setConflictedReviews(data.conflicted_reviews || []);
    } catch (error) {
      console.error('Failed to fetch conflicted reviews:', error);
      toast.error('Failed to load conflicted reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const resolveConflict = async (reviewId: number, decision: 'approved' | 'rejected', notes: string) => {
    setActionLoading(reviewId);
    try {
      const response = await fetch(`/api/reviews/${reviewId}/resolve-conflict/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          final_decision: decision,
          resolution_notes: notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchConflictedReviews();
        setShowResolutionModal(false);
        setResolutionNotes('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to resolve conflict');
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      toast.error('Failed to resolve conflict');
    } finally {
      setActionLoading(null);
    }
  };

  const openResolutionModal = (review: ConflictedReview) => {
    setSelectedReview(review);
    setShowResolutionModal(true);
    setResolutionNotes('');
    // Set initial decision based on majority
    const majority = review.summary.approved > review.summary.rejected ? 'approved' : 'rejected';
    setFinalDecision(majority);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  // Only allow superusers to access this page
  if (!currentUser?.is_superuser) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-600 text-lg font-medium">Access Denied</p>
          <p className="text-red-500 mt-2">Only superusers can resolve conflicts.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-md p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Conflict Resolution</h1>
        <p className="opacity-90">Resolve conflicts between supervisor decisions</p>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{conflictedReviews.filter(r => r.status === 'conflicted').length}</div>
            <div className="text-sm opacity-90">Conflicted Reviews</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{conflictedReviews.filter(r => r.status === 'escalated').length}</div>
            <div className="text-sm opacity-90">Escalated Reviews</div>
          </div>
        </div>
      </div>

      {/* Conflicted Reviews List */}
      <div className="space-y-6">
        {conflictedReviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conflicts to resolve</h3>
            <p className="text-gray-500">All supervisor decisions are in agreement.</p>
          </div>
        ) : (
          conflictedReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Review Header */}
              <div className="bg-gray-50 border-b border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{review.app_name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                  <button
                    onClick={() => openResolutionModal(review)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    Resolve Conflict
                  </button>
                </div>
              </div>

              {/* Review Content */}
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Review Content:</h4>
                  <p className="text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-4">{review.content}</p>
                </div>

                {/* Vote Summary */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Vote Summary:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{review.summary.approved}</div>
                      <div className="text-sm text-green-700">Approved</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{review.summary.rejected}</div>
                      <div className="text-sm text-red-700">Rejected</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{review.summary.pending}</div>
                      <div className="text-sm text-yellow-700">Pending</div>
                    </div>
                  </div>
                </div>

                {/* Individual Decisions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Supervisor Decisions:</h4>
                  <div className="space-y-3">
                    {review.decisions.map((decision, index) => (
                      <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className={`w-3 h-3 rounded-full mt-1.5 ${
                          decision.decision === 'approved' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">{decision.supervisor}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              decision.decision === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {decision.decision.charAt(0).toUpperCase() + decision.decision.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(decision.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {decision.comments && (
                            <p className="text-sm text-gray-600 italic">"{decision.comments}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolution Modal */}
      {showResolutionModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Resolve Conflict</h3>
              
              {/* Review Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{selectedReview.app_name}</h4>
                <p className="text-sm text-gray-700 mb-3">{selectedReview.content}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{selectedReview.summary.approved}</div>
                    <div className="text-gray-600">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{selectedReview.summary.rejected}</div>
                    <div className="text-gray-600">Rejected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">{selectedReview.summary.pending}</div>
                    <div className="text-gray-600">Pending</div>
                  </div>
                </div>
              </div>

              {/* Final Decision */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Final Decision</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="approved"
                      checked={finalDecision === 'approved'}
                      onChange={(e) => setFinalDecision(e.target.value as 'approved' | 'rejected')}
                      className="mr-2"
                    />
                    <span className="text-green-700 font-medium">Approve</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="rejected"
                      checked={finalDecision === 'rejected'}
                      onChange={(e) => setFinalDecision(e.target.value as 'approved' | 'rejected')}
                      className="mr-2"
                    />
                    <span className="text-red-700 font-medium">Reject</span>
                  </label>
                </div>
              </div>

              {/* Resolution Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes (Required)
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Explain why this decision was made and any additional context..."
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => resolveConflict(selectedReview.id, finalDecision, resolutionNotes)}
                  disabled={actionLoading === selectedReview.id || !resolutionNotes.trim()}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    finalDecision === 'approved'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                  } text-white`}
                >
                  {actionLoading === selectedReview.id 
                    ? 'Resolving...' 
                    : `${finalDecision === 'approved' ? 'Approve' : 'Reject'} Review`
                  }
                </button>
                <button
                  onClick={() => setShowResolutionModal(false)}
                  disabled={actionLoading === selectedReview.id}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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

export default ConflictResolutionPage;
