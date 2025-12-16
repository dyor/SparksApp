import AsyncStorage from '@react-native-async-storage/async-storage';

// Dynamic import to avoid potential circular dependencies
let FriendService: any = null;
const loadFriendService = async () => {
    if (!FriendService) {
        try {
            const module = await import('./FriendService');
            FriendService = module.default || module.FriendService;
        } catch (error) {
            console.error('Failed to load FriendService:', error);
        }
    }
    return FriendService;
};

const STORAGE_KEY = 'friendInvitations_viewed';
const SPARK_ID = 'friend-spark';

export class FriendInvitationNotificationService {
    /**
     * Get unread invitation count for current user
     */
    static async getUnreadCount(): Promise<number> {
        try {
            // Load FriendService dynamically
            const service = await loadFriendService();
            if (!service || typeof service.getPendingInvitations !== 'function') {
                console.warn('FriendService not available');
                return 0;
            }

            // Check if user is authenticated before trying to get invitations
            const { useAuthStore } = await import('../store/authStore');
            const authStore = useAuthStore.getState();
            if (!authStore.user || !authStore.user.uid) {
                // User not authenticated, no invitations
                return 0;
            }

            // Get all pending invitations
            const invitations = await service.getPendingInvitations();
            
            // Get viewed invitation IDs from AsyncStorage
            const viewedIds = await this.getViewedInvitationIds();
            
            // Count unread (invitations not in viewed list)
            const unreadCount = invitations.filter(inv => !viewedIds.includes(inv.id)).length;
            
            return unreadCount;
        } catch (error: any) {
            // Handle authentication errors gracefully
            if (error?.message?.includes('authenticated') || error?.message?.includes('must be authenticated')) {
                // User not authenticated, return 0
                return 0;
            }
            console.error('Error getting unread invitation count:', error);
            return 0;
        }
    }

    /**
     * Mark invitations as viewed (clear notifications)
     */
    static async markInvitationsAsViewed(invitationIds: string[]): Promise<void> {
        try {
            const viewedIds = await this.getViewedInvitationIds();
            const updatedIds = [...new Set([...viewedIds, ...invitationIds])];
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedIds));
        } catch (error) {
            console.error('Error marking invitations as viewed:', error);
        }
    }

    /**
     * Get viewed invitation IDs from AsyncStorage
     */
    private static async getViewedInvitationIds(): Promise<string[]> {
        try {
            const viewed = await AsyncStorage.getItem(STORAGE_KEY);
            return viewed ? JSON.parse(viewed) : [];
        } catch (error) {
            console.error('Error getting viewed invitation IDs:', error);
            return [];
        }
    }

    /**
     * Clear all viewed invitations (for testing/debugging)
     */
    static async clearViewedInvitations(): Promise<void> {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing viewed invitations:', error);
        }
    }
}
