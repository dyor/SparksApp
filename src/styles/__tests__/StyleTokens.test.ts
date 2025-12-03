import { StyleTokens } from '../StyleTokens';

describe('StyleTokens', () => {
    describe('spacing', () => {
        it('has all required spacing values', () => {
            expect(StyleTokens.spacing.xs).toBe(4);
            expect(StyleTokens.spacing.sm).toBe(8);
            expect(StyleTokens.spacing.md).toBe(12);
            expect(StyleTokens.spacing.lg).toBe(16);
            expect(StyleTokens.spacing.xl).toBe(20);
            expect(StyleTokens.spacing.xxl).toBe(24);
        });

        it('spacing values are numbers', () => {
            Object.values(StyleTokens.spacing).forEach(value => {
                expect(typeof value).toBe('number');
            });
        });

        it('spacing values are positive', () => {
            Object.values(StyleTokens.spacing).forEach(value => {
                expect(value).toBeGreaterThan(0);
            });
        });
    });

    describe('borderRadius', () => {
        it('has all required border radius values', () => {
            expect(StyleTokens.borderRadius.sm).toBe(8);
            expect(StyleTokens.borderRadius.md).toBe(12);
            expect(StyleTokens.borderRadius.lg).toBe(16);
            expect(StyleTokens.borderRadius.xl).toBe(20);
        });

        it('border radius values are numbers', () => {
            Object.values(StyleTokens.borderRadius).forEach(value => {
                expect(typeof value).toBe('number');
            });
        });
    });

    describe('fontSize', () => {
        it('has all required font sizes', () => {
            expect(StyleTokens.fontSize.sm).toBe(12);
            expect(StyleTokens.fontSize.md).toBe(14);
            expect(StyleTokens.fontSize.lg).toBe(16);
            expect(StyleTokens.fontSize.xl).toBe(18);
            expect(StyleTokens.fontSize.xxl).toBe(20);
            expect(StyleTokens.fontSize.title).toBe(28);
        });

        it('font sizes are numbers', () => {
            Object.values(StyleTokens.fontSize).forEach(value => {
                expect(typeof value).toBe('number');
            });
        });

        it('font sizes are in ascending order (except title)', () => {
            expect(StyleTokens.fontSize.sm).toBeLessThan(StyleTokens.fontSize.md);
            expect(StyleTokens.fontSize.md).toBeLessThan(StyleTokens.fontSize.lg);
            expect(StyleTokens.fontSize.lg).toBeLessThan(StyleTokens.fontSize.xl);
            expect(StyleTokens.fontSize.xl).toBeLessThan(StyleTokens.fontSize.xxl);
            expect(StyleTokens.fontSize.title).toBeGreaterThan(StyleTokens.fontSize.xxl);
        });
    });

    describe('shadows', () => {
        it('has small shadow definition', () => {
            expect(StyleTokens.shadows.small).toBeDefined();
            expect(StyleTokens.shadows.small.shadowColor).toBe('#000');
            expect(StyleTokens.shadows.small.shadowOffset).toEqual({ width: 0, height: 2 });
            expect(StyleTokens.shadows.small.shadowOpacity).toBe(0.1);
            expect(StyleTokens.shadows.small.shadowRadius).toBe(4);
            expect(StyleTokens.shadows.small.elevation).toBe(3);
        });
    });
});
