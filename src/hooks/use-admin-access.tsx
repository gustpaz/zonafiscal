"use client";

import { useAuth } from "@/hooks/use-auth";
import { getUserById } from "@/lib/admin-data";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAdminAccess(requiredPermission?: string, redirectOnDeny: boolean = true) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;
      
      if (!user) {
        router.push('/');
        return;
      }

      try {
        const userData = await getUserById(user.uid);
        
        if (!userData) {
          router.push('/dashboard');
          return;
        }

        // Verifica se é Super Admin
        if (userData.adminRole === 'Super Admin') {
          setIsAuthorized(true);
          setIsChecking(false);
          return;
        }

        // Verifica se tem permissões específicas
        if (userData.adminPermissions && userData.adminPermissions.length > 0) {
          if (!requiredPermission || userData.adminPermissions.includes(requiredPermission as any)) {
            setIsAuthorized(true);
            setIsChecking(false);
            return;
          }
        }

        // Se chegou aqui, não tem acesso
        if (redirectOnDeny) {
          router.push('/dashboard');
        } else {
          setAccessDenied(true);
        }
        setIsChecking(false);
      } catch (error) {
        console.error('Erro ao verificar permissões de admin:', error);
        if (redirectOnDeny) {
          router.push('/dashboard');
        } else {
          setAccessDenied(true);
        }
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [user, loading, router, requiredPermission]);

  return { isAuthorized, isChecking, accessDenied, user };
}
