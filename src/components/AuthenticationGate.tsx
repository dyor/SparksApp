import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { createCommonStyles } from '../styles/CommonStyles';
import { SignInButton, SignInWithAppleButton } from './AuthComponents';
import { useAuthStore } from '../store/authStore';
import AuthService from '../services/AuthService';
import { HapticFeedback } from '../utils/haptics';

interface AuthenticationGateProps {
    children: React.ReactNode;
    onSignInSuccess?: () => void;
}

/**
 * Component that requires authentication before showing children
 * Shows sign-in UI if user is not authenticated
 */
export const AuthenticationGate: React.FC<AuthenticationGateProps> = ({ children, onSignInSuccess }) => {
    const { colors } = useTheme();
    const commonStyles = createCommonStyles(colors);
    const { user, setUser, setRole, setSparkAdminRoles } = useAuthStore();
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isSigningInWithApple, setIsSigningInWithApple] = useState(false);

    // If user is authenticated, show children
    if (user && user.uid) {
        return <>{children}</>;
    }

    // Otherwise, show sign-in prompt
    const handleSignIn = async () => {
        try {
            setIsSigningIn(true);
            HapticFeedback.impact('light');

            const user = await AuthService.signInWithGoogle();
            if (user) {
                setUser(user);
                const role = await AuthService.getUserRole();
                setRole(role);
                const sparkAdminRoles = await AuthService.getSparkAdminRoles();
                setSparkAdminRoles(sparkAdminRoles);
                HapticFeedback.notification('success');
                onSignInSuccess?.();
            }
        } catch (error: any) {
            console.error('Sign-in error:', error);
            HapticFeedback.notification('error');
            Alert.alert('Sign-In Failed', error.message || 'Unable to sign in. Please try again.');
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleSignInWithApple = async () => {
        try {
            setIsSigningInWithApple(true);
            HapticFeedback.impact('light');

            const user = await AuthService.signInWithApple();
            if (user) {
                setUser(user);
                const role = await AuthService.getUserRole();
                setRole(role);
                const sparkAdminRoles = await AuthService.getSparkAdminRoles();
                setSparkAdminRoles(sparkAdminRoles);
                HapticFeedback.notification('success');
                onSignInSuccess?.();
            }
        } catch (error: any) {
            console.error('Apple Sign-in error:', error);
            HapticFeedback.notification('error');
            Alert.alert('Sign-In Failed', error.message || 'Unable to sign in. Please try again.');
        } finally {
            setIsSigningInWithApple(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>Sign In Required</Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                    You must sign in to use Friend Spark. This allows you to connect with friends and share sparks.
                </Text>

                <View style={styles.buttonContainer}>
                    <SignInButton onPress={handleSignIn} loading={isSigningIn} />
                    <SignInWithAppleButton onPress={handleSignInWithApple} loading={isSigningInWithApple} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
});
