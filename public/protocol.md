# BLOOD / FANG — Blockula Demo

BLOOD is an experimental fixed-supply fungible token and integrated constant-product AMM.
It is native WASM, not an Ethereum/Solidity ERC-20 deployment. All assets here are demo assets.

## Official deployment

The current program address and code hashes are in /deployment.json.
Only the program identified there is the current BLOOD pool. An initial 0.3%-LP-fee prototype
was superseded before site publication; its creator liquidity was withdrawn. It is not the
current token, even though it has the same display symbol. Always compare the program address.

## Supply and ownership

- Exactly 1,000,000 BLOOD, 9 decimals. No mint or burn entry point.
- Initial pool: 100,000 BLOOD + 100 demo FANG, seeded by darkoh.boo (one h).
- Remaining 900,000 BLOOD: darkohh.boo (two h), Darkoh's personal demo account.
- Initial LP shares belong to the locally managed darkoh.boo deployer. These are withdrawable.
- Only 1,000 LP base units are permanently locked; this is NOT a permanently locked liquidity pool.
- Token transfers, reset-before-change allowances, and delegated transfers are supported.
- No contract admin, mutable treasury, emergency drain, or upgrade authority.

## Trading fees — 1% to Darkoh

Treasury: darkohh.boo, boo19vhu6sf33wg73qwt7f7knrg9entqxkzqksgzzpkhcsjeprh7ehfszhfmfc.
The address is fixed at initialization and cannot be changed.

Buys: fee = floor(FANG input / 100). The fee goes to the treasury immediately. The remaining
FANG enters the pool. BLOOD out = floor(net FANG * BLOOD reserve / (FANG reserve + net FANG)).

Sells: gross FANG = floor(BLOOD input * FANG reserve / (BLOOD reserve + BLOOD input)).
Fee = floor(gross FANG / 100). The treasury receives the fee; the seller receives the rest.

Both directions pay the creator fee in FANG. Rounding is down to whole drops (1e-9 FANG),
so microscopic trades can round the fee to zero. There is no separate LP trading fee.
This differs from Uniswap's usual LP-fee distribution: this demo routes the full 1% to the
creator account, as requested. Network transaction fees and storage deposits are additional.

The on-chain counter f is total FANG fees actually paid by this program, not projected revenue.
Fees are already in the treasury wallet; there is no claim transaction.

## Liquidity

Adds mint proportional LP shares. BLOOD is capped by the entered maximum; unused FANG is
refunded atomically. Removal burns LP shares and returns both assets proportionally.
Initial shares are floor(sqrt(FANG drops * BLOOD units)), minus the permanently locked 1,000.

Minimum output / minimum LP shares and a block-height deadline are checked by the contract.
Failed calls revert transfers and storage together; the chain can still charge a transaction fee.
Direct native transfers to the program are disabled. Integer arithmetic only, with u128 products.

## Wallets

Passkeys derive signing keys locally via the official Blockula SDK and WebAuthn PRF.
Private signing material stays in memory; only a public account hint and pending transaction id
are stored in browser localStorage. The server does not custody a wallet.

Passkeys are bound to their website hostname. A demo.blockula.app passkey cannot be unlocked on
this website. Create a passkey here and optionally link it as an OWNER device on your existing
account through the official Blockula wallet. This is full account control: the UI explicitly
labels it. Spending-only session keys cannot call programs on the current Blockula release.
Do not paste seeds, recovery phrases, or private keys into the app or chat.

## Verification and limits

Rust VM tests cover asset conservation, fee routing on buys/sells, swaps, liquidity, allowances,
malformed/expired/slippage failures and rollback, plus 100 randomized sequences.
Live browser tests perform real demo-chain buy/sell/add/remove transactions and render desktop
and mobile layouts. The automated harness emulates a PRF-capable passkey; the user's physical
Touch ID / Face ID prompt is not automated or certified by these tests.

Pool reads use the demo node's paginated storage API because its public program-view endpoint
is disabled. These are RPC-reported values, not independently verified storage proofs.
The SDK pins chain id, genesis, prefix, program version digest and immutable authority.
The displayed reserve curve is illustrative, not price history.

Experimental, unaudited software. Demo FANG and BLOOD have no represented cash value.
