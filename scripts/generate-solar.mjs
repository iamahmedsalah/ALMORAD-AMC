import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const data = JSON.parse(readFileSync(require.resolve('@iconify-json/solar/icons.json'), 'utf8'));
const names = ['arrow-right-up-linear', 'arrow-right-linear', 'arrow-down-linear', 'check-circle-linear', 'chat-round-line-linear', 'chart-2-linear', 'star-linear', 'code-square-linear', 'lightbulb-linear', 'layers-linear', 'compass-linear', 'global-linear', 'letter-linear', 'phone-linear', 'map-point-linear', 'play-linear', 'pause-linear', 'sun-2-linear', 'moon-stars-linear', 'monitor-linear', 'close-linear', 'calendar-linear', 'case-round-linear', 'users-group-rounded-linear', 'widget-2-linear'];
const icons = Object.fromEntries(names.map(name => {if (!data.icons[name]) throw new Error(`Missing Solar icon: ${name}`);return [name, data.icons[name].body];}));
writeFileSync('apps/web/src/components/ui/solar-data.ts', '// Generated from @iconify-json/solar. See docs/asset-notices.md.\nexport const solarIcons = '+JSON.stringify(icons,null,2)+' as const;\n');
