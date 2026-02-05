/**
 * Canonical type for Memory Lake profile ids (request headers: x-memorylake-org-id, etc.).
 */
export interface MemorylakeProfile {
  mem0rgId: string;
  mem0ProjId: string;
  datasetId: string;
}

/** Arena profile from POST /api/v1/arena/profile (Memory Lake ids + optional projId). */
export type ArenaProfileData = MemorylakeProfile & { projId?: string };

const REQUIRED_KEYS: (keyof MemorylakeProfile)[] = [
  "mem0rgId",
  "mem0ProjId",
  "datasetId",
];

function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard: true if value has required MemorylakeProfile string fields.
 */
export function isMemorylakeProfile(
  value: unknown
): value is MemorylakeProfile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  return REQUIRED_KEYS.every(
    (key) => key in o && isString(o[key]) && (o[key] as string).length > 0
  );
}

/**
 * Parses unknown input into MemorylakeProfile or undefined.
 */
export function parseMemorylakeProfile(
  value: unknown
): MemorylakeProfile | undefined {
  if (!isMemorylakeProfile(value)) {
    return undefined;
  }
  return {
    mem0rgId: value.mem0rgId,
    mem0ProjId: value.mem0ProjId,
    datasetId: value.datasetId,
  };
}

/**
 * Builds request headers for Memory Lake API from a valid profile.
 */
export function memorylakeProfileToHeaders(
  profile: MemorylakeProfile
): Record<string, string> {
  return {
    "x-memorylake-org-id": profile.mem0rgId,
    "x-memorylake-project-id": profile.mem0ProjId,
    "x-memorylake-dataset-id": profile.datasetId,
  };
}
