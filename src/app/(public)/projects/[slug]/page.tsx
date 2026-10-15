import { notFound } from 'next/navigation';
import { publicProject } from '@/lib/data';
import { str } from '@/lib/content';
import { pageMetadata } from '@/lib/metadata';
import { ProjectCaseStudy } from '@/components/project-case-study';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const project = await publicProject((await params).slug);
  return project
    ? pageMetadata(
        str(project, 'title'),
        '/projects/' + str(project, 'slug'),
        str(project, 'short_description'),
      )
    : { title: 'Project not found', robots: { index: false } };
}
export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const project = await publicProject((await params).slug);
  if (!project) notFound();
  return <ProjectCaseStudy project={project} />;
}
