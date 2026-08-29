import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('AdFlowSettlement', () => {
  async function deployFixture() {
    const [owner, advertiser, publisher, operator] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('ERC20Mock');
    const token = await Token.deploy();
    const Vault = await ethers.getContractFactory('CampaignVault');
    const vault = await Vault.deploy(owner.address, operator.address);
    const Settlement = await ethers.getContractFactory('AdFlowSettlement');
    const settlement = await Settlement.deploy(owner.address, await vault.getAddress(), operator.address);

    await vault.connect(owner).setSettlementContract(await settlement.getAddress());
    await token.mint(advertiser.address, 1_000_000n);
    await token.connect(advertiser).approve(await vault.getAddress(), 1_000_000n);
    await vault.connect(advertiser).createCampaign(await token.getAddress(), 1_000_000n);

    return { advertiser, publisher, operator, token, settlement };
  }

  it('computes CPC payout from verified units instead of accepting an arbitrary payout', async () => {
    const { advertiser, publisher, operator, token, settlement } = await deployFixture();
    await settlement.connect(advertiser).createAgreement(1n, publisher.address, 28_000n, 1n, 500_000n);
    await settlement.connect(publisher).acceptAgreement(1n);

    await settlement.connect(operator).settleEpoch(1n, 10n, ethers.id('epoch:1'), ethers.id('evidence:1'));

    expect(await settlement.claimable(publisher.address, await token.getAddress())).to.equal(280_000n);
  });

  it('uses CPM unit scale and blocks epoch replay', async () => {
    const { advertiser, publisher, operator, token, settlement } = await deployFixture();
    await settlement.connect(advertiser).createAgreement(1n, publisher.address, 10_000n, 1_000n, 100_000n);
    await settlement.connect(publisher).acceptAgreement(1n);
    const epoch = ethers.id('epoch:1');

    await settlement.connect(operator).settleEpoch(1n, 1_999n, epoch, ethers.id('evidence:1'));

    expect(await settlement.claimable(publisher.address, await token.getAddress())).to.equal(19_990n);
    await expect(
      settlement.connect(operator).settleEpoch(1n, 1n, epoch, ethers.id('evidence:1')),
    ).to.be.revertedWithCustomError(settlement, 'Replay');
  });

  it('does not give the settlement operator advertiser withdrawal power', async () => {
    const { advertiser, publisher, operator, settlement } = await deployFixture();
    await settlement.connect(advertiser).createAgreement(1n, publisher.address, 1n, 1n, 1n);

    await expect(settlement.connect(operator).setAgreementActive(1n, false)).to.be.revertedWithCustomError(
      settlement,
      'NotAdvertiser',
    );
  });
});
