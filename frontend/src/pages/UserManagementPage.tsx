import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SupervisorManagement from '../components/SupervisorManagement';
import ReviewModerationPage from './ReviewModerationPage';
import ConflictResolutionPage from './ConflictResolutionPage';

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'supervisors' | 'moderation' | 'conflicts'>('supervisors');

  // Access control - check permissions based on tab
  const canAccessTab = (tab: string) => {
    switch (tab) {
      case 'supervisors':
        return currentUser?.is_superuser;
      case 'moderation':
        return currentUser?.is_supervisor || currentUser?.is_superuser;
      case 'conflicts':
        return currentUser?.is_superuser;
      default:
        return false;
    }
  };

  if (!currentUser?.is_supervisor && !currentUser?.is_superuser) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-600 text-lg font-medium">Access Denied</p>
          <p className="text-red-500 mt-2">Only supervisors and superusers can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { 
                key: 'supervisors', 
                label: 'Supervisor Management', 
                icon: '👥',
                description: 'Manage supervisor roles',
                requiredRole: 'superuser'
              },
              { 
                key: 'moderation', 
                label: 'Review Moderation', 
                icon: '✅',
                description: 'Approve/reject reviews',
                requiredRole: 'supervisor'
              },
              { 
                key: 'conflicts', 
                label: 'Conflict Resolution', 
                icon: '⚖️',
                description: 'Resolve supervisor conflicts',
                requiredRole: 'superuser'
              },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              const hasAccess = canAccessTab(tab.key);
              
              if (!hasAccess) return null;
              
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{tab.icon}</span>
                    <div className="text-left">
                      <div>{tab.label}</div>
                      <div className="text-xs opacity-75">{tab.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'supervisors' && canAccessTab('supervisors') && (
          <SupervisorManagement />
        )}
        {activeTab === 'moderation' && canAccessTab('moderation') && (
          <ReviewModerationPage />
        )}
        {activeTab === 'conflicts' && canAccessTab('conflicts') && (
          <ConflictResolutionPage />
        )}
      </div>
    </div>
  );
};

export default UserManagementPage;
