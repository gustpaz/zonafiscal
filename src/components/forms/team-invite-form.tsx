"use client";

import { useState } from 'react';
import { useFormValidation, getFieldError, getGeneralError } from '@/hooks/use-validation';
import { inviteSchema } from '@/lib/validation';
import { ValidatedEmailInput } from '@/components/ui/validated-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface TeamInviteFormData {
  email: string;
  role: 'admin' | 'member';
}

export function TeamInviteForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data,
    errors,
    isValid,
    setField,
    submit,
    reset
  } = useFormValidation<TeamInviteFormData>(
    inviteSchema,
    async (formData) => {
      setIsSubmitting(true);
      
      try {
        const response = await fetch('/api/send-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao enviar convite');
        }

        toast({
          title: "Convite enviado!",
          description: "O convite foi enviado com sucesso para o email.",
        });

        reset();
        
      } catch (error) {
        toast({
          title: "Erro ao enviar convite",
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  );

  const generalError = getGeneralError(errors);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convidar Membro da Equipe</CardTitle>
        <CardDescription>
          Envie um convite para um novo membro se juntar à sua equipe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {generalError && (
          <Alert variant="destructive">
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <ValidatedEmailInput
            label="Email do convidado"
            placeholder="exemplo@empresa.com"
            value={data.email || ''}
            onChange={(e) => setField('email', e.target.value)}
            error={getFieldError(errors, 'email')}
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Função <span className="text-red-500">*</span>
            </label>
            <Select
              value={data.role || ''}
              onValueChange={(value: 'admin' | 'member') => setField('role', value)}
            >
              <SelectTrigger className={getFieldError(errors, 'role') ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            {getFieldError(errors, 'role') && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">
                  {getFieldError(errors, 'role')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Convite'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={isSubmitting}
            >
              Limpar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
