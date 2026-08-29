// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CampaignVault
/// @notice Escrows campaign USDC and credits publisher claims from approved settlement epochs.
/// @dev Advertisers sign their own lifecycle writes. Only the configured settlement operator
///      may submit a deterministic settlement epoch; no model is allowed to call this contract.
contract CampaignVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error AgreementAlreadyAccepted();
    error AgreementInactive();
    error AgreementNotFound();
    error AllocationExceeded();
    error CampaignInactive();
    error CampaignNotFound();
    error InsufficientAvailableEscrow();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidCampaignState();
    error InvalidSettlementOperator();
    error NotSettlementContract();
    error NotAdvertiser();
    error NotPublisher();
    error NotSettlementOperator();
    error NothingClaimable();
    error SettlementAlreadyRecorded();
    error SettlementReferenceRequired();

    struct Campaign {
        address advertiser;
        IERC20 token;
        uint128 funded;
        uint128 reserved;
        uint128 paid;
        bool active;
    }

    struct Agreement {
        uint64 campaignId;
        address publisher;
        uint128 allocationCap;
        uint128 settled;
        bool accepted;
        bool active;
    }

    address public settlementOperator;
    address public settlementContract;
    uint256 public nextCampaignId;
    uint256 public nextAgreementId;

    mapping(uint256 campaignId => Campaign campaign) public campaigns;
    mapping(uint256 agreementId => Agreement agreement) public agreements;
    mapping(bytes32 settlementReference => bool recorded) public settlementRecorded;
    mapping(address publisher => mapping(address token => uint256 amount)) public claimable;

    event CampaignCreated(uint256 indexed campaignId, address indexed advertiser, address indexed token, uint256 initialFunding);
    event CampaignFunded(uint256 indexed campaignId, uint256 amount, uint256 totalFunded);
    event CampaignStatusChanged(uint256 indexed campaignId, bool active);
    event CampaignWithdrawal(uint256 indexed campaignId, address indexed advertiser, uint256 amount);
    event AgreementCreated(uint256 indexed agreementId, uint256 indexed campaignId, address indexed publisher, uint256 allocationCap);
    event AgreementAccepted(uint256 indexed agreementId, address indexed publisher);
    event AgreementStatusChanged(uint256 indexed agreementId, bool active);
    event SettlementOperatorChanged(address indexed previousOperator, address indexed newOperator);
    event SettlementContractChanged(address indexed previousContract, address indexed newContract);
    event SettlementRecorded(bytes32 indexed settlementReference, uint256 indexed agreementId, uint256 amount, bytes32 evidenceRoot);
    event Claimed(address indexed publisher, address indexed token, uint256 amount);

    constructor(address initialOwner, address initialSettlementOperator) Ownable(initialOwner) {
        if (initialSettlementOperator == address(0)) revert InvalidSettlementOperator();
        settlementOperator = initialSettlementOperator;
    }

    modifier onlyAdvertiser(uint256 campaignId) {
        Campaign storage campaign = _campaign(campaignId);
        if (campaign.advertiser != msg.sender) revert NotAdvertiser();
        _;
    }

    modifier onlySettlementOperator() {
        if (msg.sender != settlementOperator) revert NotSettlementOperator();
        _;
    }

    function setSettlementOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert InvalidSettlementOperator();
        address previousOperator = settlementOperator;
        settlementOperator = newOperator;
        emit SettlementOperatorChanged(previousOperator, newOperator);
    }

    /// @notice Configures the only settlement contract allowed to release campaign escrow.
    function setSettlementContract(address newSettlementContract) external onlyOwner {
        if (newSettlementContract == address(0)) revert InvalidAddress();
        address previousContract = settlementContract;
        settlementContract = newSettlementContract;
        emit SettlementContractChanged(previousContract, newSettlementContract);
    }

    function createCampaign(address token, uint256 initialFunding) external nonReentrant returns (uint256 campaignId) {
        if (token == address(0)) revert InvalidAddress();
        if (initialFunding == 0 || initialFunding > type(uint128).max) revert InvalidAmount();

        campaignId = ++nextCampaignId;
        campaigns[campaignId] = Campaign({
            advertiser: msg.sender,
            token: IERC20(token),
            funded: uint128(initialFunding),
            reserved: 0,
            paid: 0,
            active: true
        });
        IERC20(token).safeTransferFrom(msg.sender, address(this), initialFunding);
        emit CampaignCreated(campaignId, msg.sender, token, initialFunding);
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

    function createAgreement(uint256 campaignId, address publisher, uint256 allocationCap)
        external
        onlyAdvertiser(campaignId)
        returns (uint256 agreementId)
    {
        Campaign storage campaign = _campaign(campaignId);
        if (!campaign.active) revert CampaignInactive();
        if (publisher == address(0)) revert InvalidAddress();
        if (allocationCap == 0 || allocationCap > type(uint128).max) revert InvalidAmount();
        if (_availableEscrow(campaign) < allocationCap) revert InsufficientAvailableEscrow();

        campaign.reserved += uint128(allocationCap);
        agreementId = ++nextAgreementId;
        agreements[agreementId] = Agreement({
            campaignId: uint64(campaignId),
            publisher: publisher,
            allocationCap: uint128(allocationCap),
            settled: 0,
            accepted: false,
            active: true
        });
        emit AgreementCreated(agreementId, campaignId, publisher, allocationCap);
    }

    function acceptAgreement(uint256 agreementId) external {
        Agreement storage agreement = _agreement(agreementId);
        if (agreement.publisher != msg.sender) revert NotPublisher();
        if (!agreement.active) revert AgreementInactive();
        if (agreement.accepted) revert AgreementAlreadyAccepted();

        agreement.accepted = true;
        emit AgreementAccepted(agreementId, msg.sender);
    }

    /// @notice An advertiser can pause future settlement on an agreement. Already settled money remains claimable.
    function setAgreementActive(uint256 agreementId, bool active) external {
        Agreement storage agreement = _agreement(agreementId);
        Campaign storage campaign = _campaign(agreement.campaignId);
        if (campaign.advertiser != msg.sender) revert NotAdvertiser();

        agreement.active = active;
        emit AgreementStatusChanged(agreementId, active);
    }

    /// @notice Records one immutable settlement epoch. The reference prevents RPC/job retries from double-paying.
    function recordSettlement(uint256 agreementId, uint256 amount, bytes32 settlementReference, bytes32 evidenceRoot)
        external
        onlySettlementOperator
    {
        if (amount == 0 || amount > type(uint128).max) revert InvalidAmount();
        if (settlementReference == bytes32(0)) revert SettlementReferenceRequired();
        if (settlementRecorded[settlementReference]) revert SettlementAlreadyRecorded();

        Agreement storage agreement = _agreement(agreementId);
        if (!agreement.active || !agreement.accepted) revert AgreementInactive();
        if (uint256(agreement.settled) + amount > agreement.allocationCap) revert AllocationExceeded();

        Campaign storage campaign = _campaign(agreement.campaignId);
        if (campaign.reserved < amount) revert InvalidCampaignState();

        settlementRecorded[settlementReference] = true;
        agreement.settled += uint128(amount);
        campaign.reserved -= uint128(amount);
        campaign.paid += uint128(amount);
        claimable[agreement.publisher][address(campaign.token)] += amount;

        emit SettlementRecorded(settlementReference, agreementId, amount, evidenceRoot);
    }

    function claim(address token) external nonReentrant {
        uint256 amount = claimable[msg.sender][token];
        if (amount == 0) revert NothingClaimable();

        claimable[msg.sender][token] = 0;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, token, amount);
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

    function _agreement(uint256 agreementId) private view returns (Agreement storage agreement) {
        agreement = agreements[agreementId];
        if (agreement.publisher == address(0)) revert AgreementNotFound();
    }

    function _availableEscrow(Campaign storage campaign) private view returns (uint256) {
        return uint256(campaign.funded) - uint256(campaign.reserved) - uint256(campaign.paid);
    }
}
