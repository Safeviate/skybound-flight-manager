
'use client';

import { useState } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, KeyRound, Rocket } from 'lucide-react';
import { companyData } from '@/lib/data-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const otpFormSchema = z.object({
  otp: z.string().length(6, { message: 'Please enter the 6-digit code.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type OtpFormValues = z.infer<typeof otpFormSchema>;

export default function LoginPage() {
  const { login } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: 'admin@skybound.com', password: 'password' },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: '' },
  });

  const company = companyData.find((c) => c.id === 'skybound');

  async function handleLogin(data: LoginFormValues) {
    setLoginError(null);
    const loginSuccess = await login(data.email, data.password);

    if (loginSuccess) {
      // 2FA Step
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedOtp(otp);
      setEmail(data.email);
      setStep('otp');
    } else {
      setLoginError('Invalid email or password. Please try again.');
      loginForm.setValue('password', '');
    }
  }

  async function handleOtpSubmit(data: OtpFormValues) {
    setLoginError(null);
    // In a real app, the OTP would be verified on the server.
    // For this demo, we check against the one we generated.
    if (data.otp === generatedOtp) {
        // Since the password was already verified, we can now complete the login.
        // We call login again, but this time it should succeed without the password check
        // because the user object is already partially authenticated in the context (a real app would handle this differently).
        await login(email); // Re-login to set the final user state
        const redirectPath = searchParams.get('redirect');
        router.push(redirectPath || '/my-profile');
    } else {
        setLoginError('Invalid verification code. Please try again.');
        otpForm.setValue('otp', '');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Rocket className="h-8 w-8 text-primary" />
        <span className="text-xl font-semibold">{company?.name || 'SkyBound'}</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            {step === 'login' ? 'Login' : 'Two-Factor Authentication'}
          </CardTitle>
          <CardDescription>
            {step === 'login'
              ? 'Enter your email below to login to your account.'
              : `A verification code has been sent to ${email}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'login' ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                {loginError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Login Failed</AlertTitle>
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@skybound.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting ? 'Logging in...' : <><LogIn className="mr-2 h-4 w-4" /> Login</>}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Your verification code is:</AlertTitle>
                  <AlertDescription className="font-bold text-lg tracking-widest text-center py-2">
                    {generatedOtp}
                  </AlertDescription>
                </Alert>
                {loginError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Verification Failed</AlertTitle>
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input 
                            placeholder="Enter the 6-digit code" 
                            {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
                  {otpForm.formState.isSubmitting ? 'Verifying...' : <><KeyRound className="mr-2 h-4 w-4" /> Verify Code</>}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
