/**
 * Utility functions for generating unique IDs
 */

/**
 * Generate a unique ID based on timestamp
 * @returns Unique string ID
 */
export const generateId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

/**
 * Generate a short unique ID (8 characters)
 * @returns Short unique string ID
 */
export const generateShortId = (): string => {
    return Math.random().toString(36).substr(2, 8);
};
