import { AdminDashboard, ClerkAdminDashboard } from '@/components/admin/dashboard';

export const metadata = { title: 'Admin · Tagwimi' };

export default function AdminPage() {
  return process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' ? <ClerkAdminDashboard /> : <AdminDashboard />;
}
