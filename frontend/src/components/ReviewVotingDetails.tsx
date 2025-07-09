import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

interface SupervisorDecision {
  supervisor_id: number;
  supervisor_name: string;
  supervisor_email: string;
  decision: 'approved' | 'rejected';
  comments: string;
  created_at: string;
}

interface ReviewVotingDetailsProps {
  reviewId: number;
  isOpen: boolean;
  onClose: () => void;
}

const ReviewVotingDetails: React.FC<ReviewVotingDetailsProps> = ({ reviewId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<SupervisorDecision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approvalSummary, setApprovalSummary] = useState<any>(null);
  const [showDetailedDecisions, setShowDetailedDecisions] = useState(false);
  const [blindVotingMessage, setBlindVotingMessage] = useState<string | null>(null);

  const fetchVotingDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/reviews/${reviewId}/supervisor-decisions/`);
      setDecisions(response.data.decisions || []);
      setApprovalSummary(response.data.approval_summary);
      setShowDetailedDecisions(response.data.show_detailed_decisions);
      setBlindVotingMessage(response.data.blind_voting_message);
    } catch (error: any) {
      console.error('Failed to fetch voting details:', error);
      toast.error('Failed to load voting details');
    } finally {
      setIsLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    if (isOpen && reviewId) {
      fetchVotingDetails();
    }
  }, [isOpen, reviewId, fetchVotingDetails]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Voting Details - Review #{reviewId}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Admin Privilege Notice */}
              {user?.is_superuser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-blue-900">Admin View</span>
                  </div>
                  <p className="text-sm text-blue-800 mt-1">
                    You are viewing detailed voting information as an administrator. This information is hidden from supervisors during blind voting.
                  </p>
                </div>
              )}

              {/* Approval Summary */}
              {approvalSummary && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Voting Summary</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{approvalSummary.approved}</div>
                      <div className="text-sm text-gray-600">Approved</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{approvalSummary.rejected}</div>
                      <div className="text-sm text-gray-600">Rejected</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{approvalSummary.pending}</div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{approvalSummary.total_supervisors}</div>
                      <div className="text-sm text-gray-600">Total Supervisors</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Blind Voting Message */}
              {blindVotingMessage && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-yellow-900">Blind Voting Active</span>
                  </div>
                  <p className="text-sm text-yellow-800 mt-1">{blindVotingMessage}</p>
                </div>
              )}

              {/* Detailed Decisions */}
              {showDetailedDecisions && decisions.length > 0 ? (
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Individual Supervisor Decisions</h3>
                  <div className="space-y-3">
                    {decisions.map((decision) => (
                      <div key={decision.supervisor_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              decision.decision === 'approved' ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <div className="font-medium text-gray-900">{decision.supervisor_name}</div>
                              <div className="text-sm text-gray-600">{decision.supervisor_email}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              decision.decision === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {decision.decision.charAt(0).toUpperCase() + decision.decision.slice(1)}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(decision.created_at).toLocaleDateString()} at{' '}
                              {new Date(decision.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        {decision.comments && (
                          <div className="bg-gray-50 rounded-md p-3">
                            <p className="text-sm text-gray-700">{decision.comments}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : !showDetailedDecisions ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Voting Details Hidden</h3>
                  <p className="text-gray-600">
                    Individual supervisor decisions are hidden during the voting process to ensure unbiased decision-making.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Decisions Yet</h3>
                  <p className="text-gray-600">No supervisors have voted on this review yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewVotingDetails;
