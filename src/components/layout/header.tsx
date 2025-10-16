
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Building, Repeat, PanelLeft } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function Header({ title, children }: { title: string, children?: React.ReactNode }) {
  const { user, company, userCompanies, setCompany, logout } = useUser();
  const router = useRouter();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };
  
  const handleSwitchCompany = (newCompanyId: string) => {
    const newCompany = userCompanies.find(c => c.id === newCompanyId);
    if (newCompany && newCompany.id !== company?.id) {
        setCompany(newCompany);
        router.push('/my-dashboard'); 
    }
    setIsSwitcherOpen(false);
  }

  return (
    <>
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8 no-print">
      <div className="flex items-center flex-1">
        <div className="md:hidden">
            <SidebarTrigger>
                <PanelLeft />
            </SidebarTrigger>
        </div>
        <h1 className="text-xl font-semibold md:text-2xl whitespace-nowrap text-[var(--header-foreground)] ml-4">{title}</h1>
      </div>
      
      <div className="flex-1 text-center">
        <span className="text-lg font-bold text-muted-foreground">{company?.name || 'Safeviate'}</span>
      </div>
      
      <div className="flex items-center justify-end gap-4 flex-1">
        {children}
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="default" className="relative h-auto px-4 py-2 text-left">
                      <div className="flex flex-col">
                          <span>{user?.name}</span>
                          <span className="text-xs text-primary-foreground/80 -mt-1">{user?.role}</span>
                      </div>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <div className="text-xs text-muted-foreground">Active Company: <strong>{company?.name}</strong></div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/personnel/me"><UserIcon className="mr-2 h-4 w-4" /><span>My Profile</span></Link>
                  </DropdownMenuItem>
                  {user?.permissions.includes('Super User') && (
                    <DropdownMenuItem onSelect={() => setIsSwitcherOpen(true)}>
                        <Repeat className="mr-2 h-4 w-4" />
                        <span>Switch Company</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        <Dialog open={isSwitcherOpen} onOpenChange={setIsSwitcherOpen}>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>Switch Company</DialogTitle>
                    <DialogDescription>
                       Select a company to switch to.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        {userCompanies.map(c => (
                            <button
                                key={c.id}
                                className={cn(
                                    "w-full text-left p-3 rounded-md flex items-center justify-between transition-colors",
                                    company?.id === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                )}
                                onClick={() => handleSwitchCompany(c.id)}
                                disabled={company?.id === c.id}
                            >
                                <span>{c.name}</span>
                                {company?.id === c.id && <Check className="h-5 w-5" />}
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </header>
    </>
  );
}
