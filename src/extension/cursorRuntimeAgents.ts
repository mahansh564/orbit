import type { AgentConfig } from '@shared/types';
import type { CursorComposerRecord } from './cursorComposerStorageSync';

const CURSOR_RUNTIME_AGENT_COLOR = '#58A6FF';

/**
 * Resolves a display name for a Cursor composer-backed runtime agent.
 *
 * @param composer Cursor composer metadata.
 * @returns Cursor-provided name, or a deterministic fallback.
 */
export function resolveCursorComposerDisplayName(composer: CursorComposerRecord): string {
  const trimmed = composer.name?.trim() ?? '';
  if (trimmed.length > 0) {
    return trimmed;
  }

  return `Cursor Agent (${composer.composerId.slice(0, 8)})`;
}

/**
 * Merges runtime Cursor agents into configured agents while hiding transcript-path duplicates.
 *
 * @param agents Existing configured/persisted agents.
 * @param transcriptRootPath Cursor transcript root (`.../agent-transcripts`).
 * @param runtimeComposers Active Cursor composers to mirror as runtime agents.
 * @returns Combined list of configured and runtime Cursor agents.
 */
export function mergeRuntimeCursorAgents(
  agents: AgentConfig[],
  transcriptRootPath: string,
  runtimeComposers: readonly CursorComposerRecord[]
): AgentConfig[] {
  const runtimeAgents: AgentConfig[] = [];
  const knownIds = new Set(agents.map((agent) => agent.id));
  const knownTranscriptPaths = new Set(
    agents.map((agent) => normalizePathForCompare(agent.transcriptPath))
  );

  for (const composer of runtimeComposers) {
    const runtimeAgentId = `cursor-${composer.composerId}`;
    if (knownIds.has(runtimeAgentId)) {
      continue;
    }

    const transcriptPath = normalizePathForCompare(
      `${transcriptRootPath}/${composer.composerId}/${composer.composerId}.jsonl`
    );
    if (knownTranscriptPaths.has(transcriptPath)) {
      continue;
    }

    runtimeAgents.push({
      id: runtimeAgentId,
      name: resolveCursorComposerDisplayName(composer),
      sourceAdapter: 'jsonl',
      transcriptPath,
      crewRole: 'analyst',
      color: CURSOR_RUNTIME_AGENT_COLOR
    });

    knownIds.add(runtimeAgentId);
    knownTranscriptPaths.add(transcriptPath);
  }

  return runtimeAgents.length > 0 ? [...agents, ...runtimeAgents] : agents;
}

function normalizePathForCompare(pathValue: string): string {
  return process.platform === 'win32' ? pathValue.toLowerCase() : pathValue;
}
