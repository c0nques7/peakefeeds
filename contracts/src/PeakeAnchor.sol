// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title PeakeAnchor
/// @notice Records that a wallet vouched for a PeakeFeeds post. A post's fingerprint is
/// keccak256(content | salt); the salt stays off-chain, so the fingerprint reveals nothing
/// about the post until someone holding the post and salt checks it.
/// @dev Ownerless and stateless on purpose: there is nothing to administer, upgrade or drain.
/// The author is msg.sender, so smart-contract wallets are recorded as themselves rather than
/// as whichever bundler relayed their transaction.
contract PeakeAnchor {
    /// @notice Emitted once per anchored post.
    event Anchored(address indexed author, bytes32 indexed contentHash);

    /// @notice Anchors `contentHash` to the calling wallet. Paid for by the caller.
    function anchor(bytes32 contentHash) external {
        emit Anchored(msg.sender, contentHash);
    }
}
