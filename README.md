# Lifting Google Sheets automation

Source-controlled Google Apps Script helpers and macros for a lifting workbook.
The project generates 5/3/1 cycles, calculates volume and estimated PRs, manages
the weekly rollover, and records automation health. Its core logic is tested
locally with Vitest and successful `main` builds deploy through GitHub Actions.

This repository contains only reusable source and synthetic test data. The live
Google Sheet, workout history, Apps Script project ID, and deployment credentials
remain private.

## Prerequisites

- Node.js 24 or newer
- Access to the linked Google Sheet and Apps Script project
- The Apps Script API enabled at <https://script.google.com/home/usersettings>

Install the pinned project dependencies from Git Bash:

```bash
npm install
```

Authorize `clasp` once on a new computer:

```bash
npx clasp login
```

The OAuth token is stored outside this repository by default. Never commit a
`.clasprc.json`, client secret, credential file, or token.

Copy `.clasp.example.json` to `.clasp.json`, then replace the placeholder with
the script ID from **Apps Script > Project Settings**. The local mapping is
ignored by Git.

## Development workflow

1. Edit the files under `src/` locally.
2. Run the automated tests:

   ```bash
   npm test
   ```

3. Review the files that `clasp` will upload:

   ```bash
   npm run apps:status
   ```

4. Test and upload the complete project to Apps Script:

   ```bash
   npm run apps:push
   ```

5. Commit the verified change and push it to GitHub. A successful test run on
   `main` automatically pushes the same source to Apps Script.

`npm run apps:push` stops if the local tests fail. A `clasp push` replaces the
remote project's complete source, so avoid making simultaneous edits in the
Apps Script web editor. If an emergency web edit is made, commit or stash local
work and run `npm run apps:pull` before continuing locally.

## Tests

Vitest loads `src/Code.js` in a small Apps Script-like VM context. The current
suite covers lift parsing, volume and one-rep-max calculations, rounding, and
the `FIVE_THREE_ONE_SSL` custom function, including its three-set 40/50/60
deload. Spreadsheet integration and the
recorded `Startnewweek` macro still require a test spreadsheet because they
depend directly on `SpreadsheetApp` and workbook layout.

The test suite also covers the recorded macro's Apps Script API contract,
complete 5/3/1 cycles and training-max changes, automation status recording,
trigger deduplication, malformed entries, strict separator handling, dumbbell
pairs such as `65s-10`, and bodyweight entries such as `bw-5`.

GitHub Actions runs the same test suite for every push and pull request. After a
push to `main` passes, a separate deploy job restores the encrypted
`CLASPRC_JSON_BASE64` credential and `APPS_SCRIPT_ID` project mapping from
repository secrets, then runs `clasp push`. Pull requests and non-`main`
branches never receive the secrets and never deploy.

The deploy credential is a base64-encoded copy of the local `~/.clasprc.json`.
It contains an OAuth refresh token and must only be stored as an encrypted
GitHub Actions secret. Never print it, commit it, or place it in an artifact.

The production script also exposes a token-protected `doPost` web-app endpoint
that returns only the current squat, bench, and deadlift training maxes and
estimated one-rep maxes. A separate private publisher validates that six-value
snapshot and updates `tjander3.github.io`. Spreadsheet identifiers, workout
history, and the endpoint token are never included in the response.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run the automated test suite once |
| `npm run test:watch` | Re-run tests while editing |
| `npm run apps:status` | List exactly what `clasp` will upload |
| `npm run apps:pull` | Replace local Apps Script files with the remote source |
| `npm run apps:push` | Run tests, then upload the project |
| `npm run apps:open` | Open the linked Apps Script editor |
| `npm run apps:test:status` | List files targeting the optional test Apps Script project |
| `npm run apps:test:push` | Test and upload to the optional test Apps Script project |
| `npm run apps:test:open` | Open the optional test Apps Script project |

## Workout entry format

Use `weight-reps`, for example `315-5`. A planned set with no completed reps,
such as `315-`, is ignored. The parser also supports:

- `65s-10` for a pair of 65-pound dumbbells. Volume counts both dumbbells.
- `bw-5` for five bodyweight repetitions. The reps are recorded, but no load is
  invented for volume or estimated one-rep max calculations.

Colon separators such as `415:1`, fractional repetitions such as `425-.25`, and
incomplete plans are ignored and do not count toward PRs or volume.

## Production automation

The production project has three externally invoked entrypoints:

- `FIVE_THREE_ONE_SSL` is called by spreadsheet formulas.
- `Startnewweek` is the bound spreadsheet macro named **Start new week**.
- `write_prs` is invoked by an installable daily time trigger.
- `doPost` serves the minimal authenticated public-stat snapshot.

After linking a new Apps Script project, run `setupTriggers` once in the Apps
Script editor. It keeps one existing `write_prs` trigger, or replaces duplicates
with one trigger scheduled daily near 12:05 AM America/New_York. Trigger state is
owned by Google and is not included in `clasp push`.

Every `write_prs` run records start time, finish time, duration, success/failure,
and rows written in the execution log and Script Properties. Run
`log_write_prs_status` in the editor to print the latest recorded result.

See [OPERATIONS.md](OPERATIONS.md) for the test-sheet, verification, backup, and
rollback procedures.

## License

This project is available under the [MIT License](LICENSE).
