import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';

type PublisherSite = {
  origin: string;
  normalizedDomain: string;
  verificationMethod: string | null;
  verificationChallengeHash: string | null;
};

function isPrivateAddress(address: string) {
  if (isIP(address) === 6)
    return (
      address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80')
    );
  const [a, b] = address.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254)
  );
}

export class PublisherSiteVerificationService {
  async verify(site: PublisherSite) {
    const challenge = site.verificationChallengeHash;
    if (!challenge || !site.verificationMethod) return false;
    if (site.verificationMethod === 'DNS_TXT') {
      const records = await dns.resolveTxt(`_adflow-verification.${site.normalizedDomain}`);
      return records.some((record) => record.join('') === challenge);
    }

    const addresses = await dns.lookup(site.normalizedDomain, { all: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) return false;
    const url = new URL(site.origin);
    if (url.protocol !== 'https:') return false;
    const target =
      site.verificationMethod === 'WELL_KNOWN'
        ? new URL(`/.well-known/adflow-verification/${challenge}`, url).toString()
        : url.toString();
    const response = await fetch(target, {
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: 'text/plain,text/html' },
    });
    if (!response.ok) return false;
    const body = (await response.text()).slice(0, 64_000);
    return site.verificationMethod === 'WELL_KNOWN'
      ? body.trim() === challenge
      : new RegExp(
          `<meta\\s+[^>]*name=["']adflow-site-verification["'][^>]*content=["']${challenge}["']`,
          'i',
        ).test(body);
  }
}
