
'use client';

import { useUser } from '@/context/user-provider';

export default function Footer() {
  const { company } = useUser();
  const trademark = company?.trademark || 'Safeviate';
  const companyName = company?.name || 'SkyBound';

  return (
    <footer className="w-full border-t border-border bg-background p-4 text-center text-xs text-muted-foreground no-print">
      <p>
        &copy; {new Date().getFullYear()} {companyName} Flight Manager. "{trademark}" is a trademark of the project owner. All rights reserved. Unauthorized use of this name is strictly prohibited.
      </p>
    </footer>
  );
}
