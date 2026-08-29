// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICampaignVault {
    function campaignAdvertiser(uint256 campaignId) external view returns (address);
    function campaignToken(uint256 campaignId) external view returns (address);
    function reserveForSettlement(uint256 campaignId, uint256 amount) external;
    function releaseReservedEscrow(uint256 campaignId, uint256 amount) external;
}

/// @title AdFlowSettlement
/// @notice Creates rate-bound publisher agreements and settles only verified, replay-safe epochs.
contract AdFlowSettlement is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error AgreementInactive();
    error AgreementNotFound();
    error AgreementNotAccepted();
    error AllocationExceeded();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidRate();
    error NotAdvertiser();
    error NotPublisher();
    error NotSettlementOperator();
    error NothingClaimable();
    error Replay();

    struct Agreement {
        uint64 campaignId;
        address publisher;
        uint128 rateAtomic;
        uint64 unitScale;
        uint128 allocationCapAtomic;
        uint128 settledAtomic;
        bool accepted;
        bool active;
    }

    ICampaignVault public immutable vault;
    address public settlementOperator;
    uint256 public nextAgreementId;

    mapping(uint256 agreementId => Agreement agreement) public agreements;
    mapping(bytes32 epochReference => bool settledEpochs) public settledEpochs;
    mapping(address publisher => mapping(address token => uint256 amount)) public claimable;

    event AgreementCreated(uint256 indexed agreementId, uint256 indexed campaignId, address indexed publisher, uint256 rateAtomic, uint256 unitScale, uint256 allocationCapAtomic);
    event AgreementAccepted(uint256 indexed agreementId, address indexed publisher);
    event AgreementPaused(uint256 indexed agreementId, bool active);
    event SettlementOperatorChanged(address indexed previousOperator, address indexed newOperator);
    event EpochSettled(bytes32 indexed epochReference, uint256 indexed agreementId, uint256 verifiedUnits, uint256 payoutAtomic, bytes32 evidenceRoot);
    event Claimed(address indexed publisher, address indexed token, uint256 amount);

    constructor(address initialOwner, address vaultAddress, address initialSettlementOperator) Ownable(initialOwner) {
        if (vaultAddress == address(0) || initialSettlementOperator == address(0)) revert InvalidAddress();
        vault = ICampaignVault(vaultAddress);
        settlementOperator = initialSettlementOperator;
    }

    function setSettlementOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert InvalidAddress();
        address previousOperator = settlementOperator;
        settlementOperator = newOperator;
        emit SettlementOperatorChanged(previousOperator, newOperator);
    }

    function createAgreement(uint256 campaignId, address publisher, uint256 rateAtomic, uint256 unitScale, uint256 allocationCapAtomic)
        external
        returns (uint256 agreementId)
    {
        if (vault.campaignAdvertiser(campaignId) != msg.sender) revert NotAdvertiser();
        if (publisher == address(0)) revert InvalidAddress();
        if (rateAtomic == 0 || rateAtomic > type(uint128).max || allocationCapAtomic == 0 || allocationCapAtomic > type(uint128).max) revert InvalidAmount();
        if (unitScale == 0 || unitScale > type(uint64).max) revert InvalidRate();

        vault.reserveForSettlement(campaignId, allocationCapAtomic);
        agreementId = ++nextAgreementId;
        agreements[agreementId] = Agreement({
            campaignId: uint64(campaignId),
            publisher: publisher,
            rateAtomic: uint128(rateAtomic),
            unitScale: uint64(unitScale),
            allocationCapAtomic: uint128(allocationCapAtomic),
            settledAtomic: 0,
            accepted: false,
            active: true
        });
        emit AgreementCreated(agreementId, campaignId, publisher, rateAtomic, unitScale, allocationCapAtomic);
    }

    function acceptAgreement(uint256 agreementId) external {
        Agreement storage agreement = _agreement(agreementId);
        if (agreement.publisher != msg.sender) revert NotPublisher();
        if (!agreement.active) revert AgreementInactive();
        agreement.accepted = true;
        emit AgreementAccepted(agreementId, msg.sender);
    }

    function setAgreementActive(uint256 agreementId, bool active) external {
        Agreement storage agreement = _agreement(agreementId);
        if (vault.campaignAdvertiser(agreement.campaignId) != msg.sender) revert NotAdvertiser();
        agreement.active = active;
        emit AgreementPaused(agreementId, active);
    }

    function settleEpoch(uint256 agreementId, uint256 verifiedUnits, bytes32 epochReference, bytes32 evidenceRoot) external {
        if (msg.sender != settlementOperator) revert NotSettlementOperator();
        if (settledEpochs[epochReference]) revert Replay();
        if (epochReference == bytes32(0)) revert InvalidAmount();

        Agreement storage agreement = _agreement(agreementId);
        if (!agreement.active) revert AgreementInactive();
        if (!agreement.accepted) revert AgreementNotAccepted();
        uint256 payoutAtomic = (verifiedUnits * uint256(agreement.rateAtomic)) / uint256(agreement.unitScale);
        if (payoutAtomic == 0 || uint256(agreement.settledAtomic) + payoutAtomic > agreement.allocationCapAtomic) revert AllocationExceeded();

        settledEpochs[epochReference] = true;
        agreement.settledAtomic += uint128(payoutAtomic);
        vault.releaseReservedEscrow(agreement.campaignId, payoutAtomic);
        claimable[agreement.publisher][vault.campaignToken(agreement.campaignId)] += payoutAtomic;

        emit EpochSettled(epochReference, agreementId, verifiedUnits, payoutAtomic, evidenceRoot);
    }

    function claim(address token) external nonReentrant {
        uint256 amount = claimable[msg.sender][token];
        if (amount == 0) revert NothingClaimable();
        claimable[msg.sender][token] = 0;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, token, amount);
    }

    function _agreement(uint256 agreementId) private view returns (Agreement storage agreement) {
        agreement = agreements[agreementId];
        if (agreement.publisher == address(0)) revert AgreementNotFound();
    }
}
