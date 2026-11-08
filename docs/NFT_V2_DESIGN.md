# NFT v2 design: dual metadata routes

`CampusEventPassV2` keeps the V1 pass behaviour and adds **two metadata routes in one collection**:

1. A default fully on-chain generative SVG.
2. An optional per-token external metadata URI.

V2 is a separate collection from V1. Deploying V2 does not migrate V1 tokens; token numbering restarts at #1. This sanitized snapshot contains no live contract address, transaction hash or owner address.

## Goal

Make every pass visually different by default with fully on-chain SVG, while optionally allowing a per-token external metadata URI for completely different artwork. The pass remains a non-transferable ERC-721 with organizer-only check-in.

## Contract model

`contracts/CampusEventPassV2.sol` preserves the V1 state and entry points:

- `claim()` mints one pass to the caller and increments the token id.
- `checkIn(uint256 tokenId)` is owner-only, requires an existing pass, and can run once per token.
- `ticketOf(address)`, `checkedIn(uint256)`, `totalClaims()`, `ownerOf(uint256)` and the ERC-721 interfaces remain available.
- All transfer variants revert, including approvals and self-transfers.
- Receiver callback and rejected-receiver rollback behaviour are preserved.

It adds:

- `externalTokenURI(uint256 tokenId)` to read the per-token override.
- `setExternalTokenURI(uint256 tokenId, string calldata uri)` for the owner.
- `ExternalTokenURIUpdated(tokenId, uri)` for auditability.

## Generative artwork

The default route is generated inside `tokenURI` and stored nowhere except in the Base64 response.

- Seed: `keccak256(abi.encodePacked(tokenId, holder))`.
- Palette: `seed % 6`, selected from Aurora, Dusk, Forest, Ember, Tide and Orchid.
- Pattern: `(seed >> 8) % 4`, selected from Orbit, Wave, Grid and Eclipse.
- Offset: `seed % 120`, used to vary pattern geometry.
- Holder tag: the last four hexadecimal characters of the holder address, drawn at the bottom right.
- Ticket number: the token id, rendered as `TICKET #n`.
- Canvas: `800×480` with a rounded frame and a diagonal gradient.
- Artwork attributes: `Palette`, `Pattern` and `Ticket`.

The JSON and SVG are both `data:` URIs:

- image: `data:image/svg+xml;base64,<svg>`
- metadata: `data:application/json;base64,<json>`

No IPFS, HTTPS or other hosting dependency is required for the default route.

`scripts/gen-v2-samples.cjs` can render six local Hardhat holders into the git-ignored `samples/` directory for local inspection. No sample image is committed to this snapshot.

## Optional external metadata

The owner can set or clear an override for one token:

```solidity
setExternalTokenURI(uint256 tokenId, string calldata uri) external onlyOwner
```

- A non-empty URI is returned by `tokenURI` exactly as stored.
- An empty string deletes the override and restores the on-chain SVG.
- The override is per token, so a collection can mix external and on-chain metadata.
- The contract does not validate the URI or its content. The owner must host the metadata JSON and its image, and should use immutable content identifiers if permanence matters.
- Marketplaces and wallets may cache metadata, so changing or clearing the URI does not guarantee an immediate refresh.
- Because the on-chain art depends only on the token id and holder, clearing an override restores exactly the same SVG as before.

See [`EXTERNAL_METADATA_TEMPLATE.md`](EXTERNAL_METADATA_TEMPLATE.md) for a JSON template and operating notes.

## Tests

The V2 suite adds **9 Hardhat cases** to the V1 baseline. Together with V1 (11 cases) and V3 (10 cases), this snapshot defines **30 contract tests**. The V2 cases cover:

- one pass per wallet, owner and `totalClaims`
- organizer-only check-in and duplicate check-in
- transfer and approval restrictions
- deterministic, unique metadata and SVG for two holders
- holder tag and ticket number in the SVG
- metadata attributes and missing-token reverts
- per-token external metadata override, owner-only set/clear and on-chain fallback
- ERC-721 interfaces
- reentrant claim and rejected-receiver rollback

## Deployment notes

1. Deploy `CampusEventPassV2` with your own wallet or tooling. The included `scripts/deploy.cjs` targets the V1 contract only; adapt it if you want a scripted V2 deployment.
2. Confirm that the deployment receipt succeeded, the runtime bytecode matches your compiled artifact, `owner()` is the intended organizer account, and `totalClaims()` is zero.
3. Set `VITE_CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS` at build time if the front end should use this collection.
4. Keep V1 and V2 separate. Old V1 tokens remain on the V1 contract; new claims start at token #1 in V2.
5. Record the deployment locally if you need an audit trail. Do not add live addresses or transaction hashes to this sanitized snapshot.

## Dynamic total-claims number

`tokenURI` could include `totalClaims()` in the SVG, but then every existing token's metadata would change whenever a new pass was claimed. Wallets and marketplaces may cache the old image, so the displayed number might not update. This design keeps the fixed `TICKET #n` (the token id, which increments per claim) and does not put the global total in the image. A separate dashboard or indexer can show the live total.

## Why both routes

The on-chain route is permanent and needs no hosting. The external route allows completely different artwork per token, including IPFS or HTTPS content, and supports a mixed collection. The owner is trusted to set and clear external URIs; if that trust is not acceptable, deploy a pure on-chain instance and never set an override.

## Related

- [`NFT_V3_DESIGN.md`](NFT_V3_DESIGN.md) — the 1024×1024 square generation
- [`EXTERNAL_METADATA_TEMPLATE.md`](EXTERNAL_METADATA_TEMPLATE.md) — metadata JSON template
