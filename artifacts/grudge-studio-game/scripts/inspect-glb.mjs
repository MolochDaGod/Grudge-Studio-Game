import fs from 'fs';
const p = process.argv[2];
const b = fs.readFileSync(p);
const s = b.toString('latin1');
const re = /"name":"([^"]+)"/g;
const names = new Set();
let m;
while ((m = re.exec(s))) names.add(m[1]);
console.log([...names].filter((n) => /arrow|project|trap|shield|ice|anim|shoot|tower/i.test(n)).join('\n'));