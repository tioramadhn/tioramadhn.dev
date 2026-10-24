'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  Field,
  StatusBanner,
  TextArea,
  TextInput,
  labelClass,
} from '@/components/admin/fields';
import { Mascot } from '@/components/mascot';

import { saveSettingsAction } from '@/app/admin/content-actions';

import type { SiteSettings } from '@/lib/content-types';

const buttonClass =
  'border-ink bg-paper-raised border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase hover:bg-lime hover:text-[#11100f]';

export function ProfileForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<SiteSettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const patch = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K]
  ) => setValues((current) => ({ ...current, [key]: value }));

  const patchProfile = <K extends keyof SiteSettings['profile']>(
    key: K,
    value: SiteSettings['profile'][K]
  ) =>
    setValues((current) => ({
      ...current,
      profile: { ...current.profile, [key]: value },
    }));

  const patchHero = <K extends keyof SiteSettings['hero']>(
    key: K,
    value: SiteSettings['hero'][K]
  ) =>
    setValues((current) => ({
      ...current,
      hero: { ...current.hero, [key]: value },
    }));

  const save = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await saveSettingsAction(values);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage('Saved. The site is updated.');
      router.refresh();
    });
  };

  const uploadResume = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);

      const response = await fetch('/api/media', {
        method: 'POST',
        body: form,
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Upload failed.');
      }

      patchProfile('resumeUrl', data.url);
      setMessage('CV uploaded. Save to publish the new link.');
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Upload failed.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={clsx('flex flex-col gap-6')}>
      <div className={clsx('flex items-center gap-3')}>
        <Mascot expression="content" size={72} className={clsx('-my-4')} />
        <h1 className={clsx('display-text text-3xl')}>Profile</h1>
      </div>

      <section className={clsx('panel flex flex-col gap-4 p-6')}>
        <h2 className={labelClass}>Identity</h2>
        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <Field label="Name">
            <TextInput
              value={values.profile.name}
              onChange={(v) => patchProfile('name', v)}
            />
          </Field>
          <Field label="Handle" hint="Used in the logo and social links.">
            <TextInput
              value={values.profile.handle}
              onChange={(v) => patchProfile('handle', v)}
            />
          </Field>
          <Field label="Role">
            <TextInput
              value={values.profile.role}
              onChange={(v) => patchProfile('role', v)}
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={values.profile.email}
              onChange={(v) => patchProfile('email', v)}
            />
          </Field>
          <Field label="Location">
            <TextInput
              value={values.profile.location}
              onChange={(v) => patchProfile('location', v)}
            />
          </Field>
          <Field label="Timezone">
            <TextInput
              value={values.profile.timezone}
              onChange={(v) => patchProfile('timezone', v)}
            />
          </Field>
        </div>

        <Field
          label="Meta description"
          hint="Shown in search results and social cards."
        >
          <TextArea
            value={values.profile.description}
            onChange={(v) => patchProfile('description', v)}
          />
        </Field>

        <label className={clsx('flex items-center gap-3')}>
          <input
            type="checkbox"
            checked={values.profile.openToWork}
            onChange={(event) =>
              patchProfile('openToWork', event.target.checked)
            }
            className={clsx('border-ink h-5 w-5 border-[3px]')}
          />
          <span className={labelClass}>
            Show the &ldquo;open to opportunities&rdquo; badge
          </span>
        </label>

        <Field label="CV / résumé" hint="Upload a PDF, or point at any URL.">
          <div className={clsx('flex gap-2')}>
            <TextInput
              value={values.profile.resumeUrl}
              onChange={(v) => patchProfile('resumeUrl', v)}
              placeholder="/media/2026/10/resume.pdf"
            />
            <label
              className={clsx(
                buttonClass,
                'flex shrink-0 cursor-pointer items-center'
              )}
            >
              {uploading ? 'Uploading…' : 'Upload PDF'}
              <input
                type="file"
                accept="application/pdf"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadResume(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
        </Field>
      </section>

      <section className={clsx('panel flex flex-col gap-4 p-6')}>
        <h2 className={labelClass}>Homepage</h2>
        <Field label="Headline" hint="One line per row of the big heading.">
          <TextArea
            rows={2}
            value={values.hero.headline}
            onChange={(v) => patchHero('headline', v)}
          />
        </Field>
        <Field
          label="Intro"
          hint="Follows the highlighted role in the opening paragraph."
        >
          <TextArea
            rows={3}
            value={values.hero.intro}
            onChange={(v) => patchHero('intro', v)}
          />
        </Field>
        <div className={clsx('grid gap-4', 'md:grid-cols-2')}>
          <Field label="Call-to-action title">
            <TextInput
              value={values.hero.ctaTitle}
              onChange={(v) => patchHero('ctaTitle', v)}
            />
          </Field>
          <Field label="Call-to-action body">
            <TextInput
              value={values.hero.ctaBody}
              onChange={(v) => patchHero('ctaBody', v)}
            />
          </Field>
        </div>
        <Field label="Favourite stack" hint="Comma separated chips.">
          <TextInput
            value={values.stack.join(', ')}
            onChange={(v) =>
              patch(
                'stack',
                v.split(',').map((item) => item.trimStart())
              )
            }
          />
        </Field>
      </section>

      <section className={clsx('panel flex flex-col gap-4 p-6')}>
        <div className={clsx('flex items-center justify-between')}>
          <h2 className={labelClass}>Highlights</h2>
          <button
            type="button"
            className={buttonClass}
            onClick={() =>
              patch('highlights', [
                ...values.highlights,
                { label: '', title: '', detail: '' },
              ])
            }
          >
            + Add
          </button>
        </div>

        {values.highlights.map((highlight, index) => (
          <div
            key={index}
            className={clsx('border-ink flex flex-col gap-3 border-2 p-4')}
          >
            <div className={clsx('grid gap-3', 'md:grid-cols-3')}>
              <Field label="Label">
                <TextInput
                  value={highlight.label}
                  onChange={(v) =>
                    patch(
                      'highlights',
                      values.highlights.map((item, i) =>
                        i === index ? { ...item, label: v } : item
                      )
                    )
                  }
                />
              </Field>
              <Field label="Title">
                <TextInput
                  value={highlight.title}
                  onChange={(v) =>
                    patch(
                      'highlights',
                      values.highlights.map((item, i) =>
                        i === index ? { ...item, title: v } : item
                      )
                    )
                  }
                />
              </Field>
              <Field label="Detail">
                <TextInput
                  value={highlight.detail}
                  onChange={(v) =>
                    patch(
                      'highlights',
                      values.highlights.map((item, i) =>
                        i === index ? { ...item, detail: v } : item
                      )
                    )
                  }
                />
              </Field>
            </div>
            <button
              type="button"
              className={clsx(buttonClass, 'self-start')}
              onClick={() =>
                patch(
                  'highlights',
                  values.highlights.filter((_, i) => i !== index)
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      <section className={clsx('panel flex flex-col gap-4 p-6')}>
        <div className={clsx('flex items-center justify-between')}>
          <h2 className={labelClass}>Social links</h2>
          <button
            type="button"
            className={buttonClass}
            onClick={() =>
              patch('socials', [...values.socials, { label: '', href: '' }])
            }
          >
            + Add
          </button>
        </div>

        {values.socials.map((social, index) => (
          <div key={index} className={clsx('flex flex-wrap items-end gap-3')}>
            <div className={clsx('w-40')}>
              <Field label="Label">
                <TextInput
                  value={social.label}
                  onChange={(v) =>
                    patch(
                      'socials',
                      values.socials.map((item, i) =>
                        i === index ? { ...item, label: v } : item
                      )
                    )
                  }
                />
              </Field>
            </div>
            <div className={clsx('min-w-60 flex-1')}>
              <Field label="URL">
                <TextInput
                  value={social.href}
                  onChange={(v) =>
                    patch(
                      'socials',
                      values.socials.map((item, i) =>
                        i === index ? { ...item, href: v } : item
                      )
                    )
                  }
                />
              </Field>
            </div>
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                patch(
                  'socials',
                  values.socials.filter((_, i) => i !== index)
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      <StatusBanner error={error} message={message} />

      <div
        className={clsx(
          'border-ink bg-paper-raised sticky bottom-0 flex items-center gap-3 border-[3px] p-4'
        )}
      >
        <button
          type="button"
          disabled={pending || uploading}
          onClick={save}
          className={clsx(
            'border-ink bg-ink text-paper shadow-brutal panel-interactive border-[3px] px-5 py-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <span className={clsx('text-ink-soft font-mono text-[11px]')}>
          Stored in R2 as site/settings.json
        </span>
      </div>
    </div>
  );
}
