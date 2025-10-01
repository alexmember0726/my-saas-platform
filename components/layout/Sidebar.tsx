// components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Briefcase, LayoutDashboard, Settings, Code, Menu } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    // New prop: organizationId if currently viewing an organization's context
    organizationId: string | null;
}

// Define the two sets of navigation items
const globalNav = [
    { href: '/organizations', label: 'Organizations', icon: Briefcase },
];

const contextualNav = (orgId: string) => [
    { href: '/organizations', label: 'Organizations', icon: Briefcase },
    { href: `/organizations/${orgId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/organizations/${orgId}/projects`, label: 'Projects', icon: Code }
];


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, organizationId }) => {
    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);

    // Determine which set of links to display
    const navItems = organizationId ? contextualNav(organizationId) : globalNav;
    const currentTitle = organizationId ? "Organization Overview" : "Organizations";


    useEffect(() => {
        // We use a media query to determine if the screen is considered "mobile" (below 'lg')
        const mediaQuery = window.matchMedia('(max-width: 1023px)');

        const handleResize = (e: MediaQueryListEvent | MediaQueryList) => {
            setIsMobile(e.matches);
        };

        handleResize(mediaQuery);
        mediaQuery.addEventListener('change', handleResize);
        return () => mediaQuery.removeEventListener('change', handleResize);
    }, []);

    const handleLinkClick = () => {
        if (isMobile) {
            onClose();
        }
    };

    return (
        <>
            {/* Overlay for Mobile View */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <div className={`
                flex flex-col w-64 bg-gray-900 text-white h-screen fixed top-0 left-0 z-40 pt-6 transition-transform duration-300
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            >
                <div className="px-6 pb-6 text-xl font-bold border-b border-gray-700">
                    {currentTitle}
                </div>
                <nav className="flex-1 px-2 py-4 space-y-2">
                    {navItems.map((item) => {
                        // Check if the current pathname starts with the item's href (for nested routes)
                        const isActive = pathname == item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={handleLinkClick}
                                className={`
                                    flex items-center px-4 py-2 rounded-lg transition-colors duration-200
                                    ${isActive
                                        ? 'bg-indigo-600 text-white font-semibold'
                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }
                                `}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="px-6 py-4 text-xs text-gray-500 border-t border-gray-700">
                    v1.0.0
                </div>
            </div>
        </>
    );
};