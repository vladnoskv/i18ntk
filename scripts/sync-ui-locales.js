const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');

const baseDir = path.join(__dirname, '..', 'ui-locales');
const enContent = SecurityUtils.safeReadFileSync(path.join(baseDir,'en.json'),'utf8');
const en = JSON.parse(enContent || '{}');
function flatten(obj,pfx='',out={}){ for(const [k,v] of Object.entries(obj)){ const nk=pfx?`${pfx}.${k}`:k; if(v && typeof v==='object' && !Array.isArray(v)) flatten(v,nk,out); else out[nk]=v; } return out; }
function unflatten(map){ const root={}; for(const [k,v] of Object.entries(map)){ const parts=k.split('.'); let cur=root; while(parts.length>1){ const p=parts.shift(); cur[p]=cur[p]||{}; cur=cur[p]; } cur[parts[0]]=v; } return root; }
const enFlat = flatten(en);
for (const file of SecurityUtils.safeReaddirSync(baseDir)) {
  if (!file.endsWith('.json') || file==='en.json') continue;
  const p = path.join(baseDir,file);
  const data = (() => {
    const s = SecurityUtils.safeReadFileSync(p,'utf8');
    try {
      return s ? JSON.parse(s) : {};
    } catch (e) {
      console.warn(`sync-ui-locales: invalid JSON in ${file}, defaulting to {}: ${e.message}`);
      return {};
    }
  })();  const flat = flatten(data);
  let changed = false;
  for (const [k,v] of Object.entries(enFlat)) {
    if (!(k in flat)) { flat[k] = v || 'NOT_TRANSLATED'; changed = true; }
  }
  if (changed) { SecurityUtils.safeWriteFileSync(p, JSON.stringify(unflatten(flat), null, 2)); }
}
console.log('UI locales synced.');