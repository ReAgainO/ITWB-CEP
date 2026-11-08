export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || "").trim();
export const SEPOLIA_CHAIN_ID = 11155111n;
export const SEPOLIA_CHAIN_HEX = "0xaa36a7";
export const EXPLORER_URL = "https://sepolia.etherscan.io";

export const PASS_ABI = [
  "error AlreadyClaimed()",
  "error TicketDoesNotExist()",
  "error AlreadyCheckedIn()",
  "error TicketIsNonTransferable()",
  "error OwnableUnauthorizedAccount(address account)",
  "function claim() returns (uint256 tokenId)",
  "function checkIn(uint256 tokenId)",
  "function ticketOf(address attendee) view returns (uint256)",
  "function checkedIn(uint256 tokenId) view returns (bool)",
  "function totalClaims() view returns (uint256)",
  "function owner() view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event TicketClaimed(address indexed attendee, uint256 indexed tokenId)",
  "event TicketCheckedIn(uint256 indexed tokenId, address indexed organizer)",
];
