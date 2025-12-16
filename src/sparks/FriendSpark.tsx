import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { AuthenticationGate } from '../components/AuthenticationGate';
import { FriendSparkMain } from './FriendSpark/FriendSparkMain';
import { FriendSparkSettings } from './FriendSpark/FriendSparkSettings';
import { Friend } from '../services/FriendService';

interface FriendSparkProps {
    showSettings?: boolean;
    onCloseSettings?: () => void;
    onStateChange?: (state: any) => void;
    onComplete?: (result: any) => void;
}

export const FriendSpark: React.FC<FriendSparkProps> = ({
    showSettings = false,
    onCloseSettings,
    onStateChange,
    onComplete,
}) => {
    const { colors } = useTheme();

    const handleFriendPress = (friend: Friend) => {
        // TODO: Phase 2 - Show shareable sparks for this friend
        console.log('Friend pressed:', friend);
    };

    const handleSignInSuccess = () => {
        // Refresh UI after sign-in
        console.log('Sign-in successful');
    };

    return (
        <AuthenticationGate onSignInSuccess={handleSignInSuccess}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {showSettings ? (
                    <FriendSparkSettings onClose={onCloseSettings || (() => {})} />
                ) : (
                    <FriendSparkMain onFriendPress={handleFriendPress} />
                )}
            </View>
        </AuthenticationGate>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default FriendSpark;
