function calculate_volume(lifts) {
  var volume = 0;
  for (var element in lifts) {
    var lift = lifts[element];
    var multiplier = lift["volumeMultiplier"] || 1;
    volume += parseFloat(lift["weight"]) * parseFloat(lift["reps"]) * multiplier;
  }
  return volume;
}

function get_volume(lift, week, year) {
  var lift_locations = get_lift_locations();
  var lifting_days = get_lifting_days_in_week(
    lift_locations[lift]["sheet"],
    week,
    year
  );
  var lifts = get_lifts_in_row(lift_locations, lift, lifting_days);
  return calculate_volume(lifts);
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
  var max_percentage = [1, 1.03, 1.06, 1.09, 1.13, 1.16, 1.2, 1.24, 1.27, 1.33];
  var numericWeight = Number(weight);
  var numericReps = Number(reps);
  if (!Number.isFinite(numericWeight) || !Number.isFinite(numericReps) || numericReps < 1) {
    return 0;
  }
  var percentageIndex = Math.min(Math.floor(numericReps), max_percentage.length) - 1;
  return numericWeight * max_percentage[percentageIndex];
}

function get_max_lift(lifts) {
  var max = { "1rm": 0 };
  var real_max = { "1rm": 0 };

  for (var index in lifts) {
    var current_lift = lifts[index];
    if (current_lift["1rm"] > max["1rm"]) {
      max = JSON.parse(JSON.stringify(current_lift));
    }

    var currentWeight = Number(current_lift["weight"]);
    var currentReps = Number(current_lift["reps"]);
    var realWeight = Number(real_max["1rm"]);
    if (currentWeight > realWeight && currentReps !== 0) {
      real_max = JSON.parse(JSON.stringify(current_lift));
      real_max["1rm"] = real_max["weight"];
    } else if (
      currentWeight === realWeight &&
      currentReps > Number(real_max["reps"] || 0) &&
      currentReps !== 0
    ) {
      real_max = JSON.parse(JSON.stringify(current_lift));
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
    lift_name = lift_name.charAt(0).toUpperCase() + lift_name.slice(1);
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
