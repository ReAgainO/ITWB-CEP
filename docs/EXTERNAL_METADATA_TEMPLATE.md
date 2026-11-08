# External metadata template

`CampusEventPassV2` and `CampusEventPassV3` default to the on-chain SVG. The owner can switch a single token to an external metadata JSON:

```solidity
setExternalTokenURI(uint256 tokenId, string calldata uri) external onlyOwner
```

- Passing an empty string clears the override and returns to the on-chain SVG.
- The URI is returned by `tokenURI` exactly as stored; it should point to **metadata JSON**, not directly to a PNG.
- The contract does not validate the URI or its content. The owner is trusted to host a valid JSON.
- Use immutable IPFS/Arweave CIDs if you need permanence. HTTPS can link-rot or be changed.
- Marketplaces/wallets may cache metadata; changing the URI does not guarantee an immediate refresh.
- The fixed ticket number is `tokenId`; include `TICKET #n` in your external image/metadata yourself if you want it visible.
- Use a **1:1 square image (for example 1024×1024)**. MetaMask renders NFT artwork in a square thumbnail; a wide image can be cropped. V3's default on-chain art is already 1024×1024 for this reason.

This sanitized snapshot contains no live contract address, transaction hash or owner address. Use the placeholder `YOUR_CONTRACT_ADDRESS` and your own deployment when following the steps below.

## JSON template

```json
{
  "name": "Campus Event Pass #1",
  "description": "A non-transferable campus event attendance pass on an Ethereum test network.",
  "image": "ipfs://bafy.../pass-1.png",
  "attributes": [
    { "trait_type": "Ticket", "value": "1" },
    { "trait_type": "Art", "value": "External" }
  ]
}
```

## Mixed collection example

- Token #1: `setExternalTokenURI(1, "ipfs://bafy.../1.json")` → external artwork.
- Token #2: never set → on-chain generated SVG.
- Token #3: set then cleared with `setExternalTokenURI(3, "")` → back to on-chain.

## How to set it

1. Upload `1.json` and its image to IPFS/Arweave (or a stable HTTPS host).
2. As the contract owner, call `setExternalTokenURI(1, "ipfs://.../1.json")`.
3. Read `tokenURI(1)` and `externalTokenURI(1)` to verify.
4. To revert: `setExternalTokenURI(1, "")`.

Do not use `javascript:` URIs. For external overrides prefer `ipfs://` or `https://`; `data:` URIs are technically storable but wallet support varies. The owner role must remain available on the account that manages metadata.
