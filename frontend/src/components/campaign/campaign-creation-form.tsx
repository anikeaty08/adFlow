'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { IconArrowLeft, IconArrowRight, IconCheck, IconShieldCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { createCampaign } from '@/lib/api/campaigns';
import { CreativeUpload } from './creative-upload';

const campaignSchema = z.object({
  name: z.string().min(2).max(120),
  objectiveText: z.string().min(10).max(4_000),
  landingUrl: z.string().url(),
  budget: z.number().positive(),
  categories: z.string().min(2),
  blockedCategories: z.string(),
  minReputation: z.number().min(0).max(100),
  maxCpc: z.number().positive().max(1),
  durationDays: z.number().int().min(1).max(90),
});
type CampaignFormValues = z.infer<typeof campaignSchema>;

const steps = ['Intent', 'Economics', 'Creative', 'Agent policy', 'Fund'] as const;
const atomicUsdc = (value: number) => String(Math.round(value * 1_000_000));
const categoriesFrom = (value: string) =>
  value
    .split(',')
    .map((category) => category.trim())
    .filter(Boolean);

export function CampaignCreationForm() {
  const router = useRouter();
  const form = useForm<CampaignFormValues>({
    defaultValues: {
      budget: 20,
      blockedCategories: 'adult, gambling',
      categories: 'AI, blockchain, developer tools',
      durationDays: 7,
      landingUrl: 'https://product.dev',
      maxCpc: 0.05,
      minReputation: 80,
      name: 'Developer API Launch',
      objectiveText: 'Promote my developer tool to AI and blockchain audiences. Optimize for quality clicks.',
    },
    resolver: zodResolver(campaignSchema),
  });
  const [step, setStep] = useState(0);
  const [creativeIds, setCreativeIds] = useState<string[]>([]);
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
        blockedCategories: categoriesFrom(values.blockedCategories),
        budgetPlannedAtomic: atomicUsdc(values.budget),
        creativeIds,
        endAt: endAt.toISOString(),
        landingUrl: values.landingUrl,
        maxUnitPriceAtomic: atomicUsdc(values.maxCpc),
        name: values.name,
        objectiveText: values.objectiveText,
        pricingModel: 'CPC',
        settlementToken: {
          address: process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
          symbol: 'USDC',
        },
        startAt: startAt.toISOString(),
        strategy: { explorationRatioBasisPoints: 1000, minReputationScore: values.minReputation },
        targeting: { categories: categoriesFrom(values.categories) },
      });
      router.push(`/app/campaigns/${campaign.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Campaign could not be created.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function nextStep() {
    const fieldsByStep = [
      ['name', 'objectiveText', 'landingUrl'] as const,
      ['budget', 'maxCpc', 'durationDays'] as const,
      [],
      ['categories', 'blockedCategories', 'minReputation'] as const,
    ];
    const fields = fieldsByStep[step];
    if (fields?.length && !(await form.trigger(fields))) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 0));
  }

  const values = form.watch();
  return (
    <form onSubmit={form.handleSubmit(submit)} style={{ display: 'grid', gap: '1.3rem', maxWidth: 720 }}>
      <ol
        aria-label="Campaign creation progress"
        style={{ display: 'flex', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}
      >
        {steps.map((label, index) => (
          <li
            key={label}
            style={{ color: index <= step ? 'var(--accent)' : 'var(--muted)', fontSize: '0.78rem' }}
          >
            {index < step ? <IconCheck size={14} /> : `${index + 1}.`} {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <>
          <label>
            Campaign name
            <input {...form.register('name')} />
          </label>
          <label>
            What should your agent accomplish?
            <textarea {...form.register('objectiveText')} rows={4} />
          </label>
          <label>
            Destination URL
            <input {...form.register('landingUrl')} />
          </label>
        </>
      ) : null}

      {step === 1 ? (
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
      ) : null}

      {step === 2 ? (
        <CreativeUpload
          destinationUrl={values.landingUrl}
          headline={values.name}
          onComplete={(creativeId) => setCreativeIds((ids) => [...new Set([...ids, creativeId])])}
        />
      ) : null}

      {step === 3 ? (
        <>
          <label>
            Target audiences (comma separated)
            <input {...form.register('categories')} />
          </label>
          <label>
            Blocked categories (comma separated)
            <input {...form.register('blockedCategories')} />
          </label>
          <label>
            Minimum publisher reputation
            <input
              max="100"
              min="0"
              type="number"
              {...form.register('minReputation', { valueAsNumber: true })}
            />
          </label>
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
              Actions above 2 USDC require your review. The agent cannot bypass this policy or sign wallet
              transactions.
            </span>
          </div>
        </>
      ) : null}

      {step === 4 ? (
        <article
          style={{
            border: '1px solid var(--line-strong)',
            borderRadius: 14,
            display: 'grid',
            gap: 10,
            padding: '1.25rem',
          }}
        >
          <p className="eyebrow">Funding review</p>
          <strong>{values.name}</strong>
          <span>
            {values.budget?.toFixed(2)} USDC · {values.maxCpc?.toFixed(3)} max CPC · {values.durationDays}{' '}
            days
          </span>
          <span>
            {creativeIds.length
              ? `${creativeIds.length} creative ready for delivery`
              : 'No creative uploaded yet'}
          </span>
          <span>Next: create the campaign, then approve USDC and fund CampaignVault from your wallet.</span>
        </article>
      ) : null}

      <div style={{ display: 'flex', gap: 10 }}>
        {step > 0 ? (
          <button className="buttonSecondary" onClick={previousStep} type="button">
            <IconArrowLeft size={17} /> Back
          </button>
        ) : null}
        {step < steps.length - 1 ? (
          <button className="buttonPrimary" onClick={nextStep} type="button">
            Continue <IconArrowRight size={17} />
          </button>
        ) : (
          <button className="buttonPrimary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating campaign' : 'Create and review funding'} <IconArrowRight size={17} />
          </button>
        )}
      </div>
      {submitError ? <p style={{ color: 'var(--danger)', margin: 0 }}>{submitError}</p> : null}
    </form>
  );
}
