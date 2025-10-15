"use client";

import { useState, useCallback } from 'react';
import { z } from 'zod';

// ===== TIPOS =====

interface ValidationError {
  field: string;
  message: string;
}

interface UseValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit?: (data: T) => void | Promise<void>;
  initialData?: Partial<T>;
}

interface UseValidationReturn<T> {
  data: Partial<T>;
  errors: ValidationError[];
  isValid: boolean;
  isSubmitting: boolean;
  setField: (field: keyof T, value: any) => void;
  setData: (data: Partial<T>) => void;
  validate: () => boolean;
  validateField: (field: keyof T) => boolean;
  submit: () => Promise<void>;
  reset: () => void;
  clearErrors: () => void;
}

// ===== HOOK PRINCIPAL =====

export function useValidation<T extends Record<string, any>>({
  schema,
  onSubmit,
  initialData = {}
}: UseValidationOptions<T>): UseValidationReturn<T> {
  
  const [data, setDataState] = useState<Partial<T>>(initialData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== FUNÇÕES AUXILIARES =====

  const parseErrors = (zodErrors: z.ZodError): ValidationError[] => {
    return zodErrors.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message
    }));
  };

  const clearFieldError = (field: string) => {
    setErrors(prev => prev.filter(error => error.field !== field));
  };

  // ===== FUNÇÕES PÚBLICAS =====

  const setField = useCallback((field: keyof T, value: any) => {
    setDataState(prev => ({ ...prev, [field]: value }));
    clearFieldError(field as string);
  }, []);

  const setData = useCallback((newData: Partial<T>) => {
    setDataState(prev => ({ ...prev, ...newData }));
    // Limpar erros dos campos que foram atualizados
    const updatedFields = Object.keys(newData);
    setErrors(prev => prev.filter(error => !updatedFields.includes(error.field)));
  }, []);

  const validateField = useCallback((field: keyof T): boolean => {
    try {
      // Criar um schema parcial apenas para o campo
      const fieldSchema = schema.pick({ [field]: true } as any);
      fieldSchema.parse({ [field]: data[field] });
      
      clearFieldError(field as string);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = parseErrors(error);
        setErrors(prev => [
          ...prev.filter(e => e.field !== field),
          ...fieldErrors
        ]);
      }
      return false;
    }
  }, [data, schema]);

  const validate = useCallback((): boolean => {
    try {
      schema.parse(data);
      setErrors([]);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(parseErrors(error));
      }
      return false;
    }
  }, [data, schema]);

  const submit = useCallback(async () => {
    if (!onSubmit) return;
    
    setIsSubmitting(true);
    
    try {
      if (validate()) {
        await onSubmit(data as T);
      }
    } catch (error) {
      console.error('Erro no submit:', error);
      setErrors([{
        field: 'general',
        message: 'Erro interno. Tente novamente.'
      }]);
    } finally {
      setIsSubmitting(false);
    }
  }, [data, validate, onSubmit]);

  const reset = useCallback(() => {
    setDataState(initialData);
    setErrors([]);
    setIsSubmitting(false);
  }, [initialData]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // ===== COMPUTED VALUES =====

  const isValid = errors.length === 0 && Object.keys(data).length > 0;

  // ===== RETURN =====

  return {
    data,
    errors,
    isValid,
    isSubmitting,
    setField,
    setData,
    validate,
    validateField,
    submit,
    reset,
    clearErrors
  };
}

// ===== HOOKS ESPECÍFICOS =====

export function useFormValidation<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  onSubmit: (data: T) => void | Promise<void>
) {
  return useValidation({ schema, onSubmit });
}

export function useFieldValidation<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  field: keyof T
) {
  const [value, setValue] = useState<any>('');
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((newValue: any) => {
    setValue(newValue);
    
    try {
      const fieldSchema = schema.pick({ [field]: true } as any);
      fieldSchema.parse({ [field]: newValue });
      setError(null);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldError = err.errors.find(e => e.path[0] === field);
        setError(fieldError?.message || 'Valor inválido');
      }
      return false;
    }
  }, [schema, field]);

  return {
    value,
    error,
    setValue,
    validate,
    isValid: !error && value !== ''
  };
}

// ===== UTILITÁRIOS =====

export function getFieldError(errors: ValidationError[], field: string): string | null {
  const error = errors.find(e => e.field === field);
  return error ? error.message : null;
}

export function hasFieldError(errors: ValidationError[], field: string): boolean {
  return errors.some(e => e.field === field);
}

export function getGeneralError(errors: ValidationError[]): string | null {
  const error = errors.find(e => e.field === 'general');
  return error ? error.message : null;
}

// ===== VALIDAÇÃO EM TEMPO REAL =====

export function useRealtimeValidation<T extends Record<string, any>>(
  schema: z.ZodSchema<T>
) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateField = useCallback((field: keyof T, value: any) => {
    try {
      const fieldSchema = schema.pick({ [field]: true } as any);
      fieldSchema.parse({ [field]: value });
      
      setErrors(prev => prev.filter(e => e.field !== field));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(e => e.path[0] === field);
        if (fieldError) {
          setErrors(prev => [
            ...prev.filter(e => e.field !== field),
            { field: field as string, message: fieldError.message }
          ]);
        }
      }
      return false;
    }
  }, [schema]);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => prev.filter(e => e.field !== field));
  }, []);

  return {
    errors,
    validateField,
    clearFieldError,
    hasError: (field: string) => errors.some(e => e.field === field),
    getError: (field: string) => errors.find(e => e.field === field)?.message || null
  };
}
