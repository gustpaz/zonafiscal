"use client";

import { SidebarMenuButton } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Crown, LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface LockedMenuItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  tooltip: string;
  locked: boolean;
  upgradeMessage: string;
}

export function LockedMenuButton({ href, icon: Icon, label, tooltip, locked, upgradeMessage }: LockedMenuItemProps) {
  if (locked) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              <SidebarMenuButton 
                disabled={true}
                className="opacity-60 cursor-not-allowed w-full"
              >
                <Lock className="size-4" />
                <span>{label}</span>
                <Crown className="ml-auto size-3 text-amber-500" />
              </SidebarMenuButton>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 p-4">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">🔒 Funcionalidade Premium</p>
                <p className="text-xs mt-1 text-amber-700 dark:text-amber-300">{upgradeMessage}</p>
              </div>
              <Link 
                href="/pricing"
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-semibold py-2 px-3 rounded-md transition-all shadow-sm hover:shadow-md"
              >
                <Crown className="size-3" />
                Fazer Upgrade
              </Link>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <SidebarMenuButton asChild tooltip={tooltip}>
      <Link href={href}>
        <Icon />
        <span>{label}</span>
      </Link>
    </SidebarMenuButton>
  );
}
