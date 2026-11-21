/**
 * Team service.
 *
 * There is only a list (`GET`) and invite (`POST`) endpoint today; the UI's
 * "remove" action is local-only, so the service exposes a pure `removeLocal`
 * helper instead of inventing a DELETE request.
 */

import { ApiError, apiFetch } from "./http";

export interface TeamMember {
  id: string;
  role: string;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
}

export interface InviteMemberInput {
  email: string;
  name: string;
  role: string;
}

interface TeamListResponse {
  members: TeamMember[];
}

interface InviteMemberResponse {
  member: TeamMember;
}

/** `GET /api/team` */
export async function list(): Promise<TeamMember[]> {
  const data = await apiFetch<TeamListResponse>("/api/team");
  return data.members || [];
}

/** `POST /api/team` */
export async function invite(input: InviteMemberInput): Promise<TeamMember> {
  const data = await apiFetch<InviteMemberResponse>("/api/team", {
    method: "POST",
    body: input,
  });
  return data.member;
}

/**
 * Pure local removal — there is no DELETE endpoint. Mirrors the page's
 * `setMembers((prev) => prev.filter(...))`.
 */
export function removeLocal(
  members: TeamMember[],
  memberId: string,
): TeamMember[] {
  return members.filter((member) => member.id !== memberId);
}

function readErrorField(data: unknown): string | null {
  if (data !== null && typeof data === "object") {
    const value = (data as { error?: unknown }).error;
    if (typeof value === "string" && value) return value;
  }
  return null;
}

/**
 * Error message for inviting a member, mirroring the original inline
 * handling: API `error` field first, then the fallback, and `"Network error"`
 * for transport failures.
 */
export function getTeamErrorMessage(
  error: unknown,
  fallback = "Failed to invite member",
): string {
  if (error instanceof ApiError) {
    if (error.data === null || error.data === undefined) {
      return "Network error";
    }
    return readErrorField(error.data) ?? fallback;
  }
  return "Network error";
}

export const teamService = {
  list,
  invite,
  removeLocal,
};
