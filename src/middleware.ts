// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  authLimiter, 
  aiLimiter, 
  globalLimiter,
  getIdentifier,
  createRateLimitResponse,
  isRateLimitEnabled
} from './lib/rate-limit';

export async function middleware(request: NextRequest) {
  // Se rate limiting não estiver configurado, apenas continuar
  if (!isRateLimitEnabled()) {
    console.warn('⚠️ Rate limiting não configurado. Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN');
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const identifier = getIdentifier(request);

  try {
    // 1. Rate limiting para rotas de autenticação
    if (
      pathname === '/login' || 
      pathname === '/signup' ||
      pathname.startsWith('/api/auth')
    ) {
      const { success, limit, remaining, reset } = await authLimiter.limit(identifier);
      
      if (!success) {
        console.warn(`🚫 Rate limit atingido em auth: ${identifier}`);
        return createRateLimitResponse(
          'Muitas tentativas de login. Por favor, aguarde 15 minutos antes de tentar novamente.',
          limit,
          remaining,
          reset
        );
      }
      
      // Adicionar headers informativos
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());
      return response;
    }

    // 2. Rate limiting para rotas de IA
    if (
      pathname.includes('/generate-report') ||
      pathname.startsWith('/api/ai') ||
      pathname.includes('/categorize')
    ) {
      const { success, limit, remaining, reset } = await aiLimiter.limit(identifier);
      
      if (!success) {
        console.warn(`🚫 Rate limit atingido em IA: ${identifier}`);
        return createRateLimitResponse(
          'Limite de gerações de IA atingido. Aguarde 1 hora antes de tentar novamente.',
          limit,
          remaining,
          reset
        );
      }
      
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      return response;
    }

    // 3. Rate limiting global para outras APIs
    if (pathname.startsWith('/api/')) {
      // Excluir webhooks (eles têm sua própria autenticação)
      if (pathname.includes('webhook') || pathname.includes('/stripe/')) {
        return NextResponse.next();
      }

      const { success, limit, remaining, reset } = await globalLimiter.limit(identifier);
      
      if (!success) {
        console.warn(`🚫 Rate limit global atingido: ${identifier}`);
        return createRateLimitResponse(
          'Muitas requisições. Por favor, aguarde um momento.',
          limit,
          remaining,
          reset
        );
      }
      
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      return response;
    }

    // 4. Páginas públicas sem rate limit (mas monitora)
    return NextResponse.next();

  } catch (error) {
    // Em caso de erro no rate limiter, permitir requisição (fail open)
    console.error('❌ Erro no rate limiter:', error);
    return NextResponse.next();
  }
}

// Configurar em quais rotas o middleware deve rodar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|logos|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

