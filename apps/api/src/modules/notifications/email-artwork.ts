import {readFileSync} from 'node:fs';
let logo:Buffer|undefined;
/** Original official artwork, embedded so email clients need no public image URL. */
export function emailArtwork(){
  logo??=readFileSync(new URL('./assets/logo-on-dark.png',import.meta.url));
  return [{filename:'almorad-amc.png',content:logo,contentType:'image/png',contentId:'almorad-logo'}];
}
