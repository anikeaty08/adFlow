import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('CampaignVault', () => {
  async function deployFixture() {
    const [owner, advertiser, publisher, operator] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('ERC20Mock');
    const token = await Token.deploy();
    const Vault = await ethers.getContractFactory('CampaignVault');
    const vault = await Vault.deploy(owner.address, operator.address);

    await token.mint(advertiser.address, 2_000_000n);

    return { advertiser, publisher, operator, token, vault };
  }

  async function createAcceptedAgreement() {
    const fixture = await deployFixture();
    const { advertiser, publisher, token, vault } = fixture;

    await token.connect(advertiser).approve(await vault.getAddress(), 1_000_000n);
    await vault.connect(advertiser).createCampaign(await token.getAddress(), 1_000_000n);
    await vault.connect(advertiser).createAgreement(1n, publisher.address, 500_000n);
    await vault.connect(publisher).acceptAgreement(1n);

    return fixture;
  }

  it('escrows funding and limits settlement to an accepted agreement cap', async () => {
    const { operator, publisher, token, vault } = await createAcceptedAgreement();
    const reference = ethers.id('epoch:agreement-1:1');

    await vault.connect(operator).recordSettlement(1n, 400_000n, reference, ethers.id('evidence:1'));

    expect(await vault.claimable(publisher.address, await token.getAddress())).to.equal(400_000n);
    await expect(
      vault.connect(operator).recordSettlement(1n, 100_001n, ethers.id('epoch:agreement-1:2'), ethers.id('evidence:2')),
    ).to.be.revertedWithCustomError(vault, 'AllocationExceeded');
  });

  it('prevents an operator from replaying a settlement epoch', async () => {
    const { operator, vault } = await createAcceptedAgreement();
    const reference = ethers.id('epoch:agreement-1:1');

    await vault.connect(operator).recordSettlement(1n, 10n, reference, ethers.id('evidence:1'));

    await expect(
      vault.connect(operator).recordSettlement(1n, 10n, reference, ethers.id('evidence:1')),
    ).to.be.revertedWithCustomError(vault, 'SettlementAlreadyRecorded');
  });

  it('requires publisher acceptance before settlement and transfers only on claim', async () => {
    const { advertiser, publisher, operator, token, vault } = await deployFixture();
    await token.connect(advertiser).approve(await vault.getAddress(), 100n);
    await vault.connect(advertiser).createCampaign(await token.getAddress(), 100n);
    await vault.connect(advertiser).createAgreement(1n, publisher.address, 100n);

    await expect(
      vault.connect(operator).recordSettlement(1n, 100n, ethers.id('epoch:unaccepted'), ethers.id('evidence:1')),
    ).to.be.revertedWithCustomError(vault, 'AgreementInactive');

    await vault.connect(publisher).acceptAgreement(1n);
    await vault.connect(operator).recordSettlement(1n, 100n, ethers.id('epoch:accepted'), ethers.id('evidence:1'));
    await vault.connect(publisher).claim(await token.getAddress());

    expect(await token.balanceOf(publisher.address)).to.equal(100n);
  });

  it('does not let an advertiser withdraw escrow reserved for an agreement', async () => {
    const { advertiser, vault } = await createAcceptedAgreement();

    await expect(vault.connect(advertiser).withdrawUnreserved(1n, 500_001n)).to.be.revertedWithCustomError(
      vault,
      'InsufficientAvailableEscrow',
    );
  });
});
