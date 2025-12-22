import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme, ThemeColors } from '../../contexts/ThemeContext';
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
import { createCommonStyles } from '../../styles/CommonStyles';
import { useAuthStore } from '../../store/authStore';

interface FriendSparkSettingsProps {
    onClose: () => void;
}

export const FriendSparkSettings: React.FC<FriendSparkSettingsProps> = ({ onClose }) => {
    const { colors } = useTheme();
    const commonStyles = createCommonStyles(colors);
    const styles = createStyles(colors);
    const { user } = useAuthStore();
    const [invitations, setInvitations] = useState<FriendInvitation[]>([]);
    const [sentInvitations, setSentInvitations] = useState<FriendInvitation[]>([]);
    const [acceptedInvitations, setAcceptedInvitations] = useState<FriendInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        loadAllInvitations();
        loadPendingCount();
    }, []);

    const loadAllInvitations = async () => {
        try {
            setIsLoading(true);
            const [pending, sent, accepted] = await Promise.all([
                FriendService.getPendingInvitations(),
                FriendService.getSentInvitations(),
                FriendService.getAcceptedInvitations(),
            ]);

            setInvitations(pending);
            // Limit to most recent 10
            setSentInvitations(sent.slice(0, 10));
            setAcceptedInvitations(accepted.slice(0, 10));

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
        console.log('📧 FriendSparkSettings: handleAccept called with invitationId:', invitationId);
        try {
            HapticFeedback.medium();
            console.log('📧 FriendSparkSettings: Calling FriendService.acceptInvitation...');
            await FriendService.acceptInvitation(invitationId);
            console.log('✅ FriendSparkSettings: Invitation accepted successfully');

            // Reload all invitations
            await loadAllInvitations();
            await loadPendingCount();

            HapticFeedback.success();
            Alert.alert('Success', 'Friend request accepted!');
        } catch (error: any) {
            console.error('❌ FriendSparkSettings: Error accepting invitation:', error);
            console.error('❌ Error details:', {
                message: error?.message,
                stack: error?.stack,
                name: error?.name,
            });
            HapticFeedback.error();
            Alert.alert('Error', error?.message || 'Failed to accept invitation');
        }
    };

    const handleReject = async (invitationId: string) => {
        console.log('📧 FriendSparkSettings: handleReject called with invitationId:', invitationId);
        try {
            HapticFeedback.medium();
            console.log('📧 FriendSparkSettings: Calling FriendService.rejectInvitation...');
            await FriendService.rejectInvitation(invitationId);
            console.log('✅ FriendSparkSettings: Invitation rejected successfully');

            // Reload all invitations
            await loadAllInvitations();
            await loadPendingCount();

            HapticFeedback.success();
        } catch (error: any) {
            console.error('❌ FriendSparkSettings: Error rejecting invitation:', error);
            console.error('❌ Error details:', {
                message: error?.message,
                stack: error?.stack,
                name: error?.name,
            });
            HapticFeedback.error();
            Alert.alert('Error', error?.message || 'Failed to reject invitation');
        }
    };

    const handleDeleteSent = async (invitationId: string) => {
        Alert.alert(
            'Delete Invitation',
            'Are you sure you want to delete this invitation?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            HapticFeedback.medium();
                            await FriendService.deleteInvitation(invitationId);
                            await loadAllInvitations();
                            HapticFeedback.success();
                        } catch (error: any) {
                            console.error('Error deleting invitation:', error);
                            HapticFeedback.error();
                            Alert.alert('Error', error.message || 'Failed to delete invitation');
                        }
                    },
                },
            ]
        );
    };

    const handleInvitationCreated = async () => {
        setShowCreateModal(false);
        await loadAllInvitations();
        await loadPendingCount();
    };

    return (
        <SettingsContainer>
            <SettingsHeader title="Friend Spark Settings" subtitle="Manage your friend connections" />
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

                <SettingsSection title="Sent Invitations">
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : sentInvitations.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No sent invitations
                        </Text>
                    ) : (
                        <View style={styles.invitationList}>
                            {sentInvitations.map((invitation) => (
                                <View
                                    key={invitation.id}
                                    style={[styles.invitationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                >
                                    <View style={styles.invitationInfo}>
                                        <Text style={[styles.inviterName, { color: colors.text }]}>
                                            To: {invitation.toEmail}
                                        </Text>
                                        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                                            Status: {invitation.status}
                                        </Text>
                                        {invitation.createdAt && (
                                            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                                                Sent: {new Date(invitation.createdAt.toMillis()).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </View>
                                    {invitation.status === 'pending' && (
                                        <TouchableOpacity
                                            style={[commonStyles.secondaryButton, styles.deleteButton]}
                                            onPress={() => handleDeleteSent(invitation.id)}
                                        >
                                            <Text style={commonStyles.secondaryButtonText}>Delete</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </SettingsSection>

                <SettingsSection title="Accepted Invitations">
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : acceptedInvitations.length === 0 ? (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No accepted invitations
                        </Text>
                    ) : (
                        <View style={styles.invitationList}>
                            {acceptedInvitations.map((invitation) => (
                                <View
                                    key={invitation.id}
                                    style={[styles.invitationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                >
                                    <View style={styles.invitationInfo}>
                                        <Text style={[styles.inviterName, { color: colors.text }]}>
                                            {invitation.fromUserId === user?.uid
                                                ? `To: ${invitation.toEmail}`
                                                : `From: ${invitation.fromUserName} (${invitation.fromUserEmail})`}
                                        </Text>
                                        {invitation.respondedAt && (
                                            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                                                Accepted: {new Date(invitation.respondedAt.toMillis()).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </SettingsSection>

                {/* Close Button */}
                <View style={styles.closeButtonContainer}>
                    <TouchableOpacity
                        style={[styles.closeButton, { borderColor: colors.border }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.closeButtonText, { color: colors.text }]}>
                            Close
                        </Text>
                    </TouchableOpacity>
                </View>
            </SettingsScrollView>

            <CreateInvitationModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onInvitationCreated={handleInvitationCreated}
            />
        </SettingsContainer>
    );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 8,
    },
    invitationList: {
        gap: 12,
        marginTop: 8,
    },
    invitationCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    invitationInfo: {
        flex: 1,
    },
    inviterName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    statusText: {
        fontSize: 14,
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 12,
    },
    deleteButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    closeButtonContainer: {
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    closeButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
