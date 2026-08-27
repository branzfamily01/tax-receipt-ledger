async function saveForm(e){e.preventDefault();const old=state.records.find(x=>x.id===state.editingId);const rec={id:state.editingId||uuid(),date:$('#dateInput').value,vendor:$('#vendorInput').value.trim(),amount:Number($('#amountInput').value)||0,businessPct:Number($('#businessPctInput').value)||0,expense:Number($('#expenseInput').value)||0,incomeType:$('#incomeTypeInput').value,category:$('#categoryInput').value,payment:$('#paymentInput').value,purpose:$('#purposeInput').value.trim(),memo:$('#memoInput').value.trim(),ocrText:$('#ocrText').value,confirmed:$('#confirmedInput').checked,imageBlob:state.selectedImage||old?.imageBlob||null,imageName:state.selectedImageName||old?.imageName||'',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};await put(rec);state.records=await getAll();$('#receiptDialog').close();render();toast('保存しました')}
async function deleteCurrent(){if(!state.editingId)return;if(!confirm('このレシートを削除しますか？'))return;await remove(state.editingId);state.records=await getAll();$('#receiptDialog').close();render();toast('削除しました')}

function csvCell(v){const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function exportRows(){return filterForExport().map((r,i)=>({'No':i+1,'取引日':r.date,'支払先':r.vendor,'内容・用途':r.purpose,'支払額':r.amount,'事業利用割合(%)':r.businessPct,'経費計上額':r.expense,'勘定科目':r.category,'所得区分':r.incomeType,'支払方法':r.payment,'証憑ID':r.id,'画像ファイル名':r.imageName||'','確認状態':r.confirmed?'確認済み':'要確認','メモ':r.memo||'','登録日時':r.createdAt||''}))}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function exportCSV(){const rows=exportRows();if(!rows.length){toast('出力するデータがありません');return}const headers=Object.keys(rows[0]);const csv='\ufeff'+[headers.join(','),...rows.map(r=>headers.map(h=>csvCell(r[h])).join(','))].join('\r\n');downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),fileBase()+'.csv');toast('CSVを作成しました')}
function fileBase(){const y=$('#yearFilter').value==='all'?'all':$('#yearFilter').value;return`keihi-receipts-${y}`}

// Minimal XLSX writer: ZIP(store) + OpenXML. No external library required.
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function u16(n){return[n&255,(n>>>8)&255]}function u32(n){return[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function concat(arrays){let n=arrays.reduce((s,a)=>s+a.length,0),o=new Uint8Array(n),p=0;for(const a of arrays){o.set(a,p);p+=a.length}return o}
const te=new TextEncoder();
