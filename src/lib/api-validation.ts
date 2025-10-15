import { NextRequest } from 'next/server';
import { z } from 'zod';
import { 
  validateInput, 
  createValidationResponse, 
  validateRequestSize,
  sanitizeString,
  sanitizeEmail 
} from './validation';

// ===== MIDDLEWARE DE VALIDAÇÃO =====

export function withValidation<T>(
  schema: z.ZodSchema<T>,
  options: {
    requireAuth?: boolean;
    sanitize?: boolean;
    maxSize?: number;
  } = {}
) {
  return function validationMiddleware(
    handler: (req: NextRequest, validatedData: T) => Promise<Response>
  ) {
    return async (req: NextRequest): Promise<Response> => {
      try {
        // 1. Verificar tamanho da requisição
        const contentLength = req.headers.get('content-length');
        if (contentLength && !validateRequestSize(contentLength)) {
          return createValidationResponse(['Requisição muito grande'], 413);
        }

        // 2. Verificar método HTTP
        if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
          return createValidationResponse(['Método HTTP não permitido'], 405);
        }

        // 3. Verificar Content-Type
        const contentType = req.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return createValidationResponse(['Content-Type deve ser application/json'], 400);
        }

        // 4. Extrair e validar dados
        let rawData;
        try {
          rawData = await req.json();
        } catch (error) {
          return createValidationResponse(['JSON inválido'], 400);
        }

        // 5. Sanitizar dados se solicitado
        if (options.sanitize) {
          rawData = sanitizeData(rawData);
        }

        // 6. Validar dados com schema
        const validation = validateInput(schema, rawData);
        
        if (!validation.success) {
          return createValidationResponse(validation.errors || ['Dados inválidos']);
        }

        // 7. Verificar autenticação se necessário
        if (options.requireAuth) {
          const authHeader = req.headers.get('authorization');
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return createValidationResponse(['Token de autenticação necessário'], 401);
          }
        }

        // 8. Chamar handler com dados validados
        return await handler(req, validation.data!);

      } catch (error) {
        console.error('Erro na validação:', error);
        return createValidationResponse(['Erro interno do servidor'], 500);
      }
    };
  };
}

// ===== SANITIZAÇÃO DE DADOS =====

function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeString(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Sanitizar chave
      const cleanKey = sanitizeString(key);
      
      // Sanitizar valor
      if (key === 'email' && typeof value === 'string') {
        sanitized[cleanKey] = sanitizeEmail(value);
      } else {
        sanitized[cleanKey] = sanitizeData(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

// ===== VALIDAÇÃO DE PARÂMETROS DE ROTA =====

export function validateRouteParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string | string[] | undefined>
): {
  success: boolean;
  data?: T;
  error?: Response;
} {
  try {
    // Converter params para objeto simples
    const cleanParams: any = {};
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        cleanParams[key] = value[0]; // Pegar primeiro valor se for array
      } else {
        cleanParams[key] = value;
      }
    }

    const validation = validateInput(schema, cleanParams);
    
    if (!validation.success) {
      return {
        success: false,
        error: createValidationResponse(validation.errors || ['Parâmetros inválidos'])
      };
    }

    return { success: true, data: validation.data };

  } catch (error) {
    return {
      success: false,
      error: createValidationResponse(['Erro na validação de parâmetros'], 500)
    };
  }
}

// ===== VALIDAÇÃO DE QUERY PARAMETERS =====

export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): {
  success: boolean;
  data?: T;
  error?: Response;
} {
  try {
    const queryObject: any = {};
    
    for (const [key, value] of searchParams.entries()) {
      queryObject[key] = value;
    }

    const validation = validateInput(schema, queryObject);
    
    if (!validation.success) {
      return {
        success: false,
        error: createValidationResponse(validation.errors || ['Query parameters inválidos'])
      };
    }

    return { success: true, data: validation.data };

  } catch (error) {
    return {
      success: false,
      error: createValidationResponse(['Erro na validação de query parameters'], 500)
    };
  }
}

// ===== SCHEMAS COMUNS PARA PARÂMETROS =====

export const idParamSchema = z.object({
  id: z.string()
    .min(1, 'ID é obrigatório')
    .max(100, 'ID muito longo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID contém caracteres inválidos')
});

export const paginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Página deve ser um número')
    .transform(Number)
    .refine(n => n > 0, 'Página deve ser maior que 0')
    .default('1'),
  
  limit: z.string()
    .regex(/^\d+$/, 'Limite deve ser um número')
    .transform(Number)
    .refine(n => n > 0 && n <= 100, 'Limite deve estar entre 1 e 100')
    .default('10')
});

export const searchSchema = z.object({
  q: z.string()
    .min(1, 'Termo de busca é obrigatório')
    .max(100, 'Termo de busca muito longo')
    .regex(/^[a-zA-Z0-9À-ÿ\s]+$/, 'Termo de busca contém caracteres inválidos')
});

// ===== HELPERS DE VALIDAÇÃO =====

export function createSuccessResponse(data: any, statusCode = 200) {
  return Response.json(data, { status: statusCode });
}

export function createErrorResponse(
  message: string, 
  statusCode = 400, 
  details?: any
) {
  return Response.json(
    {
      error: message,
      details,
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  );
}

// ===== VALIDAÇÃO DE CORS =====

export function validateCORS(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
    'http://localhost:3000',
    'http://localhost:9002'
  ];

  if (!origin) return false;
  
  return allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  );
}

// ===== VALIDAÇÃO DE RATE LIMITING =====

export function validateRateLimit(
  req: NextRequest,
  identifier: string,
  limit: number,
  windowMs: number
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  // Esta função seria integrada com o sistema de rate limiting existente
  // Por enquanto, retorna sempre permitido
  return {
    allowed: true,
    remaining: limit - 1,
    resetTime: Date.now() + windowMs
  };
}

// ===== LOGGING DE SEGURANÇA =====

export function logSecurityEvent(
  event: string,
  details: any,
  req: NextRequest
) {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    method: req.method,
    url: req.url
  };

  // Em produção, isso seria enviado para um sistema de logging
  console.warn('SECURITY EVENT:', securityLog);
  
  // Também enviar para Sentry se disponível
  if (typeof window === 'undefined') {
    // Server-side
    import('@sentry/nextjs').then(Sentry => {
      Sentry.captureMessage(`Security Event: ${event}`, 'warning');
    }).catch(() => {
      // Sentry não disponível, ignorar
    });
  }
}
