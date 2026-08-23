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
    const allowedList = Array.from(allowed).sort((a, b) => a - b).join(", ");
    throw new Error(
      `Invalid last_percentage "${last_percentage}". Allowed values: ${allowedList}.`
    );
  }

  const headerSeq = p === 60
    ? [40, 50, 60]
    : p === 105
      ? [75, 85, 95, 100, 105]
      : [p - 20, p - 10, p];

  const workSeq = p === 60
    ? [40, 50, 60]
    : p === 105
      ? [75, 85, 95, 100, 105, 85, 85, 85]
      : [p - 20, p - 10, p, p - 10, p - 10, p - 10, p - 10, p - 10];

  const weights = workSeq.map(percentage => (
    roundToNearest5(tm * (percentage / 100))
  ));
  const withDash = weight => `${weight}-`;
  const joinWithDashes = values => values.map(withDash).join(" ");
  const timeZone = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), timeZone, "MM/dd/yyyy");
  const header = `${tm} (${headerSeq.join(",")})`;

  let rows;
  if (p === 60) {
    rows = weights.map(withDash);
  } else if (p === 105) {
    rows = [
      joinWithDashes([weights[0], weights[1]]),
      joinWithDashes([weights[2]]),
      joinWithDashes([weights[3]]),
      joinWithDashes([weights[4]]),
      joinWithDashes([weights[5], weights[6], weights[7]]),
    ];
  } else {
    rows = [
      joinWithDashes([weights[0]]),
      joinWithDashes([weights[1]]),
      joinWithDashes([weights[2]]),
      joinWithDashes([weights[3], weights[4], weights[5]]),
      joinWithDashes([weights[6], weights[7]]),
    ];
  }

  return [[today], [header], ...rows.map(row => [row])];
}

/** Round to nearest 5 (e.g., 243 -> 245, 242 -> 240). */
function roundToNearest5(value) {
  return Math.round(Number(value) / 5) * 5;
}
