import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateVerificationToken(): { token: string; expiry: Date } {
  const token = generateToken();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // Token valid for 24 hours
  return { token, expiry };
}

export function generateResetToken(): { token: string; expiry: Date } {
  const token = generateToken();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // Token valid for 1 hour
  return { token, expiry };
}

export function getUserDisplayName(user: { firstName?: string | null; lastName?: string | null; email?: string | null }): string {
  const firstName = user.firstName?.trim();
  const lastName = user.lastName?.trim();
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  } else if (user.email) {
    return user.email;
  }
  
  return 'Someone';
}
