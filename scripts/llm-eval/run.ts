/**
 * Runs the fixtures against Groq and/or OpenRouter using the app's real prompt, schema and client.
 *   npm run eval [-- --provider groq|openrouter] [-- --only N]
 * Keys come from .env (GROQ_API_KEY, OPENROUTER_API_KEY). Pass target: ≥ 90 % per provider.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { extractEntries } from '../../src/features/llm/extract';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_KNOWN_SOURCES,
  DEFAULT_MODELS,
  PROVIDER_IDS,
  type ParsedEntry,
  type ProviderId,
} from '../../src/features/llm/types';

interface Expected {
  type: string;
  direction: string;
  amount: number | null;
  /** Any of these is accepted (case-insensitive, singular/plural tolerant). */
  description: string[] | null;
  source: string | null;
  category: string;
  spent_at: string | null;
}
interface FixtureFile {
  now: string;
  timeZone: string;
  fixtures: { id: number; transcript: string; expected: Expected[] }[];
}

loadDotEnv(join(process.cwd(), '.env'));

const args = process.argv.slice(2);
const argValue = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const file: FixtureFile = JSON.parse(readFileSync(join(__dirname, 'fixtures.json'), 'utf8'));
const only = Number(argValue('only')) || file.fixtures.length;
const fixtures = file.fixtures.slice(0, only);
const keyEnv: Record<ProviderId, string> = {
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};
const modelEnv: Record<ProviderId, string> = { groq: 'GROQ_MODEL', openrouter: 'OPENROUTER_MODEL' };
const requested = argValue('provider') as ProviderId | undefined;
const providers = PROVIDER_IDS.filter(
  (p) => (!requested || p === requested) && process.env[keyEnv[p]],
);

async function main() {
  if (!providers.length) {
    console.error('No provider key found. Add GROQ_API_KEY / OPENROUTER_API_KEY to .env');
    process.exit(1);
  }
  for (const provider of providers) {
    const model = process.env[modelEnv[provider]] || DEFAULT_MODELS[provider];
    console.log(`\n=== ${provider} · ${model} · ${fixtures.length} fixtures ===`);
    let passed = 0;
    for (const fx of fixtures) {
      const started = Date.now();
      const { outcome } = await extractEntries({
        ctx: {
          transcript: fx.transcript,
          knownSources: DEFAULT_KNOWN_SOURCES,
          categories: DEFAULT_CATEGORIES,
          nowISO: file.now,
          timeZone: file.timeZone,
        },
        providers: [{ id: provider, apiKey: process.env[keyEnv[provider]]!, model }],
      });
      const ms = Date.now() - started;
      const problems =
        outcome.kind === 'parsed'
          ? compare(fx.expected, outcome.entries)
          : [`${outcome.kind}: ${outcome.reason}`];
      if (!problems.length) passed++;
      const mark = problems.length ? 'FAIL' : 'pass';
      console.log(
        `${mark} #${String(fx.id).padStart(2)} ${String(ms).padStart(5)}ms  ${fx.transcript}`,
      );
      problems.forEach((p) => console.log(`        - ${p}`));
    }
    const pct = Math.round((passed / fixtures.length) * 100);
    console.log(
      `\n${provider}: ${passed}/${fixtures.length} passed (${pct}%) ${pct >= 90 ? '✓' : '✗ below 90%'}`,
    );
  }
}

function compare(expected: Expected[], actual: ParsedEntry[]): string[] {
  if (expected.length !== actual.length) {
    return [`expected ${expected.length} entries, got ${actual.length}: ${JSON.stringify(actual)}`];
  }
  const problems: string[] = [];
  expected.forEach((exp, i) => {
    const got = actual[i];
    const check = (field: string, e: unknown, a: unknown) => {
      if (e !== a)
        problems.push(`[${i}] ${field}: expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`);
    };
    check('type', exp.type, got.type);
    check('direction', exp.direction, got.direction);
    check('amount', exp.amount, got.amount);
    check('source', exp.source, got.source);
    check('category', exp.category, got.category);
    check('spent_at', exp.spent_at, got.spentAt);
    const ok =
      exp.description === null
        ? got.description === null
        : exp.description.some((d) => sameWords(d, got.description));
    if (!ok)
      problems.push(
        `[${i}] description: expected one of ${JSON.stringify(exp.description)}, got ${JSON.stringify(got.description)}`,
      );
  });
  return problems;
}

/** Case-insensitive, singular/plural tolerant ("Eggs" ~ "egg", "fees" ~ "fee"). */
function sameWords(a: string, b: string | null): boolean {
  if (b === null) return false;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/(es|s)$/, ''))
      .join(' ');
  return norm(a) === norm(b);
}

function loadDotEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
