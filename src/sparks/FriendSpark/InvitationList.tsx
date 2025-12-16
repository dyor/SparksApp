import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { createCommonStyles } from '../../styles/CommonStyles';
import { FriendInvitation } from '../../services/FriendService';

interface InvitationListProps {
    invitations: FriendInvitation[];
    onAccept: (invitationId: string) => void;
    onReject: (invitationId: string) => void;
}

export const InvitationList: React.FC<InvitationListProps> = ({ invitations, onAccept, onReject }) => {
    const { colors } = useTheme();
    const commonStyles = createCommonStyles(colors);

    if (invitations.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {invitations.map((invitation) => (
                <View
                    key={invitation.id}
                    style={[styles.invitationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                    <View style={styles.invitationInfo}>
                        <Text style={[styles.inviterName, { color: colors.text }]}>
                            {invitation.fromUserName}
                        </Text>
                        <Text style={[styles.inviterEmail, { color: colors.textSecondary }]}>
                            {invitation.fromUserEmail}
                        </Text>
                        {invitation.createdAt && (
                            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                                {new Date(invitation.createdAt.toMillis()).toLocaleDateString()}
                            </Text>
                        )}
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[commonStyles.primaryButton, styles.acceptButton]}
                            onPress={() => onAccept(invitation.id)}
                        >
                            <Text style={commonStyles.primaryButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[commonStyles.secondaryButton, styles.rejectButton]}
                            onPress={() => onReject(invitation.id)}
                        >
                            <Text style={commonStyles.secondaryButtonText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 12,
        marginTop: 8,
    },
    invitationCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    invitationInfo: {
        marginBottom: 12,
    },
    inviterName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    inviterEmail: {
        fontSize: 14,
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    acceptButton: {
        flex: 1,
    },
    rejectButton: {
        flex: 1,
    },
});
