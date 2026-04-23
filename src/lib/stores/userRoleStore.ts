import { writable } from 'svelte/store';

// User role store for ELD Progress Report
// Supports admin, teacher, guardian roles
export const userRoleStore = writable<string>('admin');

// Helper function to update user role from various sources
export function updateUserRole(role: string | undefined) {
  if (role) {
    userRoleStore.set(role);
  }
}

// Helper to get user role from URL params (fallback)
export function getUserRoleFromUrl(): string {
  if (typeof window === 'undefined') return 'admin';
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('portal') || urlParams.get('user-role') || 'admin';
}