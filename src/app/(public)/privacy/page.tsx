import { pageMetadata } from '@/lib/metadata';
export const generateMetadata = () => pageMetadata('Inquiry privacy notice', '/privacy');
export default function Privacy() {
  return (
    <article className="container page-content privacy-page prose">
      <span className="eyebrow">PRIVACY NOTICE · OCTOBER 15, 2026</span>
      <h1>Your inquiry, in confidence.</h1>
      <p className="lead">
        MaikuuuTech uses the details you submit to understand your requirements, contact you through
        your preferred method, and manage our project conversation.
      </p>
      <h2>What is collected</h2>
      <p>
        Your name, email, selected service, project description, budget preference, contact
        preference, and consent are required. Phone, deadline, notes, features, external contact
        details, and supporting files are optional except when needed for your chosen contact
        method. Please avoid identity documents, passwords, payment details, health information, and
        other sensitive information.
      </p>
      <h2>Who can access it</h2>
      <p>
        Inquiries and documents are restricted to the authorized portfolio administrator. Supabase
        processes database records and private file storage. Cloudflare processes website requests
        and Turnstile spam verification. Your inquiry is not published on the portfolio. Reference
        numbers are for your correspondence and do not open a public tracking page.
      </p>
      <h2>Spam protection and security</h2>
      <p>
        A keyed, non-reversible hash of the connection address helps limit abuse. The raw address is
        not stored in inquiry records. Documents use private storage and authorized downloads
        expire. No system can guarantee absolute security.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Information is kept while an inquiry or related project conversation needs it. The
        administrator reviews completed, declined, and archived inquiries for deletion when no
        longer needed. Deletion removes the inquiry, associated activity, and uploaded files from
        active storage; provider backups may remain under the provider’s retention schedule.
      </p>
      <h2>Your choices</h2>
      <p>
        You can use a published contact link instead of the form. To request correction or deletion,
        contact MaikuuuTech through the same conversation or a contact link on this website and
        include your reference number. Do not send additional identity documents unless a suitable
        verification process has been agreed.
      </p>
      <h2>Consent</h2>
      <p>
        By selecting the form’s consent checkbox, you acknowledge this notice and agree to
        processing for reviewing and responding to your inquiry. Budget and deadline preferences do
        not establish a quotation or agreement.
      </p>
    </article>
  );
}
