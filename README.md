# Campus Event Pass

A small Ethereum application for issuing **one non-transferable ERC-721 event pass per wallet**, with organizer-only check-in and fully on-chain SVG artwork.

## What is inside

- `contracts/` — three contract generations (V1, V2, V3), built on OpenZeppelin ERC721/Ownable.
- `src/` — React 19 + Vite 7 bilingual front end with wallet and Demo modes.
- `test/` — 30 Hardhat contract tests and 22 Node tests for the Demo state machine and i18n.
- `scripts/` — deployment, gas measurement and sample generation.
- `docs/` — design, metadata, validation and deployment notes.

## Quick start

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:demo
pnpm build
```

## Notes

- This is a sanitized source snapshot: no private key, API key, live address or personal data.
- The demo video is available in the `itwb-cep` release: <https://github.com/ReAgainO/ITWB-CEP/releases/tag/itwb-cep>.
- V2 and V3 generate the pass artwork entirely on-chain; V3 uses a 1024×1024 square canvas so wallet thumbnails show the full design.
