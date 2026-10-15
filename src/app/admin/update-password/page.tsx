import { AuthForm } from '@/components/auth-form';
import { requireAdmin } from '@/lib/auth';
export default async function Password() {
  await requireAdmin();
  return (
    <main id="main" className="auth-main" style={{ minHeight: '100vh' }}>
      <AuthForm mode="password" configured />
    </main>
  );
}
