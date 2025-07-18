
'use client';

import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ALL_PERMISSIONS, Permission } from '@/lib/types';
import type { z } from 'zod';

// Define the schema inline for clarity, though it's inferred from new-personnel-form
const FormSchema = z.object({
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one permission.',
  }),
});

type PermissionsFormProps = {
    form: ReturnType<typeof useFormContext>;
}

export function PermissionsForm() {
    const { control } = useFormContext();

  return (
    <FormItem>
      <div className="mb-4">
        <FormLabel className="text-base">User Permissions</FormLabel>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ALL_PERMISSIONS.map((permission) => (
          <FormField
            key={permission}
            control={control}
            name="permissions"
            render={({ field }) => {
              return (
                <FormItem
                  key={permission}
                  className="flex flex-row items-start space-x-3 space-y-0"
                >
                  <FormControl>
                    <Checkbox
                      checked={field.value?.includes(permission)}
                      onCheckedChange={(checked) => {
                        return checked
                          ? field.onChange([...field.value, permission])
                          : field.onChange(
                              field.value?.filter(
                                (value: Permission) => value !== permission
                              )
                            );
                      }}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {permission}
                  </FormLabel>
                </FormItem>
              );
            }}
          />
        ))}
      </div>
    </FormItem>
  );
}
