import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start Checklist - SkyBound',
  description: 'Begin your pre-flight checklist.',
};

export default function PublicChecklistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
