// One OpenAI-compatible Chat Completions client for both Groq and OpenRouter.
import type { ChatMessage } from './prompt';
import type { ProviderId } from './types';

const ENDPOINTS: Record<ProviderId, string> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};

/** transient → retry later; fatal → needs the user (bad key/model); invalid_json → model output unusable. */
export type LlmErrorKind = 'transient' | 'fatal' | 'invalid_json';

export class LlmCallError extends Error {
  constructor(
    public kind: LlmErrorKind,
    message: string,
    /** Model output when the provider returned some (e.g. Groq json_validate_failed). */
    public rawText: string | null = null,
  ) {
    super(message);
  }
}

export interface ChatRequest {
  provider: ProviderId;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export async function callChat(req: ChatRequest): Promise<{ rawText: string; model: string }> {
  const { provider, apiKey, model, messages, timeoutMs = 10_000, fetchImpl = fetch } = req;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0,
    // Reasoning models spend tokens before answering; 1000 leaves room for multi-entry output.
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  };
  if (model.includes('gpt-oss')) {
    if (provider === 'groq') body.reasoning_effort = 'low';
    else body.reasoning = { effort: 'low', exclude: true };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider === 'openrouter') headers['X-Title'] = 'Voice Expense';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(ENDPOINTS[provider], {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new LlmCallError('transient', controller.signal.aborted ? 'timeout' : 'no internet');
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text().catch(() => '');
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON error page; handled by status below
  }

  // OpenRouter can report upstream errors with HTTP 200 and an `error` object.
  const status = res.ok && json?.error ? Number(json.error.code) || 502 : res.status;
  if (status >= 200 && status < 300) {
    const content: unknown = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim())
      throw new LlmCallError('invalid_json', 'empty response');
    return { rawText: content, model: json?.model ?? model };
  }

  const detail = String(json?.error?.message ?? text).slice(0, 160);
  if (
    status === 400 &&
    (json?.error?.code === 'json_validate_failed' || detail.includes('json_validate_failed'))
  ) {
    // Groq JSON mode rejected the model's output; keep what it generated.
    throw new LlmCallError('invalid_json', 'invalid JSON', json?.error?.failed_generation ?? null);
  }
  if (status === 401 || status === 403)
    throw new LlmCallError('fatal', `invalid API key (HTTP ${status})`);
  if (status === 429 || status === 408 || status >= 500)
    throw new LlmCallError('transient', `HTTP ${status}`);
  // 400/404 here almost always means a wrong model id.
  throw new LlmCallError('fatal', `HTTP ${status}: ${detail}`);
}
