# CodeTerrarium

CodeTerrarium is a VS Code extension that visualizes AI coding agents as creatures in a living pixel-art terrarium.

## Commands

- `CodeTerrarium: Open Terrarium`
- `CodeTerrarium: Add Agent`
- `CodeTerrarium: Reset Ecosystem`

## Current Status (March 6, 2026)

### Working

- Extension activation and command registration are in place.
- Transcript watching and JSONL event parsing are implemented.
- Extension/webview message bridge is implemented with typed message guards.
- Webview scene loop, creature state updates, weather/flora/day-night systems, and HUD rendering are implemented.
- Creature stats persistence to workspace `.codeterrarium/stats.json` is implemented.
- Quality checks currently pass:
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
  - `npm run package`

### Known Gaps

- Integration test coverage with `@vscode/test-electron` is not implemented yet.
- Packaging/build polish is still pending (webview bundle size warning, minimal docs).

## Next Steps Checklist

- [x] Wire `codeterrarium.maxFps` into Phaser runtime (remove hardcoded FPS assumptions).
- [x] Wire `codeterrarium.weatherEnabled` to enable/disable weather system behavior.
- [x] Add adapter architecture for configurable agent transcript sources (beyond direct JSONL watcher parsing).
- [x] Implement `Tooltip` UI module and connect it to creature hover/selection state.
- [x] Replace placeholder generated textures with real sprite/tilemap/audio assets from `src/assets`.
- [ ] Add integration tests with `@vscode/test-electron` for extension lifecycle and webview messaging.
- [ ] Tighten VSIX packaging footprint and review ignored files.
- [ ] Expand README with setup, configuration examples, transcript format examples, and troubleshooting.
- [ ] Add release checklist for versioning/changelog/package validation.
