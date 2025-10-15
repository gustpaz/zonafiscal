"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Home, Globe } from 'lucide-react';

export default function ViewSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view');

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('view');
    } else {
      params.set('view', value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Tabs value={currentView || 'all'} onValueChange={handleValueChange}>
      <TabsList>
        <TabsTrigger value="all">
          <Globe className="mr-2" />
          Todos
        </TabsTrigger>
        <TabsTrigger value="business">
          <Briefcase className="mr-2" />
          Empresarial
        </TabsTrigger>
        <TabsTrigger value="personal">
          <Home className="mr-2" />
          Pessoal
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
