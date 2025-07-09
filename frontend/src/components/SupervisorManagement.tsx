import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import userService, { User } from '../services/users';



const SupervisorManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    fetchUsers();
    fetchSupervisors();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchSupervisors = async () => {
    try {
      const data = await userService.getSupervisors();
      setSupervisors(data.supervisors || []);
    } catch (error) {
      console.error('Failed to fetch supervisors:', error);
      toast.error('Failed to load supervisors');
    } finally {
      setIsLoading(false);
    }
  };

  const promoteToSupervisor = async (userId: number) => {
    setActionLoading(userId);
    try {
      await userService.promoteToSupervisor(userId);
      toast.success('User promoted to supervisor successfully');
      fetchUsers();
      fetchSupervisors();
    } catch (error: any) {
      console.error('Failed to promote user:', error);
      toast.error(error?.response?.data?.error || 'Failed to promote user');
    } finally {
      setActionLoading(null);
    }
  };

  const bulkPromoteToSupervisor = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to promote');
      return;
    }

    setBulkActionLoading(true);
    try {
      const data = await userService.bulkPromoteSupervisors(selectedUsers);
      toast.success(data.message);
      setSelectedUsers([]);
      fetchUsers();
      fetchSupervisors();
    } catch (error: any) {
      console.error('Failed to promote users:', error);
      toast.error(error?.response?.data?.error || 'Failed to promote users');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const revokeSupervisor = async (userId: number) => {
    setActionLoading(userId);
    try {
      await userService.revokeSupervisor(userId);
      toast.success('Supervisor role revoked successfully');
      fetchUsers();
      fetchSupervisors();
    } catch (error: any) {
      console.error('Failed to revoke supervisor:', error);
      toast.error(error?.response?.data?.error || 'Failed to revoke supervisor role');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllNonSupervisors = () => {
    const nonSupervisorIds = filteredUsers
      .filter(user => !user.is_supervisor)
      .map(user => user.id);
    setSelectedUsers(nonSupervisorIds);
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Only allow superusers to access this component
  if (!currentUser?.is_superuser) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 font-medium">Access Denied</p>
        <p className="text-red-500 text-sm">Only superusers can manage supervisors.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-md p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Supervisor Management</h2>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{supervisors.length}</div>
            <div className="text-sm opacity-90">Active Supervisors</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{users.length - supervisors.length}</div>
            <div className="text-sm opacity-90">Regular Users</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-2xl font-bold">{selectedUsers.length}</div>
            <div className="text-sm opacity-90">Selected for Promotion</div>
          </div>
        </div>
      </div>

      {/* Current Supervisors */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="bg-purple-100 text-purple-600 p-2 rounded-lg mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
          </span>
          Current Supervisors ({supervisors.length})
        </h3>
        
        {supervisors.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-500">No supervisors assigned yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supervisors.map((supervisor) => (
              <div key={supervisor.id} className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-medium">
                    {supervisor.first_name[0]}{supervisor.last_name[0]}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {supervisor.first_name} {supervisor.last_name}
                    </div>
                    <div className="text-sm text-gray-600">@{supervisor.username}</div>
                    <div className="text-sm text-gray-500">{supervisor.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => revokeSupervisor(supervisor.id)}
                  disabled={actionLoading === supervisor.id}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  {actionLoading === supervisor.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Revoking...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span>Revoke</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Promotion Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Promote Users to Supervisors</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllNonSupervisors}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearSelection}
              className="text-gray-600 hover:text-gray-700 text-sm font-medium"
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search users..."
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-medium">
                {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={bulkPromoteToSupervisor}
                disabled={bulkActionLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
              >
                {bulkActionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Promoting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    <span>Promote Selected</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <div key={user.id} className={`flex items-center justify-between p-4 rounded-lg border ${
              user.is_supervisor 
                ? 'bg-gray-50 border-gray-200' 
                : selectedUsers.includes(user.id)
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}>
              <div className="flex items-center space-x-3">
                {!user.is_supervisor && (
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                )}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  user.is_supervisor ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {user.first_name[0]}{user.last_name[0]}
                </div>
                <div>
                  <div className="font-medium text-gray-900 flex items-center">
                    {user.first_name} {user.last_name}
                    {user.is_supervisor && (
                      <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                        Supervisor
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">@{user.username}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
              <div>
                {!user.is_supervisor ? (
                  <button
                    onClick={() => promoteToSupervisor(user.id)}
                    disabled={actionLoading === user.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {actionLoading === user.id ? 'Promoting...' : 'Make Supervisor'}
                  </button>
                ) : (
                  <button
                    onClick={() => revokeSupervisor(user.id)}
                    disabled={actionLoading === user.id}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {actionLoading === user.id ? 'Revoking...' : 'Revoke'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorManagement;
