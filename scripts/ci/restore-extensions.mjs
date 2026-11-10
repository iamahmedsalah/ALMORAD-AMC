import {ReleasePolicyError} from './migrations.mjs';

/** Only extension names may leave the archive inspection boundary. */
export function archiveExtensions(toc='') {
  const names=[];
  for(const line of toc.split(/\r?\n/)) {
    const match=line.match(/^\d+;\s+\d+\s+\d+\s+EXTENSION\s+-\s+(\S+)\s*$/);
    if(!match)continue;
    if(!/^[a-z][a-z0-9_-]{0,62}$/.test(match[1]))throw new ReleasePolicyError('Unsupported extension identifier in restore archive');
    names.push(match[1]);
  }
  return [...new Set(names)].sort();
}
export function missingExtensions(required,available='') {
  const installed=new Set(available.split(/\r?\n/).map(name=>name.trim()));
  return required.filter(name=>!installed.has(name));
}
