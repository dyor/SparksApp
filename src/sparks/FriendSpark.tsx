import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootTabParamList } from '../types/navigation';
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
    const navigation = useNavigation<NavigationProp<RootTabParamList>>();

    const handleFriendPress = (friend: Friend) => {
        // TODO: Phase 2 - Show shareable sparks for this friend
        console.log('Friend pressed:', friend);
    };

    const handleSignInSuccess = () => {
        // Refresh UI after sign-in
        console.log('Sign-in successful');
    };

    const renderUnauthenticated = () => (
        <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
            <Text style={[styles.message, { color: colors.text }]}>
                You must be logged in to use this Spark.
            </Text>
            <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Settings')}
            >
                <Text style={[styles.buttonText, { color: colors.background }]}>
                    Visit Settings Page
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <AuthenticationGate
            onSignInSuccess={handleSignInSuccess}
            renderUnauthenticated={renderUnauthenticated}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {showSettings ? (
                    <FriendSparkSettings onClose={onCloseSettings || (() => { })} />
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
    message: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default FriendSpark;
