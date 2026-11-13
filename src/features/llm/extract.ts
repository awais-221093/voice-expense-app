import { buildMessages } from './prompt';
import { LlmCallError, callChat } from './providers';
import { parseLlmResponse } from './schema';
import type {
  AttemptRecord,
  ExtractionContext,
  ExtractionOutcome,
  ExtractionResult,
  ProviderId,
} from './types';

export interface ProviderConfig {
  id: ProviderId;
  apiKey: string | null;
  model: string;
}

export interface ExtractOptions {
  ctx: ExtractionContext;
  /** Primary first; include the fallback only when the setting is on. */
  providers: ProviderConfig[];
  fetchImpl?: typeof fetch;
}

const TRANSIENT_RETRY_DELAY_MS = 800;

/**
 * Runs the extraction and returns every attempt (for the append-only `llmAttempts` log)
 * plus one outcome. Policy (plan §3.2, §4):
 *  - invalid JSON: retry the same provider once, then give up (no fallback; the model works, the note is odd)
 *  - transient (offline/timeout/5xx/429): retry once, then try the fallback provider
 *  - fatal (bad key/model, missing key): go straight to the fallback provider
 */
export async function extractEntries({
  ctx,
  providers,
  fetchImpl,
}: ExtractOptions): Promise<ExtractionResult> {
  const attempts: AttemptRecord[] = [];
  const failures: { kind: 'transient' | 'fatal'; reason: string }[] = [];
  const messages = buildMessages(ctx);
  const todayISODate = ctx.nowISO.slice(0, 10);

  for (const p of providers) {
    if (!p.apiKey) {
      failures.push({ kind: 'fatal', reason: `no ${p.id} API key` });
      continue;
    }
    let invalid = 0;
    let transientRetried = false;

    while (true) {
      const at = new Date().toISOString();
      try {
        const { rawText, model } = await callChat({
          provider: p.id,
          apiKey: p.apiKey,
          model: p.model,
          messages,
          fetchImpl,
        });
        const parsed = parseLlmResponse(rawText, { categories: ctx.categories, todayISODate });
        attempts.push({
          at,
          provider: p.id,
          model,
          rawText,
          error: parsed.ok ? null : parsed.reason,
        });
        if (parsed.ok)
          return {
            attempts,
            outcome: { kind: 'parsed', entries: parsed.entries, notes: parsed.notes },
          };
        if (++invalid >= 2)
          return { attempts, outcome: { kind: 'invalid_json', reason: 'invalid JSON' } };
      } catch (e) {
        const err = e instanceof LlmCallError ? e : new LlmCallError('transient', String(e));
        attempts.push({
          at,
          provider: p.id,
          model: p.model,
          rawText: err.rawText,
          error: err.message,
        });
        if (err.kind === 'invalid_json') {
          if (++invalid >= 2)
            return { attempts, outcome: { kind: 'invalid_json', reason: 'invalid JSON' } };
        } else if (err.kind === 'transient' && !transientRetried) {
          transientRetried = true;
          await sleep(TRANSIENT_RETRY_DELAY_MS);
        } else {
          failures.push({ kind: err.kind, reason: `${p.id}: ${err.message}` });
          break;
        }
      }
    }
  }

  return { attempts, outcome: combineFailures(failures) };
}

/** Any transient failure means "try again later"; only all-fatal means the user must act. */
function combineFailures(
  failures: { kind: 'transient' | 'fatal'; reason: string }[],
): ExtractionOutcome {
  const reason = failures.map((f) => f.reason).join('; ') || 'no provider configured';
  return failures.some((f) => f.kind === 'transient')
    ? { kind: 'transient', reason }
    : { kind: 'fatal', reason };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
