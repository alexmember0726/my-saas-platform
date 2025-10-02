// components/layout/Header.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Briefcase, LogOut, Menu } from 'lucide-react'; // Using lucide-react for modern icons

interface HeaderProps {
    toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    const { user, logout } = useAuth();
    
    // --- Placeholder for Contextual Data ---
    // In a final application, this data would come from a Context/Hook (e.g., useActiveOrganization)
    const appTitle = "My Saas Platform";

    return (
        <header className="flex justify-between items-center h-16 bg-white border-b border-gray-200 px-6 sticky top-0 z-10">
            
            {/* Left Side: App Title and Main Navigation Link */}
            <div className="flex items-center space-x-4">
                
                {/* Sidebar Toggle (Kept for layout compatibility) */}
                <button
                    onClick={toggleSidebar}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-lg transition-colors"
                    aria-label="Toggle sidebar"
                >
                    <Menu className="w-6 h-6" />
                </button>
                
                {/* App Title / Home Link */}
                <Link href="/organizations" className="flex items-center text-xl font-bold text-indigo-600 space-x-2">
                    <Briefcase className="w-6 h-6" />
                    <span className="hidden sm:inline">{appTitle}</span>
                </Link>
            </div>

            {/* Right side: User info and logout */}
            <div className="flex items-center space-x-4">
                
                {/* User Info */}
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                    Hello, {user?.name || 'User'}
                </span>
                
                {/* Logout Button */}
                <button
                    onClick={logout}
                    className="flex items-center px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                    aria-label="Sign Out"
                >
                    <LogOut className="w-4 h-4 mr-1" />
                    Sign Out
                </button>
            </div>
        </header>
    );
};