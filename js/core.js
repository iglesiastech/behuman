// ── API REST directa — sin SDK, sin SharedWorker, sin Headers error ──
const SUPABASE_URL    = 'https://ncebqouvfkgobbaihuhf.supabase.co';
const SUPABASE_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZWJxb3V2Zmtnb2JiYWlodWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODAzNzAsImV4cCI6MjA5MzU1NjM3MH0.UUm6RlO9jHDR2FXIB3C0qFAtRtGRdMRhoVeNf9AdMFY';
// service_role removida del cliente por seguridad: las subidas a Storage
// ahora usan el JWT del admin logueado + una policy de Storage en Supabase.

let _authToken = null; // se llena al hacer login

// ── Llamada genérica a la API REST ──
async function sbFetch(path, options = {}) {
  const headers = {
    'apikey':        SUPABASE_ANON,
    'Authorization': 'Bearer ' + (_authToken || SUPABASE_ANON),
    'Content-Type':  'application/json',
    'Prefer':        options.prefer || '',
  };
  if(options.returning) headers['Prefer'] = 'return=representation';

  const res = await fetch(SUPABASE_URL + path, {
    method:  options.method || 'GET',
    headers,
    body:    options.body ? JSON.stringify(options.body) : undefined,
  });

  if(!res.ok) {
    const err = await res.json().catch(()=>({message: res.statusText}));
    throw new Error(err.message || err.error || res.statusText);
  }
  if(res.status === 204) return { data: null, error: null };
  const data = await res.json();
  return { data, error: null };
}

// ── Builder de queries ──
function sb() {
  return {
    from(table) {
      let _table = table, _select = '*', _filters = [], _order = [], _limit = null, _single = false, _updateBody = undefined, _deleteMode = false;

      const builder = {
        select(cols) { _select = cols || '*'; return builder; },
        eq(col, val) { _filters.push(`${col}=eq.${encodeURIComponent(val)}`); return builder; },
        neq(col, val) { _filters.push(`${col}=neq.${encodeURIComponent(val)}`); return builder; },
        in(col, vals) { _filters.push(`${col}=in.(${vals.map(v=>encodeURIComponent(v)).join(',')})`); return builder; },
        not(col, op, val) { _filters.push(`${col}=not.${op}.${encodeURIComponent(val)}`); return builder; },
        gte(col, val) { _filters.push(`${col}=gte.${encodeURIComponent(val)}`); return builder; },
        lte(col, val) { _filters.push(`${col}=lte.${encodeURIComponent(val)}`); return builder; },
        ilike(col, val) { _filters.push(`${col}=ilike.${encodeURIComponent(val)}`); return builder; },
        or(expr) { _filters.push(`or=(${expr})`); return builder; },
        order(col, opts={}) { _order.push(`${col}.${opts.ascending===false?'desc':'asc'}`); return builder; },
        limit(n) { _limit = n; return builder; },
        single() { _single = true; return builder; },

        async insert(body) {
          const { data } = await sbFetch(`/rest/v1/${_table}`, {
            method: 'POST', body: Array.isArray(body) ? body : [body],
            returning: true
          });
          return { data: Array.isArray(data) ? data[0] : data, error: null };
        },

        async upsert(body) {
          const { data } = await sbFetch(`/rest/v1/${_table}`, {
            method: 'POST', body: Array.isArray(body) ? body : [body],
            prefer: 'resolution=merge-duplicates,return=representation'
          });
          return { data, error: null };
        },

        update(body) {
          _updateBody = body;
          // Retorna el builder para poder encadenar .eq() después
          return builder;
        },

        // Ejecutar update cuando se hace await
        then(resolve, reject) {
          let promise;
          if(_updateBody !== undefined) {
            // Es un UPDATE
            let path = `/rest/v1/${_table}?`;
            if(_filters.length) path += _filters.join('&');
            promise = sbFetch(path, { method: 'PATCH', body: _updateBody, returning: true })
              .then(({data}) => resolve({ data, error: null }))
              .catch(e => resolve({ data: null, error: e }));
          } else if(_deleteMode) {
            // Es un DELETE
            let path = `/rest/v1/${_table}?`;
            if(_filters.length) path += _filters.join('&');
            promise = sbFetch(path, { method: 'DELETE' })
              .then(() => resolve({ data: null, error: null }))
              .catch(e => resolve({ data: null, error: e }));
          } else {
            // Es un SELECT
            let path = `/rest/v1/${_table}?select=${encodeURIComponent(_select)}`;
            if(_filters.length) path += '&' + _filters.join('&');
            if(_order.length)   path += '&order=' + _order.join(',');
            if(_limit)          path += '&limit=' + _limit;
            const prefer = _single ? 'return=representation' : '';
            sbFetch(path, { prefer })
              .then(({data}) => {
                const result = _single ? (Array.isArray(data) ? data[0] : data) : data;
                resolve({ data: result, error: null });
              })
              .catch(e => resolve({ data: null, error: e }));
          }
        },

        delete() {
          _deleteMode = true;
          return builder;
        },

      };
      return builder;
    },

    // ── AUTH ──
    auth: {
      async signInWithPassword({ email, password }) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error_description || data.msg || 'Error al iniciar sesión');
        _authToken = data.access_token;
        localStorage.setItem('bh_token', data.access_token);
        localStorage.setItem('bh_refresh', data.refresh_token);
        return { data: { user: data.user, session: data }, error: null };
      },

      async signUp({ email, password, options }) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, data: options?.data || {} })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.msg || data.error_description || 'Error al registrarse');
        if(data.access_token) _authToken = data.access_token;
        return { data: { user: data.user, session: data.access_token ? data : null }, error: null };
      },

      async getUser() {
        const token = _authToken || localStorage.getItem('bh_token');
        if(!token) return { data: { user: null } };
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + token }
        });
        if(!res.ok) { _authToken = null; localStorage.removeItem('bh_token'); return { data: { user: null } }; }
        const user = await res.json();
        _authToken = token;
        return { data: { user } };
      },

      async getSession() {
        const { data: { user } } = await this.getUser();
        return { data: { session: user ? { user } : null } };
      },

      async signOut() {
        const token = _authToken || localStorage.getItem('bh_token');
        if(token) {
          await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + token }
          }).catch(()=>{});
        }
        _authToken = null;
        localStorage.removeItem('bh_token');
        localStorage.removeItem('bh_refresh');
      },

      async resetPasswordForEmail(email) {
        await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      }
    }
  };
}

// getSB() ahora devuelve nuestro cliente REST propio
function getSB() { return sb(); }

// Restaurar token si hay sesión guardada
(function(){
  const t = localStorage.getItem('bh_token');
  if(t) _authToken = t;
})();

/* ══ NAVIGATION ══ */
const PAGES = ['home','programas','tienda','turnos','checkout','login','admin','admin-fichas','portal','programa-detalle','prog-checkout','prog-landing','blog','blog-post'];
function goTo(id, fromHistory){
  PAGES.forEach(p => {
    const el = document.getElementById('page-'+p);
    if(el) el.classList.remove('active');
  });
  const target = document.getElementById('page-'+id);
  if(target) target.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  const nl = document.getElementById('nl-'+id);
  if(nl) nl.classList.add('active');
  window.scrollTo(0,0);

  // Ocultar nav principal en admin y admin-fichas
  const mainNav = document.getElementById('mainNav');
  if(mainNav) mainNav.style.display = (id==='admin'||id==='admin-fichas') ? 'none' : '';

  initReveal();
  if(id==='tienda')            renderProducts();
  if(id==='checkout')          renderCkItems();
  if(id==='admin') {
    const token = _authToken || localStorage.getItem('bh_token');
    if(!token) { goTo('login'); return; }
    initAdminPage();
    // Esperar a que checkSession cargue el rol
    if(_userRol === 'user') {
      checkSession().then(() => applyAdminRol());
    } else {
      applyAdminRol();
    }
  }
  if(id==='home')              loadHomeProgs();
  if(id==='turnos')            loadConsultasEnTurnos();
  if(id==='portal')            initPortal();
  if(id==='programa-detalle')  {}
  if(id==='prog-checkout')     initProgCheckout();
  if(id==='programas')         loadProgramasPage();
  if(id==='blog')              loadBlogPage();

  // Historial del navegador: permite usar el botón "atrás" de Chrome para
  // volver a la página anterior en vez de salir del sitio.
  if(!fromHistory){ try { history.pushState({ page:id }, '', '#'+id); } catch(e){} }
}
function closeMob(){ document.getElementById('mobMenu').classList.remove('open'); }

/* ══ NAV SCROLL ══ */
window.addEventListener('scroll',()=>{
  const nav = document.getElementById('mainNav');
  if(nav) nav.classList.toggle('scrolled',scrollY>40);
},{passive:true});

/* ══ REVEAL ══ */
function initReveal(){
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); }});
  },{threshold:.1});
  document.querySelectorAll('.rv:not(.in)').forEach(el=>obs.observe(el));
}
// initReveal called in DOMContentLoaded

/* ══ FORMAT ══ */
const fmt = n => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n);

/* ══ TOAST ══ */
function toast(msg,type='default',ms=3000){
  const icons={ok:'✓',err:'✕',default:'·'};
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span class="t-ic">${icons[type]||icons.default}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),280);},ms);
}

/* ══ CART ══ */
const CKEY='bh_cart_v3';
const Cart={
  get(){ try{return JSON.parse(localStorage.getItem(CKEY))||[];}catch{return[];} },
  save(items){ localStorage.setItem(CKEY,JSON.stringify(items)); this.ui(); },
  add(p){ const items=this.get(); const i=items.findIndex(x=>x.id===p.id); if(i>-1)items[i].qty++;else items.push({...p,qty:1}); this.save(items); toast(p.name+' agregado al carrito','ok'); this.openDrawer(); },
  remove(id){ this.save(this.get().filter(i=>i.id!==id)); },
  qty(id,q){ if(q<1){this.remove(id);return;} const items=this.get(); const i=items.findIndex(x=>x.id===id); if(i>-1){items[i].qty=q;this.save(items);} },
  total(){ return this.get().reduce((s,i)=>s+i.price*i.qty,0); },
  count(){ return this.get().reduce((s,i)=>s+i.qty,0); },
  openDrawer(){ document.getElementById('cartOv').classList.add('open'); document.getElementById('cartDw').classList.add('open'); },
  closeDrawer(){ document.getElementById('cartOv').classList.remove('open'); document.getElementById('cartDw').classList.remove('open'); },
  ui(){
    const n=this.count(); const b=document.getElementById('cartBadge');
    b.textContent=n; b.classList.toggle('show',n>0); this.renderDw();
  },
  renderDw(){
    const items=this.get(); const bd=document.getElementById('cartBd'); const ft=document.getElementById('cartFt');
    if(!items.length){
      bd.innerHTML='<div class="cart-empty-s"><div class="ico">🛒</div><p style="font-size:.83rem">Tu carrito está vacío</p><button class="btn-outline" style="font-size:.72rem;padding:.5rem 1.2rem;margin-top:.2rem" onclick="goTo(\'tienda\');Cart.closeDrawer()">Ver tienda</button></div>';
      ft.style.display='none'; return;
    }
    ft.style.display='block';
    bd.innerHTML=items.map(it=>`
      <div class="ci">
        <div class="ci-img">${it.image?`<img src="${it.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`:'📦'}</div>
        <div class="ci-info">
          <div class="ci-name">${it.name}</div>
          <div class="ci-price">${fmt(it.price)}</div>
          <div class="ci-qty">
            <button onclick="Cart.qty('${it.id}',${it.qty-1})">−</button>
            <span>${it.qty}</span>
            <button onclick="Cart.qty('${it.id}',${it.qty+1})">+</button>
          </div>
        </div>
        <button onclick="Cart.remove('${it.id}')" style="color:var(--muted);font-size:.76rem;align-self:flex-start;padding:.18rem;background:none;border:none;cursor:pointer">✕</button>
      </div>`).join('');
    document.getElementById('cartTotAmt').textContent=fmt(this.total());
  }
};
window.Cart=Cart;
// cartOv, cartX and Cart.ui() are initialized in DOMContentLoaded

/* ══ PRODUCTS DATA ══ */
const PRODUCTS=[
  {id:'p1',name:'Magnesio Bisglicinato',desc:'Absorción premium. Ideal para sueño, calambres y estrés.',price:8500,cat:'Minerales',img:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80',badge:'Más vendido'},
  {id:'p2',name:'Vitamina D3 + K2',desc:'La combinación esencial para huesos, inmunidad y hormonas.',price:6900,cat:'Vitaminas',img:'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&q=80',badge:null},
  {id:'p3',name:'Omega 3 EPA/DHA',desc:'Aceite de pescado de alta pureza. Anti-inflamatorio esencial.',price:11200,cat:'Vitaminas',img:'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80',badge:'Nuevo'},
  {id:'p4',name:'Probiótico 50B UFC',desc:'50 mil millones de UFC para tu microbiota intestinal.',price:13800,cat:'Digestivo',img:'https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=400&q=80',badge:null},
  {id:'p5',name:'Zinc Quelado',desc:'Alta biodisponibilidad. Clave para inmunidad, piel y hormonas.',price:5400,cat:'Minerales',img:'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&q=80',badge:null},
  {id:'p6',name:'Ashwagandha KSM-66',desc:'Adaptógeno de máxima concentración para estrés y cortisol.',price:9700,cat:'Adaptógenos',img:'https://images.unsplash.com/photo-1611072172098-0ff84a8a8a44?w=400&q=80',badge:null},
  {id:'p7',name:'Hierro Bisglicinato',desc:'Para mujeres con déficit de hierro. Sin efectos secundarios.',price:7200,cat:'Minerales',img:'https://images.unsplash.com/photo-1576671414121-aa2d60f51f84?w=400&q=80',badge:null},
  {id:'p8',name:'Complejo B Activo',desc:'Vitaminas del grupo B en forma activa y biodisponible.',price:8100,cat:'Vitaminas',img:'https://images.unsplash.com/photo-1550572017-37b77e6f5a07?w=400&q=80',badge:null},
  {id:'p9',name:'Coenzima Q10 200mg',desc:'Energía celular y protección cardiovascular.',price:15600,cat:'Adaptógenos',img:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=70',badge:'Premium'},
];
let filteredProducts=[...PRODUCTS];

function renderProducts(){
  const grid=document.getElementById('productsGrid');
  if(!grid) return;
  document.getElementById('tiendaCount').textContent=filteredProducts.length+' producto'+(filteredProducts.length!==1?'s':'');
  grid.innerHTML=filteredProducts.map(p=>`
    <div class="product-card">
      <div class="product-img-wrap">
        <img class="product-img" src="${p.img}" alt="${p.name}" loading="lazy">
        ${p.badge?`<div class="product-badge-tag">${p.badge}</div>`:''}
        <button class="product-quick" onclick="Cart.add({id:'${p.id}',name:'${p.name}',price:${p.price},image:'${p.img}'})">+ Agregar al carrito</button>
      </div>
      <div class="product-body">
        <div class="product-cat">${p.cat}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-footer">
          <div class="product-price">${fmt(p.price)}</div>
          <button class="product-add" onclick="Cart.add({id:'${p.id}',name:'${p.name}',price:${p.price},image:'${p.img}'})">+</button>
        </div>
      </div>
    </div>`).join('');
}

function filterTienda(){
  const checks=[...document.querySelectorAll('.filter-opt input:not([checked]):checked')].map(cb=>cb.value);
  filteredProducts=checks.length?PRODUCTS.filter(p=>checks.includes(p.cat)):[...PRODUCTS];
  renderProducts();
}
function sortTienda(v){
  if(v==='asc') filteredProducts.sort((a,b)=>a.price-b.price);
  else if(v==='desc') filteredProducts.sort((a,b)=>b.price-a.price);
  else if(v==='name') filteredProducts.sort((a,b)=>a.name.localeCompare(b.name));
  renderProducts();
}
renderProducts();

/* ══ PROGRAMAS FILTER ══ */

/* ══ TURNOS ══ */
const BS={tipo:null,precio:null,modalidad:null,fecha:null,hora:null,calY:new Date().getFullYear(),calM:new Date().getMonth(),medicoId:null,medicoNombre:null,medicoColor:null,diasPermitidos:null};
const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS=['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
const TIPO_NAMES={primera:'Primera consulta',seguimiento:'Seguimiento',resultados:'Interpretación de análisis'};

function selTipo(el){
  document.querySelectorAll('.tipo-opt').forEach(o=>o.classList.remove('selected'));
  el.classList.add('selected');
  BS.tipo       = el.dataset.tipo;
  BS.precio     = parseInt(el.dataset.precio);
  BS.modalidad  = null;
  BS.medicoId   = null;
  BS.medicoNombre = null;
  BS.diasPermitidos = null;

  const modalidad = el.dataset.modalidad || 'ambas';
  const wrap = document.getElementById('modalidadWrap');
  if(modalidad === 'ambas') {
    wrap.style.display = '';
    document.querySelectorAll('.modalidad-btn').forEach(b=>b.classList.remove('selected'));
    setTimeout(()=>wrap.scrollIntoView({behavior:'smooth',block:'nearest'}),50);
  } else {
    wrap.style.display = 'none';
    BS.modalidad = modalidad;
    updateSum();
    setTimeout(()=>bGoTo(2), 300);
  }
  updateSum();
}

function selModalidad(mod, btn) {
  BS.modalidad = mod;
  document.querySelectorAll('.modalidad-btn').forEach(b=>b.classList.remove('selected'));
  if(btn) btn.classList.add('selected');
  updateSum();
  setTimeout(()=>bGoTo(2), 350);
}
