
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

  const childrenArray = React.Children.toArray(children);
  const backButton = childrenArray.find(child => (child as React.ReactElement)?.props?.asChild);
  const otherChildren = childrenArray.filter(child => !(child as React.ReactElement)?.props?.asChild);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8 no-print">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      
      {backButton}

      <h1 className="text-xl font-semibold md:text-2xl whitespace-nowrap">{title}</h1>
      <div className="w-full flex-1 flex items-center justify-end">
        
        <div className="flex items-center gap-4">
          {otherChildren}
          {user && (
            <Button asChild variant="secondary" size="icon" className="rounded-full">
                <Link href="/my-profile">
                    <div className="h-10 w-10 flex items-center justify-center">
                        <UserIcon className="h-5 w-5" />
                    </div>
                    <span className="sr-only">My Profile</span>
                </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
