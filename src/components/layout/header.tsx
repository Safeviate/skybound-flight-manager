
'use client';
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Search, User as UserIcon, LogOut, Edit } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

export default function Header({ title, children }: { title: string, children?: React.ReactNode }) {
  const { user, logout } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

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
         <Dialog>
            <DialogTrigger asChild>
                <Button variant="default" className="relative h-auto px-4 py-2 text-left">
                    <div className="flex flex-col">
                        <span>{user?.name}</span>
                        <span className="text-xs text-primary-foreground/80 -mt-1">{user?.role}</span>
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>My Personal Information</DialogTitle>
                    <DialogDescription>A summary of your user profile and contact details.</DialogDescription>
                </DialogHeader>
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-medium text-muted-foreground">Full Name</p>
                                <p>{user?.name}</p>
                            </div>
                            <div>
                                <p className="font-medium text-muted-foreground">Role</p>
                                <p>{user?.role}</p>
                            </div>
                            <div>
                                <p className="font-medium text-muted-foreground">Email Address</p>
                                <p>{user?.email || 'Not Provided'}</p>
                            </div>
                            <div>
                                <p className="font-medium text-muted-foreground">Phone Number</p>
                                <p>{user?.phone || 'Not Provided'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <div className="flex justify-end gap-2">
                    <Button onClick={handleLogout} variant="outline">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </Button>
                    <Button asChild>
                        <Link href="/my-profile">
                            <Edit className="mr-2 h-4 w-4" />
                            Update My Information
                        </Link>
                    </Button>
                 </div>
            </DialogContent>
          </Dialog>
      </div>
    </header>
  );
}
