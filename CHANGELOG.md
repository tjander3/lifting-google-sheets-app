# Changelog

## 2026-08-23

- Changed the public training snapshot from calculated one-rep-max estimates
  to the real max table maintained by `write_prs` and bumped its schema to 2.
- Kept `hello_world` as a timestamped manual logging smoke test while removing
  obsolete debug helpers, noisy logs, stale comments, and a redundant variable.
- Split the Apps Script monolith into configuration, diagnostics, sheet access,
  lifting/PR, 5/3/1, macro, and public-stats modules. Replaced the global
  `Date.prototype.getWeek` mutation with a tested `get_week_number` helper.

## 2026-08-22

- Published the reusable Apps Script source under the MIT License while keeping
  spreadsheet data, project mappings, and deployment credentials private.
- Added automated tests and production deployment after successful `main` tests.
- Added the 5/3/1 three-set 40/50/60 deload week.
- Batched PR reads and writes to eliminate the six-minute `write_prs` timeout.
- Added source-controlled trigger setup and persistent runtime status logging.
- Added a separate test-project workflow, integration contracts, rollback and
  backup documentation, and full-cycle fixture tests.
- Hardened workout parsing to reject separator typos while supporting dumbbell
  pairs, bodyweight work, incomplete entries, and high-repetition estimates.
- Fixed calculated-PR mutation while selecting the heaviest real lift.
- Added a token-protected, six-value public training-stat endpoint and automatic
  web-app redeployment support for the private GitHub Pages publisher.
