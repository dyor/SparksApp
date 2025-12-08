import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../services/AuthService';

interface AuthState {
  // User state
  user: User | null;
  role: UserRole;
  sparkAdminRoles: string[];
  
  // Loading states
  isLoading: boolean;
  isInitializing: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setRole: (role: UserRole) => void;
  setSparkAdminRoles: (roles: string[]) => void;
  setIsLoading: (loading: boolean) => void;
  setIsInitializing: (initializing: boolean) => void;
  clearAuth: () => void;
  
  // Helpers
  isAuthenticated: () => boolean;
  isAppAdmin: () => boolean;
  isSparkAdmin: (sparkId: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      role: 'standard',
      sparkAdminRoles: [],
      isLoading: false,
      isInitializing: false,
      
      // Actions
      setUser: (user) => set({ user }),
      
      setRole: (role) => set({ role }),
      
      setSparkAdminRoles: (roles) => set({ sparkAdminRoles: roles }),
      
      setIsLoading: (loading) => set({ isLoading: loading }),
      
      setIsInitializing: (initializing) => set({ isInitializing: initializing }),
      
      clearAuth: () => set({
        user: null,
        role: 'standard',
        sparkAdminRoles: [],
        isLoading: false,
      }),
      
      // Helpers
      isAuthenticated: () => {
        const state = get();
        return state.user !== null;
      },
      
      isAppAdmin: () => {
        const state = get();
        return state.role === 'app-admin';
      },
      
      isSparkAdmin: (sparkId: string) => {
        const state = get();
        return state.isAppAdmin() || state.sparkAdminRoles.includes(sparkId);
      },
    }),
    {
      name: 'sparks-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        sparkAdminRoles: state.sparkAdminRoles,
      }),
    }
  )
);
