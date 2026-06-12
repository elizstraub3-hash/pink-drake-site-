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
    sessionStorage.setItem('pink_auth','1');
    checkAuth();
  } else {
    document.getElementById('loginErr').style.display = 'block';
    document.getElementById('pwd').value = '';
    setTimeout(() => document.getElementById('loginErr').style.display = 'none', 3000);
  }
}

function doLogout() { sessionStorage.removeItem('pink_auth'); checkAuth(); }

document.addEventListener('keypress', e => {
  if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') doLogin();
});

/* ── Navigation ── */
function loadSection(sec) {
  currentSection = sec;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.sec === sec));
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  const el = document.getElementById('sec-' + sec);
  if (el) el.style.display = 'block';
  if (sec === 'dashboard') loadDashboard();
  if (sec === 'products')  loadProducts();
  if (sec === 'sales')     loadSales();
  closeSidebar();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
function closeSidebar()  { document.getElementById('sidebar').classList.remove('open'); }

/* ── Dashboard ── */
function loadDashboard() {
  const sales = DB.getSales();
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today);
  set('dash-total-sales', sales.length);
  set('dash-today-sales', todaySales.length);
  set('dash-revenue-total', 'R$ ' + sales.reduce((a,s)=>a+(s.total||0),0).toFixed(2).replace('.',','));
  set('dash-revenue-today', 'R$ ' + todaySales.reduce((a,s)=>a+(s.total||0),0).toFixed(2).replace('.',','));
  set('dash-products', DB.getProducts().filter(p=>p.active).length);

  const recent = sales.slice(0,5);
  const el = document.getElementById('recentSales');
  el.innerHTML = !recent.length
    ? '<p class="empty-msg">Nenhuma venda ainda.</p>'
    : recent.map(s=>`
      <div class="recent-row">
        <div class="rr-left">
          <strong>${s.customerName||'—'}</strong>
          <span class="badge b-${s.deliveryType==='delivery'?'delivery':'pickup'}">${s.deliveryType==='delivery'?'Entrega':'Retirada'}</span>
          <span class="badge b-ch">${s.channel||'WhatsApp'}</span>
        </div>
        <div class="rr-right">
          <span class="rr-date">${fmt(s.createdAt)}</span>
          <strong class="rr-val">R$ ${(s.total||0).toFixed(2).replace('.',',')}</strong>
        </div>
      </div>`).join('');
}

/* ── Products ── */
function loadProducts() {
  const list = DB.getProducts();
  const tbody = document.getElementById('prodTbody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Nenhum produto.</td></tr>'; return; }
  tbody.innerHTML = list.map(p=>`
    <tr class="${p.active?'':'row-off'}">
      <td>${p.image?`<img src="${p.image}" class="p-thumb" onerror="this.style.display='none'">`:'<div class="p-thumb-ph">🌸</div>'}</td>
      <td><strong>${p.name}</strong><br><small>${p.description.slice(0,50)}...</small></td>
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
  editingId = id || null;
  const p = id ? DB.getProducts().find(x=>x.id===id) : null;
  document.getElementById('prodModalTitle').textContent = p ? 'Editar Produto' : 'Novo Produto';
  if (p) {
    setVal('pName', p.name); setVal('pPrice', p.price); setVal('pCat', p.category);
    setVal('pDesc', p.description); setVal('pImg', p.image||''); setVal('pStock', p.stock||0);
    document.getElementById('pActive').checked = p.active;
  } else {
    document.getElementById('prodForm').reset();
    document.getElementById('pActive').checked = true;
  }
  document.getElementById('prodModal').classList.add('open');
}

function closeProdModal() { document.getElementById('prodModal').classList.remove('open'); editingId = null; }

function saveProd() {
  const name  = getVal('pName').trim();
  const price = parseFloat(getVal('pPrice'));
  const cat   = getVal('pCat').trim();
  if (!name || isNaN(price) || !cat) { alert('Preencha Nome, Preço e Categoria!'); return; }
  const data = { name, price, category:cat, description:getVal('pDesc'), image:getVal('pImg'), stock:parseInt(getVal('pStock'))||0, active:document.getElementById('pActive').checked };
  editingId ? DB.updateProduct(editingId, data) : DB.addProduct(data);
  closeProdModal(); loadProducts();
}

function toggleProd(id) {
  const p = DB.getProducts().find(x=>x.id===id);
  if (p) { DB.updateProduct(id,{active:!p.active}); loadProducts(); }
}

function delProd(id) {
  if (confirm('Excluir este produto?')) { DB.deleteProduct(id); loadProducts(); }
}

/* ── Sales ── */
function loadSales() {
  let list = DB.getSales();
  const n = getVal('fName').toLowerCase();
  const t = getVal('fType');
  const c = getVal('fChan');
  if (n) list = list.filter(s=>(s.customerName||'').toLowerCase().includes(n));
  if (t !== 'all') list = list.filter(s=>s.deliveryType===t);
  if (c !== 'all') list = list.filter(s=>(s.channel||'WhatsApp')===c);

  set('salesCount', list.length + ' venda(s)');
  document.getElementById('exportBtn').disabled = !list.length;

  const tbody = document.getElementById('salesTbody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">Nenhuma venda encontrada.</td></tr>'; return; }
  tbody.innerHTML = list.map(s=>`
    <tr>
      <td>${fmt(s.createdAt)}</td>
      <td><strong>${s.customerName||'—'}</strong>${s.customerPhone?`<br><small>${s.customerPhone}</small>`:''}</td>
      <td class="items-cell">${(s.items||[]).map(i=>`${i.name} ×${i.qty}`).join('<br>')}</td>
      <td><strong>R$ ${(s.total||0).toFixed(2).replace('.',',')}</strong></td>
      <td><span class="badge b-${s.deliveryType==='delivery'?'delivery':'pickup'}">${s.deliveryType==='delivery'?'🛵 Entrega':'🏪 Retirada'}</span></td>
      <td><span class="badge b-ch">${s.channel||'WhatsApp'}</span></td>
      <td><button class="act-btn del-btn" onclick="delSale(${s.id})" title="Excluir">🗑️</button></td>
    </tr>`).join('');
}

function delSale(id) {
  if (confirm('Excluir esta venda?')) { DB.deleteSale(id); loadSales(); loadDashboard(); }
}

function exportSales() {
  let list = DB.getSales();
  const n = getVal('fName').toLowerCase();
  const t = getVal('fType');
  const c = getVal('fChan');
  if (n) list = list.filter(s=>(s.customerName||'').toLowerCase().includes(n));
  if (t !== 'all') list = list.filter(s=>s.deliveryType===t);
  if (c !== 'all') list = list.filter(s=>(s.channel||'WhatsApp')===c);
  DB.exportCSV(list);
}

/* ── Manual Sale Modal ── */
function openManualModal(channel) {
  document.getElementById('mChan').value = channel || 'Manual';
  document.getElementById('manualForm').reset();
  document.getElementById('mItems').innerHTML = '';
  addItem();
  document.getElementById('manualModal').classList.add('open');
}

function closeManualModal() { document.getElementById('manualModal').classList.remove('open'); }

function addItem() {
  const prods = DB.getProducts().filter(p=>p.active);
  const div = document.createElement('div');
  div.className = 'mitem';
  div.innerHTML = `
    <select onchange="updItem(this)">
      <option value="">Selecione</option>
      ${prods.map(p=>`<option value="${p.id}" data-price="${p.price}" data-name="${p.name}">${p.name} — R$ ${p.price.toFixed(2).replace('.',',')}</option>`).join('')}
    </select>
    <input type="number" name="qty" min="1" value="1" oninput="updTotal()">
    <input type="text" name="subtotal" readonly placeholder="—">
    <button type="button" onclick="this.parentElement.remove();updTotal()">✕</button>`;
  document.getElementById('mItems').appendChild(div);
}

function updItem(sel) {
  const opt = sel.selectedOptions[0];
  const sub = sel.parentElement.querySelector('[name=subtotal]');
  sub.value = opt?.dataset.price ? 'R$ ' + parseFloat(opt.dataset.price).toFixed(2).replace('.',',') : '';
  updTotal();
}

function updTotal() {
  let t = 0;
  document.querySelectorAll('.mitem').forEach(d => {
    const sel = d.querySelector('select');
    const qty = parseInt(d.querySelector('[name=qty]').value)||0;
    const opt = sel.selectedOptions[0];
    if (opt?.dataset.price) t += parseFloat(opt.dataset.price)*qty;
  });
  set('mTotal','R$ ' + t.toFixed(2).replace('.',','));
}

function saveManualSale() {
  const name = getVal('mName').trim();
  if (!name) { alert('Informe o nome da cliente!'); return; }
  const items = [];
  let total = 0;
  document.querySelectorAll('.mitem').forEach(d => {
    const sel = d.querySelector('select');
    const opt = sel.selectedOptions[0];
    const qty = parseInt(d.querySelector('[name=qty]').value)||1;
    if (opt?.dataset.price) {
      const price = parseFloat(opt.dataset.price);
      items.push({id:parseInt(sel.value), name:opt.dataset.name, price, qty});
      total += price * qty;
    }
  });
  if (!items.length) { alert('Adicione pelo menos um produto!'); return; }
  DB.addSale({
    customerName: name, customerPhone: getVal('mPhone'),
    items, total,
    deliveryType: getVal('mType'),
    address: getVal('mAddr'),
    notes: getVal('mNotes'),
    channel: getVal('mChan')
  });
  closeManualModal(); loadSales();
  if (currentSection === 'dashboard') loadDashboard();
  alert(`✅ Venda de ${name} (R$ ${total.toFixed(2).replace('.',',')}) registrada!`);
}

/* ── Helpers ── */
function fmt(iso) { return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); }
function set(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }
function getVal(id) { const el=document.getElementById(id); return el?el.value:''; }
function setVal(id, v) { const el=document.getElementById(id); if(el) el.value=v; }

function togglePwd() {
  const inp = document.getElementById('pwd');
  const open = document.getElementById('eyeOpen');
  const closed = document.getElementById('eyeClosed');
  if (inp.type === 'password') {
    inp.type = 'text';
    open.style.display = 'none';
    closed.style.display = 'block';
  } else {
    inp.type = 'password';
    open.style.display = 'block';
    closed.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', checkAuth);
