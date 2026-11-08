# Deployment guide

This guide covers a fresh Sepolia testnet deployment and local acceptance checks. This sanitized snapshot contains no live contract address, transaction hash, owner address or deployment record; use your own values and do not add them to the snapshot.

## 1. Scope and safety

- `pnpm deploy:sepolia` deploys **`CampusEventPass` (V1) only**. V2 and V3 require their own deployment flow: adapt `scripts/deploy.cjs` or deploy through your wallet, then apply the same verification steps.
- Use a dedicated test wallet and Sepolia test ETH. Never use a mainnet key.
- Never put a private key, mnemonic, RPC credential or API key in this repository, a chat message, a ticket or a hosted front end.
- Test ETH has no real value. Do not buy "deployment credentials" from third parties.

## 2. Prerequisites

- Node.js 22.12 or newer and pnpm 11.
- Two test wallets: one organizer/deployer and one attendee.
- A Sepolia RPC endpoint from a provider you trust. Confirm the endpoint is for Sepolia, chain id `11155111`, before deploying.
- A small amount of Sepolia test ETH for deployment, claims and check-ins.

## 3. Local verification

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm compile
pnpm test
pnpm test:demo
pnpm measure:gas
pnpm build
```

Expected results in this snapshot:

- Hardhat runs 30 contract cases (V1 11, V2 9, V3 10) on an ephemeral local chain.
- The Node suites run 22 cases (13 demo, 9 i18n).
- `pnpm measure:gas` writes `docs/local-gas-measurements.json`; the numbers are local measurements, not testnet costs.
- `pnpm build` produces a Vite production bundle. Without a configured contract address, that bundle starts in Demo mode.

## 4. Configure the environment

```sh
cp .env.example .env
```

Fill in only the values you need:

```dotenv
# Public build-time constant used by the front end.
VITE_CONTRACT_ADDRESS=

# Private deployment inputs; never commit them.
SEPOLIA_RPC_URL=https://YOUR_SEPOLIA_RPC_ENDPOINT
DEPLOYER_PRIVATE_KEY=
```

Notes:

- `DEPLOYER_PRIVATE_KEY` is a 64-character hexadecimal private key for the dedicated test wallet, not a mnemonic. Leave it empty until you are ready to deploy.
- `.env` is ignored by Git. If a key is exposed, stop using that wallet; deleting the file is not enough.
- Every `VITE_` value is embedded in the public browser bundle. Only public values, such as a contract address, belong under that prefix.
- `hardhat.config.cjs` adds the `sepolia` network only when both `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` are set.

## 5. Deploy V1

```sh
pnpm deploy:sepolia
```

The script:

1. Refuses to run on any network other than `sepolia`.
2. Reads the RPC chain id and aborts unless it is `11155111`.
3. Aborts if the deployer has no Sepolia ETH.
4. Deploys `CampusEventPass`, waits for confirmations and checks the receipt status.
5. Checks that runtime bytecode exists at the deployed address and that `owner()` matches the signing account.
6. Writes `deployments/sepolia-<timestamp>.json` and `deployments/sepolia.json` with the public address, deployer address, transaction hash, block number, gas used and ABI.

The terminal prints the contract address and transaction hash. Save them locally if you need an audit trail; do not commit them to this sanitized snapshot.

If the command times out, check the wallet nonce and transaction history before retrying. Re-running immediately can create a second contract.

To deploy V2 or V3, point your tooling at the corresponding contract name and repeat the same checks. The included script is intentionally limited to V1.

## 6. Point the front end at the contract

Set the public address at build time:

```dotenv
VITE_CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS
```

Then rebuild the front end and restart the dev command. The value is compiled into the bundle; editing an environment file next to an existing build does not change that build.

The front-end output is static. Serve the generated `dist/` directory over HTTPS from any static host; no application runtime, database or wallet key is required. A placeholder host such as `https://your-domain.example` may be used in local notes, but no real host is part of this snapshot.

Do not upload `.env`, deployment records or the full development directory. Upload only the compiled front-end assets.

## 7. Manual acceptance

1. Connect the attendee wallet to the front end and confirm the wallet is on Sepolia. The UI should recognize bytecode at the configured address. A missing-bytecode warning means the address or network is wrong.
2. Claim a pass. Verify the contract address and fee in the wallet before confirming. Record the resulting token number and, if needed, the transaction hash locally.
3. Reload the page. The token number should still come from the contract. A second claim should be rejected by the contract or disabled by the UI.
4. Switch to the organizer wallet. The check-in panel should appear only for `owner()`. Enter the attendee's ticket number, confirm the check-in transaction and record the result locally.
5. Switch back to the attendee and reload. The pass should show as checked in. Another device using the same wallet should read the same on-chain state.
6. Exercise negative paths locally where possible: wrong network, rejected signature, non-owner check-in and duplicate check-in. A failed on-chain transaction can still cost gas.

## 8. Owner powers and irreversible actions

- The contract owner can call `checkIn` and, on V2/V3, `setExternalTokenURI`.
- The owner can transfer ownership. Only the new owner can then check passes in or change external metadata.
- `renounceOwnership()` permanently removes the owner. Claims continue, but check-in and external-metadata updates can never be performed again. Do not call it during a demonstration unless permanent loss of administration is intended.
- ERC-721 approvals do not bypass the non-transferability rule.
- Ticket numbers and holder addresses are public. A ticket number alone does not prove control of a wallet or the identity of a person; event staff need a separate signed challenge or a manual check.

## 9. Evidence handling

Save deployment addresses, transaction hashes, receipts, test logs and local gas measurements outside the repository, or in a private record you control. Local gas values are not testnet gas values. Never include private keys, mnemonics, RPC credentials or personal attendee data in evidence.

For optional source verification, use the block explorer's Standard JSON Input flow:

1. Take the `input` object from the matching `artifacts/build-info/` JSON file. Do not upload the whole build-info package.
2. Select compiler `0.8.30`, optimizer enabled with 200 runs, and the Cancun EVM target.
3. Use contract path `contracts/CampusEventPass.sol:CampusEventPass` for V1. V2 and V3 use their own paths and have no constructor arguments.
4. Confirm the compiler version with `node -p "require('solc').version()"` before submitting.

Source verification is optional and is not required for a successful transaction.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `HH100` / unknown network `sepolia` | Both `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` must be set before Hardhat loads the config |
| Insufficient funds | Confirm Sepolia, the current signer and the test ETH balance; mainnet balance is irrelevant |
| Wallet error `4001` | The signature was rejected; retry and do not record it as success |
| Wallet error `4902` | Add or enable Sepolia in the wallet, then retry |
| Wrong owner | Use the deploying account or the current `owner()`; check for an ownership transfer or renunciation |
| No ticket / contract error | Check the address and chain id, rebuild the front end and reconnect the wallet |
| Transaction pending for a long time | Check the wallet nonce and transaction state in a block explorer; do not click repeatedly |

