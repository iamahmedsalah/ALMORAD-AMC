import {readFileSync} from 'node:fs';
import {expect, it} from 'vitest';
const css = readFileSync(new URL('../../styles/tokens.css',import.meta.url),'utf8');
function luminance(hex: string) {
  const values = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return .2126*values[0]! + .7152*values[1]! + .0722*values[2]!;
}
it('preserves every official swatch in tokens or approved design reference', () => {
  const design = readFileSync(new URL('../../../../../docs/design.md',import.meta.url),'utf8');
  for (const hex of ['#0B0A08','#14120E','#BE9D5B','#D8BE86','#F5F1E7','#CFCBC0','#A6A39B','#7A5F28']) expect(design).toContain(hex);
});
it('passes AA text contrast for both themes and essential text pairs', () => {
  for (const block of [css.split('.dark')[0]!,css.split('.dark')[1]!.split('@theme')[0]!]) {
    const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-fA-F]{6})/g)].map(m => [m[1],m[2]]));
    for (const [fg,bg] of [['foreground','background'],['muted-foreground','background'],['primary-foreground','primary'],['brand-accent','background']]) {
      const a = luminance(tokens[fg!]!);const b = luminance(tokens[bg!]!);
      expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toBeGreaterThanOrEqual(4.5);
    }
  }
});
