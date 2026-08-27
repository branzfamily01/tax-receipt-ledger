const DB_NAME='taxReceiptLedgerDB', DB_VERSION=1, STORE='receipts';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={records:[],selectedImage:null,selectedImageName:'',editingId:null};
const categories=['雑費','租税公課','荷造運賃','水道光熱費','旅費交通費','通信費','広告宣伝費','接待交際費','損害保険料','修繕費','消耗品費','減価償却費','福利厚生費','給料賃金','外注工賃','利子割引料','地代家賃','貸倒金','新聞図書費','研修費','会議費','車両費','管理費','修繕積立金','その他・要確認'];
let dbPromise;
function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE)){const s=d.createObjectStore(STORE,{keyPath:'id'});s.createIndex('date','date');}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return dbPromise}
async function getAll(){const d=await db();return new Promise((res,rej)=>{const r=d.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
async function put(rec){const d=await db();return new Promise((res,rej)=>{const r=d.transaction(STORE,'readwrite').objectStore(STORE).put(rec);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function remove(id){const d=await db();return new Promise((res,rej)=>{const r=d.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function clearAll(){const d=await db();return new Promise((res,rej)=>{const r=d.transaction(STORE,'readwrite').objectStore(STORE).clear();r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}

function yen(n){return new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(Number(n)||0)}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function uuid(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2)}
function localToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2200)}
function parseDateYear(d){return d?String(d).slice(0,4):''}
function filtered(){const year=$('#yearFilter').value,income=$('#incomeFilter').value,q=$('#searchInput').value.trim().toLowerCase(),status=$('#statusFilter').value;return state.records.filter(r=>(year==='all'||parseDateYear(r.date)===year)&&(income==='all'||r.incomeType===income)&&(status==='all'||(status==='review'&&!r.confirmed)||(status==='confirmed'&&r.confirmed))&&(!q||[r.vendor,r.purpose,r.category,r.memo].join(' ').toLowerCase().includes(q))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.updatedAt||'').localeCompare(a.updatedAt||''))}
function filterForExport(){const year=$('#yearFilter').value,income=$('#incomeFilter').value;return state.records.filter(r=>(year==='all'||parseDateYear(r.date)===year)&&(income==='all'||r.incomeType===income)).sort((a,b)=>(a.date||'').localeCompare(b.date||''))}
function syncYears(){const current=$('#yearFilter').value;const years=[...new Set(state.records.map(r=>parseDateYear(r.date)).filter(Boolean))].sort().reverse();const now=String(new Date().getFullYear());if(!years.includes(now))years.unshift(now);$('#yearFilter').innerHTML='<option value="all">すべて</option>'+years.map(y=>`<option>${y}</option>`).join('');$('#yearFilter').value=years.includes(current)?current:(current==='all'?'all':now)}
