
'use client';

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background p-4 text-center text-xs text-muted-foreground no-print">
      <p>
        &copy; {new Date().getFullYear()} SkyBound Flight Manager. "Safeviate" is a trademark of the project owner. All rights reserved. Unauthorized use of this name is strictly prohibited.
      </p>
    </footer>
  );
}
