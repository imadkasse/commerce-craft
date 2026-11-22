import jwt from "jsonwebtoken";

export interface JWTPayload {
  userId: string;
  email: string;
  role: "SUPERADMIN" | "ADMIN";
  storeId?: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

export function signToken(payload: JWTPayload): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  const secret = getJwtSecret();
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch {
    return null;
  }
}
