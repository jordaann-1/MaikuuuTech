# Administrator guide

## First login

Complete README's Supabase migration, initial user, and trusted membership steps. Open `/admin/login`. There is no public signup. Use password recovery if required; the email template and SMTP must be configured first.

## Edit your identity

Site settings manages the public name/title, headline, introduction, biography, interests, goals, specializations, profile photograph, public email/location, availability, SEO description, default sharing image, and footer. Save to apply changes on the next public page request. Empty optional fields are omitted from the public UI.

Use Social links for your actual HTTPS profiles. Do not enter fictional credentials or links simply to fill a section.

## Publish content

Open the relevant section and choose Add. Complete required fields and save. New records default to drafts. Use the publication checkbox or eye button to publish/unpublish. Lower display order numbers appear first. The star button marks a project as featured; homepage settings use the featured projects, or the first published projects when no featured projects exist.

Project slugs use lowercase words separated by hyphens. Changing a slug changes the URL; redirects from old slugs are not automatic. Add problem/solution, responsibilities, technologies, architecture, dates, and real repository/demo/documentation links as available. List fields accept one item per line; remove blank lines.

Skills belong to configurable categories. Both category and skill must be visible for a public visitor to see them. A category in use cannot be deleted until its skills are moved or removed. No skill percentages are collected.

## Images and documents

Use each editor's upload control. Images accept JPEG, PNG, and WebP; documents accept PDF; each file is limited to 10 MiB. Write a meaningful description for every project screenshot. Reorder gallery images with up/down controls. Thumbnails and profile images use contextual public alt text.

Uploads are private until referenced by published content. Save the record to attach a new upload. Replacements create new file paths. Removing a field or deleting a record detaches references but deliberately does not immediately destroy the file: save first, then delete unused files from Media library. The library lists the current administrator's uploads. Referenced files cannot be deleted. Files abandoned during an unsaved edit can be cleaned there.

For resume replacement, upload the new PDF into the existing resume record and save, or unpublish the old record before publishing a replacement. The database permits one published resume. Removing/unpublishing it removes public view/download links. Previously issued signed URLs may remain valid for up to one minute.

## Inbox

Messages come from the configured public contact form. Expand the subject to read a message; use the envelope to mark read/unread and archive controls to move it out of/into the inbox. Filter Inbox, Unread, Archived, or All. Deletion requires confirmation. An email link opens your mail application; the portfolio does not send messages on your behalf.

## Check your changes

Open View portfolio, navigate to the changed section, or refresh an already open tab. Draft records must not appear. Publication does not require a source-code change or deployment. If content cannot load, verify the database migration and configuration; errors do not silently substitute fictitious data.

Signing out ends the session. Expired or revoked admin access redirects to sign-in and rejects API mutations. Keep recovery access current and use a unique strong password.

## Client inquiry workflow

Open **Client Inquiries**. The list searches name, email, project title and reference. Filter service/status/priority/date, active/archived/all, and newest/oldest; Apply filters resets pagination. Results load 20 at a time. The list refreshes every 30 seconds while visible, with backoff after failures. The shell badge and overview refresh every minute. A failed refresh preserves the last loaded records and shows an error.

Open a request to review client contact details, service/budget snapshots, requirements, features, requested urgency/deadline, additional notes, consent, attachments and activity. Mark reviewed/read explicitly; mark unread if follow-up is needed. Archiving removes it from the active inbox but preserves it.

Statuses are New, Under Review, Contacted, Awaiting Client, Accepted, In Progress, Completed, Declined, and Cancelled. Choose a status and admin priority (Low, Normal, High, Urgent), edit private notes and Save changes. Admin priority is separate from client urgency. Activity records status/priority/notes/archive changes and the acting administrator. The latest 100 events appear in details.

**Copy email** uses the browser clipboard. **Open email draft** opens your mail application with an editable subject/body; you send it there. Valid HTTPS external contact links open separately. The portfolio sends no inquiry email notifications.

Attachments download through the authorized route using 60-second signed links. Treat documents as untrusted; validation is not malware scanning. Deletion requires confirmation, removes files first and then deletes the inquiry/activity/metadata. If file removal fails the inquiry is kept for retry. Archiving is reversible; permanent deletion is not.

## Manage inquiry offerings

Services, Service categories and Inquiry budgets are part of the existing CMS. Add/edit/delete through the normal editor. Use lowercase unique slugs, description, optional category, indicative PHP starting price, featured/archive flags, display order and publication. **Published** means active; archived services and services in unpublished categories are hidden from both cards and inquiry selections. Lower display orders appear first.

The migration includes the 22 requested offerings. Review/edit them before launch. Academic assistance is tutoring, mentoring, consultation and guided problem-solving; the student remains the author. Budget labels and starting prices begin a discussion and are not automatic quotes or agreements.

Service/category/budget changes require no deployment. Refresh the public contact page or its service catalog to load changes. Deleting a catalog entry preserves existing inquiry snapshots. To remove a service from new requests without deleting its catalog entry, unpublish or archive it.

## Privacy and cleanup

Do not request unnecessary sensitive data. Review closed and archived requests and permanently delete when no longer needed. An archive is not deletion. A deletion request can be handled through the established conversation using the inquiry reference; do not collect additional identity documents casually.

For process-crash leftovers, run `node scripts/cleanup-inquiries.mjs` in the intended environment to preview incomplete requests older than 24 hours. Review the count, then use `--apply` to remove their files and pending rows. The tool requires the server secret and is not exposed in the dashboard or scheduled automatically. Back up appropriately and do not print client details in maintenance logs.
