import clsx from 'clsx';
import { notFound } from 'next/navigation';

import { PostEditor } from '@/components/admin/post-editor';
import { Mascot } from '@/components/mascot';

import { requireAuth } from '@/lib/auth';
import { getPost } from '@/lib/posts';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAuth();

  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <div className={clsx('mb-8 flex items-center gap-3')}>
        <Mascot expression="writing" size={72} className={clsx('-my-4')} />
        <h1 className={clsx('display-text min-w-0 text-3xl break-words')}>
          {post.title}
        </h1>
      </div>
      <PostEditor
        initial={{
          originalSlug: post.slug,
          slug: post.slug,
          title: post.title,
          description: post.description,
          date: post.date,
          tags: post.tags.join(', '),
          cover: post.cover ?? '',
          series: post.series?.title ?? '',
          body: post.body,
          status: post.status,
        }}
      />
    </>
  );
}
