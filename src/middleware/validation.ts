import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateInput, createValidationResponse, sanitizeString } from '@/lib/validation';

// ===== SCHEMAS DE VALIDAÇÃO POR ROTA =====

const routeSchemas: Record<string, z.ZodSchema> = {
  '/api/send-invite': z.object({
    email: z.string().email('Email inválido'),
    role: z.enum(['admin', 'member'], {
      errorMap: () => ({ message: 'Role deve ser admin ou member' })
    })
  })
  // Outras rotas serão adicionadas conforme necessário
};

// ===== MIDDLEWARE DE VALIDAÇÃO =====

export function validateAPIRoute(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  
  // Verificar se a rota tem schema de validação
  const schema = routeSchemas[pathname];
  if (!schema) {
    return null; // Rota não precisa de validação
  }

  // Apenas validar métodos que enviam dados
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return null;
  }

  try {
    // Verificar Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return createValidationResponse(['Content-Type deve ser application/json'], 400);
    }

    // Verificar tamanho da requisição
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) { // 5MB
      return createValidationResponse(['Requisição muito grande'], 413);
    }

    // A validação dos dados será feita no handler da rota
    // Este middleware apenas verifica aspectos básicos
    
    return null; // Continua para o handler da rota
    
  } catch (error) {
    return createValidationResponse(['Erro na validação da requisição'], 400);
  }
}

// ===== VALIDAÇÃO DE HEADERS =====

export function validateHeaders(req: NextRequest): NextResponse | null {
  const requiredHeaders = {
    'user-agent': req.headers.get('user-agent'),
    'accept': req.headers.get('accept')
  };

  // Verificar se headers obrigatórios estão presentes
  for (const [header, value] of Object.entries(requiredHeaders)) {
    if (!value) {
      return createValidationResponse([`Header ${header} é obrigatório`], 400);
    }
  }

  // Verificar se User-Agent não é suspeito
  const userAgent = requiredHeaders['user-agent'];
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious) {
    console.warn('Suspicious User-Agent detected:', userAgent);
    // Em produção, você pode querer bloquear ou rate-limit estes requests
  }

  return null;
}

// ===== VALIDAÇÃO DE ORIGEM =====

export function validateOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  // Lista de origens permitidas
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
    'http://localhost:3000',
    'http://localhost:9002',
    'https://zonafiscal.com.br',
    'https://www.zonafiscal.com.br'
  ];

  // Para requests de API, verificar origem
  if (req.nextUrl.pathname.startsWith('/api/')) {
    if (!origin && !referer) {
      return createValidationResponse(['Origem da requisição não identificada'], 400);
    }

    const requestOrigin = origin || (referer ? new URL(referer).origin : null);
    
    if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
      console.warn('Request from unauthorized origin:', requestOrigin);
      return createValidationResponse(['Origem não autorizada'], 403);
    }
  }

  return null;
}

// ===== VALIDAÇÃO DE RATE LIMITING =====

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function validateRateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxRequests = 100; // 100 requests por minuto por IP

  const key = `${ip}:${Math.floor(now / windowMs)}`;
  const current = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > current.resetTime) {
    // Reset do contador
    current.count = 0;
    current.resetTime = now + windowMs;
  }

  current.count++;
  requestCounts.set(key, current);

  if (current.count > maxRequests) {
    return createValidationResponse([
      'Muitas requisições. Tente novamente em alguns minutos.'
    ], 429);
  }

  return null;
}

// ===== MIDDLEWARE PRINCIPAL =====

export function validationMiddleware(req: NextRequest): NextResponse | null {
  // 1. Validar headers
  const headerValidation = validateHeaders(req);
  if (headerValidation) return headerValidation;

  // 2. Validar origem
  const originValidation = validateOrigin(req);
  if (originValidation) return originValidation;

  // 3. Validar rate limiting
  const rateLimitValidation = validateRateLimit(req);
  if (rateLimitValidation) return rateLimitValidation;

  // 4. Validar rota específica
  const routeValidation = validateAPIRoute(req);
  if (routeValidation) return routeValidation;

  return null; // Continua para o próximo middleware/handler
}

// ===== UTILITÁRIOS =====

export function sanitizeRequestBody(body: any): any {
  if (typeof body === 'string') {
    return sanitizeString(body);
  }
  
  if (Array.isArray(body)) {
    return body.map(sanitizeRequestBody);
  }
  
  if (body && typeof body === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(body)) {
      sanitized[sanitizeString(key)] = sanitizeRequestBody(value);
    }
    return sanitized;
  }
  
  return body;
}

export function logValidationEvent(
  event: string,
  details: any,
  req: NextRequest
) {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    method: req.method,
    url: req.url
  };

  console.warn('VALIDATION EVENT:', logData);
  
  // Enviar para Sentry se disponível
  if (typeof window === 'undefined') {
    import('@sentry/nextjs').then(Sentry => {
      Sentry.captureMessage(`Validation Event: ${event}`, 'warning');
    }).catch(() => {
      // Sentry não disponível, ignorar
    });
  }
}
