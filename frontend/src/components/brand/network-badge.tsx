export function NetworkBadge() {
  return (
    <span
      style={{
        alignItems: 'center',
        color: 'var(--muted)',
        display: 'inline-flex',
        fontFamily: 'Courier New, monospace',
        fontSize: '0.72rem',
        gap: '0.45rem',
      }}
    >
      <span
        aria-hidden="true"
        style={{ background: 'var(--accent)', borderRadius: '50%', height: 7, width: 7 }}
      />
      Celo Sepolia
    </span>
  );
}
