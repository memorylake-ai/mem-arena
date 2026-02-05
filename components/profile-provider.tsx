"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import useSWR from "swr";
import { getProfile, type ProfileUser } from "@/app/actions/profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  type ArenaProfileData,
  isMemorylakeProfile,
} from "@/lib/memorylake/profile";

export type { ArenaProfileData } from "@/lib/memorylake/profile";

const PROFILE_SWR_KEY = "profile";
const STORAGE_KEY = "arena-profile";

function saveToStorage(profile: ArenaProfileData | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/** User info from main domain (e.g. /api/user/self). Alias for ProfileUser from server action. */
export type UserInfo = ProfileUser;

interface ProfileContextValue {
  profile: ArenaProfileData | null;
  user: UserInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function profileFetcher(): Promise<{
  user: ProfileUser;
  arenaProfile: ArenaProfileData;
}> {
  return getProfile();
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR(
    PROFILE_SWR_KEY,
    profileFetcher,
    {
      revalidateOnFocus: false,
      fallbackData: undefined,
    }
  );

  const profile = data?.arenaProfile ?? null;
  const user = data?.user ?? null;

  useEffect(() => {
    saveToStorage(profile);
  }, [profile]);

  const refetch = useCallback(() => mutate(), [mutate]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      user,
      loading: isLoading,
      error: error ?? null,
      refetch,
    }),
    [profile, user, isLoading, error, refetch]
  );

  const showError = !isLoading && (error != null || profile == null);

  return (
    <ProfileContext.Provider value={value}>
      {showError ? (
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <Alert className="max-w-md" variant="destructive">
            <AlertTitle>无法获取用户信息</AlertTitle>
            <AlertDescription>
              {error?.message ?? "请从主域登录后再试。"}
            </AlertDescription>
            <Button
              className="mt-3"
              onClick={() => refetch()}
              size="sm"
              variant="outline"
            >
              重试
            </Button>
          </Alert>
        </div>
      ) : (
        children
      )}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}

/** Returns memorylake profile for request body, or undefined if not ready. */
export function useMemorylakeProfile() {
  const { profile } = useProfile();
  return isMemorylakeProfile(profile) ? profile : undefined;
}
