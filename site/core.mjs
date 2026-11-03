export const VERSION=1;
export const STORE_KEY='empyrios-lifeos-v1';
export const PRIORITIES=['P1','P2','P3'];
export const PROJECT_STATES=['active','paused','completed'];
export const LIMITS={tasks:5000,projects:200,goals:300,blocks:3000,notes:500};
const OBJ=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const cleanText=(s,max=160)=>String(s??'').trim().slice(0,max);
export const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export const validTime=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export const id=()=>globalThis.crypto?.randomUUID?.()??('l'+Date.now().toString(36)+Math.random().toString(36).slice(2));
export const today=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const toMidnight=s=>new Date(`${s}T12:00:00`);
export const addDays=(date,n)=>{const d=toMidnight(date);d.setDate(d.getDate()+n);return today(d)};
export const startOfWeek=date=>{const d=toMidnight(date);return addDays(date,-((d.getDay()+6)%7))};
export const dateDistance=(a,b)=>Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
export const moneyHours=n=>n>=60?`${(n/60).toFixed(n%60===0?0:1)}h`:`${n}m`;
export function fresh(){return {version:VERSION,createdAt:new Date().toISOString(),tasks:[],projects:[],goals:[],blocks:[],notes:[],reviews:[],settings:{focusMinutes:25}};}
const requiredString=(v,max,name,allowEmpty=false)=>{if(typeof v!=='string'||v.length>max||(!allowEmpty&&!v.trim()))throw Error(`Invalid ${name}`);return v};
const optionalDate=(v,name)=>{if(v!==null&&v!==undefined&&!validDate(v))throw Error(`Invalid ${name}`);return v??null};
const uniqueIds=(items,label)=>{const seen=new Set();for(const o of items){if(!OBJ(o))throw Error(`Invalid ${label} item`);requiredString(o.id,90,`${label} ID`);if(seen.has(o.id))throw Error(`Duplicate ${label} ID`);seen.add(o.id);}};
const datetime=(s,name)=>{if(typeof s!=='string'||s.length>45||!Number.isFinite(Date.parse(s)))throw Error(`Invalid ${name}`);return s};
function validateItem(o,type){
  requiredString(o.id,90,`${type} ID`);
  if(type==='tasks'){
    requiredString(o.title,180,'task title');requiredString(o.description??'',4000,'task description',true);
    if(o.projectId!==null&&o.projectId!==undefined)requiredString(o.projectId,90,'task project');
    if(!PRIORITIES.includes(o.priority))throw Error('Invalid task priority');
    optionalDate(o.dueDate,'task due date');
    if(!Number.isInteger(o.estimate)||o.estimate<0||o.estimate>1440)throw Error('Invalid task estimate');
    if(o.doneAt!==null&&o.doneAt!==undefined)datetime(o.doneAt,'task completion');
    datetime(o.createdAt,'task creation');
  }
  if(type==='projects'){
    requiredString(o.name,130,'project name');requiredString(o.description??'',2000,'project description',true);
    if(!PROJECT_STATES.includes(o.status))throw Error('Invalid project status');
    if(typeof o.colour!=='string'||!/^#[0-9a-fA-F]{6}$/.test(o.colour))throw Error('Invalid project colour');
    optionalDate(o.targetDate,'project target date');datetime(o.createdAt,'project creation');
  }
  if(type==='goals'){
    requiredString(o.title,160,'goal title');requiredString(o.unit??'',30,'goal unit',true);
    if(!(Number.isFinite(o.target)&&o.target>0&&o.target<=1e9))throw Error('Invalid goal target');
    if(!(Number.isFinite(o.current)&&o.current>=0&&o.current<=1e9))throw Error('Invalid goal progress');
    optionalDate(o.deadline,'goal deadline');
    if(o.projectId!==null&&o.projectId!==undefined)requiredString(o.projectId,90,'goal project');datetime(o.createdAt,'goal creation');
  }
  if(type==='blocks'){
    requiredString(o.title,160,'block title');if(!validDate(o.date)||!validTime(o.start))throw Error('Invalid planner time');
    if(!Number.isInteger(o.duration)||o.duration<5||o.duration>720||o.duration%5!==0)throw Error('Invalid block duration');
    if(o.taskId!==null&&o.taskId!==undefined)requiredString(o.taskId,90,'block task');datetime(o.createdAt,'block creation');
  }
  if(type==='notes'){
    requiredString(o.text,2000,'note text');datetime(o.createdAt,'note creation');if(typeof o.pinned!=='boolean')throw Error('Invalid note pin');
  }
  if(type==='reviews'){
    if(!validDate(o.week)||startOfWeek(o.week)!==o.week)throw Error('Invalid review week');requiredString(o.text??'',4000,'review notes',true);
  }
}
export function validateState(state){
 if(!OBJ(state)||state.version!==VERSION)throw Error('Unsupported LifeOS backup version');
 if(!OBJ(state.settings)||![15,20,25,30,45,50,60].includes(state.settings.focusMinutes))throw Error('Invalid settings');
 datetime(state.createdAt,'creation timestamp');
 for(const [k,max] of Object.entries({...LIMITS,reviews:600})){
  if(!Array.isArray(state[k])||state[k].length>max)throw Error(`Invalid ${k} collection`);
  uniqueIds(state[k],k);
  for(const o of state[k])validateItem(o,k);
 }
 const projects=new Set(state.projects.map(p=>p.id));const tasks=new Set(state.tasks.map(p=>p.id));
 for(const t of state.tasks)if(t.projectId&&!projects.has(t.projectId))throw Error('Task references missing project');
 for(const g of state.goals)if(g.projectId&&!projects.has(g.projectId))throw Error('Goal references missing project');
 for(const b of state.blocks)if(b.taskId&&!tasks.has(b.taskId))throw Error('Block references missing task');
 for(const r of state.reviews)if(r.id!==r.week)throw Error('Review ID must be week date');
 return true;
}
export function parseBackup(text){if(typeof text!=='string'||text.length>8_000_000)throw Error('Backup is too large');let o;try{o=JSON.parse(text)}catch{throw Error('Backup is not valid JSON')}validateState(o);return o;}
export function summarizeTasks(tasks,now=today()){
 const undone=tasks.filter(t=>!t.doneAt);
 return {total:tasks.length,open:undone.length,done:tasks.length-undone.length,overdue:undone.filter(t=>t.dueDate&&t.dueDate<now).length,dueToday:undone.filter(t=>t.dueDate===now).length,inbox:undone.filter(t=>!t.projectId).length};
}
export function sortTasks(tasks,now=today()){
 const p={P1:0,P2:1,P3:2};
 return [...tasks].sort((a,b)=>{
  if(!!a.doneAt!==!!b.doneAt)return a.doneAt?1:-1;
  const dA=a.dueDate??'9999-12-31',dB=b.dueDate??'9999-12-31';
  return dA.localeCompare(dB)||p[a.priority]-p[b.priority]||a.createdAt.localeCompare(b.createdAt);
 });
}
export function focusQueue(tasks,now=today(),limit=5){return sortTasks(tasks.filter(t=>!t.doneAt),now).sort((a,b)=>{
  const score=t=>(t.dueDate&&t.dueDate<now?100:0)+(t.dueDate===now?75:0)+(t.priority==='P1'?30:t.priority==='P2'?15:0)+(t.dueDate&&dateDistance(t.dueDate,now)<=3?10:0);
  return score(b)-score(a)||((a.dueDate??'9999').localeCompare(b.dueDate??'9999'));
 }).slice(0,limit)}
export function projectProgress(projectId,tasks){const t=tasks.filter(x=>x.projectId===projectId);const done=t.filter(x=>x.doneAt).length;return {total:t.length,done,pct:t.length?Math.round(done/t.length*100):0};}
export function goalProgress(goal){return Math.min(100,Math.round(goal.current/goal.target*100));}
export function interval(block){const [h,m]=block.start.split(':').map(Number),a=h*60+m;return {start:a,end:a+block.duration}};
export function blockConflicts(blocks,date){const found=new Set();const daily=blocks.filter(b=>b.date===date);for(let i=0;i<daily.length;i++)for(let j=i+1;j<daily.length;j++){const a=interval(daily[i]),b=interval(daily[j]);if(Math.max(a.start,b.start)<Math.min(a.end,b.end)){found.add(daily[i].id);found.add(daily[j].id);}}return found;}
export function weekMetrics(state,weekDate=today()){
 const week=startOfWeek(weekDate);const end=addDays(week,7);
 const completions=state.tasks.filter(t=>t.doneAt&&today(new Date(t.doneAt))>=week&&today(new Date(t.doneAt))<end);
 const activity=Array.from({length:7},(_,i)=>{const day=addDays(week,i);return {date:day,done:completions.filter(t=>today(new Date(t.doneAt))===day).length,planned:state.blocks.filter(b=>b.date===day).reduce((a,b)=>a+b.duration,0)};});
 return {week,through:addDays(week,6),completed:completions.length,scheduledMinutes:activity.reduce((s,a)=>s+a.planned,0),daily:activity};
}
export function createTask(fields,now=new Date()){
 const title=cleanText(fields.title,180);if(!title)throw Error('Give your task a title');
 const dueDate=fields.dueDate||null;if(dueDate&&!validDate(dueDate))throw Error('Invalid due date');
 const estimate=Number(fields.estimate||0);if(!Number.isInteger(estimate)||estimate<0||estimate>1440)throw Error('Estimate must be 0–1440 minutes');
 const priority=PRIORITIES.includes(fields.priority)?fields.priority:'P2';
 return {id:id(),title,description:cleanText(fields.description,4000),projectId:fields.projectId||null,priority,dueDate,estimate,doneAt:null,createdAt:now.toISOString()};
}
export function createProject(fields,now=new Date()){
 const name=cleanText(fields.name,130);if(!name)throw Error('Give your project a name');
 return {id:id(),name,description:cleanText(fields.description,2000),status:PROJECT_STATES.includes(fields.status)?fields.status:'active',colour:/^#[0-9a-fA-F]{6}$/.test(fields.colour)?fields.colour:'#9A8CFF',targetDate:fields.targetDate||null,createdAt:now.toISOString()};
}
export function createGoal(fields,now=new Date()){
 const title=cleanText(fields.title,160);if(!title)throw Error('Give your goal a name');
 const target=Number(fields.target);if(!Number.isFinite(target)||target<=0||target>1e9)throw Error('Goal target must be positive');
 const current=Number(fields.current||0);if(!Number.isFinite(current)||current<0||current>1e9)throw Error('Invalid current progress');
 return {id:id(),title,target,current,unit:cleanText(fields.unit,30),deadline:fields.deadline||null,projectId:fields.projectId||null,createdAt:now.toISOString()};
}
export function createBlock(fields,now=new Date()){
 const title=cleanText(fields.title,160);if(!title||!validDate(fields.date)||!validTime(fields.start))throw Error('Provide an activity, date and time');
 const duration=Number(fields.duration);if(!Number.isInteger(duration)||duration<5||duration>720||duration%5!==0)throw Error('Duration must be 5–720 minutes in steps of five');
 return {id:id(),title,date:fields.date,start:fields.start,duration,taskId:fields.taskId||null,createdAt:now.toISOString()};
}
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const csvSafe=s=>{const v=String(s??'');return /^[\s]*[=+@-]/.test(v)?"'"+v:v};
export function toCSV(rows,keys){const cell=v=>'"'+csvSafe(v).replace(/"/g,'""')+'"';return [keys.map(cell).join(','),...rows.map(row=>keys.map(k=>cell(row[k])).join(','))].join('\r\n')+'\r\n';}
