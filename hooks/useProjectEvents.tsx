// hooks/useProjectEvents.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Event } from '@/types/event';
import { apiFetch } from '@/lib/api/client';

interface EventPage {
  items: Event[];
  nextCursor: string | null;
}

export const useProjectEvents = (projectId: string) => {
  const [events, setEvents] = useState<EventPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Fetch next page of events
  const fetchNextPage = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage) return;

    setIsFetchingNextPage(true);
    setError(null);

    try {
      const lastPage = events[events.length - 1];
      const cursor = lastPage?.nextCursor;

      const url =
        `/projects/${projectId}/events?limit=50` +
        (cursor ? `&cursor=${cursor}` : '');

      const data: { events: Event[]; nextCursor: string | null } =
        await apiFetch(url);

      const newPageData: EventPage = {
        items: data.events,
        nextCursor: data.nextCursor,
      };

      setEvents((prev) => [...prev, newPageData]);
      setHasNextPage(!!data.nextCursor);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load more events.'
      );
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [projectId, isFetchingNextPage, hasNextPage, events]);

  // Initial load
  useEffect(() => {
    if (events.length === 0 && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, events.length, hasNextPage]);

  // Flatten pages into a single list of events
  const allEvents = events.flatMap((p) => p.items);

  return {
    events: allEvents,
    pages: events,
    isLoading,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
  };
};
