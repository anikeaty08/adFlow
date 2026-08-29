// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CampaignVault
/// @notice Escrows campaign tokens and exposes only bounded reservation/release primitives to settlement.
/// @dev Advertisers sign lifecycle writes. Settlement pricing, evidence, replay protection, and claims
///      live exclusively in AdFlowSettlement.
contract CampaignVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error CampaignInactive();
    error CampaignNotFound();
    error InsufficientAvailableEscrow();
    error InvalidAddress();
    error InvalidAmount();
    error NotSettlementContract();
    error NotAdvertiser();

    struct Campaign {
        address advertiser;
        IERC20 token;
        uint128 funded;
        uint128 reserved;
        uint128 paid;
        uint128 maxUnitPrice;
        bool active;
    }

    address public settlementContract;
    uint256 public nextCampaignId;

    mapping(uint256 campaignId => Campaign campaign) public campaigns;

    event CampaignCreated(uint256 indexed campaignId, address indexed advertiser, address indexed token, uint256 initialFunding, uint256 maxUnitPrice);
    event CampaignFunded(uint256 indexed campaignId, uint256 amount, uint256 totalFunded);
    event CampaignStatusChanged(uint256 indexed campaignId, bool active);
    event CampaignWithdrawal(uint256 indexed campaignId, address indexed advertiser, uint256 amount);
    event SettlementContractChanged(address indexed previousContract, address indexed newContract);

    constructor(address initialOwner, address initialSettlementOperator) Ownable(initialOwner) {
        if (initialSettlementOperator == address(0)) revert InvalidAddress();
    }

    modifier onlyAdvertiser(uint256 campaignId) {
        Campaign storage campaign = _campaign(campaignId);
        if (campaign.advertiser != msg.sender) revert NotAdvertiser();
        _;
    }

    /// @notice Configures the only settlement contract allowed to release campaign escrow.
    function setSettlementContract(address newSettlementContract) external onlyOwner {
        if (newSettlementContract == address(0)) revert InvalidAddress();
        address previousContract = settlementContract;
        settlementContract = newSettlementContract;
        emit SettlementContractChanged(previousContract, newSettlementContract);
    }

    function createCampaign(address token, uint256 initialFunding, uint256 maxUnitPrice) external nonReentrant returns (uint256 campaignId) {
        if (token == address(0)) revert InvalidAddress();
        if (initialFunding == 0 || initialFunding > type(uint128).max || maxUnitPrice == 0 || maxUnitPrice > type(uint128).max) revert InvalidAmount();

        campaignId = ++nextCampaignId;
        campaigns[campaignId] = Campaign({
            advertiser: msg.sender,
            token: IERC20(token),
            funded: uint128(initialFunding),
            reserved: 0,
            paid: 0,
            maxUnitPrice: uint128(maxUnitPrice),
            active: true
        });
        IERC20(token).safeTransferFrom(msg.sender, address(this), initialFunding);
        emit CampaignCreated(campaignId, msg.sender, token, initialFunding, maxUnitPrice);
    }

    /// @notice Adds escrow to an existing campaign. This is an advertiser wallet-signed action.
    function fundCampaign(uint256 campaignId, uint256 amount) external onlyAdvertiser(campaignId) nonReentrant {
        Campaign storage campaign = _campaign(campaignId);
        if (amount == 0 || amount > type(uint128).max) revert InvalidAmount();
        if (uint256(campaign.funded) + amount > type(uint128).max) revert InvalidAmount();

        campaign.funded += uint128(amount);
        campaign.token.safeTransferFrom(msg.sender, address(this), amount);
        emit CampaignFunded(campaignId, amount, campaign.funded);
    }

    function setCampaignActive(uint256 campaignId, bool active) external onlyAdvertiser(campaignId) {
        Campaign storage campaign = _campaign(campaignId);
        campaign.active = active;
        emit CampaignStatusChanged(campaignId, active);
    }

    function withdrawUnreserved(uint256 campaignId, uint256 amount) external onlyAdvertiser(campaignId) nonReentrant {
        Campaign storage campaign = _campaign(campaignId);
        if (amount == 0) revert InvalidAmount();
        if (_availableEscrow(campaign) < amount) revert InsufficientAvailableEscrow();

        campaign.funded -= uint128(amount);
        campaign.token.safeTransfer(msg.sender, amount);
        emit CampaignWithdrawal(campaignId, msg.sender, amount);
    }

    function availableEscrow(uint256 campaignId) external view returns (uint256) {
        return _availableEscrow(_campaign(campaignId));
    }

    function campaignAdvertiser(uint256 campaignId) external view returns (address) {
        return _campaign(campaignId).advertiser;
    }

    function campaignToken(uint256 campaignId) external view returns (address) {
        return address(_campaign(campaignId).token);
    }

    function campaignMaxUnitPrice(uint256 campaignId) external view returns (uint256) {
        return _campaign(campaignId).maxUnitPrice;
    }

    /// @dev Settlement cannot withdraw arbitrary escrow: it may release only a campaign's
    ///      already-reserved funds to itself after its own rate/cap/replay checks.
    function releaseReservedEscrow(uint256 campaignId, uint256 amount) external nonReentrant {
        if (msg.sender != settlementContract) revert NotSettlementContract();
        Campaign storage campaign = _campaign(campaignId);
        if (amount == 0 || campaign.reserved < amount) revert InsufficientAvailableEscrow();

        campaign.reserved -= uint128(amount);
        campaign.paid += uint128(amount);
        campaign.token.safeTransfer(msg.sender, amount);
    }

    function reserveForSettlement(uint256 campaignId, uint256 amount) external {
        if (msg.sender != settlementContract) revert NotSettlementContract();
        Campaign storage campaign = _campaign(campaignId);
        if (!campaign.active) revert CampaignInactive();
        if (amount == 0 || amount > type(uint128).max) revert InvalidAmount();
        if (_availableEscrow(campaign) < amount) revert InsufficientAvailableEscrow();
        campaign.reserved += uint128(amount);
    }

    function _campaign(uint256 campaignId) private view returns (Campaign storage campaign) {
        campaign = campaigns[campaignId];
        if (campaign.advertiser == address(0)) revert CampaignNotFound();
    }

    function _availableEscrow(Campaign storage campaign) private view returns (uint256) {
        return uint256(campaign.funded) - uint256(campaign.reserved) - uint256(campaign.paid);
    }
}
