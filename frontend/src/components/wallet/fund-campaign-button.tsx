'use client';

import { IconWallet } from '@tabler/icons-react';
import { useState } from 'react';
import { usePublicClient, useSendTransaction } from 'wagmi';
import { confirmCampaignFunding, prepareCampaignFunding } from '@/lib/api/campaigns';

type PreparedCall = { chainId: number; to: `0x${string}`; data: `0x${string}`; value: string | number };
type FundingPreparation = {
  state: string;
  approval: { contractCall: PreparedCall } | null;
  fundingContractCall: PreparedCall | null;
};

export function FundCampaignButton({ campaignId }: { campaignId: string }) {
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient({ chainId: 11142220 });
  const [status, setStatus] = useState('');
  async function fund() {
    setStatus('Preparing wallet transaction...');
    try {
      const prepared = (await prepareCampaignFunding(campaignId)) as FundingPreparation;
      if (prepared.state !== 'prepared' || !prepared.fundingContractCall) {
        setStatus('Campaign contract is not ready for funding yet.');
        return;
      }
      if (prepared.approval?.contractCall) {
        setStatus('Approve the USDC allowance in your wallet.');
        await sendTransactionAsync({
          chainId: 11142220,
          data: prepared.approval.contractCall.data,
          to: prepared.approval.contractCall.to,
          value: BigInt(prepared.approval.contractCall.value),
        });
      }
      setStatus('Fund the campaign vault in your wallet.');
      const fundingHash = await sendTransactionAsync({
        chainId: 11142220,
        data: prepared.fundingContractCall.data,
        to: prepared.fundingContractCall.to,
        value: BigInt(prepared.fundingContractCall.value),
      });
      setStatus('Transaction submitted. Waiting for chain confirmation...');
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: fundingHash });
      setStatus('Confirmed. Linking the CampaignCreated event...');
      await confirmCampaignFunding(campaignId, fundingHash);
      setStatus('Campaign funded and linked to its on-chain campaign ID.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Wallet transaction could not be submitted.');
    }
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button className="buttonPrimary" onClick={fund} type="button">
        <IconWallet size={16} />
        Approve and fund
      </button>
      {status ? <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{status}</span> : null}
    </div>
  );
}
