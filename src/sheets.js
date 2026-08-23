function get_sheet_dates(sheet_name) {
  var sheet = get_sheet(sheet_name);
  return get_sheet_dates_from_sheet(sheet);
}

function get_sheet_dates_from_sheet(sheet) {
  var startRow = 1;
  var startCol = 2;
  var numRows = 1;
  var numCols = sheet.getLastColumn() - startCol + 1;
  if (numCols < 1) {
    return [];
  }
  return sheet.getRange(startRow, startCol, numRows, numCols).getValues()[0];
}

/**
 * Returns the week number for a date using the spreadsheet's existing calendar
 * convention. dowOffset is the first day of the week, from 0 (Sunday) to 6.
 */
function get_week_number(date, dowOffset) {
  dowOffset = typeof dowOffset == "number" ? dowOffset : 0;
  var newYear = new Date(date.getFullYear(), 0, 1);
  var day = newYear.getDay() - dowOffset;
  day = day >= 0 ? day : day + 7;
  var daynum = Math.floor(
    (
      date.getTime() -
      newYear.getTime() -
      (date.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000
    ) / 86400000
  ) + 1;
  var weeknum;

  if (day < 4) {
    weeknum = Math.floor((daynum + day - 1) / 7) + 1;
    if (weeknum > 52) {
      var nextYear = new Date(date.getFullYear() + 1, 0, 1);
      var nextDay = nextYear.getDay() - dowOffset;
      nextDay = nextDay >= 0 ? nextDay : nextDay + 7;
      weeknum = nextDay < 4 ? 1 : 53;
    }
  } else {
    weeknum = Math.floor((daynum + day - 1) / 7);
  }
  return weeknum;
}

function get_lifting_days_in_week(sheet_name, week, year) {
  var rows = [];
  var dates = get_sheet_dates(sheet_name);
  var firstWeekFound = false;

  for (var i = 0; i < dates.length; i++) {
    var date = new Date(dates[i]);
    if (get_week_number(date) == week && date.getFullYear() == year) {
      firstWeekFound = true;
      // Sheet columns are one-indexed and column A contains lift names.
      rows.push(i + 2);
    } else if (firstWeekFound) {
      break;
    }
  }
  return rows;
}

function get_lifts_in_row(lift_locations, lift, lifting_days) {
  var sheet_name = lift_locations[lift]["sheet"];
  var sheet = get_sheet(sheet_name);
  var lifts = [];

  for (var i = 0; i < lifting_days.length; i++) {
    var startRow = lift_locations[lift]["startRow"];
    var startCol = lifting_days[i];
    var numRows = lift_locations[lift]["endRow"] - startRow + 1;
    var data = sheet.getRange(startRow, startCol, numRows, 1).getValues();
    lifts.push(...get_lifts_with_regex_from_array(data));
  }
  return lifts;
}

function get_lift_locations() {
  return {
    "bench": {
      "sheet": "chest",
      "startRow": "3",
      "endRow": "7",
      "name": "bench",
    },
    "incline": {
      "sheet": "chest",
      "startRow": "8",
      "endRow": "10",
      "name": "incline",
    },
    "decline": {
      "sheet": "chest",
      "startRow": "11",
      "endRow": "13",
      "name": "decline",
    },
    "squat": {
      "sheet": "legs",
      "startRow": "3",
      "endRow": "7",
      "name": "squat",
    },
    "frontSquat": {
      "sheet": "legs",
      "startRow": "8",
      "endRow": "10",
      "name": "front squat",
    },
    "deadlift": {
      "sheet": "arms",
      "startRow": "3",
      "endRow": "7",
      "name": "deadlift",
    },
    "hangClean": {
      "sheet": "arms",
      "startRow": "8",
      "endRow": "10",
      "name": "hang clean",
    },
    "chinups": {
      "sheet": "arms",
      "startRow": "23",
      "endRow": "25",
      "name": "chinups",
    },
    "shoulderPress": {
      "sheet": "chest",
      "startRow": "57",
      "endRow": "59",
      "name": "shoulder press",
    },
  };
}

function get_sheet(sheet_name) {
  var spreadsheet = SpreadsheetApp.getActive();
  var all_sheets = spreadsheet.getSheets();
  var normalized_name = sheet_name.toLowerCase();

  for (var i = 0; i < all_sheets.length; i++) {
    if (all_sheets[i].getName().toLowerCase() == normalized_name) {
      return all_sheets[i];
    }
  }
  throw new Error("Unable to find sheet: " + sheet_name);
}

function get_rows(sheet, lift_dict) {
  var startRow = lift_dict["startRow"];
  var startCol = 2;
  var numRows = lift_dict["endRow"] - startRow + 1;
  var numCols = sheet.getLastColumn() - startCol + 1;
  if (numCols < 1) {
    return [];
  }
  return sheet.getRange(startRow, startCol, numRows, numCols).getValues();
}

function get_date(sheet, col) {
  var column = parseInt(col) + 2;
  return sheet.getRange(1, column, 1, 1).getCell(1, 1).getValue();
}
