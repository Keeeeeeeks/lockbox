// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Lockbox — Collectively-Unlockable Encrypted Content
/// @notice Crowdfunding for knowledge. N contributions unlock the content for everyone.
/// @dev Encrypted content stored on IPFS, decryption gated by Lit Protocol ACCs
///      that check this contract's state. Each contribution = on-chain receipt.
contract Lockbox {
    // === State ===
    string public title;
    string public description;
    string public metadataURI;       // IPFS CID for public metadata (always visible)
    string public encryptedContentCID; // IPFS CID for encrypted content blob
    uint256 public threshold;        // Contributions needed to unlock
    uint256 public contributionAmount; // Fixed price per contribution (in wei)
    uint256 public contributionCount;  // Current contribution count
    address public author;
    bool public unlocked;
    uint256 public createdAt;

    // Progressive reveal: section headers revealed at milestones
    string[] public teaserCIDs; // IPFS CIDs for progressive reveals at 25/50/75%

    // Contributors
    // Tracks whether an address has ever contributed at least once.
    mapping(address => bool) public hasContributed;
    address[] public contributors;

    // === Events ===
    event LockboxCreated(
        address indexed author,
        string title,
        uint256 threshold,
        uint256 contributionAmount,
        string metadataURI,
        string encryptedContentCID
    );

    event Contributed(
        address indexed contributor,
        uint256 indexed contributionIndex,
        uint256 currentCount,
        uint256 remaining
    );

    event Unlocked(uint256 totalContributions, uint256 timestamp);

    event Withdrawn(address indexed author, uint256 amount);

    // === Constructor ===
    constructor(
        string memory _title,
        string memory _description,
        string memory _metadataURI,
        string memory _encryptedContentCID,
        uint256 _threshold,
        uint256 _contributionAmount,
        string[] memory _teaserCIDs,
        address _author
    ) {
        require(_threshold > 0, "Threshold must be > 0");
        require(_contributionAmount > 0, "Contribution must be > 0");
        require(_author != address(0), "Invalid author");

        title = _title;
        description = _description;
        metadataURI = _metadataURI;
        encryptedContentCID = _encryptedContentCID;
        threshold = _threshold;
        contributionAmount = _contributionAmount;
        author = _author;
        createdAt = block.timestamp;
        teaserCIDs = _teaserCIDs;

        emit LockboxCreated(
            msg.sender,
            _title,
            _threshold,
            _contributionAmount,
            _metadataURI,
            _encryptedContentCID
        );
    }

    // === Core Functions ===

    /// @notice Contribute to unlock the content
    function contribute() external payable {
        require(!unlocked, "Already unlocked");
        require(msg.value >= contributionAmount, "Insufficient payment");

        if (!hasContributed[msg.sender]) {
            hasContributed[msg.sender] = true;
        }
        contributors.push(msg.sender);
        contributionCount++;

        uint256 remaining = threshold > contributionCount ? threshold - contributionCount : 0;

        emit Contributed(msg.sender, contributionCount, contributionCount, remaining);

        if (contributionCount >= threshold) {
            unlocked = true;
            emit Unlocked(contributionCount, block.timestamp);
        }

        // Refund excess
        if (msg.value > contributionAmount) {
            payable(msg.sender).transfer(msg.value - contributionAmount);
        }
    }

    /// @notice Check unlock progress
    /// @return current Number of contributions so far
    /// @return total Threshold needed
    /// @return unlockedStatus Whether content is unlocked
    function getProgress() external view returns (uint256 current, uint256 total, bool unlockedStatus) {
        return (contributionCount, threshold, unlocked);
    }

    /// @notice Get progressive reveal level (0-4)
    /// @dev 0 = nothing, 1 = 25%, 2 = 50%, 3 = 75%, 4 = fully unlocked
    function getRevealLevel() external view returns (uint8) {
        if (unlocked) return 4;
        if (threshold == 0) return 0;
        uint256 pct = (contributionCount * 100) / threshold;
        if (pct >= 75) return 3;
        if (pct >= 50) return 2;
        if (pct >= 25) return 1;
        return 0;
    }

    /// @notice Get teaser CID for a given reveal level (1-3)
    function getTeaserCID(uint8 level) external view returns (string memory) {
        require(level >= 1 && level <= 3, "Invalid level");
        uint8 currentLevel = this.getRevealLevel();
        require(currentLevel >= level, "Not yet revealed");
        if (level - 1 < teaserCIDs.length) {
            return teaserCIDs[level - 1];
        }
        return "";
    }

    /// @notice Author withdraws funds after unlock
    function withdraw() external {
        require(msg.sender == author, "Only author");
        require(unlocked, "Not unlocked yet");
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");
        payable(author).transfer(balance);
        emit Withdrawn(author, balance);
    }

    /// @notice Get all contributor addresses
    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    /// @notice Get total number of contributors
    function getContributorCount() external view returns (uint256) {
        return contributors.length;
    }

    // === View helpers for Lit Protocol ACC ===

    /// @notice Simple boolean check — is the lockbox unlocked?
    /// @dev Use this as the simplest Lit ACC: returnValueTest { comparator: "=", value: "true" }
    function isUnlocked() external view returns (bool) {
        return unlocked;
    }
}
