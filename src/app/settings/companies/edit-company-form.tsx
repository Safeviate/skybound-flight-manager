
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Company } from '@/lib/types';
import { Paintbrush } from 'lucide-react';
import { useEffect } from 'react';

const companyFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Company name must be at least 2 characters.',
  }),
  trademark: z.string().min(2, {
    message: 'Trademark must be at least 2 characters.',
  }),
  logo: z.any().optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface EditCompanyFormProps {
  company: Company;
  onSubmit: (companyData: Partial<Company>, logoFile?: File) => void;
}

export function EditCompanyForm({ company, onSubmit }: EditCompanyFormProps) {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        trademark: company.trademark,
      });
    }
  }, [company, form]);

  function handleFormSubmit(data: CompanyFormValues) {
    const updatedCompany: Partial<Company> = {
        name: data.name,
        trademark: data.trademark,
    };
    const logoFile = data.logo?.[0];
    onSubmit(updatedCompany, logoFile);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="space-y-2">
          <h4 className="font-semibold">Company Details</h4>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., AeroVentures Flight Academy" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="trademark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trademark / Slogan</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Flying High Since 2002" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Upload New Company Logo</FormLabel>
                <FormControl>
                  <Input type="file" accept="image/*" {...form.register('logo')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
