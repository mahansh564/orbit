import Phaser from 'phaser';
import { MAX_FPS, TERRARIUM_DIMENSIONS } from '@shared/constants';
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

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: TERRARIUM_DIMENSIONS.width,
  height: TERRARIUM_DIMENSIONS.height,
  backgroundColor: '#101619',
  pixelArt: true,
  fps: {
    target: MAX_FPS,
    forceSetTimeOut: true
  },
  scene: [BootScene, TerrariumScene]
});

vscodeApi.postMessage({ type: 'ready' });
