import { describe, expect, it } from 'vitest';
import { resolveTooltipAgentId } from '../src/webview/ui/Tooltip';

describe('resolveTooltipAgentId', () => {
  it('prefers hovered creature over selected creature', () => {
    expect(resolveTooltipAgentId('hovered', 'selected')).toBe('hovered');
  });

  it('falls back to selected creature when no hover exists', () => {
    expect(resolveTooltipAgentId(null, 'selected')).toBe('selected');
  });

  it('returns null when neither hover nor selection exists', () => {
    expect(resolveTooltipAgentId(null, null)).toBeNull();
  });
});
