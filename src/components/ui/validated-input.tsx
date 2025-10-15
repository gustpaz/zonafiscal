"use client";

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ===== TIPOS =====

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  validate?: (value: string) => string | null;
  onValidationChange?: (isValid: boolean) => void;
}

interface ValidatedPasswordProps extends Omit<ValidatedInputProps, 'type'> {
  showStrength?: boolean;
}

// ===== COMPONENTE PRINCIPAL =====

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ 
    className, 
    type = 'text', 
    label, 
    error, 
    helperText, 
    required, 
    validate, 
    onValidationChange,
    onChange,
    ...props 
  }, ref) => {
    const [internalError, setInternalError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // Validação em tempo real
      if (validate) {
        const validationError = validate(value);
        setInternalError(validationError);
        onValidationChange?.(!validationError);
      }
      
      onChange?.(e);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    const displayError = error || internalError;
    const hasError = !!displayError;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={props.id} className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <div className="relative">
          <Input
            ref={ref}
            type={type}
            className={cn(
              "transition-colors",
              hasError && "border-red-500 focus-visible:ring-red-500",
              isFocused && !hasError && "border-blue-500 focus-visible:ring-blue-500",
              className
            )}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        </div>

        {displayError && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-sm">
              {displayError}
            </AlertDescription>
          </Alert>
        )}

        {helperText && !displayError && (
          <p className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

// ===== INPUT DE SENHA COM FORÇA =====

export const ValidatedPasswordInput = forwardRef<HTMLInputElement, ValidatedPasswordProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    required, 
    showStrength = true,
    validate, 
    onValidationChange,
    onChange,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [strength, setStrength] = useState(0);

    const calculateStrength = (password: string): number => {
      let score = 0;
      
      if (password.length >= 8) score += 1;
      if (password.length >= 12) score += 1;
      if (/[a-z]/.test(password)) score += 1;
      if (/[A-Z]/.test(password)) score += 1;
      if (/\d/.test(password)) score += 1;
      if (/[^a-zA-Z\d]/.test(password)) score += 1;
      
      return Math.min(score, 5);
    };

    const getStrengthColor = (strength: number): string => {
      if (strength <= 2) return 'bg-red-500';
      if (strength <= 3) return 'bg-yellow-500';
      if (strength <= 4) return 'bg-blue-500';
      return 'bg-green-500';
    };

    const getStrengthText = (strength: number): string => {
      if (strength <= 2) return 'Fraca';
      if (strength <= 3) return 'Média';
      if (strength <= 4) return 'Boa';
      return 'Forte';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPassword(value);
      
      if (showStrength) {
        setStrength(calculateStrength(value));
      }
      
      // Validação personalizada
      if (validate) {
        const validationError = validate(value);
        onValidationChange?.(!validationError);
      }
      
      onChange?.(e);
    };

    const displayError = error;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={props.id} className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <div className="relative">
          <Input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={cn(
              "pr-10",
              displayError && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            onChange={handleChange}
            {...props}
          />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>

        {showStrength && password && (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    getStrengthColor(strength)
                  )}
                  style={{ width: `${(strength / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {getStrengthText(strength)}
              </span>
            </div>
          </div>
        )}

        {displayError && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-sm">
              {displayError}
            </AlertDescription>
          </Alert>
        )}

        {helperText && !displayError && (
          <p className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

ValidatedPasswordInput.displayName = "ValidatedPasswordInput";

// ===== INPUT DE EMAIL =====

export const ValidatedEmailInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ validate, ...props }, ref) => {
    const emailValidate = (value: string): string | null => {
      if (!value) return null;
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Email inválido';
      }
      
      if (value.length > 255) {
        return 'Email muito longo';
      }
      
      return validate?.(value) || null;
    };

    return (
      <ValidatedInput
        ref={ref}
        type="email"
        validate={emailValidate}
        helperText="Digite um email válido"
        {...props}
      />
    );
  }
);

ValidatedEmailInput.displayName = "ValidatedEmailInput";

// ===== INPUT DE TELEFONE =====

export const ValidatedPhoneInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ validate, ...props }, ref) => {
    const phoneValidate = (value: string): string | null => {
      if (!value) return null;
      
      const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
      if (!phoneRegex.test(value)) {
        return 'Telefone deve estar no formato (XX) XXXXX-XXXX';
      }
      
      return validate?.(value) || null;
    };

    const formatPhone = (value: string): string => {
      const numbers = value.replace(/\D/g, '');
      
      if (numbers.length <= 2) return `(${numbers}`;
      if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      if (numbers.length <= 10) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
      }
      
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      e.target.value = formatted;
      props.onChange?.(e);
    };

    return (
      <ValidatedInput
        ref={ref}
        type="tel"
        validate={phoneValidate}
        onChange={handleChange}
        placeholder="(XX) XXXXX-XXXX"
        helperText="Digite o telefone no formato (XX) XXXXX-XXXX"
        {...props}
      />
    );
  }
);

ValidatedPhoneInput.displayName = "ValidatedPhoneInput";
