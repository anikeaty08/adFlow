import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('AdFlowTestUSDC', () => {
  it('uses six decimals and mints its declared initial test supply to the owner', async () => {
    const [owner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('AdFlowTestUSDC');
    const initialSupply = 10_000_000n * 10n ** 6n;
    const token = await Token.deploy(owner.address, initialSupply);

    expect(await token.name()).to.equal('AdFlow Test USD Coin');
    expect(await token.symbol()).to.equal('adUSDC');
    expect(await token.decimals()).to.equal(6n);
    expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
  });

  it('allows only the owner to mint further test supply', async () => {
    const [owner, recipient, attacker] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('AdFlowTestUSDC');
    const token = await Token.deploy(owner.address, 0n);

    await token.mint(recipient.address, 1_500_000n);
    expect(await token.balanceOf(recipient.address)).to.equal(1_500_000n);
    await expect(token.connect(attacker).mint(recipient.address, 1n)).to.be.revertedWithCustomError(
      token,
      'OwnableUnauthorizedAccount',
    );
  });
});
