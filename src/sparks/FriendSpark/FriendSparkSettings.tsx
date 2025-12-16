import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
    SettingsContainer,
    SettingsScrollView,
    SettingsHeader,
    SettingsSection,
    SettingsButton,
} from '../../components/SettingsComponents';
import { FriendService, FriendInvitation } from '../../services/FriendService';
import { FriendInvitationNotificationService } from '../../services/FriendInvitationNotificationService';
import { NotificationBadge } from '../../components/NotificationBadge';
import { HapticFeedback } from '../../utils/haptics';
import { InvitationList } from './InvitationList';
import { CreateInvitationModal } from './CreateInvitationModal';

interface FriendSparkSettingsProps {
    onClose: () => void;
}

export const FriendSparkSettings: React.FC<FriendSparkSettingsProps> = ({ onClose }) => {
    const { colors } = useTheme();
    const [invitations, setInvitations] = useState<FriendInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        loadInvitations();
        loadPendingCount();
    }, []);

    const loadInvitations = async () => {
        try {
            setIsLoading(true);
            const pending = await FriendService.getPendingInvitations();
            setInvitations(pending);
            
            // Mark invitations as viewed when settings opens
            if (pending.length > 0) {
                await FriendInvitationNotificationService.markInvitationsAsViewed(
                    pending.map(inv => inv.id)
                );
                await loadPendingCount();
            }
        } catch (error: any) {
            console.error('Error loading invitations:', error);
            Alert.alert('Error', error.message || 'Failed to load invitations');
        } finally {
            setIsLoading(false);
        }
    };

    const loadPendingCount = async () => {
        try {
            const count = await FriendInvitationNotificationService.getUnreadCount();
            setPendingCount(count);
        } catch (error) {
            console.error('Error loading pending count:', error);
        }
    };

    const handleAccept = async (invitationId: string) => {
        try {
            HapticFeedback.impact('medium');
            await FriendService.acceptInvitation(invitationId);
            
            // Remove from local state
            setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
            
            // Reload pending count
            await loadPendingCount();
            
            HapticFeedback.notification('success');
            Alert.alert('Success', 'Friend request accepted!');
        } catch (error: any) {
            console.error('Error accepting invitation:', error);
            HapticFeedback.notification('error');
            Alert.alert('Error', error.message || 'Failed to accept invitation');
        }
    };

    const handleReject = async (invitationId: string) => {
        try {
            HapticFeedback.impact('medium');
            await FriendService.rejectInvitation(invitationId);
            
            // Remove from local state
            setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
            
            // Reload pending count
            await loadPendingCount();
            
            HapticFeedback.notification('success');
        } catch (error: any) {
            console.error('Error rejecting invitation:', error);
            HapticFeedback.notification('error');
            Alert.alert('Error', error.message || 'Failed to reject invitation');
        }
    };

    const handleInvitationCreated = async () => {
        setShowCreateModal(false);
        // Refresh invitations if needed (though new invitations won't show up for current user)
        await loadPendingCount();
    };

    return (
        <SettingsContainer>
            <SettingsHeader title="Friend Spark Settings" onClose={onClose} />
            <SettingsScrollView>
                <SettingsSection title="Invitations">
                    <View style={{ position: 'relative' }}>
                        <SettingsButton
                            title="Send Invitation"
                            onPress={() => setShowCreateModal(true)}
                            variant="primary"
                        />
                    </View>
                </SettingsSection>

                <SettingsSection title="Pending Invitations">
                    {pendingCount > 0 && (
                        <View style={{ marginBottom: 8 }}>
                            <NotificationBadge sparkId="friend-spark" size="small" />
                        </View>
                    )}
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : invitations.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No pending invitations
                        </Text>
                    ) : (
                        <InvitationList
                            invitations={invitations}
                            onAccept={handleAccept}
                            onReject={handleReject}
                        />
                    )}
                </SettingsSection>
            </SettingsScrollView>

            <CreateInvitationModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onInvitationCreated={handleInvitationCreated}
            />
        </SettingsContainer>
    );
};

const styles = StyleSheet.create({
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 8,
    },
});
