import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signIn,
  signUp,
  signOut,
  createProfile,
  getProfile,
  updateProfile,
} from '../services/authService';
import { supabase } from '../lib/supabaseClient.js';
import type { ProfileRow } from '../types/profile';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  avatarUrl: string;
  role: string;
  nationalId: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, phone: string, password: string, nationalId: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const mapProfileToUser = (profile: ProfileRow): User => ({
    id: profile.id,
    name: profile.full_name ?? '',
    email: profile.email ?? '',
    phone: profile.phone_number ?? '',
    city: profile.city ?? '',
    address: profile.address ?? '',
    avatarUrl: profile.avatar_url ?? '',
    role: profile.role ?? 'user',
    nationalId: profile.national_id ?? '',
    createdAt: profile.created_at ?? '',
  });

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session from localStorage
    // (no network call needed), then again whenever auth state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Mark as initializing before the deferred async work so that
        // protected routes (AdminRoute, WorkerRoute) show a spinner instead of
        // redirecting to "/" while the profile is being re-fetched (e.g. on
        // token refresh or re-login).
        setIsInitializing(true);
        // Defer async work with setTimeout so the callback returns immediately,
        // releasing the Supabase auth lock before we make any DB calls.
        // This prevents lock contention between tabs (official Supabase recommendation).
        setTimeout(async () => {
          try {
            if (session?.user) {
              const profile = await getProfile(session.user.id);
              // Backfill email from auth if the profiles row is missing it
              if (!profile.email && session.user.email) {
                profile.email = session.user.email;
                await updateProfile(session.user.id, { email: session.user.email });
              }
              setUser(mapProfileToUser(profile));
            } else {
              setUser(null);
            }
          } catch (error) {
            console.error('Error loading profile', error);
            setUser(null);
          } finally {
            setIsInitializing(false);
          }
        }, 0);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const { user: authUser } = await signIn(email, password);

    if (!authUser) {
      throw new Error('No user returned from login');
    }

    const profile = await getProfile(authUser.id);
    // Backfill email from auth if the profiles row is missing it
    if (!profile.email && authUser.email) {
      profile.email = authUser.email;
      await updateProfile(authUser.id, { email: authUser.email });
    }
    const mappedUser = mapProfileToUser(profile);
    setUser(mappedUser);
    return mappedUser;
  };

  const signup = async (name: string, email: string, phone: string, password: string, nationalId: string) => {
    const { user: authUser } = await signUp(email, password);

    if (!authUser) {
      throw new Error('No user returned from signup');
    }

    const profile = await createProfile({
      id: authUser.id,
      name,
      email,
      phone,
      nationalId,
    });

    setUser(mapProfileToUser(profile));
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const dbUpdates: Partial<ProfileRow> = {};

    if (updates.name !== undefined) {
      dbUpdates.full_name = updates.name;
    }
    if (updates.email !== undefined) {
      dbUpdates.email = updates.email;
    }
    if (updates.phone !== undefined) {
      dbUpdates.phone_number = updates.phone;
    }
    if (updates.city !== undefined) {
      dbUpdates.city = updates.city;
    }
    if (updates.address !== undefined) {
      dbUpdates.address = updates.address;
    }
    if (updates.avatarUrl !== undefined) {
      dbUpdates.avatar_url = updates.avatarUrl;
    }
    if (updates.nationalId !== undefined) {
      dbUpdates.national_id = updates.nationalId;
    }

    if (Object.keys(dbUpdates).length === 0) {
      return;
    }

    const updatedProfile = await updateProfile(user.id, dbUpdates);
    setUser(mapProfileToUser(updatedProfile));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !isInitializing,
        isInitializing,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
