import type { CreatureState } from '@shared/types';
import type { Creature } from '../entities/Creature';

interface LabelBundle {
  label: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Text;
}

/**
 * Floating HUD layer for creature names and state icons.
 */
export class HUD {
  private readonly labels = new Map<string, LabelBundle>();

  /**
   * Creates HUD manager.
   *
   * @param scene Scene where HUD should render.
   */
  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * Synchronizes label objects with active creature set.
   *
   * @param creatures Active creature map by agent id.
   */
  syncCreatures(creatures: Map<string, Creature>): void {
    for (const [agentId, creature] of creatures) {
      if (this.labels.has(agentId)) {
        continue;
      }

      const label = this.scene.add.text(0, 0, creature.getAgent().name, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f2f5ff',
        backgroundColor: '#1b2530'
      });
      label.setOrigin(0.5, 1);
      label.setPadding(4, 1, 4, 1);
      label.setDepth(40);

      const icon = this.scene.add.text(0, 0, stateIcon(creature.getState()), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#cde7ff'
      });
      icon.setOrigin(0.5, 1);
      icon.setDepth(40);

      this.labels.set(agentId, { label, icon });
    }

    for (const [agentId, bundle] of this.labels) {
      if (creatures.has(agentId)) {
        continue;
      }

      bundle.label.destroy();
      bundle.icon.destroy();
      this.labels.delete(agentId);
    }
  }

  /**
   * Updates label positions and state icon content.
   *
   * @param creatures Active creature map by agent id.
   */
  update(creatures: Map<string, Creature>): void {
    for (const [agentId, creature] of creatures) {
      const bundle = this.labels.get(agentId);
      if (bundle === undefined) {
        continue;
      }

      const { x, y } = creature.getPosition();
      bundle.label.setPosition(x, y - 42);
      bundle.icon.setPosition(x, y - 24);
      bundle.icon.setText(stateIcon(creature.getState()));
    }
  }
}

function stateIcon(state: CreatureState): string {
  switch (state) {
    case 'working':
      return '[W]';
    case 'foraging':
      return '[R]';
    case 'resting':
      return '[Z]';
    case 'alert':
      return '[!]';
    case 'celebrating':
      return '[+]';
    case 'distressed':
      return '[-]';
    case 'idle':
    default:
      return '[.]';
  }
}
