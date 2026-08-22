import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';

const source = readFileSync(new URL('../src/Code.js', import.meta.url), 'utf8');

export function loadAppsScript(overrides = {}) {
  const context = createContext({
    Logger: { log() {} },
    SpreadsheetApp: {},
    Session: { getScriptTimeZone: () => 'America/New_York' },
    Utilities: { formatDate: () => '08/22/2026' },
    console,
    ...overrides,
  });

  new Script(source, { filename: 'src/Code.js' }).runInContext(context);
  return context;
}
