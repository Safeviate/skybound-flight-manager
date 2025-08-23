'use client';

import { useUser } from '@/context/user-provider';

export default function Footer() {
  const { company } = useUser();
  const trademark = company?.trademark || 'SkyBound Flight Manager';
  const companyName = company?.name || 'SkyBound Flight Manager';
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0';

  return (
    <footer className="w-full border-t border-border bg-background p-4 text-center text-xs text-muted-foreground no-print">
      <p>
        &copy; {new Date().getFullYear()} {companyName}. "{trademark}" is a trademark of the project owner. All rights reserved. Unauthorized use of this name is strictly prohibited.
        <span className="mx-2">|</span>
        Version {appVersion}
      </p>
    </footer>
  );
}
