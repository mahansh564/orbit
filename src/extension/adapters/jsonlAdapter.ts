import { createReadStream, existsSync, readdirSync, statSync, watch } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { AgentConfig } from '@shared/types';
import { parseAgentEventLine } from '../parser';
import type {
  AgentSourceAdapter,
  AgentSourceAdapterInstance,
  AgentSourceAdapterOptions
} from './types';

/**
 * Built-in adapter id for newline-delimited JSON transcript files.
 */
export const JSONL_SOURCE_ADAPTER_ID = 'jsonl';

/**
 * Adapter that watches file or directory transcript paths containing JSONL events.
 */
export class JsonlSourceAdapter implements AgentSourceAdapter {
  readonly id = JSONL_SOURCE_ADAPTER_ID;

  /**
   * Creates a JSONL source instance.
   *
   * @param options Adapter runtime options.
   * @returns Running JSONL watcher instance.
   */
  createInstance(options: AgentSourceAdapterOptions): AgentSourceAdapterInstance {
    return new JsonlSourceInstance(options);
  }
}

class JsonlSourceInstance implements AgentSourceAdapterInstance {
  private agent: AgentConfig;
  private readonly onEvent: AgentSourceAdapterOptions['onEvent'];
  private readonly onError: AgentSourceAdapterOptions['onError'];
  private readonly offsets = new Map<string, number>();
  private readonly readingFiles = new Set<string>();
  private readonly pendingFiles = new Set<string>();
  private watchers: FSWatcher[] = [];

  /**
   * Creates JSONL source runtime and attaches filesystem watchers.
   *
   * @param options Adapter runtime options.
   */
  constructor(options: AgentSourceAdapterOptions) {
    this.agent = options.agent;
    this.onEvent = options.onEvent;
    this.onError = options.onError;
    this.initialize();
  }

  /**
   * Applies latest agent config to this JSONL instance.
   *
   * @param agent Latest agent configuration.
   */
  updateAgent(agent: AgentConfig): void {
    const transcriptPathChanged = this.agent.transcriptPath !== agent.transcriptPath;
    this.agent = agent;

    if (!transcriptPathChanged) {
      return;
    }

    this.teardownWatchers();
    this.offsets.clear();
    this.readingFiles.clear();
    this.pendingFiles.clear();
    this.initialize();
  }

  /**
   * Stops all active watchers and stream activity.
   */
  dispose(): void {
    this.teardownWatchers();
    this.offsets.clear();
    this.readingFiles.clear();
    this.pendingFiles.clear();
  }

  private initialize(): void {
    try {
      const stats = statSync(this.agent.transcriptPath);
      if (stats.isDirectory()) {
        this.attachDirectoryWatcher(this.agent.transcriptPath);
        return;
      }

      this.attachFileWatcher(this.agent.transcriptPath);
    } catch (error) {
      this.reportError(error);
    }
  }

  private attachFileWatcher(filePath: string): void {
    this.initializeOffset(filePath);

    const watcher = watch(filePath, () => {
      this.scheduleRead(filePath);
    });

    this.watchers.push(watcher);
  }

  private attachDirectoryWatcher(directoryPath: string): void {
    if (existsSync(directoryPath)) {
      this.initializeDirectoryOffsets(directoryPath);
    }

    const watcher = watch(directoryPath, (_eventType, filename) => {
      if (filename === null) {
        return;
      }

      const candidatePath = join(directoryPath, filename.toString());
      if (!candidatePath.endsWith('.jsonl')) {
        return;
      }

      this.initializeOffset(candidatePath);
      this.scheduleRead(candidatePath);
    });

    this.watchers.push(watcher);
  }

  private initializeDirectoryOffsets(directoryPath: string): void {
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

        this.initializeOffset(filePath);
      }
    } catch (error) {
      this.reportError(error);
    }
  }

  private initializeOffset(filePath: string): void {
    if (this.offsets.has(filePath)) {
      return;
    }

    try {
      const fileStats = statSync(filePath);
      this.offsets.set(filePath, fileStats.size);
    } catch {
      this.offsets.set(filePath, 0);
    }
  }

  private scheduleRead(filePath: string): void {
    if (this.readingFiles.has(filePath)) {
      this.pendingFiles.add(filePath);
      return;
    }

    void this.readAppendedLines(filePath);
  }

  private async readAppendedLines(filePath: string): Promise<void> {
    this.readingFiles.add(filePath);

    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        return;
      }

      const existingOffset = this.offsets.get(filePath) ?? 0;
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
        const parsed = parseAgentEventLine(line, { id: this.agent.id, name: this.agent.name });
        if (parsed !== null) {
          this.onEvent(parsed);
        }
      }

      this.offsets.set(filePath, fileStats.size);
    } catch (error) {
      this.reportError(error);
    } finally {
      this.readingFiles.delete(filePath);
      if (this.pendingFiles.has(filePath)) {
        this.pendingFiles.delete(filePath);
        this.scheduleRead(filePath);
      }
    }
  }

  private teardownWatchers(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }

    this.watchers = [];
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
