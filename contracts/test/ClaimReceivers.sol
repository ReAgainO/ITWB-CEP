// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface IEventPass {
    function claim() external returns (uint256);
}

/// @dev Test fixtures for ERC721 receiver callbacks. Never deployed by deploy.cjs.
contract ReentrantClaimReceiver is IERC721Receiver {
    IEventPass public immutable pass;
    bool public duplicateClaimBlocked;

    constructor(address pass_) { pass = IEventPass(pass_); }

    function claim() external { pass.claim(); }

    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        require(msg.sender == address(pass), "Unexpected NFT");
        try pass.claim() { revert("Duplicate claim succeeded"); }
        catch { duplicateClaimBlocked = true; }
        return IERC721Receiver.onERC721Received.selector;
    }
}

contract RejectingClaimReceiver is IERC721Receiver {
    IEventPass public immutable pass;

    constructor(address pass_) { pass = IEventPass(pass_); }

    function claim() external { pass.claim(); }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        revert("Ticket rejected");
    }
}
