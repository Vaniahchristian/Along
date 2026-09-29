import { ClerkAlongProvider } from '@/components/providers/along';
import { AppShell } from '@/components/layout/shell';

export const metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false
    }
  }
};

export default function AppShellLayout({ children }) {
  return (
    <ClerkAlongProvider>
      <AppShell>{children}</AppShell>
    </ClerkAlongProvider>
  );
}
