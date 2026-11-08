// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice A non-transferable campus event ticket with organizer-controlled check-in.
contract CampusEventPass is ERC721, Ownable {
    error AlreadyClaimed();
    error TicketDoesNotExist();
    error AlreadyCheckedIn();
    error TicketIsNonTransferable();

    event TicketClaimed(address indexed attendee, uint256 indexed tokenId);
    event TicketCheckedIn(uint256 indexed tokenId, address indexed organizer);

    uint256 public nextTokenId = 1;
    mapping(address => uint256) public ticketOf;
    mapping(uint256 => bool) public checkedIn;

    constructor() ERC721("Campus Event Pass", "CAMPUS") Ownable(msg.sender) {}

    /// @notice Each address may claim exactly one ticket.
    function claim() external returns (uint256 tokenId) {
        if (ticketOf[msg.sender] != 0) revert AlreadyClaimed();

        tokenId = nextTokenId++;
        ticketOf[msg.sender] = tokenId;
        _safeMint(msg.sender, tokenId);
        emit TicketClaimed(msg.sender, tokenId);
    }

    /// @notice Only the organizer may check in a valid, unchecked ticket.
    function checkIn(uint256 tokenId) external onlyOwner {
        if (_ownerOf(tokenId) == address(0)) revert TicketDoesNotExist();
        if (checkedIn[tokenId]) revert AlreadyCheckedIn();

        checkedIn[tokenId] = true;
        emit TicketCheckedIn(tokenId, msg.sender);
    }

    function totalClaims() external view returns (uint256) {
        return nextTokenId - 1;
    }

    /// @notice Fully on-chain metadata; no external image or hosting is required.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TicketDoesNotExist();

        string memory number = Strings.toString(tokenId);
        string memory svg = string.concat(
            "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='480' viewBox='0 0 800 480'>",
            "<rect width='800' height='480' rx='32' fill='#0b1220'/>",
            "<circle cx='686' cy='90' r='170' fill='#214d61'/>",
            "<path d='M0 345L800 245V480H0Z' fill='#183b43'/>",
            "<text x='62' y='110' fill='#73e3c0' font-family='Arial' font-size='26'>CAMPUS WEB3</text>",
            "<text x='62' y='210' fill='white' font-family='Arial' font-size='58' font-weight='bold'>EVENT PASS</text>",
            "<text x='62' y='285' fill='#c7d2df' font-family='Arial' font-size='28'>A seat in the decentralized future</text>",
            "<text x='62' y='420' fill='#73e3c0' font-family='Arial' font-size='34'>TICKET #",
            number,
            "</text></svg>"
        );
        string memory json = string.concat(
            '{"name":"Campus Event Pass #',
            number,
            '","description":"A non-transferable campus event attendance pass on Sepolia.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @dev Prevent resale or transfer; minting remains possible.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0) && to != address(0)) {
            revert TicketIsNonTransferable();
        }
        return super._update(to, tokenId, auth);
    }
}
