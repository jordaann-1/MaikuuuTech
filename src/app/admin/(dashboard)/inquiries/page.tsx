import { requireAdmin } from '@/lib/auth';
import { inquiryFiltersSchema } from '@/lib/inquiries';
import { queryInquiries } from '@/lib/inquiry-server';
import { InquiryList } from '@/components/inquiry-list';
export default async function Inquiries() {
  const { supabase } = await requireAdmin();
  const filters = inquiryFiltersSchema.parse({});
  const [initial, services] = await Promise.all([
    queryInquiries(supabase, filters),
    supabase.from('services').select('id,title').order('sort_order'),
  ]);
  if (services.error) throw new Error('Services could not be loaded.');
  return <InquiryList initial={initial} initialFilters={filters} services={services.data || []} />;
}
