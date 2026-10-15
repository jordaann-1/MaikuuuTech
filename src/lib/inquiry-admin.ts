import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HttpError } from './http';
export const inquiryId = (value: string) => {
  const id = z.uuid().safeParse(value);
  if (!id.success) throw new HttpError(400, 'Invalid inquiry identifier.');
  return id.data;
};
export const privateHeaders = { 'Cache-Control': 'private, no-store' };
export async function inquiryDetail(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from('service_inquiries')
    .select(
      'id,public_reference,full_name,email,phone,preferred_contact_method,external_contact,service_name_snapshot,project_title,project_description,required_features,project_type,budget_range,preferred_deadline,urgency,additional_notes,status,priority,admin_notes,is_read,is_archived,privacy_consent_at,privacy_notice_version,created_at,updated_at,inquiry_attachments(id,original_filename,mime_type,file_size,created_at)',
    )
    .eq('id', id)
    .eq('submission_state', 'complete')
    .maybeSingle();
  if (error) throw new HttpError(503, 'This inquiry could not be loaded.');
  if (!data) throw new HttpError(404, 'Inquiry not found.');
  const activity = await db
    .from('inquiry_activity')
    .select('id,actor_name,action,previous_status,new_status,created_at')
    .eq('inquiry_id', id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (activity.error) throw new HttpError(503, 'Activity could not be loaded.');
  return { ...data, inquiry_activity: activity.data || [] };
}
