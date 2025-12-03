/**
 * Utility functions for date operations
 */

/**
 * Format a date string to a readable format
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "Dec 25, 2024")
 */
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

/**
 * Calculate days remaining until a date
 * @param dateString - Target date in YYYY-MM-DD format
 * @returns Number of days remaining (negative if past)
 */
export const getDaysRemaining = (dateString: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString + 'T00:00:00');
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Format a date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Formatted date range (e.g., "Dec 25 - Dec 31, 2024")
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const endDay = end.getDate();
    const year = end.getFullYear();

    if (start.getMonth() === end.getMonth()) {
        return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }

    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
};
