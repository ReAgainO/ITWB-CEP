# Validation record

This page keeps validation evidence for the Campus Event Pass source project. This is a sanitized snapshot: live contract addresses, owner addresses, transaction hashes, block numbers, deployment files, deployment identifiers and hosted URLs are intentionally omitted and are not reconstructed here. No live deployment address or transaction is asserted as reproducible from this snapshot.

## Automated suites in this snapshot

| Suite | File | Cases | Scope |
| --- | --- | --- | --- |
| Hardhat V1 | `test/CampusEventPass.cjs` | 11 | Claim uniqueness, owner-only check-in, transfer/approval blocking, events, ownership changes, interfaces, metadata, reentrancy and rollback |
| Hardhat V2 | `test/CampusEventPassV2.cjs` | 9 | V1 behaviour plus generative art, attributes, holder tag, external metadata set/clear/fallback |
| Hardhat V3 | `test/CampusEventPassV3.cjs` | 10 | V2 behaviour plus 1024×1024 canvas, six well-formed SVG renders, external fallback |
| Node demo | `test/demo.test.mjs` | 13 | Demo reducer, persistence, role restrictions, corrupt and blocked storage |
| Node i18n | `test/i18n.test.mjs` | 9 | Dictionary parity, interpolation, fallback, language detection |

- `pnpm test` executes the three Hardhat suites on an ephemeral local chain: **30 cases**.
- `pnpm test:demo` executes **22 Node cases**: 13 demo-state cases and 9 i18n cases.
- `pnpm test:i18n` executes the 9 i18n cases alone.

## Historical local runs

Records from the source project are summarized below. They are historical evidence, not a claim that every command has been rerun against this sanitized snapshot.

| Check | Recorded result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Success using the supplied lockfile; 284 packages |
| Hardhat compile | Success at each recorded run; pinned local solc 0.8.30, optimizer 200, Cancun EVM. The source project compiled the V1/V2/V3 contracts and imported OpenZeppelin sources successfully |
| `pnpm test` | The source project recorded **30 Campus Event Pass Hardhat cases** passing (V1 11, V2 9, V3 10). A separate artwork demo contract from the wider source project is intentionally not included in this snapshot |
| `pnpm test:demo` | 22 Node cases passed (demo state machine and i18n) |
| `pnpm measure:gas` | Success; local JSON measurement record written under `docs/`. Values are local ephemeral-chain measurements, not testnet costs |
| `pnpm build` | Success in the source project with Vite 7.3.6; 178 modules; no chunk-size warning. The React view layer is included in this snapshot, so a fresh build is the recommended local check |

Recorded runtimes: Node 22.20.0 and Node 24.19.0 on different runs, with pnpm 11.25.0. The lockfile controls exact dependency versions; package ranges are not a claim about the latest versions. No application dependency upgrade was attempted.

## Browser observations

The source project's production assets were served locally through Vite preview and checked in a browser. Observations are recorded as text only; no image is part of this snapshot.

- Demo mode loads without contract configuration or wallet interaction.
- An attendee claims pass #1; the claim button disables and the simulation notice remains visible.
- The organizer checks in pass #1; a repeated check-in shows the duplicate warning.
- Switching back to the attendee shows checked-in status; a reload preserves it.
- Sepolia mode without configuration shows a clear warning, with no active claim and no fabricated transaction link.
- Desktop and 390px viewports were inspected. Document width did not exceed the viewport, and the mobile layout stacked the dashboard and steps.
- Reset and a second attendee path were checked. Separate reducer cases cover role restrictions and corrupted or blocked storage.
- A narrow immediate-reload persistence window was found in Demo mode and fixed by saving with `useLayoutEffect`; regression tests and the production build passed afterwards.

## Testnet deployment evidence

A Sepolia testnet deployment of the pass contracts was performed in the source project. The contract addresses, owner address, transaction hashes, block numbers, live gas figures and deployment identifiers are **intentionally omitted from this sanitized snapshot**. No live deployment address or transaction is included, and none is invented here.

Recorded outcomes, without identifiers:

- Deployment receipts returned status `1`.
- Runtime bytecode at each deployed address matched the locally compiled artifact.
- `owner()` matched the deploying account, and `totalClaims()` was zero at deployment verification.
- Deployed bytecode sizes matched the artifacts: 6,534 bytes for V1, 11,845 bytes for V2 and 13,846 bytes for V3.
- The source-project record states that V3 token #1 was later claimed and checked in. Those transactions are not included in this snapshot.
- Deployment was signed with a browser wallet; the included `scripts/deploy.cjs` uses an environment-provided test key for fresh deployments instead. No private key or mnemonic was written to disk, sent to a host, or committed.
- V1, V2 and V3 are separate collections; tokens were not migrated between them.

## Not established

- No independent security audit, external code review or formal verification.
- No live gas or latency measurement is included. Local gas numbers are not testnet gas costs or price estimates.
- No external wallet-provider end-to-end test is included beyond the source project's browser observations.
- No independent-device or independent-network test is included.
- No hosted instance, deployment record or front-end build artifact is part of this snapshot.
- A fresh browser run against your own wallet and testnet deployment is still required; the historical browser observations are not a substitute.
- Wallet, marketplace and block-explorer rendering of on-chain SVG or external metadata may vary and was not exhaustively tested.
- The contracts target a test network and hold no funds. No production key-management or incident-response procedure is defined.

