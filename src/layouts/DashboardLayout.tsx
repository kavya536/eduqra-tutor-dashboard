import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { cn } from '../lib/utils';

import { useUIStore } from '../store/useUIStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentPage, setIsSidebarOpen } = useUIStore();
  return (
    <div className="min-h-screen bg-background text-on-surface w-full flex flex-col">
      <Sidebar />
      <main className="md:ml-[240px] ml-0 min-h-screen flex flex-col transition-all duration-500 ease-[0.16,1,0.3,1] flex-1">
        <TopBar />
        <div className={cn("flex-1 overflow-x-hidden", currentPage === 'chat' ? "p-0 md:p-6" : "p-4 md:p-10")}>
          {children}
        </div>
      </main>
    </div>
  );
}
