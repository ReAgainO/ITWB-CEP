# NFT v3 design: square 1024×1024 artwork

`CampusEventPassV3` is the square-canvas generation. It is a separate collection from V2; deploying V3 does not migrate V2 tokens, and token numbering restarts at #1. This sanitized snapshot contains no live contract address, transaction hash or owner address.

## Why V3

V2's default on-chain SVG is 800×480. Many NFT viewers, including MetaMask, render artwork in a **square** thumbnail, so a wide image is cropped and the left part (including part of the title) can disappear. The safe fix is a **1:1 canvas**: V3 uses `width='1024' height='1024' viewBox='0 0 1024 1024'`, so square viewers show the whole design without cropping.

A deployed contract's `tokenURI` logic cannot be changed. Therefore a square default requires a new collection; V2 and its tokens remain untouched. V3 starts again at token #1.

## What V3 keeps

`contracts/CampusEventPassV3.sol` preserves all V2 behaviour:

- one non-transferable pass per wallet (`claim()`), organizer-only `checkIn(tokenId)`
- `ticketOf`, `checkedIn`, `totalClaims`, ERC-721 interfaces
- all transfer/approval/self-transfer variants revert
- receiver callback and rejected-receiver rollback behaviour
- default fully on-chain metadata, with no IPFS or HTTPS dependency
- **per-token external metadata route retained**:

  ```solidity
  setExternalTokenURI(uint256 tokenId, string calldata uri) external onlyOwner
  ```

  A non-empty URI makes `tokenURI` return it exactly; an empty string clears the override and falls back to the square on-chain SVG.

## Artwork

- Seed: `keccak256(abi.encodePacked(tokenId, holder))`.
- 6 palettes: Aurora, Dusk, Forest, Ember, Tide, Orchid.
- 4 patterns: Orbit, Wave, Grid, Eclipse.
- Holder tag: the last four hexadecimal characters of the holder address.
- Fixed `TICKET #tokenId`; `totalClaims()` is not drawn, so existing metadata does not change when someone else claims.
- Metadata attributes: `Palette`, `Pattern`, `Ticket`.
- Canvas: `1024×1024` with a rounded frame, gradient, title block, holder block and a dashed separator.
- SVG and JSON are Base64 `data:` URIs.

`scripts/gen-v3-samples.cjs` can render six local Hardhat holders into the git-ignored `samples-v3/` directory. The generated index is local only; no sample image is committed to this snapshot.

## Tests

The V3 suite adds **10 Hardhat cases** to the V2 matrix. Together with V1 (11 cases) and V2 (9 cases), this snapshot defines **30 contract tests**. The V3 cases cover:

- 1024×1024 `width`, `height` and `viewBox` on every token
- six tokens across palettes and patterns with balanced SVG quoting
- deterministic, unique art and holder tags
- fixed ticket numbers and metadata attributes
- external metadata set, clear and fallback, owner-only restriction
- transfer and approval blocking
- reentrant claim and rejected-receiver rollback

## Deployment notes

1. Deploy `CampusEventPassV3` with your own wallet or tooling. The included `scripts/deploy.cjs` targets V1 only; adapt it or deploy through your wallet for V3.
2. Verify the deployment receipt, the runtime bytecode against your compiled artifact, and `owner()` / `totalClaims()`.
3. Set `VITE_CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS` at build time if the front end should use V3.
4. Acceptance check after deployment: claim token #1, call `tokenURI(1)`, and confirm that it is 1024×1024, carries `TICKET #1`, and `externalTokenURI(1)` is empty. Then check the pass in as the owner.
5. Keep collections separate. V1 and V2 tokens remain on their own contracts.
6. Do not add live addresses, transaction hashes or block numbers to this sanitized snapshot.

## If you do not want another collection

The V2 owner can point one token at an external metadata JSON whose image is 1:1 (for example 1024×1024) via `setExternalTokenURI`. That fixes only that token; the V2 default remains 800×480 for every other token. V3 is the way to change the default for all future tokens.

## Related

- [`EXTERNAL_METADATA_TEMPLATE.md`](EXTERNAL_METADATA_TEMPLATE.md) — external metadata template
- [`NFT_V2_DESIGN.md`](NFT_V2_DESIGN.md) — the 800×480 V2 design
