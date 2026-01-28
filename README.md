# Audioblocks Stacks Project

This Clarinet project contains two Clarity contracts:

- `contracts/artist-registry.clar`: On-chain artist & song registry with IPFS integration and tipping.
- `contracts/audioblocks-marketplace.clar`: NFT marketplace for minting and secondary sales with royalties.

Note: These contracts were added verbatim from provided snippets and may need syntax adjustments to compile (some match/branch structures and helper calls might need Clarity-compliant forms). I can help fix and test them on request.

## Prerequisites

- Node.js 18+
- Clarinet: `npm i -g @hirosystems/clarinet`

## Quickstart

1. Install dependencies (Clarinet is standalone):
   ```bash
   npm i -g @hirosystems/clarinet
   ```

2. Check contracts:
   ```bash
   clarinet check
   ```

3. Open the REPL:
   ```bash
   clarinet console
   ```

4. Example calls (once syntax issues are resolved):
   - Register artist:
     ```clarity
     (contract-call? .artist-registry register-artist "Alice")
     ```
   - Tip artist by ID:
     ```clarity
     (contract-call? .artist-registry tip-artist u1 u500000)
     ```
   - Create collection:
     ```clarity
     (contract-call? .audioblocks-marketplace create-nft-collection "Album" "Desc" "ipfs://..." "ipfs://..." u10 u100 u1000000)
     ```

## Project Layout

- `clarinet.toml`: Project configuration
- `contracts/`: Clarity contracts

## Next Steps

- Run `clarinet check` and share errors; I will iterate to make the contracts fully valid Clarity.
- Add unit tests in `tests/` using Clarinet (optional).
- Wire UI/backend to call read-only and public functions.
