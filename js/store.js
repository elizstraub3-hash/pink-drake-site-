const WA_NUMBER = '554184999861';
let cart = [];
let deliveryType = 'pickup';
let activeCat = 'all';
let _scrollPos = 0;

// ── Categoria colors
const CAT_COLORS = {
  'Base':'#e91e8c','Batom':'#c2185b','Sombra':'#8e24aa','Blush':'#f06292',
  'Olhos':'#7b1fa2','Corretivo':'#ad1457','Contorno':'#d81b60','Primer':'#e040fb',
  'Pele':'#f48fb1','default':'#C70077'
};

function catColor(cat) { return CAT_COLORS[cat] || CAT_COLORS['default']; }

function init() {
  renderCategories();
  updateBadge();
  window.addEventListener('scroll', () =>
    document.getElementById('header').classList.toggle('scrolled', scrollY > 60)
  );
  window.addEventListener('popstate', () => { syncFromHash(); renderProducts(); });
  document.addEventListener('click', e => {
    const dd = document.getElementById('hCatDropdown');
    if (dd && !dd.contains(e.target)) closeCatMenu();
  });
}

function renderCategories() {
  const cats = [...new Set(DB.getProducts().filter(p=>p.active).map(p=>p.category))];
  // Products area dropdown
  const sel = document.getElementById('catSelect');
  sel.innerHTML = '<option value="all">✨ Todos os Produtos</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
  // Category cards grid
  const grid = document.getElementById('catsGrid');
  if (grid) {
    grid.innerHTML = cats.map(c => `
      <button class="cat-card" onclick="goToCategory('${c}')" style="--cc:${catColor(c)}">
        <span class="cc-icon">💄</span>
        <span class="cc-name">${c}</span>
      </button>`).join('');
  }
  // Header dropdown menu
  const menu = document.getElementById('hCatMenu');
  if (menu) {
    menu.innerHTML =
      `<button class="h-cat-item" onclick="goToCategory('all');closeCatMenu()">✨ Todos os Produtos</button>` +
      cats.map(c => `<button class="h-cat-item" onclick="goToCategory('${c}');closeCatMenu()">${c}</button>`).join('');
  }
  syncFromHash();
  renderProducts();
}

function toggleCatMenu(e) {
  e.stopPropagation();
  document.getElementById('hCatDropdown').classList.toggle('open');
  document.getElementById('hCatMenu').classList.toggle('open');
}
function closeCatMenu() {
  const dd = document.getElementById('hCatDropdown');
  const menu = document.getElementById('hCatMenu');
  if (dd) dd.classList.remove('open');
  if (menu) menu.classList.remove('open');
}

function goToCategory(cat) {
  const sel = document.getElementById('catSelect');
  sel.value = cat;
  activeCat = cat;
  history.pushState(null, '', '#' + encodeURIComponent(cat));
  updateCatTitle();
  renderProducts();
  document.getElementById('products').scrollIntoView({behavior:'smooth'});
}

function syncFromHash() {
  const hash = decodeURIComponent(window.location.hash.replace('#',''));
  const sel = document.getElementById('catSelect');
  const vals = [...sel.options].map(o => o.value);
  if (hash && vals.includes(hash)) { sel.value = hash; activeCat = hash; }
  else { sel.value = 'all'; activeCat = 'all'; }
  updateCatTitle();
}

function filterCatSelect(sel) {
  activeCat = sel.value;
  if (sel.value === 'all') history.pushState(null,'',window.location.pathname);
  else history.pushState(null,'','#' + encodeURIComponent(sel.value));
  updateCatTitle();
  renderProducts();
  document.getElementById('products').scrollIntoView({behavior:'smooth'});
}

function updateCatTitle() {
  const t = document.getElementById('catTitle');
  if (t) t.textContent = activeCat === 'all' ? 'Nossos Produtos 💄' : activeCat + ' 💄';
}

function renderProducts() {
  const list = DB.getProducts().filter(p => p.active && (activeCat==='all' || p.category===activeCat));
  const grid = document.getElementById('productsGrid');
  if (!list.length) { grid.innerHTML = '<p class="no-products">Nenhum produto nesta categoria.</p>'; return; }
  grid.innerHTML = list.map(p => `
    <div class="product-card">
      <div class="product-img">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=img-ph><span>🌸</span></div>'">`
          : `<div class="img-ph"><span>🌸</span></div>`}
        <span class="p-cat">${p.category}</span>
      </div>
      <div class="p-info">
        <h3>${p.name}</h3>
        <p class="p-desc">${p.description}</p>
        <div class="p-bottom">
          <span class="p-price">R$ ${p.price.toFixed(2).replace('.',',')}</span>
          <button class="btn-add" onclick="addToCart(${p.id},this)">+ Adicionar</button>
        </div>
      </div>
    </div>`).join('');
}

// ── Cart ──
function addToCart(id, btn) {
  const p = DB.getProducts().find(x => x.id===id);
  if (!p) return;
  const ex = cart.find(i => i.id===id);
  ex ? ex.qty++ : cart.push({...p, qty:1});
  updateBadge(); renderCartItems(); openCart();
  const orig = btn.innerHTML;
  btn.innerHTML = '✓ Adicionado!'; btn.classList.add('added');
  setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('added'); }, 1400);
}

function removeFromCart(id) { cart = cart.filter(i => i.id!==id); updateBadge(); renderCartItems(); }

function changeQty(id, d) {
  const item = cart.find(i => i.id===id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) removeFromCart(id);
  else { updateBadge(); renderCartItems(); }
}

function cartTotal() { return cart.reduce((s,i) => s + i.price*i.qty, 0); }
function updateBadge() { document.getElementById('cartBadge').textContent = cart.reduce((s,i)=>s+i.qty,0); }

function renderCartItems() {
  const el = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!cart.length) {
    el.innerHTML = '<div class="cart-empty"><span>🛍️</span><p>Carrinho vazio</p></div>';
    footer.style.display = 'none'; return;
  }
  el.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div class="ci-img">${i.image ? `<img src="${i.image}">` : '<span>🌸</span>'}</div>
      <div class="ci-info">
        <p class="ci-name">${i.name}</p>
        <p class="ci-price">R$ ${i.price.toFixed(2).replace('.',',')}</p>
      </div>
      <div class="ci-qty">
        <button onclick="changeQty(${i.id},-1)">−</button>
        <span>${i.qty}</span>
        <button onclick="changeQty(${i.id},+1)">+</button>
      </div>
      <button class="ci-remove" onclick="removeFromCart(${i.id})">✕</button>
    </div>`).join('');
  document.getElementById('cartTotalAmt').textContent = `R$ ${cartTotal().toFixed(2).replace('.',',')}`;
  footer.style.display = 'block';
}

// iOS-safe scroll lock
function lockScroll() {
  _scrollPos = window.scrollY;
  document.body.style.cssText = `position:fixed;top:-${_scrollPos}px;left:0;right:0;overflow-y:scroll;`;
}
function unlockScroll() {
  document.body.style.cssText = '';
  window.scrollTo(0, _scrollPos);
}

function openCart() {
  document.getElementById('cartSide').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  lockScroll();
  renderCartItems();
}
function closeCart() {
  document.getElementById('cartSide').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  unlockScroll();
}
function toggleCart() {
  document.getElementById('cartSide').classList.contains('open') ? closeCart() : openCart();
}

function openCheckout() {
  closeCart();
  document.getElementById('sumItems').innerHTML = cart.map(i =>
    `<div class="sum-row"><span>${i.name} ×${i.qty}</span><span>R$ ${(i.price*i.qty).toFixed(2).replace('.',',')}</span></div>`
  ).join('');
  document.getElementById('sumTotal').textContent = `R$ ${cartTotal().toFixed(2).replace('.',',')}`;
  document.getElementById('checkoutOverlay').classList.add('open');
  lockScroll();
}
function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('open');
  unlockScroll();
}

function setDelivery(type) {
  deliveryType = type;
  document.getElementById('btnPickup').classList.toggle('active', type==='pickup');
  document.getElementById('btnDelivery').classList.toggle('active', type==='delivery');
  document.getElementById('addrGroup').style.display = type==='delivery' ? 'block' : 'none';
}

function sendWhatsApp() {
  const name = document.getElementById('cName').value.trim();
  if (!name) { alert('Por favor, informe seu nome!'); document.getElementById('cName').focus(); return; }
  if (deliveryType==='delivery' && !document.getElementById('cAddr').value.trim()) {
    alert('Informe o endereço de entrega!'); document.getElementById('cAddr').focus(); return;
  }
  const phone = document.getElementById('cPhone').value.trim();
  const addr  = document.getElementById('cAddr').value.trim();
  const notes = document.getElementById('cNotes').value.trim();

  let msg = `Olá! Quero finalizar meu pedido na *Pink Drake* 💕\n\n`;
  msg += `*👤 Nome:* ${name}\n`;
  if (phone) msg += `*📱 Telefone:* ${phone}\n`;
  msg += `\n*🛒 Itens do Pedido:*\n`;
  cart.forEach(i => msg += `• ${i.name} ×${i.qty} — R$ ${(i.price*i.qty).toFixed(2).replace('.',',')}\n`);
  msg += `\n*💰 Total: R$ ${cartTotal().toFixed(2).replace('.',',')}*\n`;
  msg += `\n*📦 Recebimento:* ${deliveryType==='delivery' ? 'Entrega 🛵' : 'Retirada 🏪'}\n`;
  if (deliveryType==='delivery' && addr) msg += `*📍 Endereço:* ${addr}\n`;
  if (notes) msg += `\n*📝 Obs:* ${notes}\n`;
  msg += `\nAguardo confirmação! 🌸`;

  DB.addSale({
    customerName:name, customerPhone:phone,
    items:cart.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})),
    total:cartTotal(), deliveryType, address:addr, notes, channel:'WhatsApp'
  });

  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  cart = []; updateBadge(); closeCheckout();

  const s = document.createElement('div');
  s.className = 'success-toast';
  s.innerHTML = `<span>💕</span><div><strong>Pedido enviado!</strong><p>Obrigada, ${name}! Aguarde nossa confirmação.</p></div>`;
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 4500);
}

// ── Scroll helpers ──
function scrollToHome()     { window.scrollTo({top:0,behavior:'smooth'}); }
function scrollToCats()     { document.getElementById('categories').scrollIntoView({behavior:'smooth'}); }
function scrollToProducts() { document.getElementById('products').scrollIntoView({behavior:'smooth'}); }

// ── Footer secret: 7 cliques abre admin ──
let _fc=0, _ft;
function footerSecret() {
  _fc++;
  clearTimeout(_ft);
  if (_fc>=7) { _fc=0; window.location.href='admin.html'; }
  else _ft = setTimeout(()=>_fc=0, 2500);
}

document.addEventListener('DOMContentLoaded', init);
