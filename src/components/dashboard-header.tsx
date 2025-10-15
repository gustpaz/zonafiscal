

"use client";

import { SidebarTrigger } from "./ui/sidebar";

interface DashboardHeaderProps {
    title: string;
    children?: React.ReactNode;
}

export default function DashboardHeader({ title, children }: DashboardHeaderProps) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="hidden md:flex" />
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            </div>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
             {children}
            </div>
        </div>
    );
}
