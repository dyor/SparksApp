import { generateId, generateShortId } from '../idUtils';

describe('idUtils', () => {
    describe('generateId', () => {
        it('generates a string ID', () => {
            const id = generateId();
            expect(typeof id).toBe('string');
        });

        it('generates unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(id1).not.toBe(id2);
        });

        it('generates IDs with reasonable length', () => {
            const id = generateId();
            expect(id.length).toBeGreaterThan(10);
        });

        it('generates multiple unique IDs in sequence', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(generateId());
            }
            expect(ids.size).toBe(100);
        });
    });

    describe('generateShortId', () => {
        it('generates a string ID', () => {
            const id = generateShortId();
            expect(typeof id).toBe('string');
        });

        it('generates unique IDs', () => {
            const id1 = generateShortId();
            const id2 = generateShortId();
            expect(id1).not.toBe(id2);
        });

        it('generates IDs with expected length', () => {
            const id = generateShortId();
            expect(id.length).toBeLessThanOrEqual(8);
        });

        it('generates IDs with only alphanumeric characters', () => {
            const id = generateShortId();
            expect(id).toMatch(/^[a-z0-9]+$/);
        });
    });
});
