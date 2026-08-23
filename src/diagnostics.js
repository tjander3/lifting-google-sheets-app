// Manual smoke test for verifying Apps Script execution and log output.
function hello_world() {
  Logger.log("Hello world test log: " + new Date().toISOString());
  return "Hello world";
}

function record_automation_run(jobName, status, startedAt, details) {
  var record = {
    job: jobName,
    status: status,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    details: details || {},
  };
  console.log(JSON.stringify(record));

  // Monitoring must never turn a successful spreadsheet update into a failure.
  try {
    PropertiesService.getScriptProperties().setProperty(
      AUTOMATION_CONFIG.statusPropertyPrefix + jobName,
      JSON.stringify(record)
    );
  } catch (monitoringError) {
    console.warn("Unable to persist automation status: " + monitoringError);
  }
  return record;
}

function get_automation_status(jobName) {
  var value = PropertiesService.getScriptProperties().getProperty(
    AUTOMATION_CONFIG.statusPropertyPrefix + jobName
  );
  return value ? JSON.parse(value) : null;
}

function log_write_prs_status() {
  var status = get_automation_status("write_prs");
  console.log(JSON.stringify(status));
  return status;
}

function setupTriggers() {
  var handler = AUTOMATION_CONFIG.writePrsHandler;
  var matchingTriggers = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === handler;
  });

  if (matchingTriggers.length === 1) {
    return { handler: handler, created: false, removedDuplicates: 0 };
  }

  matchingTriggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger(handler)
    .timeBased()
    .atHour(AUTOMATION_CONFIG.writePrsHour)
    .nearMinute(AUTOMATION_CONFIG.writePrsMinute)
    .everyDays(1)
    .inTimezone(AUTOMATION_CONFIG.timeZone)
    .create();

  var result = {
    handler: handler,
    created: true,
    removedDuplicates: matchingTriggers.length,
    schedule: "daily near 12:05 AM " + AUTOMATION_CONFIG.timeZone,
  };
  console.log(JSON.stringify(result));
  return result;
}
