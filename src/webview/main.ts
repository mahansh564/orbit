import Phaser from 'phaser';
import { clampMaxFps, MAX_FPS, TERRARIUM_DIMENSIONS } from '@shared/constants';
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '@shared/types';
import { BootScene } from './scenes/BootScene';
import { TerrariumScene } from './scenes/TerrariumScene';
import { getTerrariumState, initializeTerrariumState } from './state/context';

interface VsCodeApi {
  /**
   * Posts a message from webview to extension host.
   */
  postMessage(message: WebviewToExtensionMessage): void;
}

declare function acquireVsCodeApi<T = unknown>(): T;

const vscodeApi = acquireVsCodeApi<VsCodeApi>();

initializeTerrariumState((message) => {
  vscodeApi.postMessage(message);
});

window.addEventListener('message', (event: MessageEvent<ExtensionToWebviewMessage>) => {
  getTerrariumState().handleMessage(event.data);
});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: TERRARIUM_DIMENSIONS.width,
  height: TERRARIUM_DIMENSIONS.height,
  backgroundColor: '#101619',
  pixelArt: true,
  fps: {
    target: MAX_FPS,
    limit: MAX_FPS,
    forceSetTimeOut: true
  },
  scene: [BootScene, TerrariumScene]
});

const state = getTerrariumState();
const applyRuntimeFps = (): void => {
  const fps = clampMaxFps(state.getConfig().maxFps);
  game.loop.targetFps = fps;
  game.loop.fpsLimit = fps;
};

const unsubscribe = state.subscribe(() => {
  applyRuntimeFps();
});

window.addEventListener('beforeunload', () => {
  unsubscribe();
});

applyRuntimeFps();

vscodeApi.postMessage({ type: 'ready' });
