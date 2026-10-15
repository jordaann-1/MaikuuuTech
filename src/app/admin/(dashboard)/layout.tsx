import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin-shell';
import { InquiryProvider } from '@/components/inquiry-polling';
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <InquiryProvider>
      <AdminShell name={session.profile.display_name}>{children}</AdminShell>
    </InquiryProvider>
  );
}
