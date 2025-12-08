import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { createCommonStyles } from '../styles/CommonStyles';
import { HapticFeedback } from '../utils/haptics';
import AuthService, { User } from '../services/AuthService';

interface SignInButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export const SignInButton: React.FC<SignInButtonProps> = ({ onPress, loading = false }) => {
  const { colors } = useTheme();
  const commonStyles = createCommonStyles(colors);

  return (
    <TouchableOpacity
      style={[commonStyles.primaryButton, styles.signInButton, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.signInContent}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={commonStyles.primaryButtonText}>Sign in with Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface UserProfileProps {
  user: User;
  onSignOut: () => void;
  loading?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onSignOut, loading = false }) => {
  const { colors } = useTheme();
  const commonStyles = createCommonStyles(colors);

  return (
    <View style={styles.profileContainer}>
      {user.photoURL ? (
        <Image source={{ uri: user.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}
      
      <View style={styles.profileInfo}>
        <Text style={[styles.displayName, { color: colors.text }]}>
          {user.displayName || 'User'}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {user.email}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[commonStyles.secondaryButton, styles.signOutButton]}
        onPress={onSignOut}
        disabled={loading}
      >
        <Text style={commonStyles.secondaryButtonText}>
          {loading ? 'Signing out...' : 'Sign Out'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

interface SignOutButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export const SignOutButton: React.FC<SignOutButtonProps> = ({ onPress, loading = false }) => {
  const { colors } = useTheme();
  const commonStyles = createCommonStyles(colors);

  return (
    <TouchableOpacity
      style={[commonStyles.secondaryButton, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
    >
      <Text style={commonStyles.secondaryButtonText}>
        {loading ? 'Signing out...' : 'Sign Out'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  signInButton: {
    width: '100%',
  },
  signInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  signOutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
