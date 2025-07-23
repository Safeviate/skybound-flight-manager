
'use client';
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Search, User as UserIcon } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PersonalInformationCard } from '@/app/my-profile/personal-information-card';

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
            <Dialog>
              <DialogTrigger asChild>
                 <Button variant="secondary" size="icon" className="rounded-full">
                  <div className="h-10 w-10 flex items-center justify-center">
                      <UserIcon className="h-5 w-5" />
                  </div>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Personal Information</DialogTitle>
                  <DialogDescription>
                    Your personal details and document status.
                  </DialogDescription>
                </DialogHeader>
                <PersonalInformationCard user={user} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  );
}
