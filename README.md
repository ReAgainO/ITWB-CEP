# Campus Event Pass

Campus Event Pass is a small Ethereum application for issuing **one non-transferable ERC-721 event pass per wallet**, with **organizer-only check-in** and **fully on-chain SVG artwork**. The repository contains three contract generations (V1, V2 and V3), Hardhat tests, the React/Vite bilingual front end, deployment scripts and design notes.

## Snapshot status

This is a **private, sanitized source snapshot**, not a deployment bundle.

- It contains no live contract address, transaction hash, owner address, deployment record, hosted instance, API key, private key or generated sample image.
- Where a deployment value would normally appear, use a placeholder such as `YOUR_CONTRACT_ADDRESS` and supply the value from your own deployment.
- The React/Vite front end is included in `src/main.jsx`, `src/App.jsx`, `src/style.css` and the shared modules `src/contract.js`, `src/demo.js` and `src/i18n.js`.
- The project has not been independently audited. Treat it as a testnet/demo reference, not production infrastructure.

## What it does

1. An organizer deploys a pass contract. The deploying account becomes the contract owner.
2. An attendee calls `claim()`. The contract mints one pass to that wallet and records token ownership. A wallet can claim only once.
3. The organizer calls `checkIn(tokenId)` for an existing, unchecked pass. The contract records attendance and emits an event.
4. `tokenURI(tokenId)` returns ERC-721 metadata as a Base64 `data:` URI. V2 and V3 generate the SVG entirely on-chain from the token id and holder address; no image host is needed.

Passes are non-transferable. Every transfer path in the ERC-721 implementation is blocked at the contract level after minting, including both `safeTransferFrom` overloads, `transferFrom`, self-transfers and transfers attempted through an ERC-721 approval.

## Contract generations

| Contract | Artwork | External metadata | Notes |
| --- | --- | --- | --- |
| `contracts/CampusEventPass.sol` (V1) | Fixed 800×480 on-chain SVG | No | Minimal baseline: claim, check-in, fixed metadata |
| `contracts/CampusEventPassV2.sol` (V2) | Generative 800×480 on-chain SVG | Yes, per token | Wide artwork; optional external override |
| `contracts/CampusEventPassV3.sol` (V3) | Generative 1024×1024 on-chain SVG | Yes, per token | Square artwork for square NFT thumbnails |

Each generation is an independent collection. Deploying V2 or V3 does not migrate V1 tokens; token numbering restarts at #1 in the new contract.

### Generative artwork (V2 and V3)

- Seed: `keccak256(abi.encodePacked(tokenId, holder))`.
- 6 palettes: Aurora, Dusk, Forest, Ember, Tide, Orchid.
- 4 patterns: Orbit, Wave, Grid, Eclipse.
- Holder tag: the last four hexadecimal characters of the holder address, shown on the pass.
- Ticket number: the token id, rendered as `TICKET #n`. It is fixed per token.
- Metadata attributes: `Palette`, `Pattern` and `Ticket`.
- The image is an SVG embedded as `data:image/svg+xml;base64` inside metadata returned as `data:application/json;base64`.

The global `totalClaims()` value is deliberately **not** rendered in the artwork. If it were, every existing token's metadata would change whenever another pass was claimed, and wallets that cache metadata could show stale images. A separate dashboard or indexer can display the live total.

### Optional external metadata (V2 and V3)

The owner can point one token at an external metadata JSON:

```solidity
setExternalTokenURI(uint256 tokenId, string calldata uri) external onlyOwner
```

- A non-empty URI is returned by `tokenURI` exactly as stored.
- An empty string clears the override and restores the deterministic on-chain SVG.
- The contract does not fetch, validate or merge the JSON. The owner is trusted to host valid metadata and artwork.
- The external URI should point to metadata JSON, not directly to an image, and its image should be square for square NFT viewers.
- Use immutable IPFS or Arweave identifiers if permanence matters. An HTTPS location can change or disappear, and wallets may cache metadata after it is read.
- This route is not exposed by the bundled front-end ABI; setting or clearing it requires an owner-only contract call outside the UI.

See [`docs/EXTERNAL_METADATA_TEMPLATE.md`](docs/EXTERNAL_METADATA_TEMPLATE.md) for a JSON template and operating notes.

## Front-end

The UI is built with React 19, Vite 7 and ethers 6. It is bilingual: Chinese and English dictionaries share the same 158 keys, and the choice is persisted in the browser. The interface includes:

- A hero pass card with a hover swing and a click/Enter/Space burst animation. Reduced-motion preferences disable both.
- A Demo mode and a testnet mode.
- Wallet connection, network switching, claim, organizer check-in, status messages and block-explorer links for submitted transactions.
- Accessibility features: skip link, keyboard-focusable pass card, `aria-live` status, translated labels and visible focus styles.

### Demo mode

Demo mode is the default when no contract address is configured. It needs no wallet and sends no transaction.

- Two attendee profiles and one organizer profile share a local simulation.
- Claims and check-ins are kept in `localStorage` under `campus-pass-demo-v1`.
- Each profile can hold one simulated pass; the organizer profile can check in a simulated pass number.
- Demo state survives a reload in the same browser, is not shared between devices, and can be reset from the UI.
- The UI labels the result as a simulation. It is **not** an NFT and is **not** proof of attendance.

The state reducer is in `src/demo.js`; its tests cover role restrictions, duplicate claims, invalid ticket ids, reset, legacy/corrupt storage and blocked storage.

### Testnet mode

Testnet mode is active when `VITE_CONTRACT_ADDRESS` contains a valid non-zero address.

- The UI connects to an injected browser wallet and requests the Sepolia test network (chain id `11155111`).
- It checks that bytecode exists at the configured address and reads `ticketOf`, `checkedIn`, `totalClaims` and `owner`.
- The organizer check-in panel is shown only when the connected account equals the contract owner.
- Claims and check-ins are real testnet transactions and require test ETH for gas. No real funds are involved.
- An unconfigured build shows a warning and suggests Demo mode instead of pretending a deployment exists.
- Wrong-network, rejected-signature, insufficient-funds, already-claimed, already-checked-in and non-owner errors are shown in the current language.

## Architecture

| Location | Purpose |
| --- | --- |
| `contracts/CampusEventPass.sol` | V1 pass: one claim per wallet, owner-only check-in, fixed on-chain metadata |
| `contracts/CampusEventPassV2.sol` | V2 pass: generative wide SVG plus optional external metadata |
| `contracts/CampusEventPassV3.sol` | V3 pass: square generative SVG plus optional external metadata |
| `contracts/test/ClaimReceivers.sol` | Test-only receiver fixtures for reentrancy and rejection rollback tests |
| `src/App.jsx`, `src/main.jsx`, `src/style.css` | React view, entry point and styles, including the Demo/testnet modes and pass-card animation |
| `src/contract.js` | Contract address from `VITE_CONTRACT_ADDRESS`, Sepolia constants and the shared ABI |
| `src/demo.js` | Demo profiles, reducer, validation and persistence |
| `src/i18n.js` | Chinese/English dictionaries, language detection and React hook |
| `test/CampusEventPass*.cjs` | Hardhat contract and adversarial tests |
| `test/demo.test.mjs`, `test/i18n.test.mjs` | Node tests for the demo state machine and translations |
| `scripts/deploy.cjs` | Guarded Sepolia deployment for `CampusEventPass` (V1) |
| `scripts/measure-gas.cjs` | Local gas measurement; writes a local JSON record |
| `scripts/gen-v2-samples.cjs`, `scripts/gen-v3-samples.cjs` | Render local sample art into git-ignored directories |
| `docs/` | Design, metadata, animation, validation and deployment notes |
| `hardhat.config.cjs` | Pinned solc 0.8.30, optimizer 200, Cancun EVM, optional Sepolia network |
| `vite.config.js`, `index.html` | Vite configuration and HTML entry point |

## Quick start

Prerequisites: Node.js 22.12 or newer (validated with Node 22 and 24) and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm compile
pnpm test
pnpm test:demo
pnpm measure:gas
```

What each command does:

| Command | Result |
| --- | --- |
| `pnpm compile` | Compiles the contracts with the pinned local solc package |
| `pnpm test` | Runs the Hardhat contract suites on an ephemeral local chain |
| `pnpm test:demo` | Runs the demo-state and i18n Node tests |
| `pnpm test:i18n` | Runs only the i18n tests |
| `pnpm measure:gas` | Measures deploy, claim and check-in gas locally and writes `docs/local-gas-measurements.json` |
| `pnpm deploy:sepolia` | Deploys V1 to Sepolia using the environment variables below |
| `pnpm dev` | Starts the Vite dev command |
| `pnpm build` | Builds the production bundle |
| `pnpm preview` | Serves the production build locally |

Local gas numbers are not testnet gas costs or price estimates. The Hardhat network in these tests is ephemeral and needs no test ETH.

Optional sample generation, after compilation:

```sh
node scripts/gen-v2-samples.cjs
node scripts/gen-v3-samples.cjs
```

These write SVG samples and a local index into `samples/` and `samples-v3/`, both ignored by Git. No sample image is committed.

## Tests

The snapshot defines:

| Suite | Cases | Coverage |
| --- | --- | --- |
| V1 contract, `test/CampusEventPass.cjs` | 11 | Claim uniqueness, owner-only and duplicate check-in, transfer/approval blocking, events, ownership transfer and renunciation, ERC-721 interfaces, metadata, reentrancy and rejected-receiver rollback |
| V2 contract, `test/CampusEventPassV2.cjs` | 9 | V1 behavior plus deterministic generative art, palette/pattern attributes, holder tag, ticket number, external metadata set/clear/fallback |
| V3 contract, `test/CampusEventPassV3.cjs` | 10 | V2 behavior plus 1024×1024 canvas, six well-formed SVG renders, external fallback and rollback |
| Demo and i18n, `test/demo.test.mjs`, `test/i18n.test.mjs` | 22 | Demo reducer, persistence and storage edge cases; dictionary parity, interpolation, fallback and language detection |

That is **30 Hardhat cases** and **22 Node cases** as checked in. Historical run results are recorded in [`docs/VALIDATION.md`](docs/VALIDATION.md).

## Configuration

Copy `.env.example` to `.env` and fill in only the values you need. `.env` is ignored by Git.

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_CONTRACT_ADDRESS` | Front end | Public build-time constant. Use `YOUR_CONTRACT_ADDRESS` as the placeholder. Any `VITE_` value is embedded in the browser bundle. |
| `SEPOLIA_RPC_URL` | `pnpm deploy:sepolia` | Private endpoint for a Sepolia RPC provider. Use `YOUR_SEPOLIA_RPC_ENDPOINT` as the placeholder. |
| `DEPLOYER_PRIVATE_KEY` | `pnpm deploy:sepolia` | Private key of a dedicated test wallet only. Never use a mainnet key. |

Rules:

- Never commit `.env`, private keys, mnemonics, RPC credentials or API keys.
- `VITE_` variables are public. Only a contract address belongs there.
- `hardhat.config.cjs` adds the Sepolia network only when both `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` are set.
- `scripts/deploy.cjs` writes public deployment records under `deployments/` after a successful deployment. This snapshot contains no such records. Decide deliberately whether to commit new ones.
- The front end reads the contract address at build time. Changing it requires a rebuild, not just an environment edit next to an existing bundle.

## Owner-only administration at the contract level

The contract uses OpenZeppelin `Ownable`. The deployer is the initial owner. The owner role is enforced by the contracts, not by the front-end role switch.

| Action | Who can do it | Effect |
| --- | --- | --- |
| `checkIn(tokenId)` | Current owner only | Marks an existing, unchecked pass as attended, once |
| `setExternalTokenURI(tokenId, uri)` | Current owner only (V2/V3) | Sets, changes or clears one token's external metadata URI |
| `transferOwnership(newOwner)` | Current owner only | Moves all owner-only powers to the new account |
| `renounceOwnership()` | Current owner only | Permanently removes the owner; check-in and external-metadata updates stop forever |

Important boundaries:

- The owner cannot mint passes to other wallets, transfer a pass, burn a pass, revoke a pass, pause claims or change the artwork algorithm of an already-deployed contract.
- Claims are self-service: each wallet calls `claim()` for itself.
- ERC-721 approvals remain available for standard compatibility, but an approved operator still cannot transfer a pass. The transfer check reverts regardless of approval.
- Renouncing ownership does not stop claims. It permanently disables check-in and, on V2/V3, external-metadata changes.
- In Demo mode the organizer profile is a simulation only. In testnet mode the organizer panel appears only when the connected wallet matches `owner()`.

## Security and limitations

- **No audit.** The contracts are small and use OpenZeppelin 5 components, but they have not been independently reviewed. Do not use them for valuable assets without a review.
- **Testnet only.** The deployment path targets Sepolia. Gas is paid in test ETH; the contracts hold no funds and expose no payable function.
- **One wallet is not one person.** A person can control many wallets and claim many passes. The contract provides no identity, allowlist, proof-of-attendance or sybil resistance.
- **Check-in proves a ticket number, not a person.** Ticket numbers and holder addresses are public. Event staff still need a separate signed challenge or a manual identity check; this version does not claim to solve real-person verification.
- **Non-transferability is contract-level.** Wallets and marketplaces may still display transfer controls or cached listings, but every transfer reverts. There is no secondary-market integration.
- **The owner is trusted for external metadata.** On V2/V3 the owner can point a token at arbitrary JSON. The contract does not validate the content, and the URI is stored on-chain and emitted in an event, so it is public. A malicious or compromised owner could display misleading metadata, and an external host could disappear or change.
- **Metadata caching is outside the contract.** Wallets may cache `tokenURI` results. Clearing or changing an external URI does not guarantee an immediate refresh in every viewer.
- **Artwork depends on the holder address.** The deterministic seed includes the holder, so the art is stable for a non-transferable pass but would change if a transfer were somehow possible. Transfers are blocked.
- **On-chain art has no hosting dependency, but rendering still varies.** Wallets render SVG and fonts differently, and large data URIs may be truncated or ignored by some clients.
- **Smart-contract wallets must accept ERC-721.** `claim()` uses `_safeMint`. A contract account without a valid receiver callback cannot claim; the whole claim, including the recorded ticket, rolls back.
- **No enumeration or indexer.** The contracts expose mappings and events, not a list of all holders. Use events and an indexer if you need a guest list.
- **Local-only validation.** The automated suites run against an ephemeral Hardhat chain. They do not replace an end-to-end test against your own testnet deployment and wallet.
- **No license file is included.** Treat the source as private and do not redistribute it without permission.

## Documentation

- [Documentation index](docs/README.md)
- [NFT v2 design](docs/NFT_V2_DESIGN.md)
- [NFT v3 design](docs/NFT_V3_DESIGN.md)
- [External metadata template](docs/EXTERNAL_METADATA_TEMPLATE.md)
- [Pass card animation](docs/CARD_ANIMATION.md)
- [Validation record](docs/VALIDATION.md)
- [Deployment guide](docs/DEPLOYMENT.md)
