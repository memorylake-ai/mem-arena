"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import {
  getArenaSessionUserBySessionKey,
  upsertArenaSessionUser,
} from "@/lib/db";
import type { ArenaProfileData } from "@/lib/memorylake/profile";
import { isMemorylakeProfile } from "@/lib/memorylake/profile";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session";
const TRAILING_SLASH = /\/$/;
/** TTL for arena_session_users cache (30 minutes). */
const SESSION_USER_CACHE_TTL_MS = 30 * 60 * 1000;

function str(o: unknown, key: string): string | null {
  if (!o || typeof o !== "object") {
    return null;
  }
  const v = (o as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Parse arena API response: accept camelCase (mem0rgId) or snake_case (mem0_org_id, etc.). */
function parseArenaProfile(value: unknown): ArenaProfileData | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;

  const mem0rgId =
    str(o, "mem0rgId") ?? str(o, "mem0_org_id") ?? str(o, "mem0OrgId");
  const mem0ProjId =
    str(o, "mem0ProjId") ?? str(o, "mem0_proj_id") ?? str(o, "mem0ProjId");
  const datasetId = str(o, "datasetId") ?? str(o, "dataset_id");

  if (mem0rgId && mem0ProjId && datasetId) {
    const projId = str(o, "projId") ?? str(o, "proj_id");
    return {
      mem0rgId,
      mem0ProjId,
      datasetId,
      ...(projId ? { projId } : {}),
    };
  }
  if (isMemorylakeProfile(value)) {
    const projId = str(o, "projId") ?? str(o, "proj_id");
    return {
      mem0rgId: value.mem0rgId,
      mem0ProjId: value.mem0ProjId,
      datasetId: value.datasetId,
      ...(projId ? { projId } : {}),
    };
  }
  return null;
}

interface MainDomainUserData {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string;
}

interface MainDomainUserResponse {
  data: MainDomainUserData;
  message?: string;
  success?: boolean;
}

export interface ProfileUser {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string;
}

export interface GetProfileResult {
  user: ProfileUser;
  arenaProfile: ArenaProfileData;
}

/** Hash session cookie value for use as arena_session_users.session_key. */
function hashSessionCookie(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Fetches current user from main domain using session cookie.
 * Throws on missing cookie, config error, or main domain error.
 */
async function fetchMainDomainUser(
  sessionCookieValue: string
): Promise<MainDomainUserData> {
  const mainBase = process.env.MAIN_DOMAIN_API_URL;
  if (!mainBase) {
    throw new Error("MAIN_DOMAIN_API_URL is not configured");
  }
  const meUrl = `${mainBase.replace(TRAILING_SLASH, "")}/api/user/self`;
  const meRes = await fetch(meUrl, {
    method: "GET",
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${sessionCookieValue}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const meData = (await meRes
    .json()
    .catch(() => ({}))) as MainDomainUserResponse;
  if (!(meRes.ok && meData.success && meData.data)) {
    throw new Error(meData.message ?? "Memorylake profile request failed");
  }
  return meData.data;
}

/**
 * Returns current user for session-scoped actions (e.g. chat). Uses arena_session_users
 * cache; on miss or expiry, validates with main domain and upserts cache.
 * Throws when not logged in or main domain rejects.
 */
export async function getCurrentUser(): Promise<ProfileUser> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    throw new Error("未登录或 session 已过期");
  }
  const sessionKey = hashSessionCookie(sessionCookie.value);
  const cached = await getArenaSessionUserBySessionKey(sessionKey);
  const now = new Date();
  if (cached && cached.expiresAt > now) {
    return {
      id: cached.userId,
      display_name: cached.displayName ?? "",
      email: cached.email ?? "",
      avatar_url: cached.avatarUrl ?? "",
    };
  }
  const user = await fetchMainDomainUser(sessionCookie.value);
  const expiresAt = new Date(now.getTime() + SESSION_USER_CACHE_TTL_MS);
  await upsertArenaSessionUser({
    sessionKey,
    userId: user.id,
    displayName: user.display_name,
    email: user.email,
    avatarUrl: user.avatar_url,
    metadata: {},
    expiresAt,
  });
  return user;
}

/**
 * Resolves user from main-domain session cookie, fetches arena profile.
 * Throws Error with message on failure (no session, main domain error, arena error).
 */
export async function getProfile(): Promise<GetProfileResult> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    throw new Error("未登录或 session 已过期");
  }

  const user = await fetchMainDomainUser(sessionCookie.value);

  const arenaBase = process.env.ARENA_API_BASE;
  if (!arenaBase) {
    throw new Error("ARENA_API_BASE is not configured");
  }

  const profileUrl = `${arenaBase.replace(TRAILING_SLASH, "")}/api/v1/arena/profile`;
  const profileRes = await fetch(profileUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": user.id,
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });
  const profileData = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok) {
    throw new Error(
      (profileData && typeof profileData.message === "string"
        ? profileData.message
        : null) ?? "Profile request failed"
    );
  }

  const arenaProfileRaw =
    profileData &&
    typeof profileData === "object" &&
    "data" in profileData &&
    profileData.data != null
      ? profileData.data
      : profileData;

  const arenaProfile = parseArenaProfile(arenaProfileRaw);
  if (!arenaProfile) {
    throw new Error("Invalid arena profile response");
  }

  return {
    user,
    arenaProfile,
  };
}
