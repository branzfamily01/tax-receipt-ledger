const pdfImportState={file:null,doc:null,processing:false,cancel:false};

async function loadPdfJs(){
  if(window.pdfjsLib)return window.pdfjsLib;
  $('#pdfStatus').textContent='PDFエンジンを読み込んでいます…';
  await new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
    s.onload=resolve;
    s.onerror=()=>reject(new Error('PDFエンジンを取得できません'));
    document.head.appendChild(s);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  return window.pdfjsLib;
}

function openPdfImport(){
  pdfImportState.file=null;pdfImportState.doc=null;pdfImportState.cancel=false;
  $('#pdfFileInput').value='';
  $('#pdfFileName').textContent='まだPDFが選ばれていません';
  $('#pdfPageInfo').textContent='';
  $('#pdfStartPage').value=1;$('#pdfEndPage').value='';
  $('#pdfImportBtn').disabled=true;
  $('#pdfProgress').value=0;$('#pdfProgress').max=1;
  $('#pdfStatus').textContent='vFlat Scanで作ったPDFを選んでください。';
  $('#pdfResults').innerHTML='';
  $('#pdfBusinessPct').value=100;
  $('#pdfIncomeType').value='不動産所得';
  $('#pdfPayment').value='現金';
  $('#pdfDefaultCategory').value='雑費';
  $('#pdfPurpose').value='vFlat PDFから取り込み';
  $('#pdfAutoOcr').checked=true;
  $('#pdfDialog').showModal();
}

async function pdfFileSelected(file){
  if(!file)return;
  if(file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name||'')){toast('PDFファイルを選んでください');return}
  pdfImportState.file=file;pdfImportState.doc=null;
  $('#pdfFileName').textContent=`${file.name}（${Math.max(1,Math.round(file.size/1024/1024*10)/10)} MB）`;
  $('#pdfImportBtn').disabled=true;
  $('#pdfStatus').textContent='ページ数を確認しています…';
  try{
    const lib=await loadPdfJs();
    const bytes=new Uint8Array(await file.arrayBuffer());
    const doc=await lib.getDocument({data:bytes}).promise;
    pdfImportState.doc=doc;
    $('#pdfStartPage').max=doc.numPages;$('#pdfEndPage').max=doc.numPages;
    $('#pdfStartPage').value=1;$('#pdfEndPage').value=doc.numPages;
    $('#pdfPageInfo').textContent=`${doc.numPages}ページを検出しました。1ページ＝1レシートとして扱います。`;
    $('#pdfStatus').textContent='準備できました。ページ範囲と初期値を確認してください。';
    $('#pdfImportBtn').disabled=false;
  }catch(e){
    console.error(e);$('#pdfStatus').textContent='PDFを読み込めませんでした。通信状況やPDFファイルを確認してください。';toast('PDFを読み込めませんでした')
  }
}

function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('画像化に失敗しました')),'image/jpeg',.88))}
async function renderPdfPage(doc,pageNo){
  const page=await doc.getPage(pageNo);
  const base=page.getViewport({scale:1});
  const scale=Math.max(1.15,Math.min(2,1800/base.width));
  const viewport=page.getViewport({scale});
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  await page.render({canvasContext:ctx,viewport}).promise;
  return canvasBlob(canvas);
}

function pdfResultRow(pageNo,total,x,amount,ocrDone){
  const row=document.createElement('div');row.className='pdf-result-row';
  row.innerHTML=`<strong>p.${pageNo}</strong><span>${esc(x?.vendor||'（要確認）')}</span><span>${yen(amount||0)}</span><span>${esc(x?.category||$('#pdfDefaultCategory').value)}</span><span class="badge review">${ocrDone?'OCR候補':'手入力候補'}</span>`;
  $('#pdfResults').prepend(row);
}

async function importPdfPages(){
  if(pdfImportState.processing||!pdfImportState.doc)return;
  const doc=pdfImportState.doc;
  let start=Math.max(1,Number($('#pdfStartPage').value)||1),end=Math.min(doc.numPages,Number($('#pdfEndPage').value)||doc.numPages);
  if(start>end){[start,end]=[end,start]}
  const count=end-start+1;
  if(count>100&&!confirm(`${count}ページあります。処理に時間がかかることがあります。続けますか？`))return;
  const autoOcr=$('#pdfAutoOcr').checked;
  const businessPct=Math.min(100,Math.max(0,Number($('#pdfBusinessPct').value)||0));
  const incomeType=$('#pdfIncomeType').value,payment=$('#pdfPayment').value,defaultCategory=$('#pdfDefaultCategory').value;
  const purpose=$('#pdfPurpose').value.trim()||'vFlat PDFから取り込み';
  pdfImportState.processing=true;pdfImportState.cancel=false;
  $('#pdfImportBtn').disabled=true;$('#pdfCancelProcessBtn').hidden=false;$('#pdfCloseBtn').disabled=true;
  $('#pdfProgress').max=count;$('#pdfProgress').value=0;$('#pdfResults').innerHTML='';
  let worker=null,done=0;
  try{
    if(autoOcr){
      $('#pdfStatus').textContent='OCRを準備しています…';
      await loadTesseract();
      worker=await Tesseract.createWorker('jpn+eng',1,{logger:m=>{
        if(m.status==='recognizing text')$('#pdfStatus').textContent=`OCR中… ${Math.round((m.progress||0)*100)}%`;
      }});
    }
    for(let pageNo=start;pageNo<=end;pageNo++){
      if(pdfImportState.cancel)break;
      $('#pdfStatus').textContent=`${pageNo}ページ目を画像にしています…`;
      const blob=await renderPdfPage(doc,pageNo);
      let text='',x={date:'',vendor:'',amount:0,category:defaultCategory};
      if(worker){
        $('#pdfStatus').textContent=`${pageNo}ページ目をOCRしています…`;
        const ret=await worker.recognize(blob);text=ret.data.text||'';x=extractOCR(text);if(!x.category)x.category=defaultCategory;
      }
      const amount=Number(x.amount)||0;
      const base=(pdfImportState.file.name||'vflat').replace(/\.pdf$/i,'').replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,60)||'vflat';
      const rec={
        id:uuid(),date:x.date||localToday(),vendor:x.vendor||'（要確認）',amount,businessPct,expense:Math.round(amount*businessPct/100),
        incomeType,category:x.category||defaultCategory,payment,purpose,
        memo:`PDF一括取り込み：${pdfImportState.file.name} / ${pageNo}ページ目`,ocrText:text,confirmed:false,
        imageBlob:blob,imageName:`${base}-p${String(pageNo).padStart(3,'0')}.jpg`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
      };
      await put(rec);done++;$('#pdfProgress').value=done;pdfResultRow(pageNo,count,x,amount,!!worker);
    }
    if(worker)await worker.terminate();worker=null;
    state.records=await getAll();render();
    if(pdfImportState.cancel){$('#pdfStatus').textContent=`中止しました。${done}件は「要確認」として登録済みです。`;toast(`${done}件を登録して中止しました`)}
    else{$('#pdfStatus').textContent=`完了：${done}件を「要確認」として登録しました。一覧から1件ずつ確認してください。`;toast(`${done}件のレシート候補を登録しました`)}
  }catch(e){
    console.error(e);if(worker)try{await worker.terminate()}catch(_e){};
    state.records=await getAll();render();$('#pdfStatus').textContent=`途中でエラーになりました。完了済みの${done}件は保存されています。`;toast('PDF一括取り込みが途中で止まりました')
  }finally{
    pdfImportState.processing=false;$('#pdfImportBtn').disabled=false;$('#pdfCancelProcessBtn').hidden=true;$('#pdfCloseBtn').disabled=false;
  }
}

function bindPdfImport(){
  categories.forEach(c=>$('#pdfDefaultCategory').insertAdjacentHTML('beforeend',`<option>${c}</option>`));
  $('#pdfImportOpenBtn').onclick=openPdfImport;
  $('#pdfFileInput').onchange=e=>pdfFileSelected(e.target.files[0]);
  $('#pdfImportBtn').onclick=importPdfPages;
  $('#pdfCancelProcessBtn').onclick=()=>{pdfImportState.cancel=true;$('#pdfStatus').textContent='現在のページが終わったら中止します…'};
  $('#pdfCloseBtn').onclick=()=>{if(!pdfImportState.processing)$('#pdfDialog').close()};
}

bindPdfImport();
