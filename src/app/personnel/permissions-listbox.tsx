
'use client';

import * as React from 'react';
import { useController } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_PERMISSIONS, type Permission } from '@/lib/types';

interface PermissionsListboxProps {
  control: any;
}

export function PermissionsListbox({ control }: PermissionsListboxProps) {
    const { field } = useController({ name: 'permissions', control });
    const assignedPermissions = new Set(field.value || []);
    const availablePermissions = ALL_PERMISSIONS.filter(p => !assignedPermissions.has(p));

    const handleTogglePermission = (permission: Permission) => {
        const newValue = new Set(field.value || []);
        if (newValue.has(permission)) {
            newValue.delete(permission);
        } else {
            newValue.add(permission);
        }
        field.onChange(Array.from(newValue));
    };

    const ListItem = ({ permission, onClick }: { permission: Permission, onClick: () => void }) => (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left p-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
        >
            {permission}
        </button>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
             <Card className="flex-1">
                <CardHeader>
                    <CardTitle className="text-base">Available Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-64 border rounded-md p-2">
                        {availablePermissions.length > 0 ? availablePermissions.map(p => (
                            <ListItem key={p} permission={p} onClick={() => handleTogglePermission(p)} />
                        )) : <p className="text-sm text-muted-foreground text-center p-4">All permissions assigned.</p>}
                    </ScrollArea>
                </CardContent>
            </Card>
             <Card className="flex-1">
                <CardHeader>
                    <CardTitle className="text-base">Assigned Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-64 border rounded-md p-2">
                         {assignedPermissions.size > 0 ? Array.from(assignedPermissions).map(p => (
                            <ListItem key={p} permission={p} onClick={() => handleTogglePermission(p)} />
                        )) : <p className="text-sm text-muted-foreground text-center p-4">No permissions assigned.</p>}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};
