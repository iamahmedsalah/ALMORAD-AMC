export interface BannerField {
  label: string;
  value: string;
  icon?: string;
  status?: string;
  detail?: string;
}

export interface BannerOptions {
  title: string;
  icon?: string;
  environment?: string;
  version?: string;
  url?: string;
  docsUrl?: string;
  nodeVersion?: string;
  fields?: BannerOptionsField[];
  diagnostics?: BannerDiagnostic[];
}

export interface BannerOptionsField {
  label: string;
  icon?: string;
  value: string;
}

export interface BannerDiagnostic {
  label: string;
  icon?: string;
  status: string;
  value?: string;
  detail?: string;
}

const DOUBLE_LINE = '======================================================================';
const SINGLE_LINE = '----------------------------------------------------------------------';

export function formatBanner(options: BannerOptions): string {
  const lines: string[] = [];
  const env = (options.environment || process.env.NODE_ENV || 'development').toUpperCase();
  const titleIcon = options.icon ? `${options.icon}  ` : '';
  const nodeVer = options.nodeVersion || process.version;

  lines.push('');
  lines.push(DOUBLE_LINE);
  lines.push(`  ${titleIcon}${options.title}`);
  lines.push(SINGLE_LINE);

  // Core metadata rows
  const coreFields: Array<{ icon: string; label: string; value: string }> = [
    { icon: '⚡', label: 'Environment', value: `[ ${env} ]` },
    ...(options.version ? [{ icon: '📦', label: 'Version', value: options.version }] : []),
    ...(options.url ? [{ icon: '🚀', label: 'URL', value: options.url }] : []),
    ...(options.docsUrl ? [{ icon: '📖', label: 'Swagger API', value: options.docsUrl }] : []),
    { icon: '🟢', label: 'Node.js', value: nodeVer },
  ];

  if (options.fields) {
    for (const f of options.fields) {
      coreFields.push({ icon: f.icon || '🔹', label: f.label, value: f.value });
    }
  }

  // Determine max label width for aligned output
  const maxLabelLength = Math.max(...coreFields.map((f) => f.label.length), 11);

  for (const f of coreFields) {
    const paddedLabel = f.label.padEnd(maxLabelLength, ' ');
    lines.push(`  ${f.icon} ${paddedLabel} : ${f.value}`);
  }

  // Diagnostics / Service status rows
  if (options.diagnostics && options.diagnostics.length > 0) {
    lines.push(SINGLE_LINE);
    const maxDiagLength = Math.max(...options.diagnostics.map((d) => d.label.length), 11);
    for (const d of options.diagnostics) {
      const paddedLabel = d.label.padEnd(maxDiagLength, ' ');
      const icon = d.icon || '🔸';
      const statusBlock = `[ ${d.status.toUpperCase()} ]`;
      const detailStr = d.value ? ` ${d.value}` : '';
      const extra = d.detail ? ` (${d.detail})` : '';
      lines.push(`  ${icon} ${paddedLabel} : ${statusBlock}${detailStr}${extra}`);
    }
  }

  lines.push(DOUBLE_LINE);
  lines.push('');
  return lines.join('\n');
}

export function printBanner(options: BannerOptions): void {
  // eslint-disable-next-line no-console
  console.log(formatBanner(options));
}

export function getBrowserConsoleBanner(): { message: string; styles: string[] } {
  const brandGold = '#BE9D5B';
  const brandCharcoal = '#0B0A08';

  const message = `%c ALMORAD AMC %c Growth & Brand Studio %c\n%c Production bilingual web experience | Cairo & IBM Plex Sans `;
  const styles = [
    `background: ${brandGold}; color: ${brandCharcoal}; font-weight: bold; padding: 4px 8px; border-radius: 3px 0 0 3px; font-size: 11px;`,
    `background: ${brandCharcoal}; color: #F5F1E7; font-weight: 600; padding: 4px 8px; border-radius: 0 3px 3px 0; font-size: 11px; border: 1px solid ${brandGold};`,
    '',
    `color: #A6A39B; font-size: 10px; padding-top: 4px;`
  ];

  return { message, styles };
}
