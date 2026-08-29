// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AdFlowTestUSDC
 * @notice A six-decimal Celo Sepolia test settlement asset for AdFlow integration testing.
 * @dev This is not Circle USDC and is deliberately named/symbolled to prevent user confusion.
 *      Only the owner may mint additional test supply. It must never be used on mainnet.
 */
contract AdFlowTestUSDC is ERC20, Ownable {
    uint8 private constant TOKEN_DECIMALS = 6;

    constructor(address initialOwner, uint256 initialSupply)
        ERC20("AdFlow Test USD Coin", "adUSDC")
        Ownable(initialOwner)
    {
        _mint(initialOwner, initialSupply);
    }

    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    function mint(address recipient, uint256 amount) external onlyOwner {
        _mint(recipient, amount);
    }
}
