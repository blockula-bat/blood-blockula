# BLOOD — Blockula Demo

Fixed-supply fungible token, native-FANG AMM, and passkey-signed swap/liquidity UI.
Current deployment: [`public/deployment.json`](public/deployment.json).
Protocol / fees / ownership / limitations: [`public/protocol.md`](public/protocol.md).

## Run

Node >=20. Rust 1.98.1 with wasm32v1-none for the contract.

```
npm ci --ignore-scripts
npm run dev
npm test
npm run contract
cargo test --manifest-path verification/Cargo.toml
npm run build
```

VM tests currently reference the pinned Blockula checkout at
`../../tmp/blockula-account-link-2026-11-10` relative to the project root
(commit 865c81dab9ce79f0cdfc95db986338720b1e3cef).
The verification harness uses Blockula's actual VM with its in-memory chain host.

The production site is static and talks directly to the public demo RPC via CORS. No hosting
cookies or authorization headers are sent to the RPC. `worker.js` is an optional self-hosted
proxy adapter, not needed by the static deployment. Neither contains signing credentials.

`npm run deploy` is a local operator-only tool, reads an already provisioned owner wallet from
~/.blockula, and persists signed transaction outboxes before POST. No wallet seed is in this repo
or frontend. Do not rerun unresolved signed actions; inspect their receipts first.
`scripts/ui-check.mjs` is an explicit operator test (real demo funds, local secret in .private).

The copied ABI adapter is MIT ©2026 Jack Dishman; see contract/abi/LICENSE.
Contract source, built WASM/interface and public deployment manifest are included for review.
