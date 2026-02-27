import { apiRequest } from './client';

export interface User {
  id: string;
  phoneNumber: string;
  email: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  identityCard: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getMe(): Promise<User> {
  return apiRequest<User>('/api/v1/users/me');
}

export function updateMe(body: { email?: string }): Promise<User> {
  return apiRequest<User>('/api/v1/users/me', { method: 'PATCH', body });
}

export function getMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/v1/user-profiles/me');
}

export function updateMyProfile(body: {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: string;
  identityCard?: string;
  address?: string;
}): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/v1/user-profiles/me', {
    method: 'PATCH',
    body,
  });
}
