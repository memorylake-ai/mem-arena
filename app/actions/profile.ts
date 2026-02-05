"use server";

import { cookies } from "next/headers";
import type { ArenaProfileData } from "@/lib/memorylake/profile";
import { isMemorylakeProfile } from "@/lib/memorylake/profile";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session";
const TRAILING_SLASH = /\/$/;

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

  const mainBase = process.env.MAIN_DOMAIN_API_URL;
  if (!mainBase) {
    throw new Error("MAIN_DOMAIN_API_URL is not configured");
  }

  const meUrl = `${mainBase.replace(TRAILING_SLASH, "")}/api/user/self`;
  const meRes = await fetch(meUrl, {
    method: "GET",
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
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

  const arenaBase = process.env.ARENA_API_BASE;
  if (!arenaBase) {
    throw new Error("ARENA_API_BASE is not configured");
  }

  const profileUrl = `${arenaBase.replace(TRAILING_SLASH, "")}/api/v1/arena/profile`;
  const profileRes = await fetch(profileUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": meData.data.id,
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
    user: meData.data,
    arenaProfile,
  };
}
