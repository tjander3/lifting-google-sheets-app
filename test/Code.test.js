import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAppsScript } from './loadAppsScript.js';

let app;

beforeEach(() => {
  app = loadAppsScript();
});

describe('calculate_max', () => {
  it('returns the entered weight for a one-rep set', () => {
    expect(app.calculate_max(225, 1)).toBe(225);
  });

  it('uses the configured percentage for multi-rep sets', () => {
    expect(app.calculate_max(225, 5)).toBeCloseTo(254.25);
    expect(app.calculate_max(225, 10)).toBeCloseTo(299.25);
  });

  it('returns zero when no reps were completed', () => {
    expect(app.calculate_max(225, 0)).toBe(0);
  });

  it('caps high-rep estimates at the configured ten-rep multiplier', () => {
    expect(app.calculate_max(100, 15)).toBeCloseTo(133);
  });
});

describe('lift parsing and volume', () => {
  it('extracts every weight-rep pair from spreadsheet text', () => {
    const lifts = app.get_lifts_with_regex_from_array([
      '225-5 185-10',
      'warmup 135-8',
      '',
    ]);

    expect(JSON.parse(JSON.stringify(lifts))).toEqual([
      { weight: '225', reps: '5', '1rm': 254.24999999999997 },
      { weight: '185', reps: '10', '1rm': 246.05 },
      { weight: '135', reps: '8', '1rm': 167.4 },
    ]);
  });

  it('calculates total training volume from parsed values', () => {
    expect(app.calculate_volume([
      { weight: '225', reps: '5' },
      { weight: '185', reps: '10' },
    ])).toBe(2975);
  });

  it('tolerates a colon typo for a three-digit barbell weight', () => {
    const lifts = app.get_lifts_with_regex_from_array(['415:1', 'at 8:30']);

    expect(JSON.parse(JSON.stringify(lifts))).toEqual([
      { weight: '415', reps: '1', '1rm': 415 },
    ]);
  });

  it('parses dumbbell pairs and counts both dumbbells in volume', () => {
    const lifts = app.get_lifts_with_regex_from_array(['65s-10']);

    expect(JSON.parse(JSON.stringify(lifts))).toEqual([{
      weight: '65',
      reps: '10',
      '1rm': 86.45,
      dumbbellPair: true,
      volumeMultiplier: 2,
    }]);
    expect(app.calculate_volume(lifts)).toBe(1300);
  });

  it('records bodyweight reps without inventing a load', () => {
    const lifts = app.get_lifts_with_regex_from_array(['bw-5']);

    expect(JSON.parse(JSON.stringify(lifts))).toEqual([{
      weight: '0', reps: '5', '1rm': 0, bodyweight: true,
    }]);
    expect(app.calculate_volume(lifts)).toBe(0);
  });

  it('ignores incomplete plans, fractional reps, and date fragments', () => {
    expect(app.get_lifts_with_regex_from_array([
      '245-', '425-.25', '2026-08-22', '320- 320- 320-',
    ])).toEqual([]);
  });

  it('returns zero for an empty workout', () => {
    expect(app.calculate_volume([])).toBe(0);
  });

  it('uses preloaded header dates while parsing spreadsheet rows', () => {
    const lifts = app.get_lifts_with_regex(
      [
        ['225-5', ''],
        ['', '185-10'],
      ],
      ['01/01/2026', '01/02/2026'],
    );

    expect(JSON.parse(JSON.stringify(lifts))).toEqual([
      { weight: '225', reps: '5', '1rm': 254.24999999999997, date: '01/01/2026' },
      { weight: '185', reps: '10', '1rm': 246.05, date: '01/02/2026' },
    ]);
  });
});

describe('get_max_lift', () => {
  it('does not overwrite the calculated max while selecting the real max', () => {
    const [calculated, real] = app.get_max_lift([
      { weight: '60', reps: '2', '1rm': 61.8, date: '01/01/2026' },
      { weight: '55', reps: '10', '1rm': 73.15, date: '01/02/2026' },
    ]);

    expect(JSON.parse(JSON.stringify(calculated))).toEqual({
      weight: '55', reps: '10', '1rm': 73.15, date: '01/02/2026',
    });
    expect(JSON.parse(JSON.stringify(real))).toEqual({
      weight: '60', reps: '2', '1rm': '60', date: '01/01/2026',
    });
  });
});

describe('write_prs', () => {
  it('writes calculated and real PRs in one batch', () => {
    const writes = [];
    const statuses = [];
    app.get_sheet = () => ({
      getRange: (...range) => ({
        setValues: (values) => writes.push({ range, values }),
      }),
    });
    app.get_prs = () => [[
      { lift: 'bench', weight: '225', reps: '5', date: '01/01/2026', '1rm': 254.25 },
      { lift: 'squat', weight: '315', reps: '3', date: '01/02/2026', '1rm': 333.9 },
    ], [
      { lift: 'bench', weight: '245', reps: '1', date: '01/03/2026', '1rm': '245' },
      { lift: 'squat', weight: '335', reps: '1', date: '01/04/2026', '1rm': '335' },
    ]];
    app.record_automation_run = (...args) => statuses.push(args);

    const result = app.write_prs();

    expect(writes).toEqual([{
      range: [4, 5, 2, 8],
      values: [
        ['Bench', '225-5', '01/01/2026', 254.25, 'Bench', '245-1', '01/03/2026', '245'],
        ['Squat', '315-3', '01/02/2026', 333.9, 'Squat', '335-1', '01/04/2026', '335'],
      ],
    }]);
    expect(result).toEqual({ rowsWritten: 2 });
    expect(statuses).toHaveLength(1);
    expect(statuses[0][0]).toBe('write_prs');
    expect(statuses[0][1]).toBe('success');
    expect(statuses[0][3]).toEqual({ rowsWritten: 2 });
  });

  it('records a failed run and rethrows the original error', () => {
    const statuses = [];
    app.get_sheet = () => { throw new Error('missing prs sheet'); };
    app.record_automation_run = (...args) => statuses.push(args);

    expect(() => app.write_prs()).toThrow('missing prs sheet');
    expect(statuses).toHaveLength(1);
    expect(statuses[0][1]).toBe('failure');
    expect(statuses[0][3].error).toContain('missing prs sheet');
  });
});

describe('automation status and triggers', () => {
  it('persists the most recent automation status', () => {
    const values = new Map();
    app = loadAppsScript({
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key) => values.get(key) ?? null,
          setProperty: (key, value) => values.set(key, value),
        }),
      },
    });

    app.record_automation_run('write_prs', 'success', Date.now(), { rowsWritten: 9 });
    const status = app.get_automation_status('write_prs');

    expect(JSON.parse(JSON.stringify(status))).toMatchObject({
      job: 'write_prs', status: 'success', details: { rowsWritten: 9 },
    });
  });

  it('keeps one existing write_prs trigger without creating a duplicate', () => {
    const newTrigger = vi.fn();
    app = loadAppsScript({
      ScriptApp: {
        getProjectTriggers: () => [{ getHandlerFunction: () => 'write_prs' }],
        deleteTrigger: vi.fn(),
        newTrigger,
      },
    });

    expect(app.setupTriggers()).toEqual({
      handler: 'write_prs', created: false, removedDuplicates: 0,
    });
    expect(newTrigger).not.toHaveBeenCalled();
  });

  it('replaces duplicate write_prs triggers with one configured trigger', () => {
    const deleted = [];
    const created = [];
    const builder = {
      timeBased() { return this; },
      atHour(value) { created.push(['hour', value]); return this; },
      nearMinute(value) { created.push(['minute', value]); return this; },
      everyDays(value) { created.push(['days', value]); return this; },
      inTimezone(value) { created.push(['timezone', value]); return this; },
      create() { created.push(['create']); return {}; },
    };
    const triggers = [
      { id: 1, getHandlerFunction: () => 'write_prs' },
      { id: 2, getHandlerFunction: () => 'write_prs' },
      { id: 3, getHandlerFunction: () => 'other_job' },
    ];
    app = loadAppsScript({
      ScriptApp: {
        getProjectTriggers: () => triggers,
        deleteTrigger: (trigger) => deleted.push(trigger.id),
        newTrigger: (handler) => {
          created.push(['handler', handler]);
          return builder;
        },
      },
    });

    const result = app.setupTriggers();

    expect(JSON.parse(JSON.stringify(result))).toMatchObject({
      handler: 'write_prs', created: true, removedDuplicates: 2,
    });
    expect(deleted).toEqual([1, 2]);
    expect(created).toEqual([
      ['handler', 'write_prs'], ['hour', 0], ['minute', 5], ['days', 1],
      ['timezone', 'America/New_York'], ['create'],
    ]);
  });
});

describe('roundToNearest5', () => {
  it.each([
    [242, 240],
    [243, 245],
    ['247', 245],
    [248, 250],
  ])('rounds %s to %s', (input, expected) => {
    expect(app.roundToNearest5(input)).toBe(expected);
  });
});

describe('FIVE_THREE_ONE_SSL', () => {
  it('builds a three-set deload with no supplemental work', () => {
    const result = app.FIVE_THREE_ONE_SSL(200, 60);

    expect(JSON.parse(JSON.stringify(result))).toEqual([
      ['08/22/2026'],
      ['200 (40,50,60)'],
      ['80-'],
      ['100-'],
      ['120-'],
    ]);
  });

  it('builds the standard five-row supplemental layout', () => {
    const result = app.FIVE_THREE_ONE_SSL(200, 85);

    expect(JSON.parse(JSON.stringify(result))).toEqual([
      ['08/22/2026'],
      ['200 (65,75,85)'],
      ['130-'],
      ['150-'],
      ['170-'],
      ['150- 150- 150-'],
      ['150- 150-'],
    ]);
  });

  it('builds the special 105-percent layout', () => {
    const result = app.FIVE_THREE_ONE_SSL(200, 105);

    expect(JSON.parse(JSON.stringify(result))).toEqual([
      ['08/22/2026'],
      ['200 (75,85,95,100,105)'],
      ['150- 170-'],
      ['190-'],
      ['200-'],
      ['210-'],
      ['170- 170- 170-'],
    ]);
  });

  it('rejects unsupported percentages', () => {
    expect(() => app.FIVE_THREE_ONE_SSL(200, 100)).toThrow(
      'Allowed values: 60, 85, 90, 95, 105',
    );
  });

  it('rejects a non-numeric training max', () => {
    expect(() => app.FIVE_THREE_ONE_SSL('not a number', 85)).toThrow(
      'Invalid training_max',
    );
  });

  it.each([
    ['bench', 377.5],
    ['squat', 445],
    ['deadlift', 545],
    ['press', 205],
  ])('generates every week of a complete %s cycle', (_lift, trainingMax) => {
    const cycle = [85, 90, 95, 105, 60]
      .map((percentage) => app.FIVE_THREE_ONE_SSL(trainingMax, percentage));

    expect(cycle.map((week) => week[1][0])).toEqual([
      `${trainingMax} (65,75,85)`,
      `${trainingMax} (70,80,90)`,
      `${trainingMax} (75,85,95)`,
      `${trainingMax} (75,85,95,100,105)`,
      `${trainingMax} (40,50,60)`,
    ]);
    expect(cycle.at(-1)).toHaveLength(5);
  });

  it('uses an increased training max on the next cycle without changing rounding', () => {
    expect(app.FIVE_THREE_ONE_SSL(205, 85).slice(1)).toEqual([
      ['205 (65,75,85)'],
      ['135-'],
      ['155-'],
      ['175-'],
      ['155- 155- 155-'],
      ['155- 155-'],
    ]);
  });
});

describe('Startnewweek spreadsheet contract', () => {
  it('inserts the new column, autofills the header, and shifts the history', () => {
    const calls = [];
    let activeRange;
    const makeRange = (address) => ({
      address,
      activate() { activeRange = this; calls.push(['activate', address]); return this; },
      activateAsCurrentCell() { activeRange = this; return this; },
      getColumn: () => 2,
      getNumRows: () => 100,
      offset() { return makeRange(`${address}:offset`); },
      autoFill(destination, type) { calls.push(['autoFill', address, destination.address, type]); },
      copyTo(destination, type) { calls.push(['copyTo', address, destination.address, type]); },
      moveTo(destination) { calls.push(['moveTo', address, destination.address]); },
    });
    const spreadsheet = {
      getRange(address) { return makeRange(address); },
      getActiveRange() { return activeRange; },
      getActiveSheet() {
        return {
          insertColumnsBefore(column, count) {
            calls.push(['insertColumnsBefore', column, count]);
          },
        };
      },
      getCurrentCell() { return activeRange; },
      getSelection() {
        return {
          getNextDataRange(direction) {
            calls.push(['getNextDataRange', direction]);
            return makeRange('nextDataRange');
          },
        };
      },
    };
    app = loadAppsScript({
      SpreadsheetApp: {
        getActive: () => spreadsheet,
        AutoFillSeries: { DEFAULT_SERIES: 'DEFAULT_SERIES' },
        CopyPasteType: { PASTE_NORMAL: 'PASTE_NORMAL', PASTE_VALUES: 'PASTE_VALUES' },
        Direction: { DOWN: 'DOWN', NEXT: 'NEXT', PREVIOUS: 'PREVIOUS' },
      },
    });

    app.Startnewweek();

    expect(calls).toContainEqual(['insertColumnsBefore', 2, 1]);
    expect(calls).toContainEqual(['autoFill', 'C1:D2', 'B1:D2', 'DEFAULT_SERIES']);
    expect(calls).toContainEqual(['moveTo', 'C12:R29', 'B12:Q29']);
  });
});
