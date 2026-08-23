# Changelog

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
