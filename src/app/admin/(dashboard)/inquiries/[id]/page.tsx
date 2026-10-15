import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { inquiryDetail, inquiryId } from '@/lib/inquiry-admin';
import { HttpError } from '@/lib/http';
import { InquiryDetail } from '@/components/inquiry-detail';
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  let row;
  try {
    row = await inquiryDetail(supabase, inquiryId((await params).id));
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }
  return <InquiryDetail initial={row} />;
}
