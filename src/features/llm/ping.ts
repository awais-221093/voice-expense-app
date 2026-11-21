// Shared with the eval script: no React Native imports, relative imports only.
import { LlmCallError, callChat, type LlmErrorKind } from './providers';
import type { ProviderId } from './types';

export type PingResult =
  { ok: true; model: string } | { ok: false; kind: LlmErrorKind; message: string };

/** One tiny request that proves the key and model work, before a real note depends on them. */
export async function pingProvider(
  provider: ProviderId,
  apiKey: string,
  model: string,
  fetchImpl?: typeof fetch,
): Promise<PingResult> {
  try {
    const res = await callChat({
      provider,
      apiKey,
      model,
      // JSON mode needs the word "JSON" in the prompt on some providers.
      messages: [
        { role: 'system', content: 'Reply with JSON only.' },
        { role: 'user', content: 'Return {"ok":true}' },
      ],
      fetchImpl,
    });
    return { ok: true, model: res.model };
  } catch (e) {
    const err = e instanceof LlmCallError ? e : new LlmCallError('transient', String(e));
    // An unreadable reply still means the key was accepted and the model answered.
    if (err.kind === 'invalid_json') return { ok: true, model };
    return { ok: false, kind: err.kind, message: err.message };
  }
}
