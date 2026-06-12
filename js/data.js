function parseLine(line) {
  const res=[]; let cur=''; let q=false;
  for(let i=0;i<line.length;i++){
    if(line[i]==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}
    else if(line[i]===','&&!q){res.push(cur.trim());cur='';}
    else cur+=line[i];
  }
  res.push(cur.trim()); return res;
}

const DB = {
  PRODUCTS_KEY: 'pinkdrake_products',
  SALES_KEY:    'pinkdrake_sales',
  CAIXAS_KEY:   'pinkdrake_caixas',

  /* ── Products ── */
  getProducts() {
    const d = localStorage.getItem(this.PRODUCTS_KEY);
    if (!d) { const p = this.defaults(); this.saveProducts(p); return p; }
    return JSON.parse(d);
  },
  saveProducts(p) { localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(p)); },
  addProduct(p)   { const l=this.getProducts(); p.id=Date.now(); l.push(p); this.saveProducts(l); return p; },
  updateProduct(id,data) {
    const l=this.getProducts(); const i=l.findIndex(p=>p.id===id);
    if(i!==-1){l[i]={...l[i],...data};this.saveProducts(l);return l[i];} return null;
  },
  deleteProduct(id) { this.saveProducts(this.getProducts().filter(p=>p.id!==id)); },

  exportProductsCSV() {
    const p = this.getProducts();
    const h = ['Nome','Categoria','Preço','Descrição','URL Foto','Estoque'];
    const rows = p.map(x=>[x.name,x.category,x.price.toFixed(2).replace('.',','),x.description,x.image||'',x.stock||0]);
    const csv = [h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));
    a.download = `produtos_pinkdrake_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  },

  importProductsCSV(text) {
    const lines = text.trim().split(/\r?\n/).slice(1);
    let count = 0;
    const list = this.getProducts();
    lines.forEach((line,i)=>{
      const c = parseLine(line);
      if (!c[0]||!c[1]) return;
      const price = parseFloat((c[2]||'0').replace(',','.')) || 0;
      list.push({id:Date.now()+i+Math.random()*100|0, name:c[0].trim(), category:c[1].trim(),
        price, description:c[3]||'', image:c[4]||'', stock:parseInt(c[5])||0, active:true});
      count++;
    });
    this.saveProducts(list); return count;
  },

  /* ── Sales ── */
  getSales() { return JSON.parse(localStorage.getItem(this.SALES_KEY)||'[]'); },
  addSale(s) {
    const l=this.getSales(); s.id=Date.now(); s.createdAt=new Date().toISOString();
    l.unshift(s); localStorage.setItem(this.SALES_KEY,JSON.stringify(l)); return s;
  },
  deleteSale(id) { localStorage.setItem(this.SALES_KEY,JSON.stringify(this.getSales().filter(s=>s.id!==id))); },

  exportCSV(sales) {
    const cols=['ID','Data','Cliente','Telefone','Produtos','Total','Tipo','Endereço','Canal','Pagamento','Obs'];
    const rows=sales.map(s=>[
      s.id, new Date(s.createdAt).toLocaleString('pt-BR'),
      s.customerName||'', s.customerPhone||'',
      (s.items||[]).map(i=>`${i.name} x${i.qty}`).join('; '),
      'R$ '+(s.total||0).toFixed(2),
      s.deliveryType==='delivery'?'Entrega':'Retirada',
      s.address||'', s.channel||'WhatsApp',
      s.paymentMethod||'', s.notes||''
    ]);
    const csv=[cols,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));
    a.download=`vendas_pinkdrake_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  },

  /* ── Caixa ── */
  getCaixas()      { return JSON.parse(localStorage.getItem(this.CAIXAS_KEY)||'[]'); },
  saveCaixas(l)    { localStorage.setItem(this.CAIXAS_KEY,JSON.stringify(l)); },
  getOpenCaixa()   { return this.getCaixas().find(c=>!c.closedAt)||null; },

  openCaixa(note) {
    const l=this.getCaixas();
    const c={id:Date.now(),openedAt:new Date().toISOString(),closedAt:null,openingNote:note||'',movements:[]};
    l.unshift(c); this.saveCaixas(l); return c;
  },

  closeCaixa(id, note) {
    const l=this.getCaixas(); const c=l.find(x=>x.id===id);
    if(!c) return null;
    c.closedAt=new Date().toISOString(); c.closingNote=note||'';
    this.saveCaixas(l); return c;
  },

  addMovimento(caixaId, mov) {
    const l=this.getCaixas(); const c=l.find(x=>x.id===caixaId);
    if(!c) return null;
    mov.id=Date.now(); mov.timestamp=new Date().toISOString();
    c.movements.push(mov); this.saveCaixas(l); return mov;
  },

  deleteMovimento(caixaId, movId) {
    const l=this.getCaixas(); const c=l.find(x=>x.id===caixaId);
    if(!c) return;
    c.movements=c.movements.filter(m=>m.id!==movId); this.saveCaixas(l);
  },

  getCaixaTotals(caixa) {
    const t={pix:0,dinheiro:0,debito:0,credito:0,total:0};
    (caixa.movements||[]).filter(m=>m.type==='entrada').forEach(m=>{
      const k=m.paymentMethod||'dinheiro';
      if(t[k]!==undefined) t[k]+=m.amount; else t.dinheiro+=m.amount;
      t.total+=m.amount;
    });
    return t;
  },

  /* ── Defaults ── */
  defaults() {
    return [
      {id:1,name:'Base Líquida Matte',price:45.90,category:'Base',image:'',description:'Alta cobertura, acabamento matte. Longa duração 12h.',stock:10,active:true},
      {id:2,name:'Batom Vermelho Clássico',price:28.90,category:'Batom',image:'',description:'Cor intensa, cremoso e hidratante.',stock:15,active:true},
      {id:3,name:'Paleta de Sombras Rose',price:89.90,category:'Sombra',image:'',description:'12 cores em tons rosados, matte e shimmer.',stock:8,active:true},
      {id:4,name:'Blush Pêssego',price:32.90,category:'Blush',image:'',description:'Tom suave e natural, pó compacto.',stock:12,active:true},
      {id:5,name:'Máscara de Cílios Black',price:39.90,category:'Olhos',image:'',description:'Volumizadora e definidora, à prova d\'água.',stock:20,active:true},
      {id:6,name:'Corretivo HD',price:35.90,category:'Corretivo',image:'',description:'Alta cobertura com textura leve e natural.',stock:14,active:true},
      {id:7,name:'Gloss Rosinha',price:22.90,category:'Batom',image:'',description:'Gloss volumoso com cor rosa suave.',stock:18,active:true},
      {id:8,name:'Contorno Facial',price:55.90,category:'Contorno',image:'',description:'Duo de contorno e iluminador para rosto definido.',stock:9,active:true}
    ];
  }
};
