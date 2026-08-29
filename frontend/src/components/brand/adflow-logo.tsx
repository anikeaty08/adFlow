import Image from 'next/image';

type AdFlowLogoProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function AdFlowLogo({ compact = false, inverse = false }: AdFlowLogoProps) {
  return (
    <span style={{ alignItems: 'center', display: 'inline-flex', gap: '0.65rem' }}>
      <Image alt="AdFlow" height={34} priority src="/brand/adflow-symbol.svg" width={34} />
      {!compact ? (
        <span
          style={{
            color: inverse ? '#f1f5ef' : 'var(--ink)',
            fontSize: '1.18rem',
            fontWeight: 800,
            letterSpacing: '-0.06em',
          }}
        >
          AdFlow
        </span>
      ) : null}
    </span>
  );
}
