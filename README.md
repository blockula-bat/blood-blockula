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

VM tests fetch Blockula from its public GitHub repository, pinned to
commit `865c81dab9ce79f0cdfc95db986338720b1e3cef`. No local sibling checkout is required.
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


## Live demo and contract

- Website: https://blood-on-blockula.effervescentlily2.chatgpt.site (public, no ChatGPT sign-in).
- Current immutable program: `boo1d9r5ph0e7k2vezt0tp2ns3wqvs2psyhcrmelzjfl4990xtuj8qvs96nq80`.
- Explorer: https://demo.blockula.app/#/program/boo1d9r5ph0e7k2vezt0tp2ns3wqvs2psyhcrmelzjfl4990xtuj8qvs96nq80
- Program source: `contract/src/lib.rs`. Built WASM/interface: `artifacts/`.
- 1% of buys and sells goes directly to the fixed treasury in native FANG; no separate LP fee.
- The personal account completed the 50%-supply liquidity addition at block 70092.
  The pool held 500,000 BLOOD at verification block 70392; future swaps change reserves.
  The one-off setup banner is retired. Normal liquidity controls remain available.

## Contributing

Fork and open a pull request, or push a branch if you have collaborator access.
Start with `npm ci --ignore-scripts`, `npm run dev`, and `npm test`.
`npm run contract` builds WASM; `cargo test --manifest-path verification/Cargo.toml`
runs the actual Blockula VM tests. Deployment helpers are operator-only, not part of the UI.

GitHub pushes do not automatically change the live website. The Sites publisher still needs
an authenticated source push, a saved build version and a deployment. Changes to contract logic
cannot upgrade the existing immutable program: they need a separately reviewed deployment.
Never commit `.private/`, wallet files, environment credentials, seeds or recovery material.
