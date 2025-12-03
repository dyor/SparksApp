import { formatDate, getDaysRemaining, formatDateRange } from '../dateUtils';

describe('dateUtils', () => {
    describe('formatDate', () => {
        it('formats date correctly', () => {
            expect(formatDate('2024-12-25')).toBe('Dec 25, 2024');
        });

        it('formats January date correctly', () => {
            expect(formatDate('2024-01-01')).toBe('Jan 1, 2024');
        });

        it('formats date with single digit day', () => {
            expect(formatDate('2024-03-05')).toBe('Mar 5, 2024');
        });
    });

    describe('getDaysRemaining', () => {
        it('calculates days remaining for future date', () => {
            const tomorrow = new Date();
            tomorrow.setHours(0, 0, 0, 0);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];
            expect(getDaysRemaining(dateStr)).toBe(1);
        });

        it('calculates days remaining for date one week away', () => {
            const nextWeek = new Date();
            nextWeek.setHours(0, 0, 0, 0);
            nextWeek.setDate(nextWeek.getDate() + 7);
            const dateStr = nextWeek.toISOString().split('T')[0];
            expect(getDaysRemaining(dateStr)).toBe(7);
        });

        it('returns 0 for today', () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateStr = today.toISOString().split('T')[0];
            expect(getDaysRemaining(dateStr)).toBe(0);
        });

        it('returns negative number for past date', () => {
            const yesterday = new Date();
            yesterday.setHours(0, 0, 0, 0);
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];
            expect(getDaysRemaining(dateStr)).toBe(-1);
        });
    });

    describe('formatDateRange', () => {
        it('formats date range in same month', () => {
            expect(formatDateRange('2024-12-20', '2024-12-25')).toBe('Dec 20 - 25, 2024');
        });

        it('formats date range across different months', () => {
            expect(formatDateRange('2024-11-28', '2024-12-05')).toBe('Nov 28 - Dec 5, 2024');
        });

        it('formats single day range', () => {
            expect(formatDateRange('2024-12-25', '2024-12-25')).toBe('Dec 25 - 25, 2024');
        });

        it('formats date range across year boundary', () => {
            expect(formatDateRange('2024-12-28', '2025-01-05')).toBe('Dec 28 - Jan 5, 2025');
        });
    });
});
