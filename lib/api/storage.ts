// lib/auth.ts

import { User } from "@/types/user";

const TOKEN_KEY = 'jwt_token';
const USER_KEY = 'user';
/**
 * Retrieves the JWT token from localStorage.
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * Stores the JWT token in localStorage.
 * @param token The JWT string to store.
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Removes the JWT token from localStorage.
 */
export function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Checks if a token is present (basic check for authentication status).
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * set user
 */
export function setUser(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * get User
 */
export function getUser(): User | null{
  if (typeof window !== 'undefined') {
    const _user = localStorage.getItem(USER_KEY);
    return !_user ? null : JSON.parse(_user) as User;
  }

  return null;
}

/**
 * Removes the User from localStorage.
 */
export function removeUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_KEY);
  }
}