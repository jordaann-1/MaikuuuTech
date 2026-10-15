import { defaultsFor, type Entity, type Row } from './content';
export function formValues(entity: Entity, row?: Row): Record<string, unknown> {
  const defaults = defaultsFor(entity);
  if (!row) return defaults;
  const data = Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [key, row[key] ?? value]),
  );
  if (entity === 'projects') {
    data.technologies = ((row.project_technologies as { name: string }[]) || []).map((t) => t.name);
    data.gallery = ((row.project_images as Row[]) || [])
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((image) => ({
        path: image.path,
        alt_text: image.alt_text,
        sort_order: image.sort_order,
      }));
  }
  return data;
}
export async function apiResult(response: Response) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request failed.');
  return result;
}
