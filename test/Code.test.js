import { beforeEach, describe, expect, it } from 'vitest';
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

describe('write_prs', () => {
  it('writes calculated and real PRs in one batch', () => {
    const writes = [];
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

    app.write_prs();

    expect(writes).toEqual([{
      range: [4, 5, 2, 8],
      values: [
        ['Bench', '225-5', '01/01/2026', 254.25, 'Bench', '245-1', '01/03/2026', '245'],
        ['Squat', '315-3', '01/02/2026', 333.9, 'Squat', '335-1', '01/04/2026', '335'],
      ],
    }]);
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
});
