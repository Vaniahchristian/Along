import { ClerkAlongProvider } from '@/components/providers/along';
import { AppShell } from '@/components/layout/shell';
import { AppErrorBoundary } from '@/components/layout/app-error-boundary';

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
      <AppErrorBoundary>
        <AppShell>{children}</AppShell>
      </AppErrorBoundary>
    </ClerkAlongProvider>
  );
}
