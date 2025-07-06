import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import reviewService, { ReviewStats } from '../services/reviews';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsData = await reviewService.getReviewStats();
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        toast.error('Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {(user.first_name || '').charAt(0)}{(user.last_name || '').charAt(0)}
            </span>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {user.first_name || ''} {user.last_name || ''}
            </h1>
            <p className="text-gray-600">@{user.username}</p>
            <p className="text-gray-500">{user.email}</p>
            
            <div className="flex items-center space-x-4 mt-3">
              <span className="text-sm text-gray-600">
                Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </span>
              
              {user.is_supervisor && (
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  Supervisor
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Review Statistics</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {stats.total_reviews}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Reviews</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.approved_reviews}
              </div>
              <div className="text-sm text-gray-600 mt-1">Approved</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {stats.pending_reviews}
              </div>
              <div className="text-sm text-gray-600 mt-1">Pending</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">
                {stats.average_rating != null ? stats.average_rating.toFixed(1) : '0.0'}★
              </div>
              <div className="text-sm text-gray-600 mt-1">Avg Rating</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center">Unable to load statistics</p>
        )}
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              {user.first_name}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              {user.last_name}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              {user.username}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              {user.email}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={refreshUser}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Refresh Profile
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Privacy & Data</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            • Your profile information is kept private and only visible to you
          </p>
          <p>
            • Your name may appear on reviews you submit to help other users
          </p>
          <p>
            • We use your email only for account-related communications
          </p>
          <p>
            • You can request data deletion by contacting our support team
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
