import { notFound } from 'next/navigation';

import { requireAuth } from '@/lib/auth';
import { getPage } from '@/lib/content';

import { PageEditor } from './page-editor';

export const dynamic = 'force-dynamic';

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAuth();

  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return <PageEditor initial={page} />;
}
