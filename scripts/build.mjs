import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const dir=path.join(root,'content','characters');
const output=path.join(root,'dist');
const raw=fs.readdirSync(dir).filter(n=>n.endsWith('.json')).sort().map(name=>{
  const v=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
  if (typeof v.id!=='string'||!/^[a-z0-9-]+$/.test(v.id)||!v.name) throw new Error(`Invalid character ID or name: ${name}`);
  if (path.basename(name,'.json')!==v.id) throw new Error(`File ID mismatch: ${name}, id=${v.id}. Rename the file to ${v.id}.json`);
  return v;
});
const ids=new Set();
for(const c of raw){if(ids.has(c.id))throw new Error(`Duplicated ID ${c.id}`);ids.add(c.id)}
const publicCharacters=raw.filter(x=>x.published===true).map(x=>{
  const { ...copy }=x;
  // Data in the CMS is for PUBLIC distribution. NEVER store real confidential secrets here.
  return copy;
});
const site=JSON.parse(fs.readFileSync(path.join(root,'content','site.json'),'utf8'));
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
for(const file of ['index.html','styles.css','editor.js','app.js','youtube-test.html']) fs.copyFileSync(path.join(root,file),path.join(output,file));
fs.cpSync(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});
fs.writeFileSync(path.join(output,'.nojekyll'),'');
// External JS (not inline <script>), so JSON is safe and supports file:// preview.
fs.writeFileSync(path.join(output,'generated.js'),'window.FOLIO_DATA = '+JSON.stringify({site,characters:publicCharacters}).replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029')+';\n');
console.log(`Built FOLIO: ${publicCharacters.length} published characters (${raw.length} total). Output: dist/`);
