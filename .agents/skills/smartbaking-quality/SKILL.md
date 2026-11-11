---
name: smartbaking-quality
description: Verify SmartBaking changes with focused Laravel, frontend, and Python checks, emphasizing branch isolation, inventory integrity, API failure handling, and forecast validity.
---

# SmartBaking quality and testing

Choose checks from the actual repository scripts and installed test tools. Run checks appropriate to the changed behavior; expand only when a failure or unresolved concern warrants it. Do not test wording or duplicate calculations merely to inflate test counts.

## High-value checks by area

- **Laravel:** request validation, unauthenticated/unauthorized access, cross-branch resource access and aggregates, transactional rollback, duplicate submissions, and concurrent stock usage.
- **Inventory:** ingredients consumed once at production, finished stock consumed at sale, compatible units/yields, rounded batches, expected receipts, expiry, and transfer state transitions.
- **Forecasting:** schema/frequency validation, insufficient-history fallback, finite nonnegative operational outputs where specified, future regressors, chronological splits, lag leakage, and correct timestamp boundaries.
- **Integration:** service unavailable/timeout, invalid response, bounded payloads, no leaked credentials/PII, and advisory forecasting failures that do not corrupt operational records.
- **UI:** form errors and loading states, empty/partial data, keyboard access, narrow screens, explicit branch/units, and actual versus forecast labels.

Use synthetic, deterministic fixtures without partner or employee PII. Integration tests must use isolated test databases and must not contact live bakery services. Model-evaluation results need a chronological holdout; a passing API test does not establish forecast accuracy.

Report the exact checks run, their outcomes, and meaningful gaps. Clearly distinguish an unimplemented business feature from a failed environment check. For offline claims, verify persistence across restart, duplicate-safe retries, interrupted synchronization, reconnect behavior, and multi-terminal conflicts before accepting the claim.

For a pure review, prioritize actionable defects with a concrete failure condition and file reference. Avoid broad hardening projects that do not affect the requested change.
