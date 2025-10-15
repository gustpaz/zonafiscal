
"use client";

import { useAuth } from "@/hooks/use-auth";
import VendasPage from "./vendas/page";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Image src="/logo.png" alt="Zona Fiscal Logo" width={64} height={64} className="size-16 animate-pulse" />
      </div>
    );
  }
  
  return <VendasPage />;
}

    
