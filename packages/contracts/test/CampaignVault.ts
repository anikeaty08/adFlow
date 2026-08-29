import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('CampaignVault', () => {
  async function deployFixture() {
    const [owner, advertiser, settlement] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('ERC20Mock');
    const token = await Token.deploy();
    const Vault = await ethers.getContractFactory('CampaignVault');
    const vault = await Vault.deploy(owner.address, settlement.address);

    await token.mint(advertiser.address, 1_000_000n);
    await token.connect(advertiser).approve(await vault.getAddress(), 1_000_000n);
    await vault.connect(advertiser).createCampaign(await token.getAddress(), 1_000_000n);
    return { owner, advertiser, settlement, token, vault };
  }

  it('escrows funding and releases only reserved funds to the settlement contract', async () => {
    const { owner, settlement, token, vault } = await deployFixture();
    await vault.connect(owner).setSettlementContract(settlement.address);
    await vault.connect(settlement).reserveForSettlement(1n, 400_000n);

    expect(await vault.availableEscrow(1n)).to.equal(600_000n);
    await vault.connect(settlement).releaseReservedEscrow(1n, 250_000n);
    expect(await token.balanceOf(settlement.address)).to.equal(250_000n);
  });

  it('prevents an advertiser from withdrawing reserved escrow', async () => {
    const { owner, settlement, advertiser, vault } = await deployFixture();
    await vault.connect(owner).setSettlementContract(settlement.address);
    await vault.connect(settlement).reserveForSettlement(1n, 400_000n);

    await expect(vault.connect(advertiser).withdrawUnreserved(1n, 600_001n)).to.be.revertedWithCustomError(
      vault,
      'InsufficientAvailableEscrow',
    );
  });
});
