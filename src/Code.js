//TODO ability to have 1rm max only for "real" maxes
// TODO beter to write pr as we get them vs get all at once
// TODO chinups ability to get weighted and bw
function hello_world() {
  Logger.log("Hello world test log")
  return "Hello world";
}

function test_get_volume() {
  var volume = get_volume("bench", 3, 2026);
  //var volume = get_volume("deadlift", 6, 2024);
  //var volume = get_volume("bench", 46, 2021);
  //var volume = get_volume("bench", 1, 2023);
  Logger.log(volume);
}

function test_get_calculated_pr() {

}

function test_get_real_pr() {
  Logger.log("Start of function, test_get_real_pr")
  var prs = get_prs()
  Logger.log(prs)

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
  //Logger.log(liftLocations);
  // Get the rows of the days lifted in the week given
  var row = [];
  //var sheet = get_sheet(liftLocations["sheet"]);
  // var dates = get_sheet_dates(liftLocations["sheet"]); // TODO bring this back
  var dates = get_sheet_dates(liftLocations);
  var arrayLength = dates.length;
  var firstWeekFound = false;
  for (var i = 0; i < arrayLength; i++) {
    // console.log("---------------");
    // console.log(dates[i]);  // TODO remove

    var date = new Date(dates[i]);
    console.log(date.getWeek());
    console.log(week);
    console.log(year);
    if (date.getWeek() == week && date.getFullYear() == year) {
      firstWeekFound = true;
      row.push(i + 2); // Plus 1 because sheets are 0 index and + another 1 because first row is just lift names
      // console.log("Found the same week");
      // console.log(date);
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
  var sheet = get_sheet(sheet_name);  // TODO would it be faster to pass the sheet

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
    // TODO deal with double nested?
    Logger.log("lift lift");
    Logger.log(lift);
    volume += parseFloat(lift["weight"]) * parseFloat(lift["reps"]);
    Logger.log(volume);
  }
  return volume
}

function get_volume(lift, week, year) {
  var lift_locations = get_lift_locations();
  var lifting_days = get_lifting_days_in_week(lift_locations[lift]["sheet"], week, year)
  // TODO left off here
  var lifts = get_lifts_in_row(lift_locations, lift, lifting_days);
  // TODO this is not logging the correct thing
  Logger.log(lifts);
  var volume = calculate_volume(lifts);
  return volume;
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


function get_lifts_with_regex_from_array(array) {
  const regex = /\d+-\d+/gm;
  let m;
  var lifts = []
  for (var element in array) {
    var reg_match = array[element];
    while ((m = regex.exec(reg_match)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
        var lift = match.split("-");
        lifts.push({
          "weight": lift[0],
          "reps": lift[1],
          "1rm": calculate_max(lift[0], lift[1]),

        })
      });
      //"date": get_date(sheet, col),
    }
  }
  return lifts;
}


function get_lifts_with_regex(rows, dates) {
  const regex = /\d+-\d+/gm;
  let m;
  var lifts = []

  for (var row in rows) {
    for (var col in rows[row]) {
      var str = rows[row][col];
      while ((m = regex.exec(str)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
          var lift = match.split("-");
          lifts.push({
            "weight": lift[0],
            "reps": lift[1],
            "1rm": calculate_max(lift[0], lift[1]),
            "date": dates[col],
          })
        });
      }
    }
  }
  return lifts;
}

function calculate_max(weight, reps) {
  var max_percentage = [1,1.03,1.06,1.09,1.13,1.16,1.2,1.24,1.27,1.33];
  if (reps < 1) {
    return 0;
  } else {
    return weight * max_percentage[parseInt(reps) - 1];
  }
}

function get_max_lift(lifts) {
  var max = {"1rm": 0};
  var real_max = {"1rm": 0}
  // var min = 100000; // Noone is going to lift this much
  for(var lift in lifts) {
    var curr_lift = lifts[lift];
    // Here is an example on how to compare some dates
    //Logger.log(curr_lift['date'])
    //if (+curr_lift['date']===+(new Date(2021, 3, 19, 3))) {
    //  Logger.log(curr_lift);
    //}
    if (curr_lift["1rm"] > max["1rm"]) {
      max = curr_lift;
    }

    //Logger.log(curr_lift)
    if (parseInt(curr_lift["weight"]) > parseInt(real_max["1rm"]) && parseInt(curr_lift["reps"]) != 0) {
      real_max = curr_lift;
      real_max["1rm"] = real_max["weight"];
    } else if (parseInt(curr_lift["weight"]) == parseInt(real_max["1rm"]) && parseInt(curr_lift["reps"]) > parseInt(real_max["reps"]) && parseInt(curr_lift["reps"]) != 0) {
      real_max = JSON.parse(JSON.stringify(curr_lift))
      //real_max = curr_lift;
      real_max["1rm"] = real_max["weight"];
    }
  }
  return [max, real_max];
}

// TODO get calulated prs
// TODO get non calculated prs
function get_prs() {
  var tmp_max_lifts = []; // Usd for for loop
  var max_lifts = [];
  var real_max_lifts = [];
  var lift_locations = get_lift_locations();
  var sheets = {};
  var dates_by_sheet = {};
  Logger.log(lift_locations);
  for (var key in lift_locations) {
    Logger.log("Lift is " + key);
    var sheet_name = lift_locations[key]["sheet"];
    if (!sheets[sheet_name]) {
      sheets[sheet_name] = get_sheet(sheet_name);
      dates_by_sheet[sheet_name] = get_sheet_dates_from_sheet(sheets[sheet_name]);
    }
    var sheet = sheets[sheet_name];
    var data = get_rows(sheet, lift_locations[key]);
    var lifts = get_lifts_with_regex(data, dates_by_sheet[sheet_name]);
    var tmp_max_lifts = get_max_lift(lifts);
    var max_lift = tmp_max_lifts[0];
    var real_max_lift = tmp_max_lifts[1];
    max_lift["lift"] = key;
    max_lifts.push(max_lift);
    real_max_lift["lift"] = key;

    real_max_lifts.push(real_max_lift);
    Logger.log(max_lift);
    Logger.log(real_max_lift);
    //break;
  }
  return [max_lifts, real_max_lifts];
}

function write_prs_helper(max_lifts) {
  return max_lifts.map(function(max_lift) {
    var lift_name = max_lift["lift"];
    lift_name = lift_name.charAt(0).toUpperCase() + lift_name.slice(1)
    return [
      lift_name,
      max_lift["weight"] + "-" + max_lift["reps"],
      max_lift["date"],
      max_lift["1rm"],
    ];
  });
}

function write_prs() {
  var sheet = get_sheet("prs");
  var max_lifts_arr = get_prs();
  var max_lifts = max_lifts_arr[0];
  var real_max_lifts = max_lifts_arr[1];
  var calculated_rows = write_prs_helper(max_lifts);
  var real_rows = write_prs_helper(real_max_lifts);
  var row_count = Math.max(calculated_rows.length, real_rows.length);
  if (row_count === 0) {
    return;
  }

  var output = [];
  for (var i = 0; i < row_count; i++) {
    output.push(
      (calculated_rows[i] || ["", "", "", ""])
        .concat(real_rows[i] || ["", "", "", ""])
    );
  }
  sheet.getRange(4, 5, row_count, 8).setValues(output);

}


// Date.prototype.getWeek = function () {
//   var onejan = new Date(this.getFullYear(),0,1);
//   var today = new Date(this.getFullYear(),this.getMonth(),this.getDate());
//   var dayOfYear = ((today - onejan + 86400000)/86400000);
//   return Math.ceil(dayOfYear/7)
//   /*
//   // Old way for this to work
//   var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
//   d.setUTCDate(d.getUTCDate() - d.getUTCDay());
//   var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
//   // TODO tyler added + 1
//   return 1 + Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
//   */
// }

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
            nYear = new Date(this.getFullYear() + 1,0,1);
            nday = nYear.getDay() - dowOffset;
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

//// Hellper functions from others
//// Returns the ISO week of the date.
//Date.prototype.getWeek = function() {
//  var date = new Date(this.getTime());
//  date.setHours(0, 0, 0, 0);
//  // Thursday in current week decides the year.
//  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
//  // January 4 is always in week 1.
//  var week1 = new Date(date.getFullYear(), 0, 4);
//  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
//  // TODO Tyler changed 1 + to 2 +
//  return 2 + Math.round(((date.getTime() - week1.getTime()) / 86400000
//                        - 3 + (week1.getDay() + 6) % 7) / 7);
//}

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


/** Round to nearest 5 (e.g., 243 → 245, 242 → 240). */
function roundToNearest5(x) {
  return Math.round(Number(x) / 5) * 5;
}
