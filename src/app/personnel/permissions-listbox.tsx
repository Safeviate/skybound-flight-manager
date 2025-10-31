
'use client';

import * as React from 'react';
import { useController, type Control } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormItem, FormLabel } from '@/components/ui/form';
import type { Permission } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PermissionsListboxProps {
  control: Control<any>;
  allPermissions: Permission[];
}

const groupPermissions = (permissions: Permission[]): Record<string, Permission[]> => {
  const grouped: Record<string, Permission[]> = {};

  permissions.forEach(permission => {
    const [groupName] = permission.split(':');
    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }
    grouped[groupName].push(permission);
  });

  return grouped;
};


export function PermissionsListbox({ control, allPermissions }: PermissionsListboxProps) {
  const { field } = useController({ name: 'permissions', control });
  const groupedPermissions = React.useMemo(() => groupPermissions(allPermissions), [allPermissions]);
  const sortedGroupNames = React.useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions]);


  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    const currentPermissions = new Set(field.value || []);
    if (checked) {
      currentPermissions.add(permission);
    } else {
      currentPermissions.delete(permission);
    }
    field.onChange(Array.from(currentPermissions));
  };

  if (!allPermissions) {
      return (
          <div className="flex items-center justify-center h-72 rounded-md border">
              <p className="text-sm text-muted-foreground">Loading permissions...</p>
          </div>
      );
  }

  return (
    <ScrollArea className="h-72 rounded-md border p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {sortedGroupNames.map((groupName) => (
            <div key={groupName} className="space-y-3">
                <h4 className="font-semibold text-sm border-b pb-1">{groupName}</h4>
                 <div className="space-y-2">
                    {groupedPermissions[groupName].map((permission) => (
                    <FormItem key={permission} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                        <Checkbox
                            checked={field.value?.includes(permission)}
                            onCheckedChange={(checked) => {
                            handlePermissionChange(permission, !!checked);
                            }}
                        />
                        </FormControl>
                        <FormLabel className="font-normal text-xs">{permission.split(':')[1] || permission}</FormLabel>
                    </FormItem>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </ScrollArea>
  );
}
