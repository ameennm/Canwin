# Canwin Project Lessons

## Bug: Login 401 Unauthorized (Hashing Mismatch)
**Pattern**: When migrating from one system to another, ensure the hashing algorithm and salt match exactly between the old system and the new one.
**Correction**: The Cloudflare D1 implementation uses SHA-256 for passwords. Seeding must use the same hash.
**Status**: Corrected in `login.js` and `seed.js`.

## Bug: Deployment Authentication Error 10000
**Pattern**: `npx wrangler` CLI authentication can expire or become corrupted in long-running terminals.
**Correction**: Always check `npx wrangler d1 list` to verify connectivity before assuming schema issues.
**Status**: Awaiting User Re-authentication.

## Design Decision: 5-Level Commission Pool
**Principle**: Standardizing the commission distribution to a fixed 30% pool across 5 levels ensures system sustainability.
**Hierarchy**: L1: 46.7%, L2: 26.7%, L3: 13.3%, L4: 6.7%, L5: 6.7%.
**Status**: Implemented in `verify-referral/[id].js`.
