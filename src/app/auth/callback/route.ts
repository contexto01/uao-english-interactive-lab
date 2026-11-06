import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL('/login?error=oauth', request.url));
  }

  const code = request.nextUrl.searchParams.get('code');
  const requestedNext = request.nextUrl.searchParams.get('next') ?? '/';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';

  if (!code) return NextResponse.redirect(new URL('/login?error=oauth', request.url));

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return NextResponse.redirect(new URL('/login?error=oauth', request.url));

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const email = userData.user?.email?.toLowerCase() ?? '';
  if (userError || !email.endsWith('@uao.edu.co')) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=domain', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
