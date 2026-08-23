import { readdirSync, readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';

const sourceDirectory = new URL('../src/', import.meta.url);
const sources = readdirSync(sourceDirectory)
  .filter(filename => filename.endsWith('.js'))
  .sort()
  .map(filename => ({
    filename: `src/${filename}`,
    contents: readFileSync(new URL(filename, sourceDirectory), 'utf8'),
  }));

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

  for (const source of sources) {
    new Script(source.contents, { filename: source.filename }).runInContext(context);
  }
  return context;
}

export function evaluateAppsScript(source, context) {
  return new Script(source).runInContext(context);
}
