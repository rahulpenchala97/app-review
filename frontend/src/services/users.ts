import api from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_supervisor: boolean;
  is_superuser?: boolean;
}

const userService = {
  // Get all users (paginated)
  async getUsers(params?: Record<string, any>) {
    const response = await api.get('/api/users/list/', { params });
    return response.data;
  },

  // Get all supervisors (paginated)
  async getSupervisors(params?: Record<string, any>) {
    const response = await api.get('/api/users/supervisors/', { params });
    return response.data;
  },

  // Promote a user to supervisor
  async promoteToSupervisor(user_id: number) {
    const response = await api.post('/api/users/promote-supervisor/', { user_id });
    return response.data;
  },

  // Bulk promote users to supervisor
  async bulkPromoteSupervisors(user_ids: number[]) {
    const response = await api.post('/api/users/bulk-promote-supervisors/', { user_ids });
    return response.data;
  },

  // Revoke supervisor role
  async revokeSupervisor(user_id: number) {
    const response = await api.post(`/api/users/${user_id}/revoke-supervisor/`);
    return response.data;
  },

  // Get current user's profile
  async getProfile() {
    const response = await api.get('/api/users/profile/');
    return response.data;
  },

  // Update current user's profile
  async updateProfile(data: Partial<User>) {
    const response = await api.put('/api/users/profile/update/', data);
    return response.data;
  },

  // Change password
  async changePassword(old_password: string, new_password: string, confirm_password: string) {
    const response = await api.post('/api/users/change-password/', {
      old_password,
      new_password,
      confirm_password,
    });
    return response.data;
  },

  // Get user stats (if available)
  async getUserStats() {
    const response = await api.get('/api/users/profile/refresh-stats/');
    return response.data;
  },
};

export default userService;
