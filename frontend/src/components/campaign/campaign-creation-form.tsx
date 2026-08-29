'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { IconArrowRight, IconShieldCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { createCampaign } from '@/lib/api/campaigns';
import { CreativeUpload } from './creative-upload';

const atomicUsdc = (value: string) => String(Math.round(Number(value) * 1_000_000));
const campaignSchema = z.object({
  name: z.string().min(2).max(120),
  objectiveText: z.string().min(10).max(4_000),
  landingUrl: z.string().url(),
  budget: z.number().positive(),
  maxCpc: z.number().positive().max(1),
  durationDays: z.number().int().min(1).max(90),
});
type CampaignFormValues = z.infer<typeof campaignSchema>;

export function CampaignCreationForm() {
  const router = useRouter();
  const form = useForm<CampaignFormValues>({
    defaultValues: {
      budget: 20,
      durationDays: 7,
      landingUrl: 'https://product.dev',
      maxCpc: 0.05,
      name: 'Developer API Launch',
      objectiveText: 'Promote my developer tool to AI and blockchain audiences. Optimize for quality clicks.',
    },
    resolver: zodResolver(campaignSchema),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  async function submit(values: CampaignFormValues) {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const startAt = new Date();
      const endAt = new Date(startAt);
      endAt.setDate(startAt.getDate() + values.durationDays);
      const campaign = await createCampaign({
        blockedCategories: ['adult', 'gambling'],
        budgetPlannedAtomic: atomicUsdc(String(values.budget)),
        endAt: endAt.toISOString(),
        landingUrl: values.landingUrl,
        maxUnitPriceAtomic: atomicUsdc(String(values.maxCpc)),
        name: values.name,
        objectiveText: values.objectiveText,
        pricingModel: 'CPC',
        settlementToken: {
          address: process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
          symbol: 'USDC',
        },
        startAt: startAt.toISOString(),
        strategy: { explorationRatioBasisPoints: 1000, minReputationScore: 80 },
        targeting: { categories: ['AI', 'blockchain', 'developer-tools'] },
      });
      router.push(`/app/campaigns/${campaign.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Campaign could not be created.');
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} style={{ display: 'grid', gap: '1.3rem', maxWidth: 720 }}>
      <label>
        Campaign name
        <input {...form.register('name')} />
        {form.formState.errors.name ? <small>{form.formState.errors.name.message}</small> : null}
      </label>
      <label>
        What should your agent accomplish?
        <textarea {...form.register('objectiveText')} rows={4} />
        {form.formState.errors.objectiveText ? (
          <small>{form.formState.errors.objectiveText.message}</small>
        ) : null}
      </label>
      <label>
        Destination URL
        <input {...form.register('landingUrl')} />
        {form.formState.errors.landingUrl ? <small>{form.formState.errors.landingUrl.message}</small> : null}
      </label>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <label>
          Budget USDC
          <input step="0.01" type="number" {...form.register('budget', { valueAsNumber: true })} />
        </label>
        <label>
          Maximum CPC
          <input step="0.001" type="number" {...form.register('maxCpc', { valueAsNumber: true })} />
        </label>
        <label>
          Duration days
          <input type="number" {...form.register('durationDays', { valueAsNumber: true })} />
        </label>
      </div>
      <div
        style={{
          border: '1px solid rgba(155, 239, 115, 0.32)',
          borderRadius: 12,
          color: 'var(--muted)',
          display: 'flex',
          gap: 12,
          padding: '1rem',
        }}
      >
        <IconShieldCheck color="var(--accent)" />
        <span>
          Agent policy: reputation 80+, adult and gambling blocked, 2 USDC automated-action threshold.
        </span>
      </div>
      <CreativeUpload />
      <button className="buttonPrimary" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Creating campaign' : 'Create and review funding'} <IconArrowRight size={17} />
      </button>
      {submitError ? <p style={{ color: 'var(--danger)', margin: 0 }}>{submitError}</p> : null}
    </form>
  );
}
