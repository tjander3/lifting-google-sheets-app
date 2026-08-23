var AUTOMATION_CONFIG = {
  writePrsHandler: "write_prs",
  writePrsHour: 0,
  writePrsMinute: 5,
  timeZone: "America/New_York",
  statusPropertyPrefix: "automation_status_",
};

// Manual smoke test for verifying Apps Script execution and log output.
function hello_world() {
  Logger.log("Hello world test log: " + new Date().toISOString());
  return "Hello world";
}

function get_sheet_dates(sheet_name) {
  // Get all the dates from a sheet
  var sheet = get_sheet(sheet_name);
  return get_sheet_dates_from_sheet(sheet);
}

function get_sheet_dates_from_sheet(sheet) {
  var startRow = 1;  // This is 1 indexed
  var startCol = 2; // The first one is just the name
  var numRows = 1; // Just get the date row
  var numCols = sheet.getLastColumn() - startCol + 1;
  if (numCols < 1) {
    return [];
  }
  var dataRange = sheet.getRange(startRow, startCol, numRows, numCols);
  var data = dataRange.getValues();

  return data[0];
}


function get_lifting_days_in_week(liftLocations, week, year) {
  // Get the rows of the days lifted in the week given
  var row = [];
  var dates = get_sheet_dates(liftLocations);
  var arrayLength = dates.length;
  var firstWeekFound = false;
  for (var i = 0; i < arrayLength; i++) {
    var date = new Date(dates[i]);
    if (date.getWeek() == week && date.getFullYear() == year) {
      firstWeekFound = true;
      row.push(i + 2); // Plus 1 because sheets are 0 index and + another 1 because first row is just lift names
    } else if (firstWeekFound) {
      // If we already found one match and no longer find anymore we are done with the current week
      break;
    }
  }

  return row;
}


function get_lifts_in_row(lift_locations, lift, lifting_days) {
  // Get all the dates from a sheet
  var sheet_name = lift_locations[lift]["sheet"];
  var sheet = get_sheet(sheet_name);

  var lifts = [];
  var arrayLength = lifting_days.length;
  for (var i = 0; i < arrayLength; i++) {
    var startRow = lift_locations[lift]["startRow"];
    var startCol = lifting_days[i];
    var numRows = lift_locations[lift]["endRow"] - startRow + 1;
    var numCols = 1; // only get one at a time
    // Fetch the range of cells an see what has been paid...

    var dataRange = sheet.getRange(startRow, startCol, numRows, numCols);
    // Fetch values for each row in the Range.
    var data = dataRange.getValues();
    lifts.push(...get_lifts_with_regex_from_array(data));

  }
  return lifts;
}


function calculate_volume(lifts) {
  var volume = 0;
  for (var element in lifts) {
    var lift = lifts[element];
    var multiplier = lift["volumeMultiplier"] || 1;
    volume += parseFloat(lift["weight"]) * parseFloat(lift["reps"]) * multiplier;
  }
  return volume
}

function get_volume(lift, week, year) {
  var lift_locations = get_lift_locations();
  var lifting_days = get_lifting_days_in_week(lift_locations[lift]["sheet"], week, year)
  var lifts = get_lifts_in_row(lift_locations, lift, lifting_days);
  return calculate_volume(lifts);
}

function get_lift_locations() {
  var lift_locations = {
    "bench": {
      "sheet": "chest",
      "startRow": "3",
      "endRow": "7",
      "name":  "bench",
    },
    "incline": {
      "sheet": "chest",
      "startRow": "8",
      "endRow": "10",
      "name":  "incline",
    },
    "decline": {
      "sheet": "chest",
      "startRow": "11",
      "endRow": "13",
      "name":  "decline",
    },
    "squat": {
      "sheet": "legs",
      "startRow": "3",
      "endRow": "7",
      "name":  "squat",
    },
    "frontSquat": {
      "sheet": "legs",
      "startRow": "8",
      "endRow": "10",
      "name":  "front squat",
    },
    "deadlift": {
      "sheet": "arms",
      "startRow": "3",
      "endRow": "7",
      "name":  "deadlift",
    },
    "hangClean": {
      "sheet": "arms",
      "startRow": "8",
      "endRow": "10",
      "name":  "hang clean",
    },
    "chinups": {
      "sheet": "arms",
      "startRow": "23",
      "endRow": "25",
      "name":  "chinups",
    },
    "shoulderPress": {
      "sheet": "chest",
      "startRow": "57",
      "endRow": "59",
      "name":  "shoulder press",
    }
  }
  return lift_locations;
}

function get_sheet(sheet_name) {
  var spreadsheet = SpreadsheetApp.getActive();
  var all_sheets = spreadsheet.getSheets();
  sheet_name = sheet_name.toLowerCase();

  for (var sheet in all_sheets) {
    var tmp_sheet_name = all_sheets[sheet].getName().toLowerCase();
    if ( tmp_sheet_name == sheet_name) {
      return all_sheets[sheet];
    }
  }
  throw new Error("Error we did not find the correct sheet");
}

function get_rows(sheet, lift_dict) {
  var startRow = lift_dict["startRow"];
  var startCol = 2; // The first one is just the name
  var numRows = lift_dict["endRow"] - startRow + 1;
  var numCols = sheet.getLastColumn() - startCol + 1;
  if (numCols < 1) {
    return [];
  }
  var dataRange = sheet.getRange(startRow, startCol, numRows, numCols);
  var data = dataRange.getValues();

  return data;
}

function get_date(sheet, col) {
  col = parseInt(col) + 2;
  var date_row = 1;
  var num_rows = 1;
  var num_cols = 1;
  var dataRange = sheet.getRange(date_row, col, num_rows, num_cols);
  var cell = dataRange.getCell(1, 1);
  var cell_value = cell.getValue();
  return cell_value;
}


function parse_lifts_from_value(value, date) {
  // Canonical input is weight-reps. Also support 65s-10 for a pair of
  // dumbbells and bw-5 for bodyweight reps. Separator typos, ordinary times,
  // and fractional reps are intentionally ignored.
  // Reps must begin immediately after the separator. This prevents planned
  // sequences such as "320- 320- 320-" from becoming a false 320-rep set.
  var regex = /(?:^|[^\w.])(?:(bw)\s*-(0|[1-9]\d*)|((?:0|[1-9]\d*)(?:\.\d+)?)(s)?\s*-(0|[1-9]\d*))(?![\d.])/gi;
  var match;
  var lifts = [];
  var text = String(value == null ? "" : value);

  while ((match = regex.exec(text)) !== null) {
    var isBodyweight = Boolean(match[1]);
    var isDumbbellPair = Boolean(match[4]);
    var weight = isBodyweight ? "0" : match[3];
    var reps = match[2] || match[5];
    var lift = {
      "weight": weight,
      "reps": reps,
      "1rm": calculate_max(weight, reps),
    };

    if (isBodyweight) {
      lift["bodyweight"] = true;
    }
    if (isDumbbellPair) {
      lift["dumbbellPair"] = true;
      lift["volumeMultiplier"] = 2;
    }
    if (date !== undefined) {
      lift["date"] = date;
    }
    lifts.push(lift);
  }
  return lifts;
}

function get_lifts_with_regex_from_array(array) {
  var lifts = [];
  for (var element in array) {
    lifts.push(...parse_lifts_from_value(array[element]));
  }
  return lifts;
}

function get_lifts_with_regex(rows, dates) {
  var lifts = [];
  for (var row in rows) {
    for (var col in rows[row]) {
      lifts.push(...parse_lifts_from_value(rows[row][col], dates[col]));
    }
  }
  return lifts;
}

function calculate_max(weight, reps) {
  var max_percentage = [1,1.03,1.06,1.09,1.13,1.16,1.2,1.24,1.27,1.33];
  var numericWeight = Number(weight);
  var numericReps = Number(reps);
  if (!Number.isFinite(numericWeight) || !Number.isFinite(numericReps) || numericReps < 1) {
    return 0;
  }
  var percentageIndex = Math.min(Math.floor(numericReps), max_percentage.length) - 1;
  return numericWeight * max_percentage[percentageIndex];
}

function get_max_lift(lifts) {
  var max = {"1rm": 0};
  var real_max = {"1rm": 0}
  for(var lift in lifts) {
    var curr_lift = lifts[lift];
    if (curr_lift["1rm"] > max["1rm"]) {
      max = JSON.parse(JSON.stringify(curr_lift));
    }

    var currentWeight = Number(curr_lift["weight"]);
    var currentReps = Number(curr_lift["reps"]);
    var realWeight = Number(real_max["1rm"]);
    if (currentWeight > realWeight && currentReps !== 0) {
      real_max = JSON.parse(JSON.stringify(curr_lift));
      real_max["1rm"] = real_max["weight"];
    } else if (currentWeight === realWeight && currentReps > Number(real_max["reps"] || 0) && currentReps !== 0) {
      real_max = JSON.parse(JSON.stringify(curr_lift))
      real_max["1rm"] = real_max["weight"];
    }
  }
  return [max, real_max];
}

function get_prs() {
  var max_lifts = [];
  var real_max_lifts = [];
  var lift_locations = get_lift_locations();
  var sheets = {};
  var dates_by_sheet = {};
  for (var key in lift_locations) {
    var sheet_name = lift_locations[key]["sheet"];
    if (!sheets[sheet_name]) {
      sheets[sheet_name] = get_sheet(sheet_name);
      dates_by_sheet[sheet_name] = get_sheet_dates_from_sheet(sheets[sheet_name]);
    }
    var sheet = sheets[sheet_name];
    var data = get_rows(sheet, lift_locations[key]);
    var lifts = get_lifts_with_regex(data, dates_by_sheet[sheet_name]);
    var lift_maxes = get_max_lift(lifts);
    var max_lift = lift_maxes[0];
    var real_max_lift = lift_maxes[1];
    max_lift["lift"] = key;
    max_lifts.push(max_lift);
    real_max_lift["lift"] = key;

    real_max_lifts.push(real_max_lift);
  }
  return [max_lifts, real_max_lifts];
}

function format_lift_entry(max_lift) {
  var displayWeight = max_lift["bodyweight"] ? "bw" : max_lift["weight"];
  var suffix = max_lift["dumbbellPair"] ? "s" : "";
  return displayWeight + suffix + "-" + max_lift["reps"];
}

function write_prs_helper(max_lifts) {
  return max_lifts.map(function(max_lift) {
    var lift_name = max_lift["lift"];
    lift_name = lift_name.charAt(0).toUpperCase() + lift_name.slice(1)
    return [
      lift_name,
      format_lift_entry(max_lift),
      max_lift["date"],
      max_lift["1rm"],
    ];
  });
}

function write_prs() {
  var startedAt = Date.now();
  console.log("write_prs started");
  try {
    var sheet = get_sheet("prs");
    var max_lifts_arr = get_prs();
    var max_lifts = max_lifts_arr[0];
    var real_max_lifts = max_lifts_arr[1];
    var calculated_rows = write_prs_helper(max_lifts);
    var real_rows = write_prs_helper(real_max_lifts);
    var row_count = Math.max(calculated_rows.length, real_rows.length);
    if (row_count === 0) {
      record_automation_run("write_prs", "success", startedAt, { rowsWritten: 0 });
      return { rowsWritten: 0 };
    }

    var output = [];
    for (var i = 0; i < row_count; i++) {
      output.push(
        (calculated_rows[i] || ["", "", "", ""])
          .concat(real_rows[i] || ["", "", "", ""])
      );
    }
    sheet.getRange(4, 5, row_count, 8).setValues(output);
    var result = { rowsWritten: row_count };
    record_automation_run("write_prs", "success", startedAt, result);
    return result;
  } catch (error) {
    record_automation_run("write_prs", "failure", startedAt, {
      error: error && error.stack ? error.stack : String(error),
    });
    throw error;
  }
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


/**
 * Returns the week number for this date.  dowOffset is the day of week the week
 * "starts" on for your locale - it can be from 0 to 6. If dowOffset is 1 (Monday),
 * the week returned is the ISO 8601 week number.
 * @param int dowOffset
 * @return int
 */
Date.prototype.getWeek = function (dowOffset) {
/*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */

    dowOffset = typeof(dowOffset) == 'number' ? dowOffset : 0; //default dowOffset to zero
    var newYear = new Date(this.getFullYear(),0,1);
    var day = newYear.getDay() - dowOffset; //the day of week the year begins on
    day = (day >= 0 ? day : day + 7);
    var daynum = Math.floor((this.getTime() - newYear.getTime() -
    (this.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
    var weeknum;
    //if the year starts before the middle of a week
    if(day < 4) {
        weeknum = Math.floor((daynum+day-1)/7) + 1;
        if(weeknum > 52) {
            var nYear = new Date(this.getFullYear() + 1,0,1);
            var nday = nYear.getDay() - dowOffset;
            nday = nday >= 0 ? nday : nday + 7;
            /*if the next year starts before the middle of
              the week, it is week #1 of that year*/
            weeknum = nday < 4 ? 1 : 53;
        }
    }
    else {
        weeknum = Math.floor((daynum+day-1)/7);
    }
    return weeknum;
};

/**
 * FIVE_THREE_ONE_SSL(training_max, last_percentage)
 *
 * Returns a single column containing the date, header, and grouped work sets.
 *
 * - training_max: your 5/3/1 Training Max (number)
 * - last_percentage: one of 60 (deload), 85, 90, 95, or 105 (int)
 *
 * Rules:
 * - For 60 (deload): the 3-set sequence is [40, 50, 60]
 * - For 85/90/95: the 8-set sequence is [p-20, p-10, p, p-10, p-10, p-10, p-10, p-10]
 * - For 105: the 8-set sequence is [75, 85, 95, 100, 105, 85, 85, 85]
 *
 * All weights are rounded to the nearest 5 and suffixed with a dash (e.g., "245-").
 *
 * @customfunction
 */
function FIVE_THREE_ONE_SSL(training_max, last_percentage) {
  const allowed = new Set([60, 85, 90, 95, 105]);
  const p = Number(last_percentage);
  const tm = Number(training_max);

  if (!Number.isFinite(tm)) {
    throw new Error(`Invalid training_max "${training_max}". Provide a number.`);
  }
  if (!Number.isFinite(p) || !Number.isInteger(p) || !allowed.has(p)) {
    const allowedList = Array.from(allowed).sort((a,b)=>a-b).join(", ");
    throw new Error(`Invalid last_percentage "${last_percentage}". Allowed values: ${allowedList}.`);
  }

  // Header (display) sequence
  const headerSeq = (p === 60)
    ? [40, 50, 60]
    : (p === 105)
      ? [75, 85, 95, 100, 105]
      : [p - 20, p - 10, p];

  // Work-set sequence
  const workSeq = (p === 60)
    ? [40, 50, 60]
    : (p === 105)
      ? [75, 85, 95, 100, 105, 85, 85, 85]
      : [p - 20, p - 10, p, p - 10, p - 10, p - 10, p - 10, p - 10];

  // Compute rounded weights
  const w = workSeq.map(pc => roundToNearest5(tm * (pc / 100)));

  // Format helpers
  const dash = n => `${n}-`;
  const joinDashes = arr => arr.map(dash).join(' ');

  // Date in spreadsheet timezone, formatted MM/dd/yyyy
  const tz = Session.getScriptTimeZone();
  const todayStr = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy');
  const header = `${tm} (${headerSeq.join(",")})`;

  // Build single-column output per your grouping
  let rows;
  if (p === 60) {
    // Deload: three main-work sets only, with no supplemental work.
    rows = w.map(dash);
  } else if (p === 105) {
    // [s1], [s2], [s3+s4], [s5], [s6+s7+s8]
    rows = [
      joinDashes([w[0], w[1]]),
      joinDashes([w[2]]),
      joinDashes([w[3]]),
      joinDashes([w[4]]),
      joinDashes([w[5], w[6], w[7]]),
    ];
  } else {
    // [s1], [s2], [s3], [s4+s5+s6], [s7+s8]
    rows = [
      joinDashes([w[0]]),
      joinDashes([w[1]]),
      joinDashes([w[2]]),
      joinDashes([w[3], w[4], w[5]]),
      joinDashes([w[6], w[7]]),
    ];
  }

  // Return as a single column (2-D array with N rows, 1 column)
  return [[todayStr], [header], ...rows.map(r => [r])];
}

var PUBLIC_STATS_CONFIG = {
  tokenProperty: "PUBLIC_STATS_TOKEN",
  timeZone: "America/New_York",
  lifts: [
    { id: "squat", name: "Squat", trainingMaxColumn: 11 },
    { id: "bench", name: "Bench", trainingMaxColumn: 1 },
    { id: "deadlift", name: "Deadlift", trainingMaxColumn: 21 },
  ],
};

function parse_public_stats_date_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    var dateText = Utilities.formatDate(value, PUBLIC_STATS_CONFIG.timeZone, "yyyy-MM-dd");
    return { key: Number(dateText.replace(/-/g, "")), iso: dateText };
  }

  var match = String(value || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  var month = Number(match[1]);
  var day = Number(match[2]);
  var year = Number(match[3]);
  var parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return {
    key: year * 10000 + month * 100 + day,
    iso: year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
  };
}

function require_public_stat_number_(value, label) {
  var number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 1500) {
    throw new Error("Invalid " + label + ".");
  }
  return number;
}

function build_public_training_snapshot_(progressionRows, prRows, now) {
  var todayText = Utilities.formatDate(
    now || new Date(),
    PUBLIC_STATS_CONFIG.timeZone,
    "yyyyMMdd"
  );
  var todayKey = Number(todayText);
  var selected = null;

  progressionRows.forEach(function(row) {
    var date = parse_public_stats_date_(row[0]);
    if (!date || date.key > todayKey) return;
    if (!selected || date.key >= selected.date.key) selected = { date: date, row: row };
  });
  if (!selected) throw new Error("No current training-max row found.");

  var maxes = {};
  prRows.forEach(function(row) {
    var id = String(row[0] || "").replace(/\s+/g, "").toLowerCase();
    if (["squat", "bench", "deadlift"].indexOf(id) === -1) return;
    maxes[id] = require_public_stat_number_(
      row[3],
      id + " max"
    );
  });

  var lifts = PUBLIC_STATS_CONFIG.lifts.map(function(lift) {
    if (!Object.prototype.hasOwnProperty.call(maxes, lift.id)) {
      throw new Error("Missing " + lift.id + " max.");
    }
    return {
      id: lift.id,
      name: lift.name,
      trainingMax: require_public_stat_number_(
        selected.row[lift.trainingMaxColumn],
        lift.id + " training max"
      ),
      max: maxes[lift.id],
    };
  });

  return {
    schemaVersion: 2,
    asOf: selected.date.iso,
    unit: "lb",
    lifts: lifts,
  };
}

function get_public_training_stats_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var progression = spreadsheet.getSheetByName("Lifting Progression");
  var prs = spreadsheet.getSheetByName("PRs");
  if (!progression || !prs) throw new Error("Required lifting sheets are missing.");

  var progressionRows = progression
    .getRange(1, 1, progression.getLastRow(), 22)
    .getValues();
  // I:L is the real/heaviest-lift table maintained by write_prs. E:H is the
  // calculated-estimate table and is intentionally not published.
  var prRows = prs.getRange(1, 9, prs.getLastRow(), 4).getValues();
  return build_public_training_snapshot_(progressionRows, prRows, new Date());
}

function public_stats_tokens_match_(provided, expected) {
  provided = String(provided || "");
  expected = String(expected || "");
  if (!provided || provided.length !== expected.length) return false;
  var difference = 0;
  for (var i = 0; i < expected.length; i++) {
    difference |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return difference === 0;
}

function public_stats_json_response_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  try {
    var request = JSON.parse(event && event.postData ? event.postData.contents : "{}");
    var expectedToken = PropertiesService
      .getScriptProperties()
      .getProperty(PUBLIC_STATS_CONFIG.tokenProperty);
    if (!public_stats_tokens_match_(request.token, expectedToken)) {
      return public_stats_json_response_({ error: "unauthorized" });
    }
    return public_stats_json_response_(get_public_training_stats_());
  } catch (error) {
    console.error("Public stats request failed: " + error);
    return public_stats_json_response_({ error: "unavailable" });
  }
}


/** Round to nearest 5 (e.g., 243 → 245, 242 → 240). */
function roundToNearest5(x) {
  return Math.round(Number(x) / 5) * 5;
}
