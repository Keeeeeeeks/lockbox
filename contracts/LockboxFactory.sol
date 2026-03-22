// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Lockbox.sol";

/// @title LockboxFactory — Deploy and track Lockbox instances
/// @notice Central registry for all lockboxes. Used by the Lockbox Agent.
contract LockboxFactory {
    // === State ===
    Lockbox[] public lockboxes;
    mapping(address => uint256[]) public authorLockboxes;

    // === Events ===
    event LockboxDeployed(
        uint256 indexed lockboxId,
        address indexed lockboxAddress,
        address indexed author,
        string title,
        uint256 threshold
    );

    // === Functions ===

    /// @notice Deploy a new Lockbox
    function createLockbox(
        string calldata _title,
        string calldata _description,
        string calldata _metadataURI,
        string calldata _encryptedContentCID,
        uint256 _threshold,
        uint256 _contributionAmount,
        string[] calldata _teaserCIDs
    ) external returns (uint256 lockboxId, address lockboxAddress) {
        Lockbox lockbox = new Lockbox(
            _title,
            _description,
            _metadataURI,
            _encryptedContentCID,
            _threshold,
            _contributionAmount,
            _teaserCIDs,
            msg.sender
        );

        lockboxId = lockboxes.length;
        lockboxes.push(lockbox);
        authorLockboxes[msg.sender].push(lockboxId);

        lockboxAddress = address(lockbox);

        emit LockboxDeployed(lockboxId, lockboxAddress, msg.sender, _title, _threshold);
    }

    /// @notice Get total number of lockboxes
    function getLockboxCount() external view returns (uint256) {
        return lockboxes.length;
    }

    /// @notice Get lockbox address by ID
    function getLockboxAddress(uint256 lockboxId) external view returns (address) {
        require(lockboxId < lockboxes.length, "Invalid lockbox ID");
        return address(lockboxes[lockboxId]);
    }

    /// @notice Get all lockbox IDs for an author
    function getAuthorLockboxes(address author) external view returns (uint256[] memory) {
        return authorLockboxes[author];
    }

    /// @notice Get progress for a specific lockbox
    function getLockboxProgress(uint256 lockboxId)
        external
        view
        returns (uint256 current, uint256 total, bool isUnlocked)
    {
        require(lockboxId < lockboxes.length, "Invalid lockbox ID");
        return lockboxes[lockboxId].getProgress();
    }
}
