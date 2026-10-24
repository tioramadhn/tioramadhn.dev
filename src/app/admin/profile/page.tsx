import { requireAuth } from '@/lib/auth';
import { getSettings } from '@/lib/content';

import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  await requireAuth();
  const settings = await getSettings();

  return <ProfileForm initial={settings} />;
}
