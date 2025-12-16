import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { createCommonStyles } from '../../styles/CommonStyles';
import { FriendService, Friend } from '../../services/FriendService';
import { HapticFeedback } from '../../utils/haptics';

interface FriendSparkMainProps {
    onFriendPress?: (friend: Friend) => void;
}

export const FriendSparkMain: React.FC<FriendSparkMainProps> = ({ onFriendPress }) => {
    const { colors } = useTheme();
    const commonStyles = createCommonStyles(colors);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            setIsLoading(true);
            const friendsList = await FriendService.getFriends();
            setFriends(friendsList);
        } catch (error: any) {
            console.error('Error loading friends:', error);
            Alert.alert('Error', error.message || 'Failed to load friends');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadFriends();
        setIsRefreshing(false);
    };

    const handleFriendPress = (friend: Friend) => {
        HapticFeedback.impact('light');
        onFriendPress?.(friend);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading friends...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
        >
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
                </Text>
            </View>

            {friends.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
                    <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                        Send invitations from Settings to connect with friends
                    </Text>
                </View>
            ) : (
                <View style={styles.friendsList}>
                    {friends.map((friend) => (
                        <TouchableOpacity
                            key={friend.userId}
                            style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => handleFriendPress(friend)}
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
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    friendsList: {
        gap: 12,
    },
    friendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    friendEmail: {
        fontSize: 14,
    },
});
