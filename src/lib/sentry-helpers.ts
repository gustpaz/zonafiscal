// src/lib/sentry-helpers.ts
import * as Sentry from '@sentry/nextjs';

/**
 * Captura erros de autenticação
 */
export function captureAuthError(error: Error, context?: {
  userId?: string;
  email?: string;
  action?: 'login' | 'signup' | 'logout' | 'password-reset';
}) {
  Sentry.captureException(error, {
    tags: {
      category: 'auth',
      action: context?.action || 'unknown',
    },
    user: context?.userId ? { id: context.userId, email: context.email } : undefined,
    level: 'error',
  });
}

/**
 * Captura erros de pagamento (Stripe)
 */
export function capturePaymentError(error: Error, context: {
  userId: string;
  amount?: number;
  planName?: string;
  stripeCustomerId?: string;
}) {
  Sentry.captureException(error, {
    tags: {
      category: 'payment',
      plan: context.planName,
    },
    user: { id: context.userId },
    extra: {
      amount: context.amount,
      stripeCustomerId: context.stripeCustomerId,
    },
    level: 'error',
  });
}

/**
 * Captura eventos de segurança suspeitos
 */
export function captureSecurityEvent(
  message: string, 
  severity: 'warning' | 'error' | 'critical',
  context?: {
    ip?: string;
    userId?: string;
    action?: string;
  }
) {
  Sentry.captureMessage(message, {
    level: severity,
    tags: {
      category: 'security',
      action: context?.action || 'unknown',
    },
    extra: {
      ip: context?.ip,
      userId: context?.userId,
    },
  });
}

/**
 * Captura erros de API externa (Google AI, Stripe, etc)
 */
export function captureExternalAPIError(error: Error, context: {
  service: 'google-ai' | 'stripe' | 'firebase' | 'upstash' | 'cloudinary' | 'resend';
  endpoint?: string;
  userId?: string;
}) {
  Sentry.captureException(error, {
    tags: {
      category: 'external-api',
      service: context.service,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      endpoint: context.endpoint,
    },
    level: 'error',
  });
}

/**
 * Captura erros de banco de dados (Firestore)
 */
export function captureDatabaseError(error: Error, context: {
  operation: 'read' | 'write' | 'update' | 'delete' | 'query';
  collection: string;
  userId?: string;
}) {
  Sentry.captureException(error, {
    tags: {
      category: 'database',
      operation: context.operation,
      collection: context.collection,
    },
    user: context.userId ? { id: context.userId } : undefined,
    level: 'error',
  });
}

/**
 * Captura erros de validação de entrada
 */
export function captureValidationError(error: Error, context: {
  field?: string;
  value?: any;
  userId?: string;
}) {
  Sentry.captureException(error, {
    tags: {
      category: 'validation',
      field: context.field,
    },
    user: context.userId ? { id: context.userId } : undefined,
    extra: {
      invalidValue: context.value,
    },
    level: 'warning',
  });
}

/**
 * Captura performance issues
 */
export function capturePerformanceIssue(
  message: string,
  context: {
    operation: string;
    duration: number;
    threshold: number;
  }
) {
  Sentry.captureMessage(message, {
    level: 'warning',
    tags: {
      category: 'performance',
      operation: context.operation,
    },
    extra: {
      duration: context.duration,
      threshold: context.threshold,
      exceeded_by: context.duration - context.threshold,
    },
  });
}

/**
 * Adiciona contexto do usuário ao Sentry
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  name?: string;
  plan?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });

  Sentry.setTag('user_plan', user.plan || 'unknown');
}

/**
 * Remove contexto do usuário (logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Adiciona breadcrumb customizado
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
}

/**
 * Wrapper para async functions com error handling
 */
export function withSentryErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  errorHandler?: (error: Error) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      Sentry.captureException(error);
      if (errorHandler) {
        errorHandler(error as Error);
      }
      throw error;
    }
  }) as T;
}

/**
 * Inicia span de performance
 */
export function startPerformanceSpan(name: string, op: string) {
  return Sentry.startSpan({
    name,
    op,
  }, (span) => {
    return span;
  });
}

/**
 * Captura erro e retorna mensagem amigável para o usuário
 */
export function captureAndFormatError(error: Error, userMessage?: string): string {
  Sentry.captureException(error);
  
  // Em produção, não expor detalhes técnicos
  if (process.env.NODE_ENV === 'production') {
    return userMessage || 'Ocorreu um erro. Nossa equipe foi notificada.';
  }
  
  // Em desenvolvimento, mostrar erro real
  return error.message;
}

