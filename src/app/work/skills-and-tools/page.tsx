import { MdxPage } from '@/components/mdx-page';

import Content, { meta } from './content.mdx';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
};

export default function Page() {
  return (
    <MdxPage meta={meta} mascot="excited">
      <Content />
    </MdxPage>
  );
}
