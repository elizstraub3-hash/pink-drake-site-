// Senha do painel: pink2024
const ADMIN_PWD = 'pink2024';
let editingId = null;
let currentSection = 'dashboard';

/* ── Auth ── */
function checkAuth() {
  const ok = sessionStorage.getItem('pink_auth');
  document.getElementById('loginScreen').style.display = ok ? 'none' : 'flex';
  document.getElementById('adminApp').style.display  = ok ? 'flex' : 'none';
  if (ok) loadSection('dashboard');
}
function doLogin() {
  if (document.getElementById('pwd').value === ADMIN_PWD) {
    sessionStorage.setItem('pink_auth','1'); checkAuth();
  } else {
    document.getElementById('loginErr').style.display='block';
    document.getElementById('pwd').value='';
    setTimeout(()=>document.getElementById('loginErr').style.display='none',3000);
  }
}
function doLogout() { sessionStorage.removeItem('pink_auth'); checkAuth(); }
function togglePwd() {
  const inp=document.getElementById('pwd');
  const o=document.getElementById('eyeOpen'); const c=document.getElementById('eyeClosed');
  if(inp.type==='password'){inp.type='text';o.style.display='none';c.style.display='block';}
  else{inp.type='password';o.style.display='block';c.style.display='none';}
}
document.addEventListener('keypress',e=>{
  if(e.key==='Enter'&&document.getElementById('loginScreen').style.display!=='none') doLogin();
});

/* ── Navigation ── */
function loadSection(sec) {
  currentSection=sec;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.sec===sec));
  document.querySelectorAll('.admin-section').forEach(s=>s.style.display='none');
  const el=document.getElementById('sec-'+sec); if(el) el.style.display='block';
  if(sec==='dashboard') loadDashboard();
  if(sec==='products')  loadProducts();
  if(sec==='sales')     loadSales();
  if(sec==='caixa')     loadCaixa();
  if(sec==='calc')      initCalc();
  closeSidebar();
}
function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('open'); }
function closeSidebar(){  document.getElementById('sidebar').classList.remove('open'); }

/* ── Dashboard ── */
function loadDashboard() {
  const sales=DB.getSales(); const today=new Date().toDateString();
  const ts=sales.filter(s=>new Date(s.createdAt).toDateString()===today);
  set('dash-total-sales',sales.length);
  set('dash-today-sales',ts.length);
  set('dash-revenue-total','R$ '+sales.reduce((a,s)=>a+(s.total||0),0).toFixed(2).replace('.',','));
  set('dash-revenue-today','R$ '+ts.reduce((a,s)=>a+(s.total||0),0).toFixed(2).replace('.',','));
  set('dash-products',DB.getProducts().filter(p=>p.active).length);
  const caixa=DB.getOpenCaixa();
  set('dash-caixa-status', caixa ? '🟢 Aberto' : '🔴 Fechado');
  const recent=sales.slice(0,5);
  const el=document.getElementById('recentSales');
  el.innerHTML=!recent.length?'<p class="empty-msg">Nenhuma venda ainda.</p>':
    recent.map(s=>`<div class="recent-row">
      <div class="rr-left">
        <strong>${s.customerName||'—'}</strong>
        <span class="badge b-${s.deliveryType==='delivery'?'delivery':'pickup'}">${s.deliveryType==='delivery'?'Entrega':'Retirada'}</span>
        <span class="badge b-ch">${s.channel||'WhatsApp'}</span>
        ${s.paymentMethod?`<span class="badge b-pay">${pmLabel(s.paymentMethod)}</span>`:''}
      </div>
      <div class="rr-right">
        <span class="rr-date">${fmt(s.createdAt)}</span>
        <strong class="rr-val">R$ ${(s.total||0).toFixed(2).replace('.',',')}</strong>
      </div>
    </div>`).join('');
}

/* ── Products ── */
function loadProducts() {
  const list=DB.getProducts(); const tbody=document.getElementById('prodTbody');
  if(!list.length){tbody.innerHTML='<tr><td colspan="6" class="empty-msg">Nenhum produto.</td></tr>';return;}
  tbody.innerHTML=list.map(p=>`<tr class="${p.active?'':'row-off'}">
    <td>${p.image?`<img src="${p.image}" class="p-thumb" onerror="this.style.display='none'">`:
      '<div class="p-thumb-ph">🌸</div>'}</td>
    <td><strong>${p.name}</strong><br><small style="color:#999">${p.description.slice(0,45)}...</small></td>
    <td>${p.category}</td>
    <td><strong>R$ ${p.price.toFixed(2).replace('.',',')}</strong></td>
    <td><span class="badge ${p.active?'b-on':'b-off'}">${p.active?'Ativo':'Inativo'}</span></td>
    <td class="act-cell">
      <button class="act-btn edit-btn" onclick="openProdModal(${p.id})" title="Editar">✏️</button>
      <button class="act-btn tog-btn"  onclick="toggleProd(${p.id})"   title="${p.active?'Desativar':'Ativar'}">${p.active?'👁️‍🗨️':'👁️'}</button>
      <button class="act-btn del-btn"  onclick="delProd(${p.id})"      title="Excluir">🗑️</button>
    </td>
  </tr>`).join('');
}

function openProdModal(id) {
  editingId=id||null;
  const p=id?DB.getProducts().find(x=>x.id===id):null;
  document.getElementById('prodModalTitle').textContent=p?'Editar Produto':'Novo Produto';
  if(p){setVal('pName',p.name);setVal('pPrice',p.price);setVal('pCat',p.category);
    setVal('pDesc',p.description);setVal('pImg',p.image||'');setVal('pStock',p.stock||0);
    document.getElementById('pActive').checked=p.active;}
  else{document.getElementById('prodForm').reset();document.getElementById('pActive').checked=true;}
  document.getElementById('prodModal').classList.add('open');
}
function closeProdModal(){ document.getElementById('prodModal').classList.remove('open');editingId=null; }
function saveProd() {
  const name=getVal('pName').trim(),price=parseFloat(getVal('pPrice')),cat=getVal('pCat').trim();
  if(!name||isNaN(price)||!cat){alert('Preencha Nome, Preço e Categoria!');return;}
  const d={name,price,category:cat,description:getVal('pDesc'),image:getVal('pImg'),
    stock:parseInt(getVal('pStock'))||0,active:document.getElementById('pActive').checked};
  editingId?DB.updateProduct(editingId,d):DB.addProduct(d);
  closeProdModal();loadProducts();
}
function toggleProd(id){const p=DB.getProducts().find(x=>x.id===id);if(p){DB.updateProduct(id,{active:!p.active});loadProducts();}}
function delProd(id){if(confirm('Excluir este produto?')){DB.deleteProduct(id);loadProducts();}}

function exportProducts(){ DB.exportProductsCSV(); }
function importProducts() {
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv';
  inp.onchange=e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const count=DB.importProductsCSV(ev.target.result);
      alert(`✅ ${count} produto(s) importado(s) com sucesso!`);
      loadProducts();
    };
    reader.readAsText(file,'UTF-8');
  };
  inp.click();
}

/* ── Sales ── */
function loadSales() {
  let list=DB.getSales();
  const n=getVal('fName').toLowerCase(), t=getVal('fType'), c=getVal('fChan'), pm=getVal('fPay');
  if(n) list=list.filter(s=>(s.customerName||'').toLowerCase().includes(n));
  if(t!=='all') list=list.filter(s=>s.deliveryType===t);
  if(c!=='all') list=list.filter(s=>(s.channel||'WhatsApp')===c);
  if(pm!=='all') list=list.filter(s=>(s.paymentMethod||'')===pm);
  set('salesCount',list.length+' venda(s)');
  document.getElementById('exportBtn').disabled=!list.length;
  const tbody=document.getElementById('salesTbody');
  if(!list.length){tbody.innerHTML='<tr><td colspan="8" class="empty-msg">Nenhuma venda encontrada.</td></tr>';return;}
  tbody.innerHTML=list.map(s=>`<tr>
    <td>${fmt(s.createdAt)}</td>
    <td><strong>${s.customerName||'—'}</strong>${s.customerPhone?`<br><small>${s.customerPhone}</small>`:''}</td>
    <td class="items-cell">${(s.items||[]).map(i=>`${i.name} ×${i.qty}`).join('<br>')}</td>
    <td><strong>R$ ${(s.total||0).toFixed(2).replace('.',',')}</strong></td>
    <td><span class="badge b-${s.deliveryType==='delivery'?'delivery':'pickup'}">${s.deliveryType==='delivery'?'🛵':'🏪'} ${s.deliveryType==='delivery'?'Entrega':'Retirada'}</span></td>
    <td><span class="badge b-ch">${s.channel||'WhatsApp'}</span></td>
    <td>${s.paymentMethod?`<span class="badge b-pay">${pmLabel(s.paymentMethod)}</span>`:'<span style="color:#ccc">—</span>'}</td>
    <td><button class="act-btn del-btn" onclick="delSale(${s.id})" title="Excluir">🗑️</button></td>
  </tr>`).join('');
}
function delSale(id){if(confirm('Excluir esta venda?')){DB.deleteSale(id);loadSales();loadDashboard();}}
function exportSales(){
  let list=DB.getSales();
  const n=getVal('fName').toLowerCase(),t=getVal('fType'),c=getVal('fChan'),pm=getVal('fPay');
  if(n) list=list.filter(s=>(s.customerName||'').toLowerCase().includes(n));
  if(t!=='all') list=list.filter(s=>s.deliveryType===t);
  if(c!=='all') list=list.filter(s=>(s.channel||'WhatsApp')===c);
  if(pm!=='all') list=list.filter(s=>(s.paymentMethod||'')===pm);
  DB.exportCSV(list);
}

/* ── Manual Sale ── */
function openManualModal(channel) {
  document.getElementById('mChan').value=channel||'Manual';
  document.getElementById('manualForm').reset();
  document.getElementById('mItems').innerHTML='';
  addItem();
  document.getElementById('manualModal').classList.add('open');
}
function closeManualModal(){ document.getElementById('manualModal').classList.remove('open'); }
function addItem() {
  const prods=DB.getProducts().filter(p=>p.active);
  const div=document.createElement('div'); div.className='mitem';
  div.innerHTML=`<select onchange="updItem(this)">
    <option value="">Selecione</option>
    ${prods.map(p=>`<option value="${p.id}" data-price="${p.price}" data-name="${p.name}">${p.name} — R$ ${p.price.toFixed(2).replace('.',',')}</option>`).join('')}
  </select>
  <input type="number" name="qty" min="1" value="1" oninput="updTotal()">
  <input type="text" name="subtotal" readonly placeholder="—">
  <button type="button" onclick="this.parentElement.remove();updTotal()">✕</button>`;
  document.getElementById('mItems').appendChild(div);
}
function updItem(sel) {
  const opt=sel.selectedOptions[0];
  const sub=sel.parentElement.querySelector('[name=subtotal]');
  sub.value=opt?.dataset.price?'R$ '+parseFloat(opt.dataset.price).toFixed(2).replace('.',','):'';
  updTotal();
}
function updTotal() {
  let t=0;
  document.querySelectorAll('.mitem').forEach(d=>{
    const sel=d.querySelector('select'), qty=parseInt(d.querySelector('[name=qty]').value)||0, opt=sel.selectedOptions[0];
    if(opt?.dataset.price) t+=parseFloat(opt.dataset.price)*qty;
  });
  set('mTotal','R$ '+t.toFixed(2).replace('.',','));
}
function saveManualSale() {
  const name=getVal('mName').trim(); if(!name){alert('Informe o nome da cliente!');return;}
  const items=[]; let total=0;
  document.querySelectorAll('.mitem').forEach(d=>{
    const sel=d.querySelector('select'),opt=sel.selectedOptions[0],qty=parseInt(d.querySelector('[name=qty]').value)||1;
    if(opt?.dataset.price){const price=parseFloat(opt.dataset.price);items.push({id:parseInt(sel.value),name:opt.dataset.name,price,qty});total+=price*qty;}
  });
  if(!items.length){alert('Adicione pelo menos um produto!');return;}
  const pm=getVal('mPay');
  const sale=DB.addSale({customerName:name,customerPhone:getVal('mPhone'),items,total,
    deliveryType:getVal('mType'),address:getVal('mAddr'),notes:getVal('mNotes'),
    channel:getVal('mChan'),paymentMethod:pm});
  // Registrar no caixa se aberto
  const caixa=DB.getOpenCaixa();
  if(caixa&&pm){
    DB.addMovimento(caixa.id,{type:'entrada',paymentMethod:pm,amount:total,
      description:`Venda #${sale.id} — ${name}`,saleId:sale.id});
  }
  closeManualModal();loadSales();
  if(currentSection==='dashboard') loadDashboard();
  if(currentSection==='caixa') loadCaixa();
  alert(`✅ Venda de ${name} (R$ ${total.toFixed(2).replace('.',',')}) registrada!${caixa&&pm?' Registrada no caixa.':''}`);
}

/* ── Caixa ── */
function loadCaixa() {
  const caixa=DB.getOpenCaixa();
  const statusEl=document.getElementById('caixaStatusBadge');
  const btnOpen=document.getElementById('btnOpenCaixa');
  const btnClose=document.getElementById('btnCloseCaixa');

  if(caixa) {
    statusEl.innerHTML=`<span class="caixa-badge open">🟢 CAIXA ABERTO</span><span class="caixa-since">desde ${fmt(caixa.openedAt)}</span>`;
    btnOpen.style.display='none'; btnClose.style.display='inline-flex';
    const t=DB.getCaixaTotals(caixa);
    document.getElementById('caixaTotals').innerHTML=`
      <div class="totals-grid">
        <div class="total-card pix">  <span>💙 Pix</span>     <strong>R$ ${t.pix.toFixed(2).replace('.',',')}</strong></div>
        <div class="total-card cash"> <span>💵 Dinheiro</span> <strong>R$ ${t.dinheiro.toFixed(2).replace('.',',')}</strong></div>
        <div class="total-card debit"><span>💳 Débito</span>   <strong>R$ ${t.debito.toFixed(2).replace('.',',')}</strong></div>
        <div class="total-card credit"><span>💳 Crédito</span> <strong>R$ ${t.credito.toFixed(2).replace('.',',')}</strong></div>
        <div class="total-card total"><span>💰 TOTAL</span>    <strong>R$ ${t.total.toFixed(2).replace('.',',')}</strong></div>
      </div>`;
    renderMovimentos(caixa);
  } else {
    statusEl.innerHTML=`<span class="caixa-badge closed">🔴 CAIXA FECHADO</span>`;
    btnOpen.style.display='inline-flex'; btnClose.style.display='none';
    document.getElementById('caixaTotals').innerHTML='<p class="empty-msg">Abra o caixa para ver os totais.</p>';
    document.getElementById('movimentosBody').innerHTML='<tr><td colspan="5" class="empty-msg">Nenhum movimento.</td></tr>';
  }
  loadCaixaHistory();
}

function renderMovimentos(caixa) {
  const tbody=document.getElementById('movimentosBody');
  const movs=[...caixa.movements].reverse();
  if(!movs.length){tbody.innerHTML='<tr><td colspan="5" class="empty-msg">Nenhum movimento ainda.</td></tr>';return;}
  tbody.innerHTML=movs.map(m=>`<tr>
    <td>${fmt(m.timestamp)}</td>
    <td><span class="badge b-pay">${pmLabel(m.paymentMethod)}</span></td>
    <td>${m.description||'—'}</td>
    <td><strong class="${m.type==='entrada'?'val-in':'val-out'}">
      ${m.type==='entrada'?'+':'−'} R$ ${m.amount.toFixed(2).replace('.',',')}
    </strong></td>
    <td><button class="act-btn del-btn" onclick="delMovimento(${caixa.id},${m.id})">🗑️</button></td>
  </tr>`).join('');
}

function delMovimento(caixaId,movId){
  if(confirm('Excluir este movimento?')){DB.deleteMovimento(caixaId,movId);loadCaixa();}
}

function loadCaixaHistory() {
  const list=DB.getCaixas().filter(c=>c.closedAt);
  const el=document.getElementById('caixaHistory');
  if(!list.length){el.innerHTML='<p class="empty-msg">Nenhum caixa fechado ainda.</p>';return;}
  el.innerHTML=list.slice(0,5).map(c=>{
    const t=DB.getCaixaTotals(c);
    return `<div class="hist-row">
      <div><strong>${fmt(c.openedAt)}</strong> → <strong>${fmt(c.closedAt)}</strong></div>
      <div class="hist-totals">
        <span>💙 R$ ${t.pix.toFixed(2).replace('.',',')}</span>
        <span>💵 R$ ${t.dinheiro.toFixed(2).replace('.',',')}</span>
        <span>💳Deb R$ ${t.debito.toFixed(2).replace('.',',')}</span>
        <span>💳Cre R$ ${t.credito.toFixed(2).replace('.',',')}</span>
        <strong>Total: R$ ${t.total.toFixed(2).replace('.',',')}</strong>
      </div>
    </div>`;
  }).join('');
}

function abrirCaixa() {
  const note=prompt('Observação de abertura (opcional):')||'';
  DB.openCaixa(note); loadCaixa(); loadDashboard();
  alert('✅ Caixa aberto!');
}

function fecharCaixa() {
  const caixa=DB.getOpenCaixa(); if(!caixa) return;
  const t=DB.getCaixaTotals(caixa);
  const resumo=`Pix: R$ ${t.pix.toFixed(2).replace('.',',')}\nDinheiro: R$ ${t.dinheiro.toFixed(2).replace('.',',')}\nDébito: R$ ${t.debito.toFixed(2).replace('.',',')}\nCrédito: R$ ${t.credito.toFixed(2).replace('.',',')}\nTOTAL: R$ ${t.total.toFixed(2).replace('.',',')}`;
  if(!confirm(`Fechar o caixa?\n\n${resumo}`)) return;
  const note=prompt('Observação de fechamento (opcional):')||'';
  DB.closeCaixa(caixa.id,note); loadCaixa(); loadDashboard();
  alert('✅ Caixa fechado!');
}

function openAddMovModal() {
  const caixa=DB.getOpenCaixa();
  if(!caixa){alert('Abra o caixa primeiro!');return;}
  document.getElementById('movModal').classList.add('open');
  document.getElementById('movForm').reset();
}
function closeMovModal(){ document.getElementById('movModal').classList.remove('open'); }
function saveMovimento() {
  const caixa=DB.getOpenCaixa(); if(!caixa){alert('Caixa fechado!');return;}
  const pm=getVal('movPay'), amount=parseFloat(getVal('movAmount')), desc=getVal('movDesc').trim();
  if(!pm||isNaN(amount)||amount<=0){alert('Preencha o valor e a forma de pagamento!');return;}
  DB.addMovimento(caixa.id,{type:'entrada',paymentMethod:pm,amount,description:desc||'Entrada manual'});
  closeMovModal(); loadCaixa();
}

/* ── Calculator ── */
let calcDisplay='0'; let calcPrev=''; let calcOp=''; let calcNew=true;
function initCalc() { updateCalcDisplay(); }
function calcPress(val) {
  if(val==='C'){calcDisplay='0';calcPrev='';calcOp='';calcNew=true;}
  else if(val==='±'){calcDisplay=String(-parseFloat(calcDisplay));}
  else if(val==='%'){calcDisplay=String(parseFloat(calcDisplay)/100);}
  else if(['+','-','×','÷'].includes(val)){
    if(calcOp&&!calcNew) calcEqual();
    calcPrev=calcDisplay; calcOp=val; calcNew=true;
  }
  else if(val==='='){calcEqual();}
  else if(val==='.'){
    if(calcNew){calcDisplay='0.';calcNew=false;}
    else if(!calcDisplay.includes('.')) calcDisplay+='.';
  }
  else {
    if(calcNew||calcDisplay==='0'){calcDisplay=val;calcNew=false;}
    else calcDisplay+=val;
    if(calcDisplay.length>12) calcDisplay=calcDisplay.slice(0,-1);
  }
  updateCalcDisplay();
}
function calcEqual() {
  if(!calcOp||!calcPrev) return;
  const a=parseFloat(calcPrev), b=parseFloat(calcDisplay);
  let r;
  if(calcOp==='+') r=a+b;
  else if(calcOp==='-') r=a-b;
  else if(calcOp==='×') r=a*b;
  else if(calcOp==='÷') r=b!==0?a/b:0;
  calcDisplay=String(parseFloat(r.toFixed(10)));
  calcOp=''; calcPrev=''; calcNew=true;
  updateCalcDisplay();
}
function updateCalcDisplay() {
  const el=document.getElementById('calcDisplay'); if(el) el.textContent=calcDisplay;
}

/* ── Helpers ── */
function pmLabel(pm) {
  const map={pix:'💙 Pix',dinheiro:'💵 Dinheiro',debito:'💳 Débito',credito:'💳 Crédito'};
  return map[pm]||pm||'—';
}
function fmt(iso){ return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function set(id,v){ const el=document.getElementById(id);if(el)el.textContent=v; }
function getVal(id){ const el=document.getElementById(id);return el?el.value:''; }
function setVal(id,v){ const el=document.getElementById(id);if(el)el.value=v; }

document.addEventListener('DOMContentLoaded', checkAuth);
