
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, User as UserIcon, Briefcase, Calendar as CalendarIcon, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { User as AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EditProfileForm } from './edit-profile-form';
import { getExpiryBadge } from '@/lib/utils.tsx';

interface PersonalInformationCardProps {
    user: AppUser;
    onUpdate?: () => void;
}

export function PersonalInformationCard({ user, onUpdate }: PersonalInformationCardProps) {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const handleUpdate = () => {
        setIsDialogOpen(false);
        onUpdate?.();
    }

    const getRoleVariant = (role: AppUser['role']) => {
        switch (role) {
            case 'Instructor':
                return 'primary'
            case 'Maintenance':
                return 'destructive'
            case 'Admin':
                return 'secondary'
            case 'Student':
                return 'default'
            default:
                return 'outline'
        }
    }

    return (
        <div>
            <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 rounded-full bg-muted">
                    <UserIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold">{user.name}</h3>
                    <Badge variant={getRoleVariant(user.role)} className="mt-1">{user.role}</Badge>
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.department || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Medical Exp: {user.medicalExpiry ? getExpiryBadge(user.medicalExpiry) : 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">License Exp: {user.licenseExpiry ? getExpiryBadge(user.licenseExpiry) : 'N/A'}</span>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full mt-6">
                        <Edit className="mr-2 h-4 w-4" />
                        Update Information
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Your Information</DialogTitle>
                        <DialogDescription>
                            Make changes to your profile here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <EditProfileForm user={user} onUpdate={handleUpdate} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
