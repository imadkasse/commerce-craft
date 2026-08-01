import { cookies } from "next/headers";
import { verifyToken, type JWTPayload } from "./jwt";

const COOKIE_NAME = "commercecraft_token";

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function getTokenFromRequest(request: Request): JWTPayload | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const regex = new RegExp(`${COOKIE_NAME}=([^;]+)`);
  const match = cookieHeader.match(regex);
  if (!match) return null;
  return verifyToken(match[1]);
}

export { COOKIE_NAME };
