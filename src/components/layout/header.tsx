
'use client';
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import Link from 'next/link';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';

export default function Header({ title, children }: { title: string, children?: React.ReactNode }) {
  const { user } = useUser();
  const router = useRouter();

  const childrenArray = React.Children.toArray(children);
  const backButton = childrenArray.find(child => (child as React.ReactElement)?.props?.href === "/safety");
  const otherChildren = childrenArray.filter(child => (child as React.ReactElement)?.props?.href !== "/safety");

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8 no-print">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      
      {backButton}

      <h1 className="text-xl font-semibold md:text-2xl whitespace-nowrap">{title}</h1>
      <div className="w-full flex-1 flex items-center justify-between">
        <form className="w-full max-w-sm ml-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-full"
            />
          </div>
        </form>
        <div className="flex items-center gap-4">
          {otherChildren}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src="https://placehold.co/40x40" alt={user?.name || 'User'} data-ai-hint="user avatar" />
                  <AvatarFallback>{user?.name.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.name || 'My Account'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/my-profile">
                <DropdownMenuItem>
                    My Profile
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
