import type { WebviewToExtensionMessage } from '@shared/types';
import { TerrariumState } from './TerrariumState';

let terrariumState: TerrariumState | null = null;

/**
 * Initializes singleton terrarium state for the active webview runtime.
 *
 * @param postMessage Message callback used to notify extension host.
 * @returns Initialized state instance.
 */
export function initializeTerrariumState(
  postMessage: (message: WebviewToExtensionMessage) => void
): TerrariumState {
  terrariumState = new TerrariumState(postMessage);
  return terrariumState;
}

/**
 * Returns current singleton terrarium state instance.
 *
 * @returns Initialized terrarium state.
 */
export function getTerrariumState(): TerrariumState {
  if (terrariumState === null) {
    throw new Error('Terrarium state not initialized.');
  }

  return terrariumState;
}
