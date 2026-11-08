// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice A non-transferable campus event ticket with organizer-controlled check-in.
/// @dev Each token's fully on-chain SVG is derived from its token id and holder address.
contract CampusEventPassV2 is ERC721, Ownable {
    error AlreadyClaimed();
    error TicketDoesNotExist();
    error AlreadyCheckedIn();
    error TicketIsNonTransferable();

    event TicketClaimed(address indexed attendee, uint256 indexed tokenId);
    event TicketCheckedIn(uint256 indexed tokenId, address indexed organizer);
    event ExternalTokenURIUpdated(uint256 indexed tokenId, string uri);

    uint256 public nextTokenId = 1;
    mapping(address => uint256) public ticketOf;
    mapping(uint256 => bool) public checkedIn;
    mapping(uint256 => string) private _externalTokenURIs;

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

    /// @notice Optional external metadata URI for one token. Empty means on-chain generation.
    function externalTokenURI(uint256 tokenId) external view returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TicketDoesNotExist();
        return _externalTokenURIs[tokenId];
    }

    /// @notice Owner can point a token at external metadata (JSON with its own image).
    /// @dev Passing an empty string clears the override and falls back to the on-chain SVG.
    function setExternalTokenURI(uint256 tokenId, string calldata uri) external onlyOwner {
        if (_ownerOf(tokenId) == address(0)) revert TicketDoesNotExist();
        if (bytes(uri).length == 0) delete _externalTokenURIs[tokenId];
        else _externalTokenURIs[tokenId] = uri;
        emit ExternalTokenURIUpdated(tokenId, uri);
    }

    /// @notice Default fully on-chain metadata, with an optional per-token external override.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        address holder = _ownerOf(tokenId);
        if (holder == address(0)) revert TicketDoesNotExist();

        string memory externalUri = _externalTokenURIs[tokenId];
        if (bytes(externalUri).length != 0) return externalUri;

        bytes32 seed = keccak256(abi.encodePacked(tokenId, holder));
        uint8 palette = uint8(uint256(seed) % 6);
        uint8 pattern = uint8((uint256(seed) >> 8) % 4);
        uint256 offset = uint256(seed) % 120;

        (string memory bg, string memory accent, string memory secondary, string memory text) = _palette(palette);
        string memory number = Strings.toString(tokenId);
        string memory ownerTag = Strings.toHexString(uint256(uint160(holder)) & 0xffff, 2);

        string memory svg = string.concat(
            "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='480' viewBox='0 0 800 480'>",
            "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
            "<stop offset='0' stop-color='", bg, "'/><stop offset='1' stop-color='", secondary, "'/>",
            "</linearGradient></defs>",
            "<rect width='800' height='480' rx='32' fill='url(#g)'/>",
            _pattern(pattern, accent, secondary, offset),
            "<text x='62' y='110' fill='", accent, "' font-family='Arial' font-size='26' letter-spacing='4'>CAMPUS WEB3</text>",
            "<text x='62' y='210' fill='", text, "' font-family='Arial' font-size='58' font-weight='bold'>EVENT PASS</text>",
            "<text x='62' y='285' fill='", text, "' font-family='Arial' font-size='28'>A seat in the decentralized future</text>",
            "<text x='62' y='420' fill='", accent, "' font-family='Arial' font-size='34'>TICKET #", number, "</text>",
            "<text x='738' y='420' fill='", text, "' font-family='Arial' font-size='18' text-anchor='end'>", ownerTag, "</text>",
            "</svg>"
        );

        string memory json = string.concat(
            '{"name":"Campus Event Pass #',
            number,
            '","description":"A non-transferable campus event attendance pass on Sepolia. Each pass is generated fully on-chain from its token id and holder address.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Palette","value":"',
            _paletteName(palette),
            '"},{"trait_type":"Pattern","value":"',
            _patternName(pattern),
            '"},{"trait_type":"Ticket","value":"',
            number,
            '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _palette(uint8 index) internal pure returns (string memory bg, string memory accent, string memory secondary, string memory text) {
        if (index == 0) return ("#0b1220", "#79e2bf", "#214d61", "#eaf0f3");
        if (index == 1) return ("#1a1025", "#f2a65a", "#5b2a86", "#fff4e6");
        if (index == 2) return ("#081c15", "#b7e4c7", "#2d6a4f", "#f1faee");
        if (index == 3) return ("#20120b", "#ffb703", "#8f2d1f", "#fff8e7");
        if (index == 4) return ("#0d1b2a", "#8ecae6", "#1b4965", "#f1faee");
        return ("#19101f", "#ffafcc", "#6d3b6d", "#fff0f6");
    }

    function _paletteName(uint8 index) internal pure returns (string memory) {
        if (index == 0) return "Aurora";
        if (index == 1) return "Dusk";
        if (index == 2) return "Forest";
        if (index == 3) return "Ember";
        if (index == 4) return "Tide";
        return "Orchid";
    }

    function _pattern(uint8 index, string memory accent, string memory secondary, uint256 offset) internal pure returns (string memory) {
        if (index == 0) {
            return string.concat(
                "<circle cx='686' cy='90' r='170' fill='", secondary, "'/>",
                "<path d='M0 345L800 ", Strings.toString(245 + offset), "V480H0Z' fill='", secondary, "'/>",
                "<circle cx='690' cy='86' r='250' fill='none' stroke='", accent, "' stroke-opacity='.18'/>"
            );
        }
        if (index == 1) {
            return string.concat(
                "<path d='M0 380L800 ", Strings.toString(250 + offset), "V480H0Z' fill='", secondary, "'/>",
                "<path d='M0 300L800 ", Strings.toString(170 + offset), "V220L0 350Z' fill='", accent, "' opacity='.16'/>",
                "<circle cx='700' cy='70' r='150' fill='none' stroke='", accent, "' stroke-width='2' stroke-opacity='.35'/>"
            );
        }
        if (index == 2) {
            return string.concat(
                "<path d='M0 240H800M0 320H800M0 400H800' stroke='", accent, "' stroke-opacity='.18'/>",
                "<path d='M120 0V480M280 0V480M440 0V480M600 0V480M760 0V480' stroke='", secondary, "' stroke-opacity='.35'/>",
                "<circle cx='", Strings.toString(620 + offset), "' cy='120' r='84' fill='", secondary, "'/>"
            );
        }
        return string.concat(
            "<circle cx='700' cy='90' r='230' fill='none' stroke='", accent, "' stroke-opacity='.22'/>",
            "<circle cx='700' cy='90' r='160' fill='none' stroke='", accent, "' stroke-opacity='.3'/>",
            "<circle cx='700' cy='90' r='90' fill='", secondary, "'/>",
            "<path d='M0 360L800 ", Strings.toString(300 + offset), "V480H0Z' fill='", secondary, "'/>"
        );
    }

    function _patternName(uint8 index) internal pure returns (string memory) {
        if (index == 0) return "Orbit";
        if (index == 1) return "Wave";
        if (index == 2) return "Grid";
        return "Eclipse";
    }

    /// @dev Prevent resale or transfer; minting remains possible.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0) && to != address(0)) {
            revert TicketIsNonTransferable();
        }
        return super._update(to, tokenId, auth);
    }
}
