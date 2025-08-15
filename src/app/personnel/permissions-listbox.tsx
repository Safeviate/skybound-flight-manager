
'use client';

import * as React from 'react';
import { useController } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormDescription, FormItem, FormLabel } from '@/components/ui/form';
import { ALL_PERMISSIONS, type Permission } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PermissionsListboxProps {
  control: any;
}

export function PermissionsListbox({ control }: PermissionsListboxProps) {
  const { field } = useController({ name: 'permissions', control });

  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    const currentPermissions = new Set(field.value || []);
    if (checked) {
      currentPermissions.add(permission);
    } else {
      currentPermissions.delete(permission);
    }
    field.onChange(Array.from(currentPermissions));
  };

  return (
    <ScrollArea className="h-72 rounded-md border p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {ALL_PERMISSIONS.map((permission) => (
          <FormItem key={permission} className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value?.includes(permission)}
                onCheckedChange={(checked) => {
                  handlePermissionChange(permission, !!checked);
                }}
              />
            </FormControl>
            <FormLabel className="font-normal">{permission}</FormLabel>
          </FormItem>
        ))}
      </div>
    </ScrollArea>
  );
}
