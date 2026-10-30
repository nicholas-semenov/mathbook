import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const scope={window:{},Math,Number,String,Object,Array,console};vm.createContext(scope);
for(const file of ['data.js','labs.js'])vm.runInContext(fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'),scope,{filename:file});
const {lessons,modules}=scope.window.COURSE,labs=scope.window.MathLabs;
assert.equal(lessons.length,78);assert.equal(new Set(lessons.map(x=>x.id)).size,78);
for(const l of lessons){for(const key of ['id','title','source','intuition','definition','theorem','proof','example','pitfall','quant','labPrompt'])assert.equal(typeof l[key],'string',l.id+': '+key);assert(modules.some(x=>x.id===l.module));assert(labs.specs[l.lab],l.id+' has unknown lab');assert(Number.isFinite(l.exercise.answer));assert(l.exercise.hint&&l.exercise.solution);for(const key of ['definition','theorem','proof','example']){const s=l[key];assert.equal((s.match(/\\\(/g)||[]).length,(s.match(/\\\)/g)||[]).length,l.id+' inline TeX');assert.equal((s.match(/\\\[/g)||[]).length,(s.match(/\\\]/g)||[]).length,l.id+' display TeX')}}
let count=0;
for(const [id,spec] of Object.entries(labs.specs)){
 const defaults=Object.fromEntries(spec.controls.map(x=>[x.key,x.value]));
 const variants=[defaults];
 for(const c of spec.controls){if(c.type==='range')for(const v of [c.min,c.max])variants.push({...defaults,[c.key]:v});else for(const [v] of c.options)variants.push({...defaults,[c.key]:v})}
 for(const state of variants){const out=labs.evaluate(id,state);assert(out.svg.startsWith('<svg'));assert(!/NaN|Infinity/.test(out.svg),id+' invalid SVG geometry '+JSON.stringify(state));assert(out.readout.length>0);count++}
}
const tangent=labs.evaluate('tangent',{fn:'square',a:2,power:2,sign:'1'});assert(tangent.readout.includes('4,01'));assert(tangent.readout.includes('0,0001'));
const epsilon=labs.evaluate('epsilon',{eps:.5,delta:.2});assert(epsilon.readout.includes('Условие выполнено'));
const fail=labs.evaluate('epsilon',{eps:.1,delta:.5});assert(fail.readout.includes('выходит'));
assert.equal(labs.evaluate('newton',{kind:'root',start:1}).next,1.5);
assert.equal(labs.evaluate('newton',{kind:'cycle',start:0}).next,1);
assert.equal(labs.evaluate('newton',{kind:'cycle',start:0,current:1}).next,0);
assert(!Number.isFinite(labs.evaluate('newton',{kind:'root',start:0}).next));
const t=labs.evaluate('taylor',{fn:'cos',n:2,x:0});assert(t.readout.includes('Ошибка = <strong>0</strong>'));
const integral=labs.evaluate('integral',{n:10,b:2,c:0,method:'mid'});assert(integral.readout.includes('2,66'));assert(integral.readout.includes('2,6666667'));
assert.equal(labs.defs.cube.d(-2),12);assert.equal(labs.defs.square.dd(0),2);
for(const required of ['index.html','styles.css','data.js','app.js','labs.js','mathjax/MathJax.js','mathjax/config/TeX-AMS-MML_HTMLorMML-full.js','mathjax/fonts/HTML-CSS/STIX-Web/woff/STIXMathJax_Main-Regular.woff'])assert(fs.existsSync(new URL('../dist/'+required,import.meta.url)),required+' is missing');
console.log(`PASS: ${lessons.length} lessons, ${modules.length} modules, ${Object.keys(labs.specs).length} labs, ${count} lab states, numerical checks and local assets.`);
