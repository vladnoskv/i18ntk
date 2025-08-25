const fs = require('fs');
const path = require('path');
const baseDir = path.join(__dirname, '..', 'resources', 'i18n', 'ui-locales');
const en = JSON.parse(SecurityUtils.safeReadFileSync(path.join(baseDir,'en.json'), baseDir, 'utf8'));
function flatten(obj,pfx='',out={}){ for(const [k,v] of Object.entries(obj)){ const nk=pfx?`${pfx}.${k}`:k; if(v && typeof v==='object' && !Array.isArray(v)) flatten(v,nk,out); else out[nk]=v; } return out; }
function unflatten(map){ const root={}; for(const [k,v] of Object.entries(map)){ const parts=k.split('.'); let cur=root; while(parts.length>1){ const p=parts.shift(); cur[p]=cur[p]||{}; cur=cur[p]; } cur[parts[0]]=v; } return root; }
const enFlat = flatten(en);
for (const file of fs.readdirSync(baseDir)) {
  if (!file.endsWith('.json') || file==='en.json') continue;
  const p = path.join(baseDir,file);
  const data = JSON.parse(SecurityUtils.safeReadFileSync(p, baseDir, 'utf8'));
  const flat = flatten(data);
  let changed = false;
  for (const [k,v] of Object.entries(enFlat)) {
    if (!(k in flat)) { flat[k] = v || 'NOT_TRANSLATED'; changed = true; }
  }
  if (changed) { SecurityUtils.safeWriteFileSync(p, JSON.stringify(unflatten(flat), null, 2)); }
}
console.log('UI locales synced.');