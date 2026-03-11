import type {
  AgentAction,
  AgentConfig,
  AgentEvent,
  AgentEventBase,
  EventMetadataValue
} from '@shared/types';

/**
 * Raw transcript event shape before normalization.
 */
interface RawTranscriptEvent {
  action?: unknown;
  kind?: unknown;
  role?: unknown;
  ts?: unknown;
  timestamp?: unknown;
  time?: unknown;
  agentId?: unknown;
  agentName?: unknown;
  message?: unknown;
  metadata?: unknown;
  path?: unknown;
  bytesWritten?: unknown;
  suite?: unknown;
  passed?: unknown;
  failed?: unknown;
  command?: unknown;
  exitCode?: unknown;
  reason?: unknown;
  prompt?: unknown;
  errorMessage?: unknown;
  taskId?: unknown;
  environment?: unknown;
}

/**
 * Normalizes action strings into canonical action identifiers.
 *
 * @param actionRaw Incoming action text from transcript line.
 * @returns Canonical action when recognized, otherwise null.
 */
export function normalizeAction(actionRaw: unknown): AgentAction | null {
  if (typeof actionRaw !== 'string') {
    return null;
  }

  const normalized = actionRaw.trim().toLowerCase();
  const mapping: Record<string, AgentAction> = {
    read: 'read',
    reading: 'read',
    write: 'write',
    writing: 'write',
    test_run: 'test_run',
    testrun: 'test_run',
    testpass: 'test_pass',
    test_pass: 'test_pass',
    pass: 'test_pass',
    testfail: 'test_fail',
    test_fail: 'test_fail',
    fail: 'test_fail',
    terminal: 'terminal',
    bash: 'terminal',
    idle: 'idle',
    waiting: 'idle',
    error: 'error',
    crash: 'error',
    complete: 'complete',
    completed: 'complete',
    deploy: 'deploy',
    deployment: 'deploy',
    input_request: 'input_request',
    needs_input: 'input_request',
    ask_input: 'input_request',
    blocked: 'input_request'
  };

  return mapping[normalized] ?? null;
}

/**
 * Parses a timestamp from JSONL into epoch milliseconds.
 *
 * @param tsRaw Raw timestamp field value.
 * @returns Epoch milliseconds when parseable, otherwise null.
 */
export function parseTimestamp(tsRaw: unknown): number | null {
  if (typeof tsRaw === 'number' && Number.isFinite(tsRaw)) {
    if (tsRaw > 10_000_000_000) {
      return Math.trunc(tsRaw);
    }

    return Math.trunc(tsRaw * 1000);
  }

  if (typeof tsRaw === 'string') {
    const maybeNumber = Number(tsRaw);
    if (Number.isFinite(maybeNumber)) {
      return parseTimestamp(maybeNumber);
    }

    const parsedDate = Date.parse(tsRaw);
    if (!Number.isNaN(parsedDate)) {
      return parsedDate;
    }
  }

  return null;
}

/**
 * Parses and normalizes one JSONL transcript line into an AgentEvent.
 *
 * @param line Raw line to parse.
 * @param fallbackAgent Optional fallback agent identity for missing fields.
 * @returns Normalized event or null for malformed/unsupported input.
 */
export function parseAgentEventLine(
  line: string,
  fallbackAgent?: Pick<AgentConfig, 'id' | 'name'>
): AgentEvent | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (!isRawTranscriptEvent(parsed)) {
    return null;
  }

  const action = normalizeAction(parsed.action ?? parsed.kind) ?? inferTranscriptAction(parsed);
  if (action === null) {
    return null;
  }

  const ts = parseTimestamp(parsed.ts ?? parsed.timestamp ?? parsed.time) ?? Date.now();
  const parsedAgentId = typeof parsed.agentId === 'string' ? parsed.agentId.trim() : '';
  const fallbackAgentId = fallbackAgent?.id ?? '';
  const agentId = parsedAgentId.length > 0 ? parsedAgentId : fallbackAgentId;
  if (agentId.length === 0) {
    return null;
  }

  const base: AgentEventBase = { kind: action, ts, agentId };
  const parsedAgentName = typeof parsed.agentName === 'string' ? parsed.agentName.trim() : '';
  const agentName = parsedAgentName.length > 0 ? parsedAgentName : fallbackAgent?.name;
  const metadata = sanitizeMetadata(parsed.metadata);
  const transcriptText = extractTranscriptText(parsed.message);
  const inferredPath = extractPathLikeFromText(transcriptText);
  const inferredCommand = extractCommandLikeFromText(transcriptText);

  if (agentName !== undefined) {
    base.agentName = agentName;
  }

  if (metadata !== undefined) {
    base.metadata = metadata;
  }

  switch (action) {
    case 'read':
      return {
        ...base,
        kind: 'read',
        ...withOptional('path', asOptionalString(parsed.path) ?? inferredPath)
      };
    case 'write':
      return {
        ...base,
        kind: 'write',
        ...withOptional('path', asOptionalString(parsed.path) ?? inferredPath),
        ...withOptional('bytesWritten', asOptionalFiniteNumber(parsed.bytesWritten))
      };
    case 'test_run':
      return {
        ...base,
        kind: 'test_run',
        ...withOptional('suite', asOptionalString(parsed.suite))
      };
    case 'test_pass':
      return {
        ...base,
        kind: 'test_pass',
        ...withOptional('passed', asOptionalFiniteNumber(parsed.passed))
      };
    case 'test_fail':
      return {
        ...base,
        kind: 'test_fail',
        ...withOptional('failed', asOptionalFiniteNumber(parsed.failed))
      };
    case 'terminal':
      return {
        ...base,
        kind: 'terminal',
        ...withOptional('command', asOptionalString(parsed.command) ?? inferredCommand),
        ...withOptional('exitCode', asOptionalFiniteNumber(parsed.exitCode))
      };
    case 'idle':
      return {
        ...base,
        kind: 'idle',
        ...withOptional('reason', asOptionalString(parsed.reason))
      };
    case 'input_request':
      return {
        ...base,
        kind: 'input_request',
        ...withOptional(
          'prompt',
          asOptionalString(parsed.prompt ?? parsed.message ?? parsed.reason) ?? transcriptText
        )
      };
    case 'error':
      return {
        ...base,
        kind: 'error',
        ...withOptional('errorMessage', asOptionalString(parsed.errorMessage))
      };
    case 'complete':
      return {
        ...base,
        kind: 'complete',
        ...withOptional('taskId', asOptionalString(parsed.taskId))
      };
    case 'deploy':
      return {
        ...base,
        kind: 'deploy',
        ...withOptional('environment', asOptionalString(parsed.environment))
      };
    default:
      return null;
  }
}

/**
 * Checks if incoming JSON value is an object-like transcript payload.
 *
 * @param value Parsed JSON value.
 * @returns True when value can be processed as transcript event object.
 */
export function isRawTranscriptEvent(value: unknown): value is RawTranscriptEvent {
  return typeof value === 'object' && value !== null;
}

function inferTranscriptAction(event: RawTranscriptEvent): AgentAction | null {
  const role = asOptionalString(event.role)?.toLowerCase();
  if (role === undefined) {
    return null;
  }

  if (role === 'user') {
    return 'idle';
  }

  if (role !== 'assistant') {
    return null;
  }

  const toolNames = extractToolNamesFromMessage(event.message);
  if (toolNames.some((name) => isInputRequestToolName(name))) {
    return 'input_request';
  }

  const text = extractTranscriptText(event.message);
  if (text === undefined) {
    return null;
  }

  const normalized = text.toLowerCase();

  if (looksLikeInputRequest(normalized)) {
    return 'input_request';
  }

  if (looksLikeTestFailure(normalized)) {
    return 'test_fail';
  }

  if (looksLikeTestPass(normalized)) {
    return 'test_pass';
  }

  if (looksLikeTestRun(normalized)) {
    return 'test_run';
  }

  if (looksLikeTerminalCommand(normalized)) {
    return 'terminal';
  }

  if (looksLikeWrite(normalized)) {
    return 'write';
  }

  if (looksLikeRead(normalized)) {
    return 'read';
  }

  if (looksLikeCompletion(normalized)) {
    return 'complete';
  }

  return 'idle';
}

function extractTranscriptText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return asOptionalString(value);
  }

  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as {
    content?: unknown;
    text?: unknown;
  };

  const directText = asOptionalString(record.text);
  if (directText !== undefined) {
    return directText;
  }

  if (typeof record.content === 'string') {
    return asOptionalString(record.content);
  }

  if (!Array.isArray(record.content)) {
    return undefined;
  }

  const parts = record.content.flatMap((item): string[] => {
    if (typeof item === 'string') {
      const value = asOptionalString(item);
      return value === undefined ? [] : [value];
    }

    if (typeof item !== 'object' || item === null) {
      return [];
    }

    const text = asOptionalString((item as { text?: unknown }).text);
    return text === undefined ? [] : [text];
  });

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join('\n');
}

function looksLikeInputRequest(text: string): boolean {
  if (
    /\b(need|needs)\s+(user|your)\s+(input|approval|confirmation)\b/.test(text) ||
    /\b(need|needs)\s+you\s+to\s+(confirm|choose|approve|decide)\b/.test(text) ||
    /\b(please|kindly)\s+(provide|confirm|choose|share)\b/.test(text) ||
    /\b(do you want me to|which option should|what should i|can you confirm)\b/.test(text) ||
    /\b(request(?:ing)?|await(?:ing)?)\s+(?:your\s+)?(input|approval|confirmation|response)\b/.test(
      text
    ) ||
    /\bbefore\s+i\s+proceed\b/.test(text) ||
    /\blet\s+me\s+know\s+(which|if|whether)\b/.test(text) ||
    /\b(choose|select)\s+(one|an|a)?\s*option\b/.test(text)
  ) {
    return true;
  }

  return (
    text.includes('?') &&
    /\b(can you|could you|would you|should i|may i|approve|confirm)\b/.test(text)
  );
}

function extractToolNamesFromMessage(value: unknown): string[] {
  const names: string[] = [];
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];

  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined || next.depth > 8) {
      continue;
    }

    const current = next.value;
    if (Array.isArray(current)) {
      for (const item of current) {
        stack.push({ value: item, depth: next.depth + 1 });
      }
      continue;
    }

    if (typeof current !== 'object' || current === null) {
      continue;
    }

    for (const [key, item] of Object.entries(current)) {
      if (
        typeof item === 'string' &&
        (key === 'name' ||
          key === 'tool' ||
          key === 'toolName' ||
          key === 'tool_name' ||
          key === 'functionName' ||
          key === 'function_name')
      ) {
        names.push(item);
      }
      stack.push({ value: item, depth: next.depth + 1 });
    }
  }

  return names;
}

function isInputRequestToolName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }

  return (
    normalized === 'request_user_input' ||
    normalized.includes('request_user_input') ||
    normalized.includes('needs_input') ||
    normalized.includes('ask_input')
  );
}

function looksLikeTestFailure(text: string): boolean {
  return /\b(test(s)?\s+(failed|failing)|failing test|assertion failed)\b/.test(text);
}

function looksLikeTestPass(text: string): boolean {
  return /\b(all tests\s+pass(ed)?|tests?\s+pass(ed)?|no failing tests)\b/.test(text);
}

function looksLikeTestRun(text: string): boolean {
  return /\b(run(ning)? tests?|vitest|jest|pytest|mocha|npm test|pnpm test|yarn test)\b/.test(
    text
  );
}

function looksLikeTerminalCommand(text: string): boolean {
  return (
    /\b(run|running|execute|executing)\b.{0,40}\b(command|shell|bash|terminal)\b/.test(text) ||
    /`(npm|pnpm|yarn|git|node|python|cargo|go|make)\b/.test(text)
  );
}

function looksLikeWrite(text: string): boolean {
  return /\b(edit|update|modify|patch|implement|create|refactor|fix|write)\b/.test(text);
}

function looksLikeRead(text: string): boolean {
  return /\b(read|inspect|investigate|review|analyz|check|explore|understand|trace)\b/.test(text);
}

function looksLikeCompletion(text: string): boolean {
  return /\b(done|completed|finished|resolved|implemented)\b/.test(text);
}

function extractPathLikeFromText(text: string | undefined): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  const match = text.match(/(?:\/|\.\/|\.\.\/)[^\s`"')]+/);
  return match?.[0];
}

function extractCommandLikeFromText(text: string | undefined): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  const inlineCodeMatch = text.match(/`([^`\n]+)`/);
  if (inlineCodeMatch?.[1] !== undefined) {
    return asOptionalString(inlineCodeMatch[1]);
  }

  const commandMatch = text.match(
    /\b(?:npm|pnpm|yarn|git|node|python|pytest|vitest|jest|cargo|go|make)\b[^\n]*/i
  );
  return commandMatch?.[0];
}

function sanitizeMetadata(value: unknown): Record<string, EventMetadataValue> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const output: Record<string, EventMetadataValue> = {};

  for (const [key, itemValue] of Object.entries(value)) {
    if (
      typeof itemValue === 'string' ||
      typeof itemValue === 'number' ||
      typeof itemValue === 'boolean' ||
      itemValue === null
    ) {
      output[key] = itemValue;
    }
  }

  return Object.keys(output).length > 0 ? output : undefined;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asOptionalFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function withOptional<T extends string, V>(
  key: T,
  value: V | undefined
): Record<T, V> | Record<string, never> {
  if (value === undefined) {
    return {};
  }

  return { [key]: value } as Record<T, V>;
}
