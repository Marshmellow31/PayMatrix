## What changed and why

<!-- 1–3 sentence summary of the change. Link the issue/ticket if applicable. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Security fix
- [ ] Refactor / code quality
- [ ] Documentation

## Financial data impact

> If this PR touches expense creation, settlement, or balance calculation, answer these:

- [ ] Primary Firestore writes are `await`-ed (not fire-and-forget)
- [ ] New writes use `setDoc` with a pre-generated ref (idempotent on retry), or `withRetry()` wraps `updateDoc`
- [ ] `round2()` used for all currency arithmetic — no raw floating-point accumulation

## Security checklist

- [ ] No secrets or UIDs hardcoded
- [ ] No new `sessionStorage` / `localStorage` writes for PII (names, emails)
- [ ] Cross-user Firestore writes go through a Cloud Function, not the client SDK
- [ ] Firestore rules updated if a new collection is introduced

## Testing

- [ ] Unit tests added or updated for any changed business logic
- [ ] Manually tested in the browser (describe what you checked)
- [ ] No regressions in the Vitest suite (`npm test` passes)

## Screenshots (if UI changed)

<!-- Paste before/after screenshots here -->

## Deployment notes

<!-- Anything the reviewer needs to know: feature flags, Firestore index changes, Cloud Function deploy steps, etc. -->
