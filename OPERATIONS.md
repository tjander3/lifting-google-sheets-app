# Operations

## Production inventory

- Container-bound Apps Script project: mapped locally by ignored `.clasp.json`.
- GitHub: public source repository; `main` tests and then deploys with `clasp push`.
- Spreadsheet formula entrypoint: `FIVE_THREE_ONE_SSL`.
- Spreadsheet macro: `Startnewweek` (**Start new week**).
- Installable trigger: `write_prs`, daily near 12:05 AM America/New_York.
- Persistent operational state: latest `write_prs` result in Script Properties.
- External services: Google Sheets, Apps Script, Script Properties, GitHub
  Actions, and the encrypted GitHub `CLASPRC_JSON_BASE64` and `APPS_SCRIPT_ID`
  secrets.
- Public stats: the web app accepts token-authenticated POST requests and returns
  only squat, bench, and deadlift training-max and recorded-max values. The token
  lives in Script Properties and the separate private `lifting-stats-publisher`
  repo.

There are no simple or installable edit triggers in the current project. Apps
Script installable triggers are not represented in `appsscript.json`, so run
`setupTriggers` after linking a replacement project or if trigger state is lost.

To verify that the Apps Script editor can execute the project and display logs,
select `hello_world`, click **Run**, and inspect the execution log. This smoke
test only writes a timestamped greeting to the log; it does not modify the sheet.

## Safe test spreadsheet

Do not test layout-changing macros against the live workbook.

1. In Google Sheets, make a private copy of the production lifting spreadsheet.
2. Open **Extensions > Apps Script** from that copy to create its container-bound
   test project, then copy its script ID from **Project Settings**.
3. Copy `.clasp.test.example.json` to the ignored `.clasp.test.json` and replace
   the placeholder with the test script ID.
4. Run `npm run apps:test:status`, followed by `npm run apps:test:push`.
5. In the test spreadsheet, verify `Startnewweek`, a full cycle rollover, a
   training-max change, formulas, and PR output before deploying to production.

The automatic GitHub deployment creates `.clasp.json` from the protected
`APPS_SCRIPT_ID` repository secret; it never targets the test project.

After the initial web-app deployment, `PUBLIC_STATS_DEPLOYMENT_ID` keeps the
endpoint version synchronized with every successful production source deploy.
The private publisher runs daily, validates the response, and commits the JSON
to the Pages repository only when values change.

## Deployment verification

1. Confirm the GitHub **Test and deploy** workflow passed for `main`.
2. Run `write_prs` once from the Apps Script editor when the change affects PRs.
3. Run `log_write_prs_status` and confirm `status` is `success`, `rowsWritten` is
   expected, and runtime is comfortably below six minutes.
4. Confirm the PR table in the spreadsheet has expected values.
5. After the next midnight trigger, repeat step 3 to verify the scheduled path.

An unchanged PR table is not a failure when the calculated PRs have not changed.
Use the stored status and Apps Script execution history to distinguish a
successful no-change update from a failed run.

## Spreadsheet backup

Before a layout-changing macro or risky data migration, use **File > Make a
copy** in Google Sheets. Include the date and Git commit in the copy name. Normal
source deployments do not change workbook layout and rely on Google Sheets
version history plus the Git history of this repository.

## Rollback

1. Find the last known-good commit with `git log --oneline`.
2. Use `git revert <bad-commit>` so the rollback is recorded without rewriting
   history.
3. Run `npm test` and review `npm run apps:status`.
4. Push the revert to `main`; the successful workflow redeploys the prior source.
5. Run the affected entrypoint and verify it using the steps above.

If spreadsheet data or layout was damaged, restore it separately from Google
Sheets version history or the dated workbook copy. A code rollback does not undo
spreadsheet mutations that already occurred.

## Failure response

For a `write_prs` failure, inspect Apps Script **Executions**, then run
`log_write_prs_status`. Capture the error, duration, triggering function, and
affected workbook state before changing code. Avoid merely disabling the trigger;
fix or roll back the source and verify both a manual run and the next scheduled
run.
