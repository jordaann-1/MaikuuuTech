'use client';
import { useState } from 'react';
import type { Row } from '@/lib/content';
import { InquiryForm } from './inquiry-form';
import { ContactForm } from './contact-form';
export function ContactExperience(props: {
  services: Row[];
  budgets: Row[];
  siteKey?: string;
  selectedService?: string;
}) {
  const [tab, setTab] = useState('inquiry');
  return (
    <div className="contact-workspace">
      <div className="contact-tabs" role="group" aria-label="Choose a contact form">
        <button type="button" aria-pressed={tab === 'inquiry'} onClick={() => setTab('inquiry')}>
          Project inquiry
        </button>
        <button type="button" aria-pressed={tab === 'message'} onClick={() => setTab('message')}>
          General message
        </button>
      </div>
      <div hidden={tab !== 'inquiry'}>
        <InquiryForm {...props} />
      </div>
      <div hidden={tab !== 'message'}>
        <ContactForm siteKey={props.siteKey} />
      </div>
    </div>
  );
}
