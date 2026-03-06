# AGENTS.md

## Project Overview
This is "CodeTerrarium" — a VS Code extension that renders a living pixel-art terrarium/ecosystem in a webview panel. Each AI coding agent (Claude Code, Copilot, Codex, etc.) is represented as a creature whose behavior maps to the agent's real-time activity, read from JSONL transcript files or configurable adapters.

## Tech Stack
- **Language:** TypeScript (strict mode)
- **Runtime:** VS Code Extension API (vscode ^1.96.0)
- **Rendering:** Phaser 3 (pixelArt: true) inside a VS Code webview panel
- **State:** Lightweight in-memory store; persist creature stats to workspace `.codeterrarium/` as JSON
- **Build:** esbuild for extension bundling; Vite for webview dev
- **Tests:** Vitest for unit tests; @vscode/test-electron for integration
- **Linting:** ESLint flat config + Prettier

## Architecture
src/
extension/ # VS Code extension host code
activate.ts # extension entry, register commands & providers
agentWatcher.ts # FSWatcher on JSONL transcript dirs
parser.ts # parse transcript events → AgentEvent union type
bridge.ts # postMessage bridge: extension ↔ webview
webview/ # Phaser game (runs inside webview iframe)
main.ts # Phaser Game bootstrap
scenes/
TerrariumScene.ts # main gameplay scene
BootScene.ts # asset preload
entities/
Creature.ts # base creature class (sprite, state machine, stats)
CreatureFactory.ts # spawn creature from AgentConfig
environment/
Weather.ts # weather system driven by CI/project health
Flora.ts # plants/terrain that respond to codebase metrics
DayNight.ts # day/night cycle synced to local time
ui/
HUD.ts # overlay: creature names, status icons
Tooltip.ts # hover info panel
state/
TerrariumState.ts # central state store (agents, environment, time)
shared/
types.ts # shared types between extension & webview
constants.ts # tunable constants (speeds, thresholds, colors)
assets/
sprites/ # 16×16 and 32×32 pixel art spritesheets
tilemaps/ # Tiled JSON tilemaps for terrarium background
audio/ # optional ambient SFX (rain, birds)

text

## Coding Conventions
- Pure functions preferred; side effects only at boundaries (bridge, FS, vscode API)
- All public functions and types must have JSDoc comments
- State machine for creature behavior: Idle → Foraging → Working → Resting → Alert
- Use discriminated unions for message types between extension and webview
- Sprite assets: 16×16 base tiles, 32×32 creatures, PNG with transparency
- No `any` types; no `as unknown as`; use proper generics and guards

## Agent Event Mapping
| Agent Action         | Creature Behavior         | Environment Effect          |
|----------------------|---------------------------|-----------------------------|
| Reading files        | Foraging / sniffing       | —                           |
| Writing code         | Building / digging        | Small plant sprouts nearby  |
| Running tests        | Alert / standing guard    | Sky flickers                |
| Tests passing        | Happy dance animation     | Flowers bloom, sun brightens|
| Tests failing        | Distressed animation      | Rain cloud appears          |
| Bash/terminal cmd    | Running fast              | Leaves rustle               |
| Idle / waiting       | Sleeping / resting        | Fireflies appear at night   |
| Error / crash        | Injured / limping         | Withered plant              |
| Task complete        | Celebration + XP gain     | Rainbow / golden hour       |

## Commands (package.json contributions)
- `codeterrarium.open` — Open Terrarium panel
- `codeterrarium.addAgent` — Configure a new agent transcript source
- `codeterrarium.resetEcosystem` — Reset terrarium to default state

## Key Constraints
- Extension must activate lazily (onCommand activation event)
- Webview must work offline (bundle Phaser, no CDN)
- JSONL parsing must be non-blocking (stream with readline, not slurp)
- Keep webview render ≤ 30fps to stay lightweight
- Support watching multiple transcript directories simultaneously
- All creature stats persist across VS Code restarts via workspace storage