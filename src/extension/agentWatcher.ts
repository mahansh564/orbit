import { createReadStream, existsSync, FSWatcher, readdirSync, statSync, watch } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { AgentConfig, AgentEvent } from '@shared/types';
import { parseAgentEventLine } from './parser';

/**
 * Callback signature invoked whenever a normalized transcript event is produced.
 */
export type AgentEventHandler = (event: AgentEvent) => void;

/**
 * Optional callback signature for non-fatal watcher errors.
 */
export type AgentWatcherErrorHandler = (error: Error) => void;

interface AgentWatchContext {
  agent: AgentConfig;
  watchers: FSWatcher[];
  offsets: Map<string, number>;
  readingFiles: Set<string>;
  pendingFiles: Set<string>;
}

/**
 * Watches transcript paths and streams appended JSONL lines into normalized AgentEvents.
 */
export class AgentWatcherManager {
  private readonly contexts = new Map<string, AgentWatchContext>();

  /**
   * Creates a watcher manager.
   *
   * @param onEvent Event callback for parsed agent events.
   * @param onError Optional callback for non-fatal watcher failures.
   */
  constructor(
    private readonly onEvent: AgentEventHandler,
    private readonly onError?: AgentWatcherErrorHandler
  ) {}

  /**
   * Updates active watchers to match the provided agent list.
   *
   * @param agents Current configured agents.
   */
  updateAgents(agents: AgentConfig[]): void {
    const incomingIds = new Set(agents.map((agent) => agent.id));

    for (const [existingId] of this.contexts) {
      if (!incomingIds.has(existingId)) {
        this.disposeContext(existingId);
      }
    }

    for (const agent of agents) {
      const existingContext = this.contexts.get(agent.id);
      if (existingContext !== undefined && existingContext.agent.transcriptPath === agent.transcriptPath) {
        existingContext.agent = agent;
        continue;
      }

      this.disposeContext(agent.id);
      this.createContext(agent);
    }
  }

  /**
   * Disposes all active filesystem watchers.
   */
  dispose(): void {
    for (const [agentId] of this.contexts) {
      this.disposeContext(agentId);
    }
  }

  private createContext(agent: AgentConfig): void {
    const context: AgentWatchContext = {
      agent,
      watchers: [],
      offsets: new Map<string, number>(),
      readingFiles: new Set<string>(),
      pendingFiles: new Set<string>()
    };

    try {
      const stats = statSync(agent.transcriptPath);
      if (stats.isDirectory()) {
        this.attachDirectoryWatcher(context, agent.transcriptPath);
      } else {
        this.attachFileWatcher(context, agent.transcriptPath);
      }
    } catch (error) {
      this.reportError(error);
      return;
    }

    this.contexts.set(agent.id, context);
  }

  private attachFileWatcher(context: AgentWatchContext, filePath: string): void {
    this.initializeOffset(context, filePath);

    const watcher = watch(filePath, () => {
      this.scheduleRead(context, filePath);
    });

    context.watchers.push(watcher);
  }

  private attachDirectoryWatcher(context: AgentWatchContext, directoryPath: string): void {
    if (existsSync(directoryPath)) {
      this.initializeDirectoryOffsets(context, directoryPath);
    }

    const watcher = watch(directoryPath, (_eventType, filename) => {
      if (filename === null) {
        return;
      }

      const candidatePath = join(directoryPath, filename.toString());
      if (!candidatePath.endsWith('.jsonl')) {
        return;
      }

      this.initializeOffset(context, candidatePath);
      this.scheduleRead(context, candidatePath);
    });

    context.watchers.push(watcher);
  }

  private initializeDirectoryOffsets(context: AgentWatchContext, directoryPath: string): void {
    try {
      const directoryStats = statSync(directoryPath);
      if (!directoryStats.isDirectory()) {
        return;
      }

      for (const entryName of readdirSync(directoryPath)) {
        const filePath = join(directoryPath, entryName);
        if (!filePath.endsWith('.jsonl')) {
          continue;
        }

        this.initializeOffset(context, filePath);
      }
    } catch (error) {
      this.reportError(error);
    }
  }

  private initializeOffset(context: AgentWatchContext, filePath: string): void {
    if (context.offsets.has(filePath)) {
      return;
    }

    try {
      const fileStats = statSync(filePath);
      context.offsets.set(filePath, fileStats.size);
    } catch {
      context.offsets.set(filePath, 0);
    }
  }

  private scheduleRead(context: AgentWatchContext, filePath: string): void {
    if (context.readingFiles.has(filePath)) {
      context.pendingFiles.add(filePath);
      return;
    }

    void this.readAppendedLines(context, filePath);
  }

  private async readAppendedLines(context: AgentWatchContext, filePath: string): Promise<void> {
    context.readingFiles.add(filePath);

    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        return;
      }

      const existingOffset = context.offsets.get(filePath) ?? 0;
      const startOffset = fileStats.size < existingOffset ? 0 : existingOffset;

      if (fileStats.size === startOffset) {
        return;
      }

      const stream = createReadStream(filePath, {
        start: startOffset,
        end: fileStats.size - 1,
        encoding: 'utf8'
      });

      const reader = createInterface({
        input: stream,
        crlfDelay: Infinity
      });

      for await (const line of reader) {
        const parsed = parseAgentEventLine(line, { id: context.agent.id, name: context.agent.name });
        if (parsed !== null) {
          this.onEvent(parsed);
        }
      }

      context.offsets.set(filePath, fileStats.size);
    } catch (error) {
      this.reportError(error);
    } finally {
      context.readingFiles.delete(filePath);
      if (context.pendingFiles.has(filePath)) {
        context.pendingFiles.delete(filePath);
        this.scheduleRead(context, filePath);
      }
    }
  }

  private disposeContext(agentId: string): void {
    const context = this.contexts.get(agentId);
    if (context === undefined) {
      return;
    }

    for (const watcher of context.watchers) {
      watcher.close();
    }

    context.watchers = [];
    this.contexts.delete(agentId);
  }

  private reportError(error: unknown): void {
    if (this.onError === undefined) {
      return;
    }

    if (error instanceof Error) {
      this.onError(error);
      return;
    }

    this.onError(new Error(String(error)));
  }
}
