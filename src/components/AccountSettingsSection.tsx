import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SettingsSection } from './SettingsComponents';
import { SignInButton, SignInWithAppleButton, UserProfile, SignOutButton } from './AuthComponents';
import { useAuthStore } from '../store/authStore';
import AuthService from '../services/AuthService';
import { HapticFeedback } from '../utils/haptics';

export const AccountSettingsSection: React.FC = () => {
  const { colors } = useTheme();
  const { user, role, setUser, setRole, setSparkAdminRoles, setIsLoading, clearAuth } = useAuthStore();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningInWithApple, setIsSigningInWithApple] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Verify persisted user still exists in Firebase on mount
  useEffect(() => {
    const verifyUser = async () => {
      if (user) {
        // Check if user still exists in Firebase Auth
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser || currentUser.uid !== user.uid) {
          // User no longer exists in Firebase, clear stale state
          console.log('⚠️ AccountSettingsSection: Stale user detected, clearing auth state');
          clearAuth();
        } else {
          // User exists, load roles
          loadUserRoles();
        }
      } else {
        setRole('standard');
        setSparkAdminRoles([]);
      }
    };

    verifyUser();
  }, []); // Only run on mount

  // Load user role and spark admin roles when user changes
  useEffect(() => {
    if (user) {
      loadUserRoles();
    } else {
      setRole('standard');
      setSparkAdminRoles([]);
    }
  }, [user]);

  const loadUserRoles = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const userRole = await AuthService.getUserRole();
      const sparkAdminRoles = await AuthService.getSparkAdminRoles();
      setRole(userRole);
      setSparkAdminRoles(sparkAdminRoles);
    } catch (error) {
      console.error('Error loading user roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      HapticFeedback.light();

      const signedInUser = await AuthService.signInWithGoogle();
      if (signedInUser) {
        setUser(signedInUser);
        HapticFeedback.success();
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      HapticFeedback.error();

      if (error.message === 'Sign-in was cancelled') {
        // User cancelled, don't show error
        return;
      }

      Alert.alert(
        'Sign-In Failed',
        error.message || 'Failed to sign in with Google. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignInWithApple = async () => {
    try {
      setIsSigningInWithApple(true);
      HapticFeedback.light();

      const signedInUser = await AuthService.signInWithApple();
      if (signedInUser) {
        setUser(signedInUser);
        HapticFeedback.success();
      }
    } catch (error: any) {
      console.error('Apple Sign-in error:', error);
      HapticFeedback.error();

      if (error.message === 'Sign-in was cancelled') {
        // User cancelled, don't show error
        return;
      }

      Alert.alert(
        'Sign-In Failed',
        error.message || 'Failed to sign in with Apple. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSigningInWithApple(false);
    }
  };

  const handleSignOut = async () => {
    // If no user, just clear auth state (handles case where UI shows user but there isn't one)
    if (!user) {
      clearAuth();
      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSigningOut(true);
              HapticFeedback.light();

              await AuthService.signOut();
              clearAuth();

              HapticFeedback.success();
            } catch (error: any) {
              console.error('Sign-out error:', error);
              HapticFeedback.error();

              // Even if sign-out fails, clear local auth state
              clearAuth();

              Alert.alert(
                'Sign-Out Failed',
                error?.message || 'Failed to sign out. Local session cleared.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const styles = createStyles(colors);

  // Ensure user is actually valid before showing signed-in state
  const isValidUser = user && user.uid && (user.email || user.displayName);

  return (
    <SettingsSection title="Account">
      {isValidUser ? (
        <View style={styles.signedInContainer}>
          <UserProfile user={user} onSignOut={handleSignOut} loading={isSigningOut} />

          {/* Role display (for debugging/admin visibility) */}
          {(role !== 'standard' || __DEV__) && (
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Role:</Text>
              <Text style={[styles.roleValue, { color: colors.primary }]}>
                {role === 'app-admin' ? 'App Admin' : role === 'spark-admin' ? 'Spark Admin' : 'Standard User'}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.signedOutContainer}>
          <Text style={[styles.signInPrompt, { color: colors.textSecondary }]}>
            Sign in to sync your data across devices and access admin features.
          </Text>
          <SignInButton onPress={handleSignIn} loading={isSigningIn} />
          {Platform.OS === 'ios' && (
            <SignInWithAppleButton onPress={handleSignInWithApple} loading={isSigningInWithApple} />
          )}
        </View>
      )}
    </SettingsSection>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  signedInContainer: {
    gap: 12,
  },
  signedOutContainer: {
    gap: 12,
  },
  signInPrompt: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
