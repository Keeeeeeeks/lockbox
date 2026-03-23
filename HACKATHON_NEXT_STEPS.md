# Lockbox Hackathon Finalization Checklist

## Verified now

- Contract compile passes (`npm run compile`)
- Hardhat tests pass (`npm run test`, 8/8)
- Multi-lockbox existence confirmed on-chain via factory reads:
  - Base Sepolia factory `0xbdf727a08b505de4f9db7f2b7093acf6f2b3906f` -> `getLockboxCount() = 7`
  - Tempo mainnet factory `0xef8e019373220d33dc114a94663a7672ea3d6f58` -> `getLockboxCount() = 1`
  - Status Sepolia factory `0xa309ebea3fc270251337c9a159fb53d2590b84e2` -> `getLockboxCount() = 1`
- Frontend multi-network + factory browse wiring present in `docs/app.html`
- Submission script includes track matching + required metadata fallback in `scripts/submit-hackathon.ts`

## Required before judging lock-in

1. Open live app and run manual smoke test on all configured chains:
   - `https://keeeeeeeks.github.io/lockbox/app.html`
   - switch network -> browse lockboxes -> open detail -> contribute flow
2. Confirm submission details in Devfolio UI match latest deployed addresses and links.
3. If any fields are stale, resubmit with:

```bash
npm run submit
```

4. Keep fallback track UUID list ready in case catalog API fails at submission time.

## Nice-to-have cleanup (non-blocking for submission)

- TypeScript language-server diagnostics currently show typed-API mismatches in some scripts/tests despite passing Hardhat compile/tests.
- If time allows, normalize viem and script typing across `scripts/` and `test/`.
