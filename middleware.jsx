import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token'
    });

    const isAuth = !!token;
    const userRole = token?.role;

    // Debug logging (remove in production)
    console.log('Middleware:', {
      pathname,
      isAuth,
      userRole,
      tokenExists: !!token,
      userId: token?.id || token?.sub
    });

    // Define public routes
    const publicRoutes = ["/", "/login", "/register"];
    const isPublicRoute = publicRoutes.includes(pathname);

    // Handle public routes
    if (isPublicRoute) {
      // If authenticated user tries to access login/register, redirect to dashboard
      if (isAuth && (pathname === "/login" || pathname === "/register")) {
        console.log('Authenticated user accessing auth page, redirecting to dashboard');
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      // Allow access to public routes
      return NextResponse.next();
    }

    // Protect private routes - redirect to login if not authenticated
    if (!isAuth) {
      console.log('Unauthenticated user accessing private route, redirecting to login');
      const loginUrl = new URL("/login", req.url);
      // Optionally add return URL
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access control
    const managerOnlyRoutes = ["/company", "/users", "/employees"];
    const isManagerOnlyRoute = managerOnlyRoutes.some(route => 
      pathname.startsWith(route)
    );

    if (isManagerOnlyRoute && userRole !== "MANAGER") {
      console.log('Non-manager accessing manager route, redirecting to dashboard');
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Allow access to protected routes
    console.log('Access granted to:', pathname);
    return NextResponse.next();

  } catch (error) {
    console.error('Middleware error:', error);
    // If there's an error getting the token, redirect to login
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};