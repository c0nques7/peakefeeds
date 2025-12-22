// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract PostVerifier {
    event PostVerified(
        address indexed author, 
        bytes32 indexed contentHash, 
        string channelSlug,
        uint256 timestamp
    );

    function signPost(bytes32 _contentHash, string calldata _channelSlug) external {
        emit PostVerified(msg.sender, _contentHash, _channelSlug, block.timestamp);
    }
}
