import { DomainError } from '@adflow/shared';
import type { AuthenticatedUser } from '../../shared/auth.js';
import { CampaignRepository, type NewCampaign } from './campaign.repository.js';

export class CampaignService {
  constructor(private readonly repository: CampaignRepository) {}
  create(owner: AuthenticatedUser, input: Omit<NewCampaign, 'ownerUserId' | 'ownerWalletId'>) {
    return this.repository.create({ ...input, ownerUserId: owner.id, ownerWalletId: owner.walletId });
  }
  async get(campaignId: string, owner: AuthenticatedUser) {
    const campaign = await this.repository.findById(campaignId, owner.id);
    if (!campaign) throw new DomainError('NOT_FOUND', 'Campaign was not found.');
    return campaign;
  }
  async updateDraft(
    campaignId: string,
    owner: AuthenticatedUser,
    update: { name?: string; objectiveText?: string; landingUrl?: string },
  ) {
    const campaign = await this.repository.updateDraft(campaignId, owner.id, update);
    if (!campaign) throw new DomainError('CONFLICT', 'Campaign was not found or is no longer editable.');
    return campaign;
  }
}
