// components/layout/AuthGuard.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

// Define paths that do NOT require authentication
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/docs'];

export const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (isLoading) {
      // Wait for the auth check to complete
      return;
    }

    if (!isAuthenticated && !isPublicPath) {
      // Not authenticated and trying to access a protected page
      router.replace('/auth/login');
    } else if (isAuthenticated && pathname === '/') {
      router.replace('/organizations');
    }
  }, [isAuthenticated, isLoading, pathname, router]);


  if (isLoading) {
    // Show a loading spinner while checking auth status
    return <div className="flex justify-center items-center h-screen text-center">
      <div>
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>;
  }

  // If we are on a protected page but not authenticated, the useEffect hook will handle the redirect.
  // If we are on a public page, or authenticated, show the content.
  return <>{children}</>;
};