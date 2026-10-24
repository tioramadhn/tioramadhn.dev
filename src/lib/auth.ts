import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSecret } from '@/lib/env';

export const SESSION_COOKIE = 'tio_admin_session';
const SESSION_DAYS = 7;

async function signingKey(): Promise<Uint8Array> {
  const secret = await getSecret('AUTH_SECRET');

  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Set it in `.dev.vars` locally and with `pnpm wrangler secret put AUTH_SECRET` in production.'
    );
  }

  return new TextEncoder().encode(secret);
}

/** Constant-time comparison so a wrong password leaks no length/prefix timing. */
function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);

  // Compare a fixed number of bytes regardless of the inputs' lengths.
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }

  return diff === 0;
}

export async function verifyPassword(candidate: string): Promise<boolean> {
  const expected = await getSecret('ADMIN_PASSWORD');

  if (!expected) {
    throw new Error(
      'ADMIN_PASSWORD is not set. Add it to `.dev.vars` locally and with `pnpm wrangler secret put ADMIN_PASSWORD` in production.'
    );
  }

  return safeEqual(candidate, expected);
}

export async function startSession(): Promise<void> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(await signingKey());

  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, await signingKey());
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Guard for every admin page and every write path. The adapter does not support
 * Node middleware yet, so authorisation is enforced here rather than in
 * `proxy.ts` — which means it has to be called in each server action too.
 */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect('/admin/login');
  }
}
