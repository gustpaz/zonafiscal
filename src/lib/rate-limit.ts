// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Verificar se as variáveis de ambiente estão configuradas
const isUpstashConfigured = 
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN;

// Criar instância do Redis
const redis = isUpstashConfigured 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Fallback em memória se Upstash não estiver configurado (apenas para desenvolvimento)
class MemoryRatelimit {
  private cache = new Map<string, { count: number; resetAt: number }>();
  
  constructor(private limit: number, private windowMs: number) {}
  
  async limit(identifier: string) {
    const now = Date.now();
    const entry = this.cache.get(identifier);
    
    if (!entry || now > entry.resetAt) {
      this.cache.set(identifier, { count: 1, resetAt: now + this.windowMs });
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        reset: now + this.windowMs,
      };
    }
    
    entry.count++;
    
    if (entry.count > this.limit) {
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: entry.resetAt,
      };
    }
    
    return {
      success: true,
      limit: this.limit,
      remaining: this.limit - entry.count,
      reset: entry.resetAt,
    };
  }
}

// Rate limiters diferentes para diferentes casos de uso

// 1. Global API - 100 requests por minuto
export const globalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'rl:global',
    })
  : new MemoryRatelimit(100, 60 * 1000);

// 2. Autenticação - 5 tentativas a cada 15 minutos
export const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'rl:auth',
    })
  : new MemoryRatelimit(5, 15 * 60 * 1000);

// 3. IA - 10 gerações por hora
export const aiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
      prefix: 'rl:ai',
    })
  : new MemoryRatelimit(10, 60 * 60 * 1000);

// 4. Transações - 50 criações por minuto (prevenção de spam)
export const transactionLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(50, '1 m'),
      analytics: true,
      prefix: 'rl:transactions',
    })
  : new MemoryRatelimit(50, 60 * 1000);

// 5. Email - 5 emails por hora (convites, suporte)
export const emailLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'),
      analytics: true,
      prefix: 'rl:email',
    })
  : new MemoryRatelimit(5, 60 * 60 * 1000);

// Helper para obter identificador (IP ou userId)
export function getIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  
  // Tentar obter IP de vários headers (para proxies/CDN)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

// Função auxiliar para criar resposta de rate limit
export function createRateLimitResponse(
  message: string = 'Muitas requisições. Tente novamente mais tarde.',
  limit?: number,
  remaining?: number,
  reset?: number
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (limit !== undefined) headers['X-RateLimit-Limit'] = limit.toString();
  if (remaining !== undefined) headers['X-RateLimit-Remaining'] = remaining.toString();
  if (reset !== undefined) headers['X-RateLimit-Reset'] = new Date(reset).toISOString();
  
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 429,
      headers,
    }
  );
}

// Verificar se rate limiting está habilitado
export function isRateLimitEnabled(): boolean {
  return isUpstashConfigured || process.env.NODE_ENV === 'development';
}

