# Lifting Google Sheets app

Google Apps Script helpers and macros for the lifting spreadsheet. The files in
this repository are the source of truth; `clasp` synchronizes them with the
container-bound Apps Script project.

## Prerequisites

- Node.js 24 or newer
- Access to the linked Google Sheet and Apps Script project
- The Apps Script API enabled at <https://script.google.com/home/usersettings>

Install the pinned project dependencies:

```powershell
npm install
```

Authorize `clasp` once on a new computer:

```powershell
npx clasp login
```

The OAuth token is stored outside this repository by default. Never commit a
`.clasprc.json`, client secret, credential file, or token.

## Development workflow

1. Edit the files under `src/` locally.
2. Run the automated tests:

   ```powershell
   npm test
   ```

3. Review the files that `clasp` will upload:

   ```powershell
   npm run apps:status
   ```

4. Test and upload the complete project to Apps Script:

   ```powershell
   npm run apps:push
   ```

5. Commit the verified change and push it to GitHub.

`npm run apps:push` stops if the local tests fail. A `clasp push` replaces the
remote project's complete source, so avoid making simultaneous edits in the
Apps Script web editor. If an emergency web edit is made, commit or stash local
work and run `npm run apps:pull` before continuing locally.

## Tests

Vitest loads `src/Code.js` in a small Apps Script-like VM context. The current
suite covers lift parsing, volume and one-rep-max calculations, rounding, and
the `FIVE_THREE_ONE_SSL` custom function. Spreadsheet integration and the
recorded `Startnewweek` macro still require a test spreadsheet because they
depend directly on `SpreadsheetApp` and workbook layout.

GitHub Actions runs the same test suite for every push and pull request. It does
not receive Google credentials and does not deploy to Apps Script.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run the automated test suite once |
| `npm run test:watch` | Re-run tests while editing |
| `npm run apps:status` | List exactly what `clasp` will upload |
| `npm run apps:pull` | Replace local Apps Script files with the remote source |
| `npm run apps:push` | Run tests, then upload the project |
| `npm run apps:open` | Open the linked Apps Script editor |
