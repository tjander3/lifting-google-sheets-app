import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';

const sources = [
  readFileSync(new URL('../src/Code.js', import.meta.url), 'utf8'),
  readFileSync(new URL('../src/macros.js', import.meta.url), 'utf8'),
];

export function loadAppsScript(overrides = {}) {
  const context = createContext({
    Logger: { log() {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => null,
        setProperty() {},
      }),
    },
    SpreadsheetApp: {},
    Session: { getScriptTimeZone: () => 'America/New_York' },
    Utilities: { formatDate: () => '08/22/2026' },
    console,
    ...overrides,
  });

  for (const [index, source] of sources.entries()) {
    const filename = index === 0 ? 'src/Code.js' : 'src/macros.js';
    new Script(source, { filename }).runInContext(context);
  }
  return context;
}
