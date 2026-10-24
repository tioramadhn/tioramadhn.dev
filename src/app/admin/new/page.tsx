import clsx from 'clsx';

import { PostEditor } from '@/components/admin/post-editor';
import { Mascot } from '@/components/mascot';

import { requireAuth } from '@/lib/auth';
import { today } from '@/lib/markdown';

export default async function NewPostPage() {
  await requireAuth();

  return (
    <>
      <div className={clsx('mb-8 flex items-center gap-3')}>
        <Mascot expression="writing" size={72} className={clsx('-my-4')} />
        <h1 className={clsx('display-text text-3xl')}>New post</h1>
      </div>
      <PostEditor
        initial={{
          originalSlug: '',
          slug: '',
          title: '',
          description: '',
          date: today(),
          tags: '',
          cover: '',
          body: '',
          status: 'draft',
        }}
      />
    </>
  );
}
