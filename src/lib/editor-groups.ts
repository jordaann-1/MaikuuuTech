import { entities, type Entity, type Field } from './content';
type Group = { id: string; title: string; description: string; fields: Field[] };
export function editorGroups(entity: Entity): Group[] {
  const definitions =
    entity === 'projects'
      ? [
          [
            'overview',
            'The essentials',
            'Give this project a clear identity.',
            'title',
            'slug',
            'short_description',
            'category',
            'status',
            'thumbnail',
          ],
          [
            'case-study',
            'The story behind the build',
            'Describe the problem, your approach, and your contribution.',
            'description',
            'problem',
            'solution',
            'architecture',
            'role',
            'features',
          ],
          [
            'technology',
            'Technology & links',
            'Connect the tools and places where this project lives.',
            'technologies',
            'github_url',
            'demo_url',
            'documentation_url',
          ],
          [
            'timeline',
            'Project timeline',
            'Use dates that reflect your actual development journey.',
            'start_date',
            'completion_date',
          ],
          [
            'gallery',
            'Screenshot gallery',
            'A closer look, in the order you want to tell the story.',
            'gallery',
          ],
          [
            'publishing',
            'Publishing',
            'Control visibility, featured placement, and display order.',
            'is_featured',
            'sort_order',
            'is_published',
          ],
        ]
      : entity === 'settings'
        ? [
            [
              'identity',
              'Your identity',
              'The first impression, in your own words.',
              'site_title',
              'developer_name',
              'headline',
              'introduction',
              'profile_image',
              'location',
              'availability',
            ],
            [
              'story',
              'Your story',
              'Your background, interests, and direction.',
              'biography',
              'interests',
              'career_goals',
              'specializations',
            ],
            [
              'discovery',
              'Contact & discovery',
              'How people reach you and find your portfolio.',
              'contact_email',
              'seo_description',
              'og_image',
              'footer_text',
            ],
          ]
        : [
            [
              'details',
              'Content details',
              'Add real information. Leave optional fields empty when they do not apply.',
              ...entities[entity].fields
                .filter((f) => !['sort_order', 'is_published'].includes(f.key))
                .map((f) => f.key),
            ],
            [
              'publishing',
              'Publishing',
              'Choose when this content becomes visible.',
              'sort_order',
              'is_published',
            ],
          ];
  const assigned = new Set<string>();
  const groups = definitions
    .map(([id, title, description, ...keys]) => ({
      id,
      title,
      description,
      fields: keys.flatMap((key) => {
        const field = entities[entity].fields.find((f) => f.key === key);
        if (field) assigned.add(key);
        return field ? [field] : [];
      }),
    }))
    .filter((group) => group.fields.length);
  const remaining = entities[entity].fields.filter((field) => !assigned.has(field.key));
  if (remaining.length)
    groups.push({
      id: 'additional',
      title: 'Additional details',
      description: 'More information for this record.',
      fields: remaining,
    });
  return groups;
}
