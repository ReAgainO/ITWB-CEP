// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice A non-transferable campus event ticket with organizer-controlled check-in.
/// @dev V3 keeps the V2 behaviour and renders a square 1024x1024 SVG so square NFT
///      viewers (including MetaMask) show the whole artwork instead of cropping it.
contract CampusEventPassV3 is ERC721, Ownable {
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

    struct Art {
        string bg;
        string accent;
        string secondary;
        string text;
        string number;
        string ownerTag;
        string paletteName;
        string patternName;
    }

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

        Art memory art;
        (art.bg, art.accent, art.secondary, art.text) = _palette(palette);
        art.number = Strings.toString(tokenId);
        art.ownerTag = Strings.toHexString(uint256(uint160(holder)) & 0xffff, 2);
        art.paletteName = _paletteName(palette);
        art.patternName = _patternName(pattern);

        string memory svg = _render(art, pattern, offset);

        string memory json = string.concat(
            '{"name":"Campus Event Pass #',
            art.number,
            '","description":"A non-transferable campus event attendance pass on Sepolia. Square 1024x1024 artwork generated fully on-chain from its token id and holder address.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":[{"trait_type":"Palette","value":"',
            art.paletteName,
            '"},{"trait_type":"Pattern","value":"',
            art.patternName,
            '"},{"trait_type":"Ticket","value":"',
            art.number,
            '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @dev Build the square art in several concatenation steps to keep the stack small.
    function _render(Art memory art, uint8 pattern, uint256 offset) internal pure returns (string memory svg) {
        svg = string.concat(
            "<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024' viewBox='0 0 1024 1024'>",
            "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
            "<stop offset='0' stop-color='", art.bg, "'/><stop offset='1' stop-color='", art.secondary, "'/>",
            "</linearGradient></defs>",
            "<rect width='1024' height='1024' rx='44' fill='url(#g)'/>"
        );
        svg = string.concat(svg, _pattern(pattern, art.accent, art.secondary, offset));
        svg = string.concat(
            svg,
            "<rect x='32' y='32' width='960' height='960' rx='30' fill='none' stroke='", art.accent, "' stroke-opacity='.28'/>",
            "<text x='88' y='140' fill='", art.accent, "' font-family='Arial' font-size='26' letter-spacing='7'>CAMPUS WEB3</text>",
            "<text x='88' y='330' fill='", art.text, "' font-family='Arial' font-size='104' font-weight='bold'>EVENT</text>",
            "<text x='88' y='432' fill='", art.text, "' font-family='Arial' font-size='104' font-weight='bold'>PASS</text>",
            "<text x='92' y='500' fill='", art.text, "' font-family='Arial' font-size='28' opacity='.82'>A seat in the decentralized future</text>"
        );
        svg = string.concat(
            svg,
            "<path d='M88 744H936' stroke='", art.accent, "' stroke-opacity='.45' stroke-dasharray='2 10'/>",
            "<text x='88' y='818' fill='", art.accent, "' font-family='Arial' font-size='22' letter-spacing='4'>ADMIT ONE</text>",
            "<text x='88' y='896' fill='", art.text, "' font-family='Arial' font-size='64' font-weight='bold'>TICKET #", art.number, "</text>",
            "<text x='936' y='818' fill='", art.accent, "' font-family='Arial' font-size='22' letter-spacing='4' text-anchor='end'>HOLDER</text>"
        );
        svg = string.concat(
            svg,
            "<text x='936' y='896' fill='", art.text, "' font-family='Arial' font-size='32' text-anchor='end'>", art.ownerTag, "</text>",
            "<text x='88' y='960' fill='", art.accent, "' font-family='Arial' font-size='20' letter-spacing='3'>SEPOLIA / FULLY ON-CHAIN</text>",
            "<text x='936' y='960' fill='", art.text, "' font-family='Arial' font-size='20' opacity='.7' text-anchor='end'>",
            art.patternName, " / ", art.paletteName, "</text>"
        );
        svg = string.concat(svg, "</svg>");
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
                "<circle cx='812' cy='196' r='236' fill='", secondary, "' opacity='.72'/>",
                "<circle cx='812' cy='196' r='330' fill='none' stroke='", accent, "' stroke-opacity='.22'/>",
                "<circle cx='812' cy='196' r='404' fill='none' stroke='", accent, "' stroke-opacity='.10'/>",
                "<path d='M0 ", Strings.toString(650 + offset), "L1024 570V1024H0Z' fill='", secondary, "' opacity='.55'/>"
            );
        }
        if (index == 1) {
            return string.concat(
                "<path d='M0 690C210 590 360 790 590 700S890 600 1024 660V1024H0Z' fill='", secondary, "' opacity='.7'/>",
                "<path d='M0 620C230 520 400 740 650 625S900 540 1024 590' fill='none' stroke='", accent, "' stroke-opacity='.3' stroke-width='2'/>",
                "<circle cx='820' cy='198' r='168' fill='none' stroke='", accent, "' stroke-opacity='.25' stroke-width='2'/>"
            );
        }
        if (index == 2) {
            return string.concat(
                "<path d='M0 128H1024M0 256H1024M0 384H1024M0 512H1024M0 640H1024M0 768H1024M0 896H1024' stroke='", accent, "' stroke-opacity='.07'/>",
                "<path d='M128 0V1024M256 0V1024M384 0V1024M512 0V1024M640 0V1024M768 0V1024M896 0V1024' stroke='", secondary, "' stroke-opacity='.22'/>",
                "<circle cx='", Strings.toString(760 + offset), "' cy='238' r='150' fill='", secondary, "' opacity='.72'/>",
                "<rect x='700' y='150' width='260' height='260' rx='40' fill='none' stroke='", accent, "' stroke-opacity='.25'/>"
            );
        }
        return string.concat(
            "<circle cx='820' cy='214' r='260' fill='none' stroke='", accent, "' stroke-opacity='.2'/>",
            "<circle cx='820' cy='214' r='190' fill='none' stroke='", accent, "' stroke-opacity='.28'/>",
            "<circle cx='820' cy='214' r='120' fill='", secondary, "' opacity='.8'/>",
            "<circle cx='820' cy='214' r='58' fill='", accent, "' opacity='.55'/>",
            "<path d='M0 ", Strings.toString(660 + offset), "L1024 580V1024H0Z' fill='", secondary, "' opacity='.58'/>"
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