import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db, session } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Invalidate session via Better Auth API
    try {
      await auth.api.signOut({
        headers: req.headers,
        asResponse: true,
      });
    } catch (authErr) {
      // Continue to ensure database cleanup and cookie expiration
      console.warn('Better Auth server signOut encountered warning:', authErr);
    }

    // 2. Extract session token from cookie header and ensure session deletion from database
    const cookieHeader = req.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/);
    if (tokenMatch) {
      const rawCookieVal = decodeURIComponent(tokenMatch[1]);
      const token = rawCookieVal.split('.')[0];
      if (token) {
        await db.delete(session).where(eq(session.token, token)).catch((dbErr) => {
          console.warn('Direct database session deletion warning:', dbErr);
        });
      }
    }

    const response = NextResponse.json({ success: true, message: 'Signed out successfully' });

    // 3. Explicitly clear all Better Auth cookies (both HTTP and Secure HTTPS variants)
    const cookieNames = [
      'better-auth.session_token',
      '__Secure-better-auth.session_token',
      'better-auth.session_data',
      '__Secure-better-auth.session_data',
      'better-auth.dont_remember',
      '__Secure-better-auth.dont_remember',
      'better-auth.account_data',
      '__Secure-better-auth.account_data',
    ];

    for (const name of cookieNames) {
      response.cookies.set({
        name,
        value: '',
        path: '/',
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        sameSite: 'lax',
        secure: name.startsWith('__Secure-') || process.env.NODE_ENV === 'production',
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to sign out' },
      { status: 500 }
    );
  }
}
