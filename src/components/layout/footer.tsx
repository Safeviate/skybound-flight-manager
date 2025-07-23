
'use client';

import { useUser } from '@/context/user-provider';

export default function Footer() {
  const { company } = useUser();
  const trademark = company?.trademark || 'SkyBound Flight Manager';
  const companyName = company?.name || 'SkyBound';

  return (
    <footer className="w-full border-t border-border bg-background p-4 text-center text-xs text-muted-foreground no-print">
      <p>
        &copy; {new Date().getFullYear()} {companyName}. "{trademark}" is a trademark of the project owner. All rights reserved. Unauthorized use of this name is strictly prohibited.
      </p>
    </footer>
  );
}
