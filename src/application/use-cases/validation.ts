import type { ZodSchema } from 'zod';
import { ValidationError } from './errors';

/** Parses untrusted input with a zod schema, throwing a friendly ValidationError. */
export function parseOrThrow<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ValidationError(first ? first.message : 'Invalid input');
  }
  return result.data;
}

/**
 * Generates a UUID v4 with graceful fallbacks.
 *
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost).
 * When the PWA is opened from a LAN IP (e.g. http://192.168.1.10:3000) it is
 * NOT a secure context, so that method is undefined. We therefore fall back to
 * a UUID v4 built from `crypto.getRandomValues` (available in insecure contexts
 * too), and finally to `Math.random` for the unlikely case crypto is absent
 * entirely (e.g. some SSR/worker environments).
 */
export function newId(): string {
  const hasCrypto = typeof crypto !== 'undefined';

  if (hasCrypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (hasCrypto && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  // Set the UUID v4 bits: version 4 + RFC 4122 variant.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}