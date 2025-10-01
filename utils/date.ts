// utils/date.ts

/**
 * Formats a date string into a user-friendly format (e.g., 'Jan 1, 2024')
 * @param dateString The date string from the API (e.g., ISO 8601)
 * @returns Formatted date string or 'N/A'
 */
export const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        // Use a common, readable format
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch (e) {
        return 'Invalid Date';
    }
};