// src/middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/api/webhooks']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // API webhook paths should always be accessible
  if (pathname.startsWith('/api/webhooks/')) {
    return res
  }

  // Redirect to login if trying to access protected route without session
  if (!session && !isPublicPath) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to inbox if logged in user tries to access auth pages
  if (session && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    return NextResponse.redirect(new URL('/inbox', request.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}