
'use client';
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Search, User as UserIcon } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Header({ title, children }: { title: string, children?: React.ReactNode }) {
  const { user } = useUser();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8 no-print">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      
      <div className="flex items-center gap-2">
        {/* Intentionally left for stable element positioning, other content added dynamically */}
      </div>

      <h1 className="text-xl font-semibold md:text-2xl whitespace-nowrap flex-1">{title}</h1>
      
      <div className="flex items-center justify-end gap-4">
        {children}
      </div>
    </header>
  );
}
