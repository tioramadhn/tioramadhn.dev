import { notFound } from 'next/navigation';

import { ContentPage } from '@/components/content-page';

import { getPage } from '@/lib/content';

import type { Metadata } from 'next';

const SLUG = 'contact';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage(SLUG);
  if (!page) return {};

  return { title: page.title, description: page.description };
}

export default async function Page() {
  const page = await getPage(SLUG);
  if (!page) notFound();

  return (
    <ContentPage
      caption={page.caption}
      title={page.title}
      description={page.description}
      mascot={page.mascot}
      body={page.body}
    />
  );
}
