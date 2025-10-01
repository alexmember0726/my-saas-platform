// lib/api/client.ts

import { getAuthToken } from './storage'; // We'll create this helper later

const BASE_URL = '/api'; // Assuming your backend is proxied or on the same domain

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiOptions extends RequestInit {
  method?: ApiMethod;
  body?: any;
  params?: Record<string, string>;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Handle JSON body
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.body);
  }

  // Handle query parameters
  let url = `${BASE_URL}${endpoint}`;
  if (options.params) {
    const query = new URLSearchParams(options.params).toString();
    url = `${url}?${query}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle specific errors (e.g., 401 Unauthorized, 403 Forbidden)
    if (response.status === 401) {
      // Potentially clear token and redirect to login
      console.error('Unauthorized request. Token might be expired.');
    }
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorBody.message || 'An API error occurred.');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}