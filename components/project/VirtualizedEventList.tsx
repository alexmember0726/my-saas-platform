// components/project/VirtualizedEventList.tsx
'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Event } from '@/types/event'; // Assumes you create this type

interface VirtualizedEventListProps {
    events: Event[];
    hasNextPage: boolean;
    loadNextPage: () => void;
    isFetchingNextPage: boolean;
    initialLoading: boolean;
}

// NOTE: For thousands of rows, you MUST replace this simple div with a
// proper virtualization library like react-virtual or react-window.
export const VirtualizedEventList: React.FC<VirtualizedEventListProps> = ({
    events,
    hasNextPage,
    loadNextPage,
    isFetchingNextPage,
    initialLoading,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- Infinite Scroll Logic ---
    const handleScroll = useCallback(() => {
        const target = scrollRef.current;
        if (!target) return;

        // Check if user is near the bottom of the scrollable container
        const isNearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100; // 100px buffer

        if (isNearBottom && hasNextPage && !isFetchingNextPage) {
            loadNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, loadNextPage]);

    useEffect(() => {
        const target = scrollRef.current;
        if (target) {
            target.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (target) {
                target.removeEventListener('scroll', handleScroll);
            }
        };
    }, [handleScroll]);
    // ----------------------------

    if (initialLoading) return <div className="p-8 text-center">Fetching initial events...</div>;
    if (events.length === 0) return <div className="p-8 text-center text-gray-500">No events tracked for this project.</div>;

    return (
        <div 
            ref={scrollRef} 
            className="h-[600px] overflow-y-scroll border-t border-gray-200" 
            // Important for scroll restoration
            tabIndex={0} 
        >
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metadata</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {/* In a real virtualized list, you would only render items within the current viewport */}
                    {events.map((event, index) => (
                        <tr key={event.id + index}>
                            <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500 truncate max-w-xs">{event.id}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-800">{event.name}</td>
                            <td className="px-6 py-3 text-xs text-gray-500">{JSON.stringify(event.metadata)}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500">{new Date(event.createdAt).toLocaleTimeString()}</td>
                        </tr>
                    ))}
                    
                    {/* Loading Indicator for Infinite Scroll */}
                    {isFetchingNextPage && (
                        <tr><td colSpan={4} className="text-center py-4 text-sm text-indigo-600">Loading more events...</td></tr>
                    )}
                    
                    {/* End of Content Marker */}
                    {!hasNextPage && events.length > 0 && (
                        <tr><td colSpan={4} className="text-center py-4 text-xs text-gray-400">--- End of Events ---</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};