function parse_public_stats_date_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    var dateText = Utilities.formatDate(
      value,
      PUBLIC_STATS_CONFIG.timeZone,
      "yyyy-MM-dd"
    );
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
    if (!selected || date.key >= selected.date.key) {
      selected = { date: date, row: row };
    }
  });
  if (!selected) throw new Error("No current training-max row found.");

  var maxes = {};
  prRows.forEach(function(row) {
    var id = String(row[0] || "").replace(/\s+/g, "").toLowerCase();
    if (["squat", "bench", "deadlift"].indexOf(id) === -1) return;
    maxes[id] = require_public_stat_number_(row[3], id + " max");
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
  if (!progression || !prs) {
    throw new Error("Required lifting sheets are missing.");
  }

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
    var request = JSON.parse(
      event && event.postData ? event.postData.contents : "{}"
    );
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
