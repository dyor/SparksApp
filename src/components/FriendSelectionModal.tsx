import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { createCommonStyles } from '../styles/CommonStyles';
import { CommonModal } from './CommonModal';
import { FriendService, Friend } from '../services/FriendService';
import { HapticFeedback } from '../utils/haptics';
import { useAuthStore } from '../store/authStore';

interface FriendSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectFriend: (friend: Friend) => void;
    onAddFriend?: () => void;
}

export const FriendSelectionModal: React.FC<FriendSelectionModalProps> = ({
    visible,
    onClose,
    onSelectFriend,
    onAddFriend,
}) => {
    const { colors } = useTheme();
    const commonStyles = createCommonStyles(colors);
    const { user } = useAuthStore();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (visible && user) {
            loadFriends();
        }
    }, [visible, user]);

    const loadFriends = async () => {
        try {
            setIsLoading(true);
            const friendsList = await FriendService.getFriends();
            setFriends(friendsList);
        } catch (error: any) {
            console.error('Error loading friends:', error);
            // Don't show alert - just log and show empty state
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectFriend = (friend: Friend) => {
        HapticFeedback.impact('light');
        onSelectFriend(friend);
        onClose();
    };

    const handleAddFriend = () => {
        HapticFeedback.impact('light');
        onClose();
        onAddFriend?.();
    };

    const footer = (
        <View style={styles.footer}>
            <View style={commonStyles.modalButtonContainer}>
                <View style={commonStyles.modalButton}>
                    <Text
                        style={[commonStyles.modalButtonText, { color: colors.textSecondary }]}
                        onPress={onClose}
                    >
                        Cancel
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <CommonModal visible={visible} title="Share with Friend" onClose={onClose} footer={footer}>
            <View style={styles.content}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Loading friends...
                        </Text>
                    </View>
                ) : friends.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
                        <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                            Add a friend to share with them
                        </Text>
                        {onAddFriend && (
                            <TouchableOpacity
                                style={[commonStyles.primaryButton, styles.addFriendButton]}
                                onPress={handleAddFriend}
                            >
                                <Text style={commonStyles.primaryButtonText}>Add Friend</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <ScrollView style={styles.friendsList}>
                        {friends.map((friend) => (
                            <TouchableOpacity
                                key={friend.userId}
                                style={[styles.friendItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => handleSelectFriend(friend)}
                                activeOpacity={0.7}
                            >
                                {friend.photoURL ? (
                                    <Image source={{ uri: friend.photoURL }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                                        <Text style={styles.avatarText}>
                                            {friend.displayName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.friendInfo}>
                                    <Text style={[styles.friendName, { color: colors.text }]}>{friend.displayName}</Text>
                                    <Text style={[styles.friendEmail, { color: colors.textSecondary }]}>{friend.email}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {onAddFriend && (
                            <TouchableOpacity
                                style={[styles.addFriendOption, { borderColor: colors.border }]}
                                onPress={handleAddFriend}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.addFriendText, { color: colors.primary }]}>+ Add Friend</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                )}
            </View>
        </CommonModal>
    );
};

const styles = StyleSheet.create({
    content: {
        padding: 16,
        minHeight: 200,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    addFriendButton: {
        marginTop: 8,
    },
    friendsList: {
        maxHeight: 400,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    friendEmail: {
        fontSize: 14,
    },
    addFriendOption: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        marginTop: 8,
    },
    addFriendText: {
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
});
