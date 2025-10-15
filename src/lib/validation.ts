import { z } from 'zod';
import validator from 'validator';

// ===== SCHEMAS DE VALIDAÇÃO =====

// Usuário
export const userSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'),
});

// Empresa
export const companySchema = z.object({
  name: z.string()
    .min(2, 'Nome da empresa deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da empresa muito longo')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-\.]+$/, 'Nome da empresa contém caracteres inválidos'),
  
  cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX')
    .refine((cnpj) => validateCNPJ(cnpj), 'CNPJ inválido'),
  
  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (XX) XXXXX-XXXX')
    .optional(),
});

// Convite de equipe
export const inviteSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role deve ser admin ou member' })
  }),
});

// Configurações do Slack
export const slackConfigSchema = z.object({
  botToken: z.string()
    .regex(/^xoxb-[a-zA-Z0-9-]+$/, 'Token do Slack inválido')
    .optional(),
  
  channelId: z.string()
    .regex(/^[#@][a-zA-Z0-9_-]+$/, 'Channel ID inválido (deve começar com # ou @)')
    .optional(),
  
  enabled: z.boolean().optional(),
});

// Relatório financeiro
export const reportSchema = z.object({
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  
  categories: z.array(z.string()).optional(),
});

// Transação
export const transactionSchema = z.object({
  amount: z.number()
    .positive('Valor deve ser positivo')
    .max(999999.99, 'Valor muito alto'),
  
  description: z.string()
    .min(1, 'Descrição é obrigatória')
    .max(500, 'Descrição muito longa'),
  
  category: z.string()
    .min(1, 'Categoria é obrigatória')
    .max(50, 'Categoria muito longa'),
  
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Tipo deve ser income ou expense' })
  }),
});

// ===== FUNÇÕES DE VALIDAÇÃO =====

export function validateCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cleanCNPJ[12]) !== firstDigit) return false;
  
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(cleanCNPJ[13]) === secondDigit;
}

export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cleanCPF[9]) !== firstDigit) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(cleanCPF[10]) === secondDigit;
}

// ===== SANITIZAÇÃO =====

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < e > para prevenir XSS
    .replace(/\s+/g, ' '); // Normaliza espaços
}

export function sanitizeEmail(email: string): string {
  return validator.normalizeEmail(email, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false,
  }) || email;
}

export function sanitizeHTML(input: string): string {
  // Remove tags HTML perigosas mas mantém formatação básica
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>.*?<\/embed>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '');
}

// ===== VALIDAÇÃO DE TIPOS =====

export function validateEmail(email: string): boolean {
  return validator.isEmail(email) && email.length <= 255;
}

export function validatePassword(password: string): boolean {
  return password.length >= 8 && 
         password.length <= 128 && 
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
}

export function validatePhone(phone: string): boolean {
  return validator.isMobilePhone(phone, 'pt-BR');
}

export function validateURL(url: string): boolean {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
  });
}

// ===== HELPERS DE VALIDAÇÃO =====

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => err.message);
      return { success: false, errors };
    }
  } catch (error) {
    return { 
      success: false, 
      errors: ['Erro interno de validação'] 
    };
  }
}

export function createValidationResponse(errors: string[], statusCode = 400) {
  return Response.json(
    { 
      error: 'Dados inválidos',
      details: errors,
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  );
}

// ===== CONSTANTES DE SEGURANÇA =====

export const SECURITY_LIMITS = {
  MAX_STRING_LENGTH: 1000,
  MAX_EMAIL_LENGTH: 255,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  MAX_REQUEST_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ARRAY_LENGTH: 100,
} as const;

// ===== VALIDAÇÃO DE ARQUIVOS =====

export function validateFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (file.size > SECURITY_LIMITS.MAX_FILE_SIZE) {
    return { valid: false, error: 'Arquivo muito grande' };
  }
  
  if (!SECURITY_LIMITS.ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido' };
  }
  
  return { valid: true };
}

// ===== VALIDAÇÃO DE REQUEST =====

export function validateRequestSize(contentLength: string | null): boolean {
  if (!contentLength) return true;
  
  const size = parseInt(contentLength);
  return size <= SECURITY_LIMITS.MAX_REQUEST_SIZE;
}
