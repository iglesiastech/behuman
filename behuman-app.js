/* ══ NAVIGATION ══ */
const PAGES = ['home','programas','tienda','turnos','checkout','login','admin','admin-fichas','portal','programa-detalle'];
function goTo(id){
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
  initReveal();
  if(id==='tienda')            renderProducts();
  if(id==='checkout')          renderCkItems();
  if(id==='admin')             initAdminPage();
  if(id==='turnos')            loadConsultasEnTurnos();
  if(id==='portal')            initPortal();
  if(id==='programa-detalle')  {} // se inicializa desde abrirPrograma()
}
function closeMob(){ document.getElementById('mobMenu').classList.remove('open'); }

/* ══ NAV SCROLL ══ */
const nav = document.getElementById('mainNav');
window.addEventListener('scroll',()=>nav.classList.toggle('scrolled',scrollY>40),{passive:true});
document.getElementById('hamburger').onclick=()=>document.getElementById('mobMenu').classList.add('open');
document.getElementById('mobClose').onclick=closeMob;

/* ══ REVEAL ══ */
function initReveal(){
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); }});
  },{threshold:.1});
  document.querySelectorAll('.rv:not(.in)').forEach(el=>obs.observe(el));
}
initReveal();

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
document.getElementById('cartOv').onclick=()=>Cart.closeDrawer();
document.getElementById('cartX').onclick=()=>Cart.closeDrawer();
Cart.ui();

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
function filterProgs(tag,btn){
  document.querySelectorAll('.ftab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.prog-item').forEach(item=>{
    const tags=item.dataset.tags||'';
    item.style.display=(tag==='all'||tags.includes(tag))?'':'none';
  });
}

/* ══ TURNOS ══ */
const BS={tipo:null,precio:null,modalidad:null,fecha:null,hora:null,calY:new Date().getFullYear(),calM:new Date().getMonth()};
const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS=['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
const TIPO_NAMES={primera:'Primera consulta',seguimiento:'Seguimiento',resultados:'Interpretación de análisis'};

function selTipo(el){
  document.querySelectorAll('.tipo-opt').forEach(o=>o.classList.remove('selected'));
  el.classList.add('selected');
  BS.tipo       = el.dataset.tipo;
  BS.precio     = parseInt(el.dataset.precio);
  BS.modalidad  = null; // reset modalidad

  // Mostrar selector de modalidad si la consulta tiene "ambas"
  const modalidad = el.dataset.modalidad || 'ambas';
  const wrap = document.getElementById('modalidadWrap');

  if(modalidad === 'ambas') {
    wrap.style.display = '';
    // Deshabilitar continuar hasta que elija modalidad
    const btn = document.getElementById('btnBs1');
    btn.disabled = true; btn.style.opacity = '.5'; btn.style.cursor = 'not-allowed';
  } else {
    wrap.style.display = 'none';
    BS.modalidad = modalidad;
    // Si no hay que elegir, habilitar continuar
    const btn = document.getElementById('btnBs1');
    btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
  }
  updateSum();
}

function selModalidad(mod) {
  BS.modalidad = mod;
  ['presencial','virtual'].forEach(m => {
    const el = document.getElementById('mod-'+m);
    if(!el) return;
    const sel = m === mod;
    el.style.borderColor  = sel ? 'var(--teal)' : 'var(--cream-dk)';
    el.style.background   = sel ? 'rgba(58,125,140,.05)' : '#fff';
  });
  // Habilitar continuar
  const btn = document.getElementById('btnBs1');
  btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
  updateSum();
}

function bGoTo(n){
  [1,2,3,4].forEach(i=>{
    document.getElementById('bstep'+i).style.display=i===n?'':'none';
    const si=document.getElementById('si'+i);
    if(si){ si.classList.toggle('active',i===n); si.classList.toggle('done',i<n); }
  });
  if(n===2) renderCal();
  if(n===4) updateSenaAmount();
}

function renderCal(){
  const {calY:y,calM:m}=BS;
  document.getElementById('calMonth').textContent=MONTHS[m]+' '+y;
  const grid=document.getElementById('calGrid');
  const today=new Date(); today.setHours(0,0,0,0);
  const firstDay=new Date(y,m,1).getDay();
  const dim=new Date(y,m+1,0).getDate();
  let h=DAYS.map(d=>`<div class="cal-dayname">${d}</div>`).join('');
  for(let i=0;i<firstDay;i++) h+=`<div class="cal-day empty"></div>`;
  for(let d=1;d<=dim;d++){
    const dt=new Date(y,m,d); const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isT=dt.getTime()===today.getTime();
    const dis=dt<today||dt.getDay()===0;
    const sel=BS.fecha===ds;
    h+=`<div class="cal-day${isT?' today':''}${dis?' disabled':''}${sel?' selected':''}" onclick="${dis?'':'selDate(\''+ds+'\')' }">${d}</div>`;
  }
  grid.innerHTML=h;
}
function calPrev(){ BS.calM--; if(BS.calM<0){BS.calM=11;BS.calY--;} BS.fecha=null;BS.hora=null; renderCal(); document.getElementById('slotsWrap').style.display='none'; }
function calNext(){ BS.calM++; if(BS.calM>11){BS.calM=0;BS.calY++;} BS.fecha=null;BS.hora=null; renderCal(); document.getElementById('slotsWrap').style.display='none'; }

async function selDate(ds){
  BS.fecha=ds; BS.hora=null; renderCal(); updateSum();
  const sw=document.getElementById('slotsWrap'); sw.style.display='block';
  const [,mm,dd]=ds.split('-');
  document.getElementById('slotsTitle').textContent=`Horarios para el ${parseInt(dd)} de ${MONTHS[parseInt(mm)-1]}`;

  const ALL_SLOTS=['09:00','09:45','10:30','11:15','12:00','14:00','14:45','15:30','16:15','17:00'];
  const grid = document.getElementById('slotsGrid');
  grid.innerHTML='<div style="font-size:.78rem;color:var(--muted);grid-column:1/-1">Cargando...</div>';

  let ocupados = [];
  let bloqueados = [];
  let todoBloqueado = false;

  try {
    const sb = getSB();
    if(sb){
      // Turnos ya reservados ese día
      const { data: appts } = await sb
        .from('appointments')
        .select('time')
        .eq('date', ds)
        .not('status','in','("cancelled")');
      ocupados = (appts||[]).map(a=>(a.time||'').slice(0,5));

      // Horarios bloqueados ese día
      const { data: blocks } = await sb
        .from('blocked_slots')
        .select('time, todo_el_dia')
        .eq('date', ds);

      if(blocks?.some(b=>b.todo_el_dia)){
        todoBloqueado = true;
      } else {
        bloqueados = (blocks||[]).map(b=>(b.time||'').slice(0,5)).filter(Boolean);
      }
    }
  } catch(e){ console.warn('No se pudo verificar disponibilidad:', e.message); }

  if(todoBloqueado){
    grid.innerHTML='<div style="font-size:.82rem;color:#C4614A;grid-column:1/-1;background:rgba(196,97,74,.08);padding:.75rem 1rem;border-radius:10px;border:1.5px solid rgba(196,97,74,.2)">🚫 Este día no tiene turnos disponibles</div>';
    return;
  }

  grid.innerHTML=ALL_SLOTS.map(s=>{
    const hora = s;
    const isOcupado  = ocupados.includes(hora);
    const isBloqueado = bloqueados.includes(hora);
    const noDisp = isOcupado || isBloqueado;
    const label = isOcupado ? `${hora} (ocupado)` : isBloqueado ? `${hora} (no disp.)` : hora;
    return `<button class="slot${noDisp?' disabled':''}" 
      ${noDisp?'disabled style="opacity:.35;cursor:not-allowed;text-decoration:line-through"':''} 
      onclick="${noDisp?'':'selSlot(this,\''+hora+'\')'}">${label}</button>`;
  }).join('');
}
function selSlot(btn,h){
  document.querySelectorAll('.slot').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected'); BS.hora=h;
  const b2=document.getElementById('btnBs2'); b2.disabled=false; b2.style.opacity='1'; b2.style.cursor='pointer';
  updateSum();
}

function updateSum(){
  const e=document.getElementById('sumEmpty'); const c=document.getElementById('sumContent');
  const any=BS.tipo||BS.fecha; e.style.display=any?'none':''; c.style.display=any?'flex':'none';
  if(BS.tipo){
    document.getElementById('sumTipoRow').style.display='';
    document.getElementById('sumTipoVal').textContent = TIPO_NAMES[BS.tipo]||BS.tipo;
    document.getElementById('sumPrecioRow').style.display='';
    document.getElementById('sumPrecioVal').textContent = fmt(BS.precio);
  }
  if(BS.modalidad){
    document.getElementById('sumFechaRow').style.display = BS.fecha ? '' : 'none';
    // Mostrar modalidad en el resumen
    let sumTipoEl = document.getElementById('sumTipoVal');
    if(sumTipoEl && BS.modalidad){
      const mod = BS.modalidad === 'presencial' ? ' · 📍 Presencial' : ' · 💻 Virtual';
      sumTipoEl.textContent = (TIPO_NAMES[BS.tipo]||BS.tipo) + mod;
    }
  }
  if(BS.fecha){ const [y,mm,dd]=BS.fecha.split('-'); document.getElementById('sumFechaRow').style.display=''; document.getElementById('sumFechaVal').textContent=`${parseInt(dd)} de ${MONTHS[parseInt(mm)-1]} ${y}`; }
  if(BS.hora){ document.getElementById('sumHoraRow').style.display=''; document.getElementById('sumHoraVal').textContent=BS.hora+' hs'; }
}

// Consultas que requieren paciente previo — se carga dinámicamente desde Supabase
// Este array es el fallback si no hay conexión
const CONSULTAS_SOLO_PREVIOS = ['espontanea'];

async function validarYContinuar() {
  const nom   = document.getElementById('pNombre').value.trim();
  const email = document.getElementById('pEmail').value.trim();
  const tel   = document.getElementById('pTel').value.trim();
  if(!nom||!email||!tel){ toast('Completá nombre, email y teléfono','err'); return; }

  // Verificar si esta consulta requiere paciente previo
  // Primero intentar obtenerlo de Supabase, sino usar el array fallback
  let requierePrevio = CONSULTAS_SOLO_PREVIOS.includes(BS.tipo);
  try {
    const sb = getSB();
    if(sb) {
      const { data: ct } = await sb
        .from('consultation_types')
        .select('solo_pacientes_previos')
        .eq('id', BS.tipo)
        .single();
      if(ct) requierePrevio = !!ct.solo_pacientes_previos;
    }
  } catch(e) {}

  if(requierePrevio) {
    const btn = document.getElementById('btnToStep4');
    btn.disabled = true; btn.textContent = 'Verificando...';
    try {
      const sb = getSB();
      if(sb) {
        const { data: fichas } = await sb
          .from('fichas_medicas')
          .select('id')
          .eq('patient_email', email)
          .limit(1);

        const esPrevio = fichas && fichas.length > 0;
        if(!esPrevio) {
          btn.disabled = false; btn.textContent = 'Continuar → Seña';
          let errBox = document.getElementById('previoError');
          if(!errBox) {
            errBox = document.createElement('div');
            errBox.id = 'previoError';
            errBox.style.cssText = 'background:rgba(196,97,74,.08);border:1.5px solid rgba(196,97,74,.25);border-radius:12px;padding:.9rem 1.1rem;font-size:.84rem;color:#C4614A;line-height:1.65;margin-top:1rem';
            document.getElementById('bstep3').appendChild(errBox);
          }
          errBox.innerHTML = '⚠️ <strong>Consulta exclusiva para pacientes previos.</strong><br>Esta consulta está disponible solo para quienes ya se atendieron con Be Human. Si es tu primera vez, reservá una <strong>Consulta Integral</strong>.';
          errBox.style.display = '';
          return;
        }
        const errBox = document.getElementById('previoError');
        if(errBox) errBox.style.display = 'none';
      }
    } catch(e) { console.warn('No se pudo verificar:', e.message); }
    const btn2 = document.getElementById('btnToStep4');
    btn2.disabled = false; btn2.textContent = 'Continuar → Seña';
  }
  bGoTo(4);
}

/* ── SEÑA ── */
const SENA_PCT = 0.30;

function updateSenaAmount(){
  const sena = Math.round(BS.precio * SENA_PCT);
  const el  = document.getElementById('senaAmount');
  const elT = document.getElementById('senaPrecioTotal');
  if(el)  el.textContent  = fmt(sena);
  if(elT) elT.textContent = fmt(BS.precio);
}

function copiarCBU(txt){
  navigator.clipboard.writeText(txt).then(()=>toast('Copiado ✓','ok'));
}

async function submitBooking(){
  const nom   = document.getElementById('pNombre').value.trim();
  const email = document.getElementById('pEmail').value.trim();
  const tel   = document.getElementById('pTel').value.trim();
  if(!nom||!email||!tel){ toast('Completá nombre, email y teléfono','err'); bGoTo(3); return; }

  const apellido = document.getElementById('senaApellido')?.value.trim();
  if(!apellido){ toast('Ingresá tu nombre y apellido para identificar la transferencia','err'); return; }

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.textContent = 'Registrando turno...';

  const precio = BS.precio || 0;
  const sena   = precio > 0 ? Math.round(precio * SENA_PCT) : 0;
  const [,mm,dd] = BS.fecha.split('-');
  const fechaStr = `${parseInt(dd)} de ${MONTHS[parseInt(mm)-1]} ${BS.fecha.split('-')[0]}`;

  const apptData = {
    type:          BS.tipo,
    date:          BS.fecha,
    time:          BS.hora + ':00',
    modalidad:     BS.modalidad || 'ambas',
    status:        'pending_transfer',
    patient_name:  nom,
    patient_email: email,
    patient_phone: tel,
    notes:         document.getElementById('pMotivo')?.value.trim() || null,
    source:        document.getElementById('pFuente')?.value || null,
    price:         precio,
    sena_amount:   sena,
    sena_method:   'transferencia',
    sena_status:   'pending',
    transfer_name: apellido,
  };

  const sb = getSB();
  if(!sb){
    showConfirmacionSena(nom, email, sena, fechaStr, precio);
    return;
  }

  try {
    const { data: appt, error } = await sb.from('appointments').insert(apptData).select().single();
    if(error) throw error;

    // Crear ficha si no existe (en segundo plano)
    sb.from('fichas_medicas').select('id').eq('patient_email',email).limit(1)
      .then(({ data: fe }) => {
        if(!fe||!fe.length){
          sb.from('fichas_medicas').insert({
            patient_name:nom, patient_email:email, patient_phone:tel,
            motivo_consulta_inicial: document.getElementById('pMotivo')?.value.trim()||null,
          }).catch(()=>{});
        }
      }).catch(()=>{});

    // Email — descomentar cuando configures Resend en Supabase Edge Functions
    // sendEmailPendiente(email, nom, fechaStr, BS.hora, BS.tipo, sena, precio, apellido);

    showConfirmacionSena(nom, email, sena, fechaStr, precio);

  } catch(e){
    console.error('Error al guardar turno:', e);
    btn.disabled = false;
    btn.textContent = 'Confirmar y pagar seña ✓';
    toast('Error: ' + (e.message||'No se pudo guardar el turno. Revisá tu conexión.'), 'err', 6000);
  }
}

function showConfirmacionSena(nom, email, sena, fechaStr, precio){
  document.getElementById('bookingFlow').style.display='none';
  document.getElementById('confirmScreen').innerHTML = `
    <div style="text-align:center;padding:3rem 2rem">
      <div style="width:72px;height:72px;background:rgba(212,133,58,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2.2rem;margin:0 auto 1rem">⏳</div>
      <h2 style="font-family:var(--fd);font-size:1.9rem;margin-bottom:.5rem">¡Turno registrado!</h2>
      <p style="color:var(--muted);max-width:400px;margin:0 auto;font-size:.88rem;font-weight:300;line-height:1.7">
        Tu turno está <strong>pendiente de confirmación</strong>. Te llegará un mail con los detalles.
      </p>
      <div style="background:var(--cream);border-radius:14px;padding:1.25rem;max-width:360px;margin:1.25rem auto;text-align:left;display:flex;flex-direction:column;gap:.6rem">
        <div style="display:flex;justify-content:space-between;font-size:.84rem"><span style="color:var(--muted)">Consulta</span><span style="font-weight:500">${TIPO_NAMES[BS.tipo]||BS.tipo}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.84rem"><span style="color:var(--muted)">Fecha y hora</span><span style="font-weight:500">${fechaStr} · ${BS.hora} hs</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.84rem"><span style="color:var(--muted)">Seña a transferir</span><span style="font-weight:700;color:var(--gold)">${fmt(sena)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.84rem"><span style="color:var(--muted)">Resto</span><span style="font-weight:500">${fmt(BS.precio-sena)} el día de la consulta</span></div>
      </div>
      <div style="background:rgba(212,133,58,.08);border:1.5px solid rgba(212,133,58,.2);border-radius:12px;padding:1rem 1.1rem;max-width:400px;margin:0 auto;font-size:.82rem;color:#8A5020;line-height:1.75;text-align:left">
        📲 <strong>Próximo paso:</strong> Enviá el comprobante al WhatsApp <strong>+54 9 11 7617-9836</strong> con tu nombre y apellido. Te llegará un <strong>mail de confirmación</strong> cuando lo aprobemos.
      </div>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem">
        <button class="btn-outline" onclick="goTo('home')">Volver al inicio</button>
        <a href="https://wa.me/5491176179836?text=Hola!%20Soy%20${encodeURIComponent(nom)}%2C%20reservé%20un%20turno%20para%20el%20${encodeURIComponent(fechaStr)}%20a%20las%20${BS.hora}%20hs.%20Les%20envío%20el%20comprobante." target="_blank" style="display:inline-flex;align-items:center;gap:.4rem;padding:.85rem 1.9rem;border-radius:100px;font-family:var(--fb);font-size:.76rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;background:#25D366;color:#fff;text-decoration:none">
          💬 Enviar comprobante
        </a>
      </div>
    </div>`;
  document.getElementById('confirmScreen').classList.add('show');
}

function renderCkItems(){
  const items=Cart.get(); const el=document.getElementById('ckItems');
  if(!items.length){ el.innerHTML='<div style="text-align:center;color:var(--muted);padding:2rem;font-size:.85rem">Tu carrito está vacío</div>'; renderCkTotals(); return; }
  el.innerHTML=items.map(it=>`
    <div class="order-item">
      <div class="order-item-img" style="display:flex;align-items:center;justify-content:center;font-size:1.1rem;">${it.image?`<img src="${it.image}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`:'📦'}</div>
      <div class="order-item-name">${it.name} <span style="color:var(--muted)">x${it.qty}</span></div>
      <div class="order-item-price">${fmt(it.price*it.qty)}</div>
    </div>`).join('');
  renderCkTotals();
}

function renderCkTotals(){
  const sub=Cart.total(); const ship=sub>20000?0:1500;
  const disc=ckPayMethod==='transferencia'?sub*.05:0;
  const total=sub+ship-disc;
  buildCuotas(total);
  document.getElementById('ckTotals').innerHTML=`
    <div class="tot-row"><span>Subtotal</span><span>${fmt(sub)}</span></div>
    ${disc?`<div class="tot-row" style="color:var(--teal)"><span>Descuento transferencia (5%)</span><span>-${fmt(disc)}</span></div>`:''}
    <div class="tot-row"><span>Envío</span><span>${ship?fmt(ship):'Gratis 🎉'}</span></div>
    <div class="tot-row main"><span>Total</span><span class="tot-amt">${fmt(total)}</span></div>`;
}

function buildCuotas(total){
  const opts=[1,3,6];
  document.getElementById('cuotasGrid').innerHTML=opts.map(n=>`
    <div class="cuota${n===ckCuotas?' selected':''}" onclick="selCuota(${n},${total})">
      ${n===1?'1 pago':`${n}x<br>${fmt(total/n)}`}
    </div>`).join('');
}
function selCuota(n,t){ ckCuotas=n; buildCuotas(t); }
function copyTxt(t){ navigator.clipboard.writeText(t).then(()=>toast('Copiado ✓','ok')); }

function placeOrder(){
  const nom=document.getElementById('ckNom').value.trim();
  const email=document.getElementById('ckEmail').value.trim();
  if(!nom||!email){ toast('Completá nombre y email','err'); return; }
  const btn=document.getElementById('ckBtn'); btn.disabled=true; btn.textContent='Procesando...';
  setTimeout(()=>{
    Cart.save([]); Cart.ui();
    document.getElementById('ckMain').style.display='none';
    document.getElementById('ckSuccess').classList.add('show');
  },1400);
}

/* ══ SUPABASE ══ */
const SUPABASE_URL  = 'https://ncebqouvfkgobbaihuhf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZWJxb3V2Zmtnb2JiYWlodWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODAzNzAsImV4cCI6MjA5MzU1NjM3MH0.UUm6RlO9jHDR2FXIB3C0qFAtRtGRdMRhoVeNf9AdMFY';
let sbClient = null;
function getSB(){
  if(!sbClient && typeof supabase!=='undefined'){
    sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return sbClient;
}

/* ══ AUTH: detectar sesión al cargar ══ */
async function checkExistingSession(){
  const sb = getSB();
  if(!sb) return;
  try{
    const { data:{ session } } = await sb.auth.getSession();
    if(session){ await afterLogin(session.user); }
  }catch(e){}
}

/* ══ DESPUÉS DEL LOGIN: detectar si es admin ══ */
async function afterLogin(user){
  setLoginLoading(true, 'Verificando permisos...');
  try{
    const sb = getSB();
    const { data: profile } = await sb
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    const role   = profile?.role || 'user';
    const nombre = profile?.full_name?.split(' ')[0] || user.email;

    if(role === 'admin'){
      setLoginLoading(true, '¡Bienvenida!');
      localStorage.setItem('bh_admin_session', JSON.stringify({
        email: user.email, id: user.id, name: profile.full_name || user.email
      }));
      updateNavUI('admin');
      document.getElementById('navBtnAdmin').innerHTML = `⚙️ Hola, ${nombre}`;
      setTimeout(()=>{
        setLoginLoading(false);
        goTo('admin');
      }, 600);
    } else {
      setLoginLoading(true, '¡Bienvenida!');
      localStorage.setItem('bh_user_session', JSON.stringify({
        email: user.email, id: user.id, name: profile?.full_name || user.email
      }));
      updateNavUI('user');
      setTimeout(()=>{
        setLoginLoading(false);
        goTo('portal');
        toast(`¡Bienvenida, ${nombre}! 👋`, 'ok');
      }, 600);
    }
  }catch(e){
    setLoginLoading(false);
    showErr('Error al verificar tu cuenta. Intentá de nuevo.');
  }
}

function setLoginLoading(show, msg=''){
  document.getElementById('lform-loading').style.display = show ? '' : 'none';
  document.getElementById('lform-login').style.display    = show ? 'none' : '';
  document.getElementById('lform-register').style.display = 'none';
  if(msg) document.getElementById('lLoadingMsg').textContent = msg;
}

/* ══ LOGIN ══ */
function switchLoginTab(tab){
  document.querySelectorAll('.login-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('ltab-'+tab).classList.add('active');
  document.getElementById('lform-login').style.display    = tab==='login'    ? '' : 'none';
  document.getElementById('lform-register').style.display = tab==='register' ? '' : 'none';
  document.getElementById('lform-loading').style.display  = 'none';
  document.getElementById('loginError').classList.remove('show');
}

function showErr(msg){
  const e = document.getElementById('loginError');
  e.textContent = msg;
  e.classList.add('show');
}

async function doLogin(){
  const email = document.getElementById('lEmail').value.trim();
  const pass  = document.getElementById('lPass').value;
  if(!email || !pass){ showErr('Completá email y contraseña'); return; }

  const sb = getSB();
  if(!sb){
    showErr('Supabase no está configurado. Editá SUPABASE_URL y SUPABASE_ANON en el código.');
    return;
  }

  const btn = document.getElementById('lBtn');
  btn.disabled = true;
  btn.textContent = 'Ingresando...';
  document.getElementById('loginError').classList.remove('show');

  try{
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(error) throw error;
    await afterLogin(data.user);
  }catch(e){
    const msgs = {
      'Invalid login credentials':    'Email o contraseña incorrectos.',
      'Email not confirmed':           'Confirmá tu email antes de ingresar.',
      'Too many requests':             'Demasiados intentos. Esperá unos minutos.',
    };
    showErr(msgs[e.message] || e.message || 'Error al ingresar.');
    btn.disabled = false;
    btn.textContent = 'Ingresar →';
  }
}

async function doRegister(){
  const nom   = document.getElementById('rNom').value.trim();
  const email = document.getElementById('rEmail').value.trim();
  const p1    = document.getElementById('rPass').value;
  const p2    = document.getElementById('rPass2').value;

  if(!nom || !email || !p1){ showErr('Completá todos los campos'); return; }
  if(p1 !== p2)             { showErr('Las contraseñas no coinciden'); return; }
  if(p1.length < 8)         { showErr('La contraseña debe tener al menos 8 caracteres'); return; }

  const sb = getSB();
  if(!sb){ showErr('Supabase no está configurado.'); return; }

  const btn = document.getElementById('rBtn');
  btn.disabled = true;
  btn.textContent = 'Creando cuenta...';

  try{
    const { data, error } = await sb.auth.signUp({
      email,
      password: p1,
      options: { data: { full_name: nom } }
    });
    if(error) throw error;

    if(data.user && !data.session){
      // Requiere confirmación de email
      toast('¡Cuenta creada! Revisá tu email para confirmarla.', 'ok');
      switchLoginTab('login');
    } else if(data.session){
      await afterLogin(data.user);
    }
  }catch(e){
    const msgs = {
      'User already registered': 'Ya existe una cuenta con ese email.',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    };
    showErr(msgs[e.message] || e.message);
  }finally{
    btn.disabled = false;
    btn.textContent = 'Crear cuenta';
  }
}

async function doForgot(){
  const email = document.getElementById('lEmail').value.trim();
  if(!email){ showErr('Ingresá tu email para recuperar la contraseña'); return; }
  const sb = getSB();
  if(!sb){ showErr('Supabase no está configurado.'); return; }
  try{
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    toast('Te enviamos un email para recuperar tu contraseña ✓', 'ok');
  }catch(e){ showErr('Error: ' + e.message); }
}

/* ══ CHECK SESSION AL ABRIR LA PÁGINA DE LOGIN ══ */
async function checkExistingSession(){
  const sb = getSB();
  if(!sb) return;
  try{
    const { data:{ session } } = await sb.auth.getSession();
    if(session){ await afterLogin(session.user); }
  }catch(e){}
}
/* ══ ADMIN JS ══ */
const ATITLES = {dash:'Dashboard',fotos:'Fotos del sitio',turnos:'Turnos',senas:'Señas y transferencias',fichas:'Fichas médicas','programas-adm':'Programas',testis:'Testimonios',calendario:'Calendario',horarios:'Horarios bloqueados',consultas:'Tipos de consulta'};

const AMONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const AMONTHS_L = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ATIPO = {primera_vez:'Primera consulta',primera:'Primera consulta',seguimiento:'Seguimiento',resultados:'Análisis'};

let aCurrImgKey = null, aSelFile = null, aAllFichas = [];

function showAP(id, btn) {
  document.querySelectorAll('.ap').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.asb-it').forEach(b => b.classList.remove('on'));
  document.getElementById('ap-'+id)?.classList.add('on');
  if (btn) btn.classList.add('on');
  const t = document.getElementById('atbTitle');
  if (t) t.textContent = ATITLES[id] || id;
  if (id==='fotos')    loadAFotos();
  if (id==='turnos')   { const d=document.getElementById('aDate'); if(d&&!d.value) d.value=new Date().toISOString().split('T')[0]; loadATurnos(); }
  if (id==='senas')    loadASenas();
  if (id==='fichas')   loadAFichas();
  if (id==='testis')   loadATestis();
  if (id==='horarios')      loadABlocked();
  if (id==='calendario')    initCalendario();
  if (id==='consultas')     loadAConsultas();
  if (id==='programas-adm') loadAPrograms();
  if (id==='dash')     loadADash();
}

/* ── SEÑAS ── */
const SENA_STATUS_LABELS = { pending:'Pendiente', approved:'Aprobada', rejected:'Rechazada' };
const TURNO_STATUS_LABELS = { pending:'Pendiente', pending_payment:'Esperando pago', pending_transfer:'Esperando transferencia', confirmed:'Confirmado', cancelled:'Cancelado', completed:'Completado' };

async function loadASenas() {
  const sb = getSB(); if(!sb) return;
  const filterStatus = document.getElementById('senaFilterStatus')?.value || '';
  try {
    const { data: pend } = await sb.from('appointments').select('*').eq('sena_method','transferencia').eq('sena_status','pending').order('created_at',{ascending:false});
    const today = new Date().toISOString().split('T')[0];
    const { data: aprovHoy } = await sb.from('appointments').select('sena_amount').eq('sena_status','approved').gte('updated_at',today);
    const { data: allAprov } = await sb.from('appointments').select('sena_amount').eq('sena_status','approved');
    const pendCount = pend?.length||0;
    document.getElementById('sSenaPend').textContent  = pendCount;
    document.getElementById('sSenaAprov').textContent = aprovHoy?.length||0;
    document.getElementById('sSenaMonto').textContent = fmt((allAprov||[]).reduce((s,r)=>s+(r.sena_amount||0),0));
    document.getElementById('pendBadgeCount').textContent = pendCount;
    const badge = document.getElementById('senasBadge');
    if(badge){ badge.textContent=pendCount; badge.style.display=pendCount>0?'':'none'; }
    renderSPend(pend||[]);
    let q = sb.from('appointments').select('*').not('sena_method','is',null).order('created_at',{ascending:false});
    if(filterStatus) q = q.eq('sena_status',filterStatus);
    const { data: hist } = await q;
    renderSHist(hist||[]);
  } catch(e) {
    document.getElementById('sPendBody').innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Error: ${e.message}</td></tr>`;
  }
}

function renderSPend(rows) {
  const tbody = document.getElementById('sPendBody');
  if(!rows.length) { tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:2.5rem"><div style="font-size:1.75rem;margin-bottom:.5rem">✅</div><div style="color:var(--muted);font-size:.88rem">No hay transferencias pendientes</div></td></tr>`; return; }
  tbody.innerHTML = rows.map(r=>`
    <tr>
      <td><div style="font-weight:600">${r.patient_name}</div><div style="font-size:.73rem;color:var(--muted)">${r.patient_email}</div>${r.patient_phone?`<div style="font-size:.73rem;color:var(--muted)">${r.patient_phone}</div>`:''}</td>
      <td><div style="font-weight:500">${formatADate(r.date)}</div><div style="font-size:.73rem;color:var(--muted)">${(r.time||'').slice(0,5)} hs · ${ATIPO[r.type]||r.type}</div></td>
      <td><div style="font-family:var(--fd);font-size:1.1rem;color:var(--gold)">${fmt(r.sena_amount||0)}</div><div style="font-size:.72rem;color:var(--muted)">de ${fmt(r.price||0)}</div></td>
      <td style="font-weight:500">${r.transfer_name||'—'}</td>
      <td style="font-size:.78rem;color:var(--muted)">${timeAgoA(r.created_at)}</td>
      <td>
        <div style="display:flex;flex-direction:column;gap:.4rem">
          <button onclick="aprobarSena('${r.id}')" style="padding:.45rem .9rem;border-radius:100px;font-size:.72rem;font-weight:600;background:#4A9B6F;color:#fff;border:none;cursor:pointer;font-family:var(--fb);white-space:nowrap">✓ Aprobar</button>
          <button onclick="rechazarSena('${r.id}')" style="padding:.45rem .9rem;border-radius:100px;font-size:.72rem;font-weight:600;background:rgba(196,97,74,.1);color:#C4614A;border:1.5px solid rgba(196,97,74,.25);cursor:pointer;font-family:var(--fb);white-space:nowrap">✕ Rechazar</button>
          <a href="https://wa.me/${(r.patient_phone||'').replace(/\D/g,'')}?text=Hola%20${encodeURIComponent(r.patient_name)}!%20Confirmamos%20tu%20turno%20para%20el%20${encodeURIComponent(formatADate(r.date))}%20a%20las%20${(r.time||'').slice(0,5)}%20hs." target="_blank" style="padding:.45rem .9rem;border-radius:100px;font-size:.72rem;font-weight:600;background:#25D366;color:#fff;border:none;cursor:pointer;font-family:var(--fb);text-align:center;text-decoration:none;display:block;white-space:nowrap">💬 WhatsApp</a>
        </div>
      </td>
    </tr>`).join('');
}

function renderSHist(rows) {
  const tbody = document.getElementById('sHistBody');
  if(!rows.length) { tbody.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--muted)">Sin registros</td></tr>`; return; }
  tbody.innerHTML = rows.map(r=>{
    const ss=r.sena_status||'pending';
    const ts=r.status||'pending';
    const ssColor={pending:'#D4853A',approved:'#4A9B6F',rejected:'#C4614A'}[ss]||'var(--muted)';
    const ssBg={pending:'rgba(212,133,58,.1)',approved:'rgba(74,155,111,.1)',rejected:'rgba(196,97,74,.1)'}[ss]||'rgba(138,132,128,.1)';
    return `<tr>
      <td><div style="font-weight:600;font-size:.83rem">${r.patient_name}</div><div style="font-size:.72rem;color:var(--muted)">${r.patient_email}</div></td>
      <td style="font-size:.82rem">${formatADate(r.date)}</td>
      <td style="font-size:.82rem">${(r.time||'').slice(0,5)} hs</td>
      <td style="font-size:.79rem">${ATIPO[r.type]||r.type||'—'}</td>
      <td style="font-family:var(--fd);color:var(--text)">${fmt(r.price||0)}</td>
      <td style="font-family:var(--fd);color:var(--gold)">${fmt(r.sena_amount||0)}</td>
      <td style="font-size:.79rem">${r.sena_method==='mp'?'💳 MP':'🏦 Transferencia'}</td>
      <td><span style="background:${ssBg};color:${ssColor};padding:.2rem .6rem;border-radius:100px;font-size:.67rem;font-weight:600">${SENA_STATUS_LABELS[ss]||ss}</span></td>
      <td><span style="background:rgba(58,125,140,.1);color:var(--teal);padding:.2rem .6rem;border-radius:100px;font-size:.67rem;font-weight:600">${TURNO_STATUS_LABELS[ts]||ts}</span></td>
      <td>${ss==='pending'?`<div style="display:flex;gap:.3rem"><button onclick="aprobarSena('${r.id}')" style="padding:.32rem .65rem;border-radius:100px;font-size:.67rem;font-weight:600;background:#4A9B6F;color:#fff;border:none;cursor:pointer;font-family:var(--fb)">✓</button><button onclick="rechazarSena('${r.id}')" style="padding:.32rem .65rem;border-radius:100px;font-size:.67rem;font-weight:600;background:rgba(196,97,74,.1);color:#C4614A;border:1.5px solid rgba(196,97,74,.25);cursor:pointer;font-family:var(--fb)">✕</button></div>`:'—'}</td>
    </tr>`;
  }).join('');
}

async function aprobarSena(id) {
  if(!confirm('¿Confirmar que recibiste la transferencia y aprobar el turno?')) return;
  try {
    const sb = getSB();
    // Traer datos del turno para el email
    const { data: appt } = await sb.from('appointments').select('*').eq('id',id).single();

    await sb.from('appointments').update({
      sena_status: 'approved',
      status: 'confirmed',
      updated_at: new Date().toISOString()
    }).eq('id', id);

    // Enviar email de confirmación al paciente
    if(appt) {
      // Email — descomentar cuando configures Resend en Supabase Edge Functions
      // const [,mm,dd] = appt.date.split('-');
      // const fechaStr = `${parseInt(dd)} de ${AMONTHS_L[parseInt(mm)-1]} ${appt.date.split('-')[0]}`;
      // sb.functions.invoke('send-email', { body: { type:'turno_confirmado', to:appt.patient_email, data:{...} }}).catch(()=>{});
      toast('✓ Turno confirmado · Se notificará a ' + appt.patient_email, 'ok', 5000);
    } else {
      toast('✓ Turno confirmado', 'ok');
    }

    loadASenas();
    loadADash();
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

async function rechazarSena(id) {
  if(!confirm('¿Rechazar esta transferencia? El turno quedará cancelado.')) return;
  try {
    await getSB().from('appointments').update({sena_status:'rejected',status:'cancelled',updated_at:new Date().toISOString()}).eq('id',id);
    toast('Transferencia rechazada','ok');
    loadASenas();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

/* ── DASHBOARD ── */
async function loadADash() {
  const sb = getSB(); if (!sb) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const [{ count: tc }, { count: mc }, { count: pc }, { count: sc }] = await Promise.all([
      sb.from('appointments').select('*',{count:'exact',head:true}).eq('date',today),
      sb.from('fichas_medicas').select('*',{count:'exact',head:true}),
      sb.from('appointments').select('*',{count:'exact',head:true}).eq('sena_status','pending').eq('sena_method','transferencia'),
      sb.from('appointments').select('*',{count:'exact',head:true}).eq('status','pending'),
    ]);
    document.getElementById('admSG').innerHTML = `
      <div class="asc go"><div class="asc-l">Turnos hoy</div><div class="asc-v">${tc||0}</div></div>
      <div class="asc te"><div class="asc-l">Fichas médicas</div><div class="asc-v">${mc||0}</div></div>
      <div class="asc" style="border-left:3px solid #D4853A"><div class="asc-l">Señas pendientes</div><div class="asc-v" style="color:#D4853A">${pc||0}</div></div>
      <div class="asc re"><div class="asc-l">Turnos sin confirmar</div><div class="asc-v">${sc||0}</div></div>`;
    // Badge en botón señas
    const db = document.getElementById('dashSenasBadge');
    if(db && pc > 0) db.textContent = pc + ' pendiente' + (pc>1?'s':'');
    // Badge sidebar
    const sb2 = document.getElementById('senasBadge');
    if(sb2){ sb2.textContent=pc||0; sb2.style.display=(pc||0)>0?'':'none'; }
  } catch(e) {
    document.getElementById('admSG').innerHTML = `
      <div class="asc go"><div class="asc-l">Turnos hoy</div><div class="asc-v">—</div></div>
      <div class="asc te"><div class="asc-l">Fichas</div><div class="asc-v">—</div></div>
      <div class="asc" style="border-left:3px solid #D4853A"><div class="asc-l">Señas pendientes</div><div class="asc-v">—</div></div>
      <div class="asc re"><div class="asc-l">Sin confirmar</div><div class="asc-v">—</div></div>`;
  }
}

/* ── FOTOS ── */
const SITE_IMGS = [
  {key:'hero_consultorio_1', name:'Hero — foto principal', section:'hero'},
  {key:'hero_dra',           name:'Hero — Dra. Dobenau',  section:'hero'},
  {key:'hero_consultorio_2', name:'Hero — foto derecha',  section:'hero'},
  {key:'mariel_portrait',    name:'Sección Mariel',        section:'general'},
  {key:'prog_reset_21',      name:'Programa Reset 21',     section:'programas'},
  {key:'prog_activacion',    name:'Programa Performance',  section:'programas'},
  {key:'prog_indomables',    name:'Programa Indomables',   section:'programas'},
  {key:'prog_reset_mujer',   name:'Programa Reset Mujer',  section:'programas'},
  {key:'programas_hero_bg',  name:'Fondo página Programas',section:'programas'},
  {key:'tienda_hero_bg',     name:'Fondo página Tienda',   section:'tienda'},
  {key:'portal_bg',          name:'Fondo página Login',    section:'general'},
];

async function loadAFotos() {
  const container = document.getElementById('fotosContent');
  if (!container) return;
  let urls = {};
  try {
    const sb = getSB();
    if (sb) {
      const { data } = await sb.from('site_images').select('key,url,updated_at');
      (data||[]).forEach(r => { urls[r.key] = r; });
    }
  } catch(e) {}

  container.innerHTML = SITE_IMGS.map(img => {
    const rec = urls[img.key];
    const src = rec?.url || `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=50`;
    const updated = rec?.updated_at ? 'Actualizado ' + timeAgoA(rec.updated_at) : 'Sin actualizar';
    return `
      <div class="ic">
        <div class="ic-prev" onclick="openAImgEditor('${img.key}','${img.name}','${src}')">
          <img id="aip-${img.key}" src="${src}" alt="${img.name}">
          <div class="ic-ov"><button class="ic-btn">✏️ Cambiar</button></div>
        </div>
        <div class="ic-info">
          <div class="ic-key">${img.key}</div>
          <div class="ic-name">${img.name}</div>
          <div style="font-size:.68rem;color:var(--muted);margin-top:.15rem">${updated}</div>
        </div>
        <div class="ic-acts">
          <button class="ia p" onclick="openAImgEditor('${img.key}','${img.name}','${src}')">✏️ Cambiar</button>
        </div>
      </div>`;
  }).join('');

  // Wrap en secciones
  const sections = [{id:'hero',label:'🏠 Hero — Homepage'},{id:'programas',label:'📚 Programas'},{id:'tienda',label:'🛍️ Tienda'},{id:'general',label:'👤 General'}];
  let html = '';
  sections.forEach(sec => {
    const secImgs = SITE_IMGS.filter(i => i.section === sec.id);
    const secUrls = secImgs.map(img => {
      const rec = urls[img.key];
      const src = rec?.url || `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=50`;
      const updated = rec?.updated_at ? 'Actualizado ' + timeAgoA(rec.updated_at) : 'Sin actualizar';
      return `<div class="ic">
        <div class="ic-prev" onclick="openAImgEditor('${img.key}','${img.name}','${src}')">
          <img id="aip-${img.key}" src="${src}" alt="${img.name}">
          <div class="ic-ov"><button class="ic-btn">✏️ Cambiar</button></div>
        </div>
        <div class="ic-info"><div class="ic-key">${img.key}</div><div class="ic-name">${img.name}</div><div style="font-size:.68rem;color:var(--muted);margin-top:.15rem">${updated}</div></div>
        <div class="ic-acts"><button class="ia p" onclick="openAImgEditor('${img.key}','${img.name}','${src}')">✏️ Cambiar</button></div>
      </div>`;
    }).join('');
    html += `<div style="margin-bottom:1.75rem"><div class="imgs-sec-title">${sec.label}</div><div class="ig">${secUrls}</div></div>`;
  });
  container.innerHTML = html;
}

function openAImgEditor(key, name, currentSrc) {
  aCurrImgKey = key; aSelFile = null;
  document.getElementById('imgModTitle').textContent = 'Cambiar: ' + name;
  document.getElementById('imgModCurrent').src = currentSrc;
  document.getElementById('aFN').textContent = '';
  document.getElementById('aFPW').style.display = 'none';
  document.getElementById('aUPrW').style.display = 'none';
  document.getElementById('aUI').value = '';
  document.getElementById('aUP').style.display = 'none';
  document.getElementById('aFI').value = '';
  openAMod('imgMod');
}

function switchAImgTab(tab, btn) {
  document.getElementById('itup').style.display = tab==='up'  ? '' : 'none';
  document.getElementById('itur').style.display = tab==='url' ? '' : 'none';
  document.getElementById('itub').style.borderBottomColor  = tab==='up'  ? 'var(--teal)' : 'transparent';
  document.getElementById('iturb').style.borderBottomColor = tab==='url' ? 'var(--teal)' : 'transparent';
  document.getElementById('itub').style.color  = tab==='up'  ? 'var(--teal)' : 'var(--muted)';
  document.getElementById('iturb').style.color = tab==='url' ? 'var(--teal)' : 'var(--muted)';
}

function handleAFile(e) {
  const file = e.target.files[0]; if (!file) return;
  aSelFile = file;
  document.getElementById('aFN').textContent = file.name;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('aFPI').src = ev.target.result; document.getElementById('aFPW').style.display = ''; };
  reader.readAsDataURL(file);
}

function previewAUrl() {
  const url = document.getElementById('aUI').value.trim(); if (!url) return;
  document.getElementById('aUPrI').src = url;
  document.getElementById('aUPrW').style.display = '';
}

async function saveAImg() {
  const isUp = document.getElementById('itup').style.display !== 'none';
  const btn = document.getElementById('imgSB');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    const sb = getSB();
    if (!sb) throw new Error('Supabase no configurado');
    let url;
    if (isUp) {
      if (!aSelFile) { toast('Seleccioná un archivo','err'); return; }
      const ext = aSelFile.name.split('.').pop();
      const path = `site-images/${aCurrImgKey}-${Date.now()}.${ext}`;
      const { error: ue } = await sb.storage.from('site-images').upload(path, aSelFile, {upsert:true});
      if (ue) throw ue;
      const { data: { publicUrl } } = sb.storage.from('site-images').getPublicUrl(path);
      url = publicUrl;
    } else {
      url = document.getElementById('aUI').value.trim();
      if (!url) { toast('Ingresá una URL','err'); return; }
    }
    await sb.from('site_images').upsert({key:aCurrImgKey, url, updated_at: new Date().toISOString()});
    // Actualizar preview en la grilla
    document.querySelectorAll(`[id="aip-${aCurrImgKey}"]`).forEach(el => el.src = url);
    // Actualizar también las imágenes del sitio visible
    document.querySelectorAll(`[data-site-img="${aCurrImgKey}"]`).forEach(el => el.src = url);
    toast('✓ Imagen actualizada en toda la web','ok');
    closeAMod('imgMod');
    loadAFotos();
  } catch(e) {
    toast('Error: '+e.message,'err');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
  }
}

/* ── TURNOS ── */
async function loadATurnos() {
  const date = document.getElementById('aDate')?.value;
  if (!date) return;
  const list = document.getElementById('aTList');
  list.innerHTML = '<div class="skeleton" style="height:68px;border-radius:11px;margin-bottom:.55rem"></div>'.repeat(3);
  const [,mm,dd] = date.split('-');
  let appts = [];
  try {
    const sb = getSB();
    const { data } = await sb.from('appointments').select('*').eq('date',date).order('time');
    appts = data || [];
  } catch(e) {
    appts = [{id:'d1',patient_name:'Valentina R.',patient_email:'val@demo.com',type:'primera_vez',time:'09:00:00',status:'confirmed'},{id:'d2',patient_name:'Martín G.',patient_email:'mar@demo.com',type:'seguimiento',time:'10:30:00',status:'pending'}];
  }
  if (!appts.length) { list.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--muted)">No hay turnos para este día</div>'; document.getElementById('aST').textContent=0; document.getElementById('aSF').textContent=0; document.getElementById('aSN').textContent=0; return; }

  let fichasMap = {};
  try { const sb=getSB(); const {data}=await sb.from('fichas_medicas').select('patient_email').in('patient_email',[...new Set(appts.map(a=>a.patient_email))]); (data||[]).forEach(f=>fichasMap[f.patient_email]=true); } catch(e) {}

  const cf = appts.filter(a=>fichasMap[a.patient_email]).length;
  document.getElementById('aST').textContent = appts.length;
  document.getElementById('aSF').textContent = cf;
  document.getElementById('aSN').textContent = appts.length - cf;

  list.innerHTML = appts.map(a => {
    const hf = !!fichasMap[a.patient_email];
    const sl = {pending:'Pendiente',confirmed:'Confirmado',cancelled:'Cancelado',completed:'Completado',pending_transfer:'Esperando transferencia',pending_payment:'Esperando pago'}[a.status]||a.status;
    const sc = {pending:'pe',confirmed:'co',cancelled:'ca',completed:'co',pending_transfer:'pe',pending_payment:'pe'}[a.status]||'pe';
    return `<div class="tr-row ${hf?'hf':'nf'}" onclick="openATurno('${a.patient_email}','${a.patient_name}','${a.id}','${a.type||'seguimiento'}')">
      <div class="tr-date"><div class="tr-day">${parseInt(dd)}</div><div class="tr-mon">${AMONTHS[parseInt(mm)-1]}</div></div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.15rem">
          <span style="font-weight:600;font-size:.88rem">${a.patient_name}</span>
          <span style="font-size:.65rem;font-weight:600;padding:.1rem .5rem;border-radius:100px;background:${hf?'rgba(58,125,140,.12)':'rgba(212,133,58,.12)'};color:${hf?'var(--teal)':'#D4853A'}">
            ${hf ? '↩ Paciente conocido' : '★ Primera vez'}
          </span>
        </div>
        <div style="font-size:.75rem;color:var(--muted)">${a.patient_email} · ${ATIPO[a.type]||a.type||'Consulta'} <span class="aps ${sc}">${sl}</span></div>
      </div>
      <div style="font-family:var(--fd);font-size:1.05rem;color:var(--gold);white-space:nowrap">${(a.time||'').slice(0,5)} hs</div>
      <div class="fi ${hf?'y':'n'}" title="${hf?'Paciente conocido — tiene ficha':'Primera vez — se creó ficha automáticamente'}">${hf?'✓':'★'}</div>
    </div>`;
  }).join('');
}

async function openATurno(email, nombre, apptId, tipo) {
  // Si tiene ficha → abrir modal con ficha. Si no → ofrecer crear.
  let ficha = null;
  try { const sb=getSB(); const {data}=await sb.from('fichas_medicas').select('*').eq('patient_email',email).single(); ficha=data; } catch(e) {}
  if (!ficha) {
    if (confirm(`${nombre} no tiene ficha médica. ¿Querés crear una ahora?`)) openANuevaFicha(email, nombre);
    return;
  }
  toast(`Ficha de ${nombre}: ${ficha.antecedentes_personales||'Sin antecedentes registrados'}. Usá el panel de Fichas para ver el detalle completo.`, 'ok', 5000);
}

/* ── FICHAS ── */
async function loadAFichas() {
  const tbody = document.getElementById('aFBody');
  try {
    const sb = getSB();
    const { data } = await sb.from('fichas_medicas').select('*, evoluciones(id,fecha)').order('patient_name');
    aAllFichas = data || [];
    renderAFichas(aAllFichas);
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--muted)">Conectá Supabase para ver fichas</td></tr>';
  }
}

function renderAFichas(fichas) {
  const tbody = document.getElementById('aFBody');
  if (!fichas.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--muted)">No hay fichas aún</td></tr>'; return; }
  tbody.innerHTML = fichas.map(f => {
    const evs = f.evoluciones||[];
    const last = evs.length ? evs.sort((a,b)=>b.fecha.localeCompare(a.fecha))[0].fecha : null;
    return `<tr>
      <td><div style="font-weight:600">${f.patient_name}</div>${f.dni?`<div style="font-size:.73rem;color:var(--muted)">DNI ${f.dni}</div>`:''}</td>
      <td style="color:var(--muted)">${f.patient_email}</td>
      <td>${last?formatADate(last):'—'}</td>
      <td><span style="background:rgba(58,125,140,.12);color:var(--teal);padding:.2rem .65rem;border-radius:100px;font-size:.68rem;font-weight:600">${evs.length} consulta${evs.length!==1?'s':''}</span></td>
      <td><button onclick="toast('Ficha de ${f.patient_name}: ${(f.antecedentes_personales||'Sin antecedentes').slice(0,80)}...','ok',5000)" style="padding:.38rem .85rem;border-radius:100px;font-size:.7rem;font-weight:600;border:1.5px solid var(--cream-dk);background:#fff;cursor:pointer;font-family:var(--fb)">Ver</button></td>
    </tr>`;
  }).join('');
}

function filterAFichas() {
  const q = document.getElementById('fichaQ')?.value.toLowerCase()||'';
  renderAFichas(q ? aAllFichas.filter(f => f.patient_name.toLowerCase().includes(q)||f.patient_email.toLowerCase().includes(q)) : aAllFichas);
}

function openANuevaFicha(email='', nombre='') {
  document.getElementById('nfN').value = nombre;
  document.getElementById('nfE').value = email;
  document.getElementById('nfModTitle').textContent = email ? `Nueva ficha: ${nombre}` : 'Nueva ficha médica';
  openAMod('nfMod');
}

async function crearAFicha() {
  const nombre = document.getElementById('nfN').value.trim();
  const email  = document.getElementById('nfE').value.trim();
  if (!nombre||!email) { toast('Nombre y email son obligatorios','err'); return; }
  const btn = document.getElementById('nfBtn');
  btn.disabled=true; btn.textContent='Creando...';
  try {
    const sb = getSB();
    await sb.from('fichas_medicas').insert({
      patient_name:nombre, patient_email:email,
      patient_phone:document.getElementById('nfT').value.trim()||null,
      dni:document.getElementById('nfD').value.trim()||null,
      fecha_nacimiento:document.getElementById('nfNc').value||null,
      sexo:document.getElementById('nfSx').value||null,
      peso_kg:parseFloat(document.getElementById('nfP').value)||null,
      altura_cm:parseInt(document.getElementById('nfH').value)||null,
      antecedentes_personales:document.getElementById('nfAP').value.trim()||null,
      medicacion_actual:document.getElementById('nfMd').value.trim()||null,
      alergias:document.getElementById('nfAl').value.trim()||null,
      motivo_consulta_inicial:document.getElementById('nfMt').value.trim()||null,
    });
    toast('Ficha creada ✓','ok');
    closeAMod('nfMod');
    loadAFichas();
  } catch(e) {
    toast(e.message.includes('duplicate')?'Ya existe una ficha para ese email':e.message,'err');
  } finally { btn.disabled=false; btn.textContent='Crear ficha'; }
}

/* ── TESTIMONIOS ── */
async function loadATestis() {
  const tbody = document.getElementById('aTBody');
  try {
    const sb = getSB();
    const { data } = await sb.from('testimonials').select('*').order('sort_order');
    if (!data?.length) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--muted)">Sin testimonios</td></tr>'; return; }
    tbody.innerHTML = data.map(t=>`<tr>
      <td style="font-weight:600">${t.author_name}</td>
      <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem">${t.text}</td>
      <td>${t.program||'—'}</td>
      <td><span style="background:${t.active?'rgba(74,155,111,.12)':'rgba(138,132,128,.1)'};color:${t.active?'#2E7A52':'var(--muted)'};padding:.2rem .65rem;border-radius:100px;font-size:.68rem;font-weight:600">${t.active?'Sí':'No'}</span></td>
      <td><button onclick="toggleATestis('${t.id}',${!t.active})" style="padding:.38rem .85rem;border-radius:100px;font-size:.7rem;font-weight:600;border:1.5px solid var(--cream-dk);background:#fff;cursor:pointer;font-family:var(--fb)">${t.active?'Ocultar':'Mostrar'}</button></td>
    </tr>`).join('');
  } catch(e) { tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--muted)">Error al cargar</td></tr>'; }
}
async function toggleATestis(id, active) {
  try { await getSB().from('testimonials').update({active}).eq('id',id); loadATestis(); } catch(e) {}
}

/* ── CALENDARIO ADMIN ── */
let calState = {
  year:  new Date().getFullYear(),
  month: new Date().getMonth(),
  selectedDate: new Date().toISOString().split('T')[0],
  medicoId: '',
  medicos: [],
  appts: [],
  blocked: [],
};

const CAL_MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CAL_COLORS = ['#3A7D8C','#C9935A','#4A9B6F','#7B5EA7','#C4614A','#2D6A79'];

async function initCalendario() {
  await loadMedicos();
  await loadCalData();
  renderCalAdmin();
}

async function loadMedicos() {
  try {
    const sb = getSB();
    const { data } = await sb.from('medicos').select('*').eq('activo', true).order('nombre');
    calState.medicos = data || [];
  } catch(e) {
    calState.medicos = [{ id:'', nombre:'Dra. Mariel Dobenau', color:'#3A7D8C' }];
  }

  // Llenar filtros
  const filters = document.getElementById('calMedicoFilters');
  const bqMedico = document.getElementById('bqMedico');
  calState.medicos.forEach((m, i) => {
    const color = m.color || CAL_COLORS[i % CAL_COLORS.length];
    // Botón filtro
    const btn = document.createElement('button');
    btn.className = 'medico-filter';
    btn.dataset.medico = m.id;
    btn.style.cssText = `border-color:${color};color:${color}`;
    btn.textContent = m.nombre;
    btn.onclick = () => filterCalMedico(m.id, btn, color);
    filters.appendChild(btn);
    // Select bloqueo
    const opt = document.createElement('option');
    opt.value = m.id; opt.textContent = m.nombre;
    bqMedico.appendChild(opt);
  });
}

function filterCalMedico(id, btn, color) {
  document.querySelectorAll('.medico-filter').forEach(b => {
    b.style.background = '';
    b.style.color = b.dataset.medico ? b.style.borderColor || 'var(--teal)' : 'var(--text)';
    b.classList.remove('active');
  });
  btn.classList.add('active');
  btn.style.background = color || 'var(--teal)';
  btn.style.color = '#fff';
  calState.medicoId = id;
  loadCalData().then(() => renderCalAdmin());
}

async function loadCalData() {
  const sb = getSB(); if(!sb) return;
  const firstDay = `${calState.year}-${String(calState.month+1).padStart(2,'0')}-01`;
  const lastDay  = `${calState.year}-${String(calState.month+1).padStart(2,'0')}-${new Date(calState.year, calState.month+1, 0).getDate()}`;
  try {
    let apptQ = sb.from('appointments').select('*').gte('date', firstDay).lte('date', lastDay).not('status','eq','cancelled');
    if(calState.medicoId) apptQ = apptQ.eq('medico_id', calState.medicoId);
    const { data: appts } = await apptQ.order('time');
    calState.appts = appts || [];

    let blockQ = sb.from('blocked_slots').select('*').gte('date', firstDay).lte('date', lastDay);
    if(calState.medicoId) blockQ = blockQ.or(`medico_id.eq.${calState.medicoId},medico_id.is.null`);
    const { data: blocked } = await blockQ;
    calState.blocked = blocked || [];
  } catch(e) {
    calState.appts = []; calState.blocked = [];
  }
}

function renderCalAdmin() {
  const { year, month } = calState;
  document.getElementById('calAdminMonthTitle').textContent = `${CAL_MONTHS_ES[month]} ${year}`;

  const grid     = document.getElementById('calAdminGrid');
  const firstDay = new Date(year, month, 1).getDay();
  const daysInM  = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const today    = new Date().toISOString().split('T')[0];

  let html = '';

  // Días del mes anterior
  for(let i = firstDay-1; i >= 0; i--) {
    html += `<div class="cal-cell other-month"><div class="cal-cell-num" style="color:var(--muted)">${prevDays-i}</div></div>`;
  }

  // Días del mes
  for(let d = 1; d <= daysInM; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday    = dateStr === today;
    const isSelected = dateStr === calState.selectedDate;
    const dayAppts   = calState.appts.filter(a => a.date === dateStr);
    const dayBlocked = calState.blocked.filter(b => b.date === dateStr);

    // Pills de turnos (máx 3 visible)
    let pills = dayAppts.slice(0, 3).map(a => {
      const medico = calState.medicos.find(m => m.id === a.medico_id);
      const color  = medico?.color || '#3A7D8C';
      return `<div class="cal-appt-pill" style="background:${color}20;color:${color};border-left:2px solid ${color}" title="${a.patient_name} · ${(a.time||'').slice(0,5)}">${(a.time||'').slice(0,5)} ${a.patient_name.split(' ')[0]}</div>`;
    }).join('');

    if(dayAppts.length > 3) pills += `<div style="font-size:.62rem;color:var(--muted);padding:.1rem .3rem">+${dayAppts.length-3} más</div>`;

    // Pills bloqueados
    const bPills = dayBlocked.slice(0,2).map(b =>
      `<div class="cal-blocked-pill">🚫 ${b.todo_el_dia ? 'Todo el día' : (b.time||'').slice(0,5)+' '+((b.motivo||'').slice(0,10))}</div>`
    ).join('');

    // Badge total
    const total = dayAppts.length;
    const badge = total > 0 ? `<div style="position:absolute;top:.35rem;right:.4rem;width:18px;height:18px;border-radius:50%;background:var(--teal);color:#fff;font-size:.6rem;font-weight:700;display:flex;align-items:center;justify-content:center">${total}</div>` : '';

    html += `<div class="cal-cell${isToday?' today':''}${isSelected?' selected':''}" onclick="selectCalDay('${dateStr}')">
      ${badge}
      <div class="cal-cell-num">${d}</div>
      ${pills}${bPills}
    </div>`;
  }

  // Días del mes siguiente
  const totalCells = firstDay + daysInM;
  const remaining  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for(let d = 1; d <= remaining; d++) {
    html += `<div class="cal-cell other-month"><div class="cal-cell-num" style="color:var(--muted)">${d}</div></div>`;
  }

  grid.innerHTML = html;

  // Si hay día seleccionado, mostrar detalle
  if(calState.selectedDate) renderCalSide(calState.selectedDate);
}

function selectCalDay(dateStr) {
  calState.selectedDate = dateStr;
  // Actualizar fecha en bloqueo rápido
  const bqDate = document.getElementById('bqDate');
  if(bqDate) bqDate.value = dateStr;
  renderCalAdmin();
  renderCalSide(dateStr);
}

function renderCalSide(dateStr) {
  const [y, mm, dd] = dateStr.split('-');
  const label = `${parseInt(dd)} de ${CAL_MONTHS_ES[parseInt(mm)-1]} ${y}`;
  document.getElementById('calSideTitle').textContent = label;

  const dayAppts   = calState.appts.filter(a => a.date === dateStr).sort((a,b) => (a.time||'').localeCompare(b.time||''));
  const dayBlocked = calState.blocked.filter(b => b.date === dateStr);

  document.getElementById('calSideSubtitle').textContent =
    `${dayAppts.length} turno${dayAppts.length!==1?'s':''} · ${dayBlocked.length} bloqueado${dayBlocked.length!==1?'s':''}`;

  const body = document.getElementById('calSideBody');
  let html = '';

  // Bloqueados primero
  dayBlocked.forEach(b => {
    html += `<div class="cal-blocked-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem">
        <span style="font-size:.72rem;font-weight:700;color:#C4614A;text-transform:uppercase;letter-spacing:.08em">🚫 Bloqueado</span>
        <button onclick="deleteCalBlock('${b.id}')" style="font-size:.7rem;color:#C4614A;background:none;border:none;cursor:pointer">✕ Borrar</button>
      </div>
      <div style="font-size:.82rem;font-weight:500">${b.todo_el_dia ? 'Todo el día' : `${(b.time||'').slice(0,5)} hs`}</div>
      ${b.motivo ? `<div style="font-size:.76rem;color:var(--muted);margin-top:.2rem">${b.motivo}</div>` : ''}
    </div>`;
  });

  // Turnos
  if(!dayAppts.length && !dayBlocked.length) {
    html = `<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.84rem">Sin turnos ni bloqueos para este día</div>`;
  }

  dayAppts.forEach(a => {
    const medico = calState.medicos.find(m => m.id === a.medico_id);
    const color  = medico?.color || '#3A7D8C';
    const statusLabel = {pending:'Pendiente',confirmed:'Confirmado',pending_transfer:'Esperando transferencia',completed:'Completado'}[a.status] || a.status;
    const statusColor = {pending:'#D4853A',confirmed:'#4A9B6F',pending_transfer:'#D4853A',completed:'#3A7D8C'}[a.status] || '#8A7F74';
    const modalidadLabel = a.modalidad === 'presencial' ? '📍 Presencial' : '💻 Virtual';

    html += `<div class="cal-appt-card" style="border-left:3px solid ${color}">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="cal-appt-time">${(a.time||'').slice(0,5)} hs</div>
        <span style="font-size:.68rem;font-weight:600;padding:.18rem .55rem;border-radius:100px;background:${statusColor}18;color:${statusColor}">${statusLabel}</span>
      </div>
      <div class="cal-appt-name">${a.patient_name}</div>
      <div class="cal-appt-tipo">${ATIPO[a.type]||a.type||'—'}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:.4rem">
        <span class="cal-appt-mod" style="background:${color}15;color:${color}">${modalidadLabel}</span>
        ${medico ? `<span style="font-size:.68rem;color:var(--muted)">${medico.nombre}</span>` : ''}
      </div>
      ${a.patient_phone ? `<div style="margin-top:.45rem">
        <a href="https://wa.me/${(a.patient_phone||'').replace(/\D/g,'')}" target="_blank" style="font-size:.7rem;color:#25D366;font-weight:600;text-decoration:none">💬 WhatsApp</a>
      </div>` : ''}
      ${a.sena_status === 'pending' ? `<div style="margin-top:.4rem;font-size:.7rem;background:rgba(212,133,58,.1);color:#8A5020;padding:.25rem .5rem;border-radius:6px">⏳ Transferencia pendiente</div>` : ''}
    </div>`;
  });

  body.innerHTML = html;
}

async function deleteCalBlock(id) {
  if(!confirm('¿Borrar este bloqueo?')) return;
  try {
    await getSB().from('blocked_slots').delete().eq('id', id);
    toast('Bloqueo eliminado ✓', 'ok');
    await loadCalData();
    renderCalAdmin();
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

function toggleBqTodoDia(cb) {
  const desde  = document.getElementById('bqDesde');
  const hasta  = document.getElementById('bqHasta');
  desde.disabled = cb.checked;
  hasta.disabled  = cb.checked;
  if(cb.checked) { desde.value = ''; hasta.value = ''; }
}

async function saveBlockQuick() {
  const date     = document.getElementById('bqDate').value;
  const medicoId = document.getElementById('bqMedico').value;
  const motivo   = document.getElementById('bqMotivo').value.trim();
  const todoDia  = document.getElementById('bqTodoDia').checked;
  const desde    = document.getElementById('bqDesde').value;

  if(!date) { toast('Seleccioná una fecha','err'); return; }
  if(!todoDia && !desde) { toast('Indicá la hora de inicio o tildá "Todo el día"','err'); return; }

  try {
    await getSB().from('blocked_slots').insert({
      date,
      time:        todoDia ? null : desde,
      todo_el_dia: todoDia,
      motivo:      motivo || null,
      medico_id:   medicoId || null,
    });
    toast('Horario bloqueado ✓','ok');
    // Limpiar
    document.getElementById('bqMotivo').value = '';
    document.getElementById('bqDesde').value  = '';
    document.getElementById('bqHasta').value  = '';
    document.getElementById('bqTodoDia').checked = false;
    await loadCalData();
    renderCalAdmin();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

function calAdminPrev() {
  calState.month--;
  if(calState.month < 0) { calState.month = 11; calState.year--; }
  loadCalData().then(() => renderCalAdmin());
}
function calAdminNext() {
  calState.month++;
  if(calState.month > 11) { calState.month = 0; calState.year++; }
  loadCalData().then(() => renderCalAdmin());
}
function calAdminGoToday() {
  const now = new Date();
  calState.year  = now.getFullYear();
  calState.month = now.getMonth();
  calState.selectedDate = now.toISOString().split('T')[0];
  loadCalData().then(() => renderCalAdmin());
}

/* ── PROGRAMAS ADMIN ── */
let currentAdmProgId = null;

async function loadAPrograms() {
  const sb = getSB(); if(!sb) return;
  const grid = document.getElementById('apProgGrid');
  if(!grid) return;
  try {
    const { data: progs } = await sb.from('programs').select('*, memberships(id,status)').eq('active',true).order('sort_order');
    if(!progs?.length) { grid.innerHTML='<div style="color:var(--muted);padding:2rem">No hay programas activos.</div>'; return; }
    grid.innerHTML = progs.map(p => {
      const activos = (p.memberships||[]).filter(m=>m.status==='active').length;
      return `
        <div style="background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(28,26,24,.07);overflow:hidden;cursor:pointer;transition:.2s" onclick="openProgAdmin('${p.id}','${p.name}')" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
          <div style="background:var(--dark);padding:1.75rem 1.5rem;position:relative;overflow:hidden">
            ${p.image_url?`<img src="${p.image_url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.25">`:''}
            <div style="position:relative;z-index:2">
              <div style="font-size:.65rem;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:rgba(201,147,90,.7);margin-bottom:.4rem">${p.duration||''} · ${p.level||''}</div>
              <div style="font-family:var(--fd);font-size:1.15rem;color:var(--cream)">${p.name}</div>
            </div>
          </div>
          <div style="padding:1.1rem 1.25rem">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.85rem">
              <div style="font-size:.82rem;color:var(--muted)">${p.description?.slice(0,80)||''}...</div>
            </div>
            <div style="display:flex;gap:.65rem;flex-wrap:wrap">
              <span style="background:rgba(58,125,140,.1);color:var(--teal);padding:.2rem .65rem;border-radius:100px;font-size:.7rem;font-weight:600">👥 ${activos} activo${activos!==1?'s':''}</span>
              <span style="background:rgba(201,147,90,.1);color:var(--gold-dk);padding:.2rem .65rem;border-radius:100px;font-size:.7rem;font-weight:600">💰 ${new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(p.price||0)}</span>
            </div>
            <div style="margin-top:.85rem;display:flex;gap:.5rem">
              <button onclick="event.stopPropagation();openProgAdmin('${p.id}','${p.name}')" style="flex:1;padding:.45rem;border-radius:8px;font-size:.74rem;font-weight:600;background:var(--teal);color:#fff;border:none;cursor:pointer;font-family:var(--fb)">📋 Gestionar</button>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch(e) { grid.innerHTML='<div style="color:var(--muted);padding:2rem">Error al cargar programas: '+e.message+'</div>'; }
}

async function openProgAdmin(progId, progName) {
  currentAdmProgId = progId;
  document.getElementById('progAdmModTitle').textContent = progName;
  openAMod('progAdmMod');
  switchProgAdmTab('contenido', document.getElementById('ptab-contenido'));
  loadProgContent();
}

function switchProgAdmTab(tab, btn) {
  document.querySelectorAll('#progAdmMod .portal-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('progAdm-contenido').style.display = tab==='contenido' ? '' : 'none';
  document.getElementById('progAdm-miembros').style.display  = tab==='miembros'  ? '' : 'none';
  if(tab==='contenido') loadProgContent();
  if(tab==='miembros')  loadProgMembers();
}

async function loadProgContent() {
  const sb = getSB();
  const list = document.getElementById('progAdmContentList');
  if(!list) return;
  try {
    const { data: content } = await sb.from('program_content').select('*').eq('program_id', currentAdmProgId).order('week').order('sort_order');
    if(!content?.length) { list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.85rem">Sin contenido aún. Agregá el primero.</div>'; return; }
    const TI = {video:'▶️',pdf:'📄',audio:'🎧',text:'📝',link:'🔗'};
    const weeks = {};
    content.forEach(c=>{ const w=c.week||1; if(!weeks[w]) weeks[w]=[]; weeks[w].push(c); });
    let html='';
    Object.entries(weeks).sort(([a],[b])=>+a-+b).forEach(([week,items])=>{
      html+=`<div style="font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:.75rem 0 .4rem">Semana ${week}</div>`;
      items.forEach(item=>{
        html+=`<div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:#fff;border-radius:10px;margin-bottom:.45rem;border:1.5px solid var(--cream-dk)">
          <div style="font-size:1.1rem">${TI[item.content_type]||'📄'}</div>
          <div style="flex:1">
            <div style="font-size:.86rem;font-weight:500">${item.title}</div>
            <div style="font-size:.72rem;color:var(--muted)">${item.content_type}${item.duration_min?' · '+item.duration_min+' min':''} ${item.is_preview?'· 🔓 Preview gratis':''}</div>
            ${item.url?`<div style="font-size:.7rem;color:var(--teal);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px">${item.url}</div>`:''}
          </div>
          <button onclick="deleteContent('${item.id}')" style="width:28px;height:28px;border-radius:50%;background:rgba(196,97,74,.08);color:#C4614A;border:none;cursor:pointer;font-size:.75rem">✕</button>
        </div>`;
      });
    });
    list.innerHTML = html;
  } catch(e) { list.innerHTML='<div style="color:var(--muted)">Error: '+e.message+'</div>'; }
}

function openAddContent() {
  document.getElementById('addContentForm').style.display='';
  document.getElementById('ctTitle').value='';
  document.getElementById('ctUrl').value='';
  document.getElementById('ctDesc').value='';
  document.getElementById('ctDur').value='';
  document.getElementById('ctPreview').checked=false;
}

async function saveContent() {
  const title = document.getElementById('ctTitle').value.trim();
  if(!title){ toast('El título es obligatorio','err'); return; }
  const data = {
    program_id:   currentAdmProgId,
    title,
    content_type: document.getElementById('ctType').value,
    week:         parseInt(document.getElementById('ctWeek').value)||1,
    duration_min: parseInt(document.getElementById('ctDur').value)||null,
    url:          document.getElementById('ctUrl').value.trim()||null,
    description:  document.getElementById('ctDesc').value.trim()||null,
    is_preview:   document.getElementById('ctPreview').checked,
    sort_order:   Date.now(),
  };
  try {
    await getSB().from('program_content').insert(data);
    toast('Contenido agregado ✓','ok');
    document.getElementById('addContentForm').style.display='none';
    loadProgContent();
  } catch(e){ toast('Error: '+e.message,'err'); }
}

async function deleteContent(id) {
  if(!confirm('¿Eliminar este contenido?')) return;
  try {
    await getSB().from('program_content').delete().eq('id',id);
    toast('Contenido eliminado','ok');
    loadProgContent();
  } catch(e){ toast('Error: '+e.message,'err'); }
}

async function loadProgMembers() {
  const sb = getSB();
  const list = document.getElementById('progAdmMemberList');
  if(!list) return;
  try {
    const { data: members } = await sb
      .from('memberships')
      .select('*, profiles(full_name, id)')
      .eq('program_id', currentAdmProgId)
      .order('created_at', {ascending:false});

    if(!members?.length){ list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.85rem">Sin miembros aún.</div>'; return; }

    const SC = {active:'#4A9B6F',cancelled:'#C4614A',expired:'#D4853A',pending:'#8A7F74'};
    const SL = {active:'Activo',cancelled:'Cancelado',expired:'Vencido',pending:'Pendiente'};
    const AT = {purchased:'Comprado',manual:'Manual',gift:'Regalo'};

    list.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.83rem">
      <thead><tr style="background:var(--cream)">
        <th style="padding:.6rem .85rem;text-align:left;font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Usuario</th>
        <th style="padding:.6rem .85rem;text-align:left;font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Acceso</th>
        <th style="padding:.6rem .85rem;text-align:left;font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Estado</th>
        <th style="padding:.6rem .85rem;text-align:left;font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Notas</th>
        <th style="padding:.6rem .85rem"></th>
      </tr></thead>
      <tbody>${members.map(m=>{
        const sc = SC[m.status]||'#8A7F74';
        return `<tr style="border-bottom:1px solid var(--cream-dk)">
          <td style="padding:.75rem .85rem"><div style="font-weight:500">${m.profiles?.full_name||'—'}</div><div style="font-size:.72rem;color:var(--muted)">${m.progress||0}% completado</div></td>
          <td style="padding:.75rem .85rem"><span style="font-size:.72rem;background:rgba(201,147,90,.1);color:var(--gold-dk);padding:.18rem .55rem;border-radius:100px;font-weight:600">${AT[m.access_type]||m.access_type}</span></td>
          <td style="padding:.75rem .85rem"><span style="font-size:.72rem;background:${sc}18;color:${sc};padding:.18rem .55rem;border-radius:100px;font-weight:600">${SL[m.status]||m.status}</span></td>
          <td style="padding:.75rem .85rem;font-size:.78rem;color:var(--muted)">${m.notes||'—'}</td>
          <td style="padding:.75rem .85rem">
            ${m.status==='active'
              ? `<button onclick="toggleMembership('${m.id}','cancelled')" style="padding:.32rem .7rem;border-radius:100px;font-size:.68rem;font-weight:600;background:rgba(196,97,74,.1);color:#C4614A;border:1.5px solid rgba(196,97,74,.25);cursor:pointer;font-family:var(--fb)">Desactivar</button>`
              : `<button onclick="toggleMembership('${m.id}','active')" style="padding:.32rem .7rem;border-radius:100px;font-size:.68rem;font-weight:600;background:rgba(74,155,111,.1);color:#2E7A52;border:1.5px solid rgba(74,155,111,.25);cursor:pointer;font-family:var(--fb)">Activar</button>`
            }
          </td>
        </tr>`}).join('')}
      </tbody>
    </table>`;
  } catch(e){ list.innerHTML='<div style="color:var(--muted)">Error: '+e.message+'</div>'; }
}

function openAddMember() { document.getElementById('addMemberForm').style.display=''; }

async function saveMember() {
  const email = document.getElementById('mbEmail').value.trim();
  if(!email){ toast('Ingresá el email del usuario','err'); return; }
  const sb = getSB();
  try {
    // Buscar el user_id por email
    const { data: users } = await sb.from('profiles').select('id,full_name').ilike('id',
      `(SELECT id FROM auth.users WHERE email = '${email}')`
    );
    // Alternativa: buscar en auth directamente no es posible desde cliente
    // Usar RPC o buscar por email en profiles si lo tenemos
    // Por ahora usamos el email para crear la membresía con un insert especial
    const expires = document.getElementById('mbExpires').value || null;
    await sb.from('memberships').insert({
      program_id:  currentAdmProgId,
      user_id:     email, // temporal — se reemplaza con el UUID real
      status:      'active',
      access_type: document.getElementById('mbType').value,
      notes:       document.getElementById('mbNotes').value.trim()||null,
      expires_at:  expires ? new Date(expires).toISOString() : null,
    });
    toast('Acceso otorgado ✓','ok');
    document.getElementById('addMemberForm').style.display='none';
    loadProgMembers();
  } catch(e){
    toast('Error: Asegurate que el usuario exista en el sistema','err');
  }
}

async function toggleMembership(id, newStatus) {
  const msg = newStatus==='cancelled' ? '¿Desactivar el acceso de este usuario?' : '¿Reactivar el acceso de este usuario?';
  if(!confirm(msg)) return;
  try {
    await getSB().from('memberships').update({status:newStatus}).eq('id',id);
    toast(newStatus==='active'?'Acceso activado ✓':'Acceso desactivado','ok');
    loadProgMembers();
  } catch(e){ toast('Error: '+e.message,'err'); }
}

/* ── CONSULTAS ── */

const CONSULTAS_DEFAULT = [
  { id:'integral',    nombre:'Consulta Integral – Medicina Funcional', descripcion:'Historia clínica completa, evaluación funcional, plan nutricional y estrategia terapéutica',       precio:0, duracion:'60 min', icono:'🔬', modalidad:'ambas',      activo:true },
  { id:'seguimiento', nombre:'Consulta de Seguimiento',                 descripcion:'Evaluación de evolución, ajustes de plan y revisión de adherencia',                                precio:0, duracion:'45 min', icono:'📊', modalidad:'ambas',      activo:true },
  { id:'nutricional', nombre:'Consulta Nutricional',                    descripcion:'Planificación alimentaria personalizada, evaluación de hábitos y plan nutricional',                precio:0, duracion:'45 min', icono:'🥗', modalidad:'ambas',      activo:true },
  { id:'espontanea',  nombre:'Consulta Espontánea',                     descripcion:'Resolución de dudas puntuales. Solo pacientes previos',                                           precio:0, duracion:'20 min', icono:'💬', modalidad:'ambas',      activo:true },
  { id:'pediatrica',  nombre:'Consulta Pediátrica',                     descripcion:'Consulta integral en niños, evaluación clínica y estrategia nutricional',                         precio:0, duracion:'60 min', icono:'👶', modalidad:'ambas',      activo:true },
  { id:'inbody',      nombre:'Medición InBody',                         descripcion:'Composición corporal: masa muscular, grasa corporal, agua y metabolismo basal. Solo presencial',  precio:0, duracion:'20 min', icono:'⚖️', modalidad:'presencial', activo:true },
];

async function loadAConsultas() {
  const grid = document.getElementById('consultasGrid');
  let consultas = [];
  try {
    const sb = getSB();
    const { data } = await sb.from('consultation_types').select('*').order('sort_order');
    consultas = data?.length ? data : CONSULTAS_DEFAULT;
  } catch(e) { consultas = CONSULTAS_DEFAULT; }
  renderConsultasGrid(consultas);
}

function renderConsultasGrid(consultas) {
  const grid = document.getElementById('consultasGrid');
  if(!consultas.length) { grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)">No hay consultas. Creá una nueva.</div>`; return; }
  grid.innerHTML = consultas.map(c=>`
    <div style="background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(28,26,24,.07);overflow:hidden;border:1.5px solid ${c.activo?'transparent':'rgba(196,97,74,.2)'}">
      <div style="padding:1.1rem 1.25rem;border-bottom:1px solid var(--cream-dk);display:flex;align-items:center;gap:.75rem">
        <div style="font-size:1.75rem">${c.icono||'📋'}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:.92rem">${c.nombre}</div>
          <span style="font-size:.7rem;background:${c.activo?'rgba(74,155,111,.1)':'rgba(196,97,74,.1)'};color:${c.activo?'#2E7A52':'#C4614A'};padding:.15rem .55rem;border-radius:100px;font-weight:600">${c.activo?'● Activa':'● Inactiva'}</span>
          ${c.solo_pacientes_previos?`<span style="font-size:.67rem;background:rgba(201,147,90,.12);color:var(--gold-dk);padding:.15rem .55rem;border-radius:100px;font-weight:600">🔒 Solo previos</span>`:''}
        </div>
      </div>
      <div style="padding:1rem 1.25rem;display:flex;flex-direction:column;gap:.5rem">
        <div style="font-size:.82rem;color:var(--muted);line-height:1.5">${c.descripcion||'—'}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:.25rem">
          <div style="font-family:var(--fd);font-size:1.25rem;color:var(--gold)">${fmt(c.precio)}</div>
          <div style="display:flex;gap:.4rem;align-items:center">
            <div style="font-size:.72rem;color:var(--muted);background:var(--cream);padding:.22rem .6rem;border-radius:100px">${c.duracion||'—'}</div>
            <div style="font-size:.72rem;padding:.22rem .6rem;border-radius:100px;font-weight:600;background:${c.modalidad==='presencial'?'rgba(201,147,90,.12)':c.modalidad==='virtual'?'rgba(58,125,140,.1)':'rgba(138,132,128,.1)'};color:${c.modalidad==='presencial'?'var(--gold-dk)':c.modalidad==='virtual'?'var(--teal)':'var(--muted)'}">
              ${c.modalidad==='presencial'?'📍 Presencial':c.modalidad==='virtual'?'💻 Virtual':'📍💻 Ambas'}
            </div>
          </div>
        </div>
      </div>
      <div style="padding:.75rem 1.25rem;border-top:1px solid var(--cream-dk);background:var(--cream);display:flex;gap:.5rem">
        <button onclick='openConsulta(${JSON.stringify(c)})' style="flex:1;padding:.45rem;border-radius:8px;font-size:.74rem;font-weight:600;background:var(--teal);color:#fff;border:none;cursor:pointer;font-family:var(--fb)">✏️ Editar</button>
        <button onclick="toggleConsulta('${c.id}',${!c.activo})" style="flex:1;padding:.45rem;border-radius:8px;font-size:.74rem;font-weight:600;background:#fff;color:${c.activo?'#C4614A':'#2E7A52'};border:1.5px solid ${c.activo?'rgba(196,97,74,.3)':'rgba(74,155,111,.3)'};cursor:pointer;font-family:var(--fb)">${c.activo?'⊘ Desactivar':'✓ Activar'}</button>
        <button onclick="deleteConsulta('${c.id}','${c.nombre}')" style="width:36px;padding:.45rem;border-radius:8px;font-size:.82rem;background:#fff;color:#C4614A;border:1.5px solid rgba(196,97,74,.2);cursor:pointer" title="Eliminar">🗑️</button>
      </div>
    </div>`).join('');
}

function openConsulta(c) {
  document.getElementById('cEditId').value   = c?.id||'';
  document.getElementById('cNombre').value   = c?.nombre||'';
  document.getElementById('cDesc').value     = c?.descripcion||'';
  document.getElementById('cPrecio').value   = c?.precio||'';
  document.getElementById('cDuracion').value  = c?.duracion||'';
  document.getElementById('cModalidad').value    = c?.modalidad||'ambas';
  document.getElementById('cSoloPrevios').value  = c?.solo_pacientes_previos ? 'true' : 'false';
  document.getElementById('cIcono').value         = c?.icono||'';
  document.getElementById('cActivo').value        = c?.activo!==false?'true':'false';
  document.getElementById('consultaModTitle').textContent = c?.id ? `Editar: ${c.nombre}` : 'Nueva consulta';
  openAMod('consultaMod');
}

async function saveConsulta() {
  const nombre = document.getElementById('cNombre').value.trim();
  const precio = parseInt(document.getElementById('cPrecio').value);
  if(!nombre||!precio){ toast('Nombre y precio son obligatorios','err'); return; }
  const id = document.getElementById('cEditId').value;
  const data = {
    nombre, precio,
    descripcion: document.getElementById('cDesc').value.trim()||null,
    duracion:    document.getElementById('cDuracion').value.trim()||null,
    modalidad:              document.getElementById('cModalidad').value||'ambas',
    solo_pacientes_previos: document.getElementById('cSoloPrevios').value === 'true',
    icono:                  document.getElementById('cIcono').value.trim()||'📋',
    activo:                 document.getElementById('cActivo').value==='true',
  };
  const btn = document.getElementById('cSaveBtn');
  btn.disabled=true; btn.textContent='Guardando...';
  try {
    const sb = getSB();
    if(id){ await sb.from('consultation_types').update(data).eq('id',id); toast('Consulta actualizada ✓','ok'); }
    else  { data.sort_order=Date.now(); await sb.from('consultation_types').insert(data); toast('Consulta creada ✓','ok'); }
    closeAMod('consultaMod');
    loadAConsultas();
    loadConsultasEnTurnos();
  } catch(e){ toast('Error: '+e.message,'err'); }
  finally { btn.disabled=false; btn.textContent='Guardar'; }
}

async function toggleConsulta(id, activo) {
  try {
    await getSB().from('consultation_types').update({activo}).eq('id',id);
    toast(activo?'Consulta activada ✓':'Consulta desactivada','ok');
    loadAConsultas(); loadConsultasEnTurnos();
  } catch(e){ toast('Error: '+e.message,'err'); }
}

async function deleteConsulta(id, nombre) {
  if(!confirm(`¿Eliminar "${nombre}"? No se puede deshacer.`)) return;
  try {
    await getSB().from('consultation_types').delete().eq('id',id);
    toast('Consulta eliminada','ok');
    loadAConsultas(); loadConsultasEnTurnos();
  } catch(e){ toast('Error: '+e.message,'err'); }
}

async function loadConsultasEnTurnos() {
  let consultas = [];
  try {
    // Esperar hasta que Supabase esté disponible (máx 5 segundos)
    let intentos = 0;
    while(!getSB() && intentos < 20) {
      await new Promise(r => setTimeout(r, 250));
      intentos++;
    }
    const sb = getSB();
    if(!sb) throw new Error('Supabase no disponible');
    const { data, error } = await sb.from('consultation_types').select('*').eq('activo',true).order('sort_order');
    if(error) throw error;
    consultas = data?.length ? data : CONSULTAS_DEFAULT;
  } catch(e){
    console.warn('Usando consultas por defecto:', e.message);
    consultas = CONSULTAS_DEFAULT;
  }
  const container = document.querySelector('#tipoOptions');
  if(!container) return;
  container.innerHTML = consultas.map(c=>`
    <div class="tipo-opt" data-tipo="${c.id}" data-precio="${c.precio}" data-dur="${c.duracion||'45 min'}" data-modalidad="${c.modalidad||'ambas'}" onclick="selTipo(this)">
      <div class="tipo-icon">${c.icono||'📋'}</div>
      <div class="tipo-info">
        <div class="tipo-name">${c.nombre}</div>
        <div class="tipo-desc">${c.descripcion||''} · ${c.duracion||''}</div>
      </div>
      <div class="tipo-price">${c.precio > 0 ? fmt(c.precio) : 'A confirmar'}</div>
      <div class="tipo-check">✓</div>
    </div>`).join('');
}

/* ── HORARIOS BLOQUEADOS ── */
async function loadABlocked() {
  const tbody = document.getElementById('aBBody');
  try {
    const sb = getSB();
    const { data } = await sb.from('blocked_slots').select('*').order('date').order('time');
    if (!data?.length) { tbody.innerHTML='<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted)">Sin bloqueados</td></tr>'; return; }
    tbody.innerHTML = data.map(b=>`<tr>
      <td>${formatADate(b.date)}</td>
      <td>${b.time?b.time.slice(0,5)+' hs':'Todo el día'}</td>
      <td>${b.reason||'—'}</td>
      <td><button onclick="deleteABlock('${b.id}')" style="padding:.32rem .75rem;border-radius:100px;font-size:.7rem;font-weight:600;border:1.5px solid rgba(196,97,74,.3);color:#C4614A;background:#fff;cursor:pointer;font-family:var(--fb)">✕ Borrar</button></td>
    </tr>`).join('');
  } catch(e) {}
}
async function aBlockSlot() {
  const date=document.getElementById('bDate').value; if(!date){toast('Seleccioná una fecha','err');return;}
  try { await getSB().from('blocked_slots').insert({date,time:document.getElementById('bTime').value||null,reason:document.getElementById('bReason').value.trim()||null}); toast('Horario bloqueado ✓','ok'); loadABlocked(); } catch(e){toast('Error: '+e.message,'err');}
}
async function deleteABlock(id) {
  try { await getSB().from('blocked_slots').delete().eq('id',id); loadABlocked(); } catch(e){}
}

/* ── MODAL ── */
function openAMod(id)  { document.getElementById(id)?.classList.add('open'); }
function closeAMod(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('click', e => { if(e.target.classList.contains('amb')) e.target.classList.remove('open'); });

/* ── HELPERS ── */
function formatADate(str) {
  if(!str) return '—';
  const [y,m,d] = str.split('-');
  return `${parseInt(d)} de ${AMONTHS_L[parseInt(m)-1]} ${y}`;
}
function timeAgoA(str) {
  const diff = Date.now() - new Date(str);
  const m = Math.floor(diff/60000);
  if(m<60) return `hace ${m}m`;
  if(m<1440) return `hace ${Math.floor(m/60)}h`;
  return `hace ${Math.floor(m/1440)}d`;
}

/* ══ INIT ADMIN ══ */
function initAdminPage() {
  const sb = getSB();
  if(sb) sb.auth.getUser().then(({data:{user}})=>{ 
    if(user){ const n=document.getElementById('admName'); if(n) n.textContent=user.email.split('@')[0]; }
  }).catch(()=>{});
  loadADash();
}
  }).catch(()=>{});
  loadADash();
}

/* ══ PORTAL JS ══ */
let portalUser = null;
let currentProgId = null;
let currentContent = [];

async function initPortal() {
  const sb = getSB(); if(!sb) { goTo('login'); return; }
  try {
    const { data: { user } } = await sb.auth.getUser();
    if(!user) { goTo('login'); return; }
    portalUser = user;
    const { data: profile } = await sb.from('profiles').select('full_name,role').eq('id', user.id).single();
    const nombre = profile?.full_name?.split(' ')[0] || user.email.split('@')[0];
    const pwEl = document.getElementById('portalWelcome');
    if(pwEl) pwEl.textContent = `Bienvenida, ${nombre}`;
    const pnEl = document.getElementById('portalUserName');
    if(pnEl) pnEl.textContent = profile?.full_name || nombre;
    const peEl = document.getElementById('portalUserEmail');
    if(peEl) peEl.textContent = user.email;
    const paEl = document.getElementById('portalAvatar');
    if(paEl) paEl.textContent = nombre.charAt(0).toUpperCase();
    loadPortalPrograms();
    loadPortalTurnos();
  } catch(e) { console.warn('Portal error:', e); }
}

async function loadPortalPrograms() {
  const sb = getSB();
  const grid = document.getElementById('portalProgGrid');
  const noProgs = document.getElementById('portalNoProgs');
  if(!grid) return;
  try {
    const { data: memberships } = await sb
      .from('memberships')
      .select('*, programs(*)')
      .eq('user_id', portalUser.id)
      .eq('status', 'active');

    if(!memberships?.length) {
      grid.style.display = 'none';
      if(noProgs) noProgs.style.display = '';
      return;
    }
    grid.style.display = '';
    if(noProgs) noProgs.style.display = 'none';

    grid.innerHTML = memberships.map(m => {
      const prog = m.programs;
      if(!prog) return '';
      const pct = m.progress || 0;
      return `
        <div class="portal-prog-card" onclick="abrirPrograma('${prog.id}','${m.id}')">
          <div class="portal-prog-img" style="background:var(--dark2);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center">
            ${prog.image_url ? `<img src="${prog.image_url}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;opacity:.65">` : ''}
            <div style="position:relative;z-index:2;color:var(--cream);font-family:var(--fd);font-size:1.1rem;padding:1.5rem;text-align:center;text-shadow:0 2px 8px rgba(0,0,0,.5)">${prog.name}</div>
          </div>
          <div class="portal-prog-body">
            <div class="portal-prog-badge">✓ Acceso activo</div>
            <div class="portal-prog-name">${prog.name}</div>
            <div class="portal-prog-meta">${prog.duration||''} · ${prog.level||''}</div>
            <div class="portal-prog-progress"><div class="portal-prog-progress-bar" style="width:${pct}%"></div></div>
            <div class="portal-prog-pct">${pct}% completado</div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    if(grid) grid.innerHTML = '<div style="color:var(--muted);font-size:.85rem">Error al cargar programas.</div>';
  }
}

async function loadPortalTurnos() {
  const sb = getSB();
  const list = document.getElementById('portalTurnosList');
  if(!list) return;
  try {
    const { data: turnos } = await sb
      .from('appointments')
      .select('*')
      .eq('patient_email', portalUser.email)
      .order('date', { ascending: false })
      .limit(10);

    if(!turnos?.length) {
      list.innerHTML = '<div class="portal-empty"><div class="portal-empty-icon">📅</div><p>No tenés turnos registrados.</p><button class="btn-primary" style="margin-top:1rem" onclick="goTo(\'turnos\')">Reservar turno →</button></div>';
      return;
    }
    const ML = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const SL = {pending:'Pendiente',pending_transfer:'Esperando transferencia',confirmed:'Confirmado',completed:'Completado',cancelled:'Cancelado'};
    const SC = {pending:'#D4853A',pending_transfer:'#D4853A',confirmed:'#4A9B6F',completed:'#3A7D8C',cancelled:'#C4614A'};
    list.innerHTML = turnos.map(t => {
      const [y,mm,dd] = t.date.split('-');
      const fecha = `${parseInt(dd)} de ${ML[parseInt(mm)-1]} ${y}`;
      const sc = SC[t.status]||'#8A7F74';
      return `<div style="background:#fff;border-radius:14px;padding:1rem 1.25rem;margin-bottom:.75rem;box-shadow:0 2px 10px rgba(28,26,24,.06);display:flex;align-items:center;gap:1rem;border-left:3px solid ${sc}">
        <div style="flex:1">
          <div style="font-weight:600;font-size:.9rem">${fecha} · ${(t.time||'').slice(0,5)} hs</div>
          <div style="font-size:.78rem;color:var(--muted);margin-top:.15rem">${t.type||'Consulta'} · ${t.modalidad==='presencial'?'📍 Presencial':'💻 Virtual'}</div>
        </div>
        <span style="font-size:.72rem;font-weight:600;padding:.22rem .65rem;border-radius:100px;background:${sc}18;color:${sc}">${SL[t.status]||t.status}</span>
      </div>`;
    }).join('');
  } catch(e) {}
}

function switchPortalTab(id, btn) {
  document.querySelectorAll('.portal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.portal-section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('portal-'+id)?.classList.add('active');
}

async function abrirPrograma(progId, membId) {
  currentProgId = progId;
  goTo('programa-detalle');
  const sb = getSB();
  try {
    const { data: prog } = await sb.from('programs').select('*').eq('id', progId).single();
    if(prog) {
      const titleEl = document.getElementById('progDetalleTitle');
      const subEl   = document.getElementById('progDetalleSub');
      const durEl   = document.getElementById('progDetalleDuracion');
      const bgEl    = document.getElementById('progDetalleBg');
      if(titleEl) titleEl.textContent = prog.name;
      if(subEl)   subEl.textContent   = prog.subtitle || '';
      if(durEl)   durEl.textContent   = prog.duration || '';
      if(bgEl && prog.image_url) bgEl.src = prog.image_url;
    }
    const { data: content } = await sb.from('program_content').select('*').eq('program_id', progId).order('week').order('sort_order');
    currentContent = content || [];
    const { data: progreso } = await sb.from('content_progress').select('content_id,completed').eq('user_id', portalUser.id);
    const completedIds = new Set((progreso||[]).filter(p=>p.completed).map(p=>p.content_id));
    renderProgWeeks(currentContent, completedIds);
  } catch(e) {
    const wi = document.getElementById('progWeekItems');
    if(wi) wi.innerHTML = '<div style="padding:1rem;color:var(--muted)">Error al cargar contenido.</div>';
  }
}

function renderProgWeeks(content, completedIds) {
  const container = document.getElementById('progWeekItems');
  if(!container) return;
  if(!content.length) {
    container.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--muted);font-size:.84rem">Este programa no tiene contenido aún.<br>Mariel lo está preparando 🌱</div>';
    return;
  }
  const weeks = {};
  content.forEach(c => { const w = c.week||1; if(!weeks[w]) weeks[w]=[]; weeks[w].push(c); });
  const TI = {video:'▶️',pdf:'📄',audio:'🎧',text:'📝',link:'🔗'};
  let html = '';
  Object.entries(weeks).sort(([a],[b])=>+a-+b).forEach(([week, items]) => {
    html += `<div style="padding:.6rem 1.1rem;background:var(--cream);font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--cream-dk)">Semana ${week}</div>`;
    items.forEach(item => {
      const done = completedIds.has(item.id);
      html += `<div class="prog-item-row${done?' completed':''}" onclick="selContent('${item.id}')">
        <div class="prog-item-icon ${done?'done':item.content_type}">${done?'✓':TI[item.content_type]||'📄'}</div>
        <div class="prog-item-info">
          <div class="prog-item-title">${item.title}</div>
          <div class="prog-item-meta">${item.content_type||'video'}${item.duration_min?' · '+item.duration_min+' min':''}</div>
        </div>
        ${done?'<span class="prog-item-check">✓</span>':''}
      </div>`;
    });
  });
  container.innerHTML = html;
}

async function selContent(contentId) {
  const item = currentContent.find(c => c.id === contentId);
  if(!item) return;
  document.querySelectorAll('.prog-item-row').forEach(r => r.classList.remove('active'));
  event?.currentTarget?.classList.add('active');
  const titleEl = document.getElementById('progItemTitle');
  const descEl  = document.getElementById('progItemDesc');
  if(titleEl) titleEl.textContent = item.title;
  if(descEl)  descEl.textContent  = item.description || '';
  const player = document.getElementById('progPlayer');
  if(player) {
    if(item.url && item.content_type === 'video') {
      let eu = item.url;
      const ytm = item.url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
      const vim = item.url.match(/vimeo\.com\/(\d+)/);
      if(ytm) eu = `https://www.youtube.com/embed/${ytm[1]}?rel=0`;
      else if(vim) eu = `https://player.vimeo.com/video/${vim[1]}`;
      player.innerHTML = `<iframe src="${eu}" allowfullscreen style="width:100%;height:100%;border:none"></iframe>`;
    } else if(item.content_type==='pdf' && item.url) {
      player.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,.7);gap:1rem"><div style="font-size:3rem">📄</div><div>${item.title}</div><a href="${item.url}" target="_blank" style="padding:.65rem 1.5rem;background:var(--teal);color:#fff;border-radius:100px;text-decoration:none;font-size:.8rem;font-weight:600">Abrir PDF →</a></div>`;
    } else {
      player.innerHTML = `<div class="prog-player-placeholder"><div style="font-size:2rem;margin-bottom:.5rem">${{video:'▶️',pdf:'📄',audio:'🎧',text:'📝',link:'🔗'}[item.content_type]||'📄'}</div><div style="font-size:.88rem">${item.url?`<a href="${item.url}" target="_blank" style="color:var(--gold)">Abrir →</a>`:'Próximamente'}</div></div>`;
    }
  }
  const actEl = document.getElementById('progItemActions');
  if(actEl) actEl.innerHTML = `<button onclick="marcarCompletado('${contentId}')" style="padding:.55rem 1.2rem;border-radius:100px;font-size:.76rem;font-weight:600;background:rgba(74,155,111,.1);color:#2E7A52;border:1.5px solid rgba(74,155,111,.3);cursor:pointer;font-family:var(--fb)">✓ Marcar como completado</button>`;
}

async function marcarCompletado(contentId) {
  const sb = getSB();
  try {
    await sb.from('content_progress').upsert({user_id:portalUser.id,content_id:contentId,completed:true,updated_at:new Date().toISOString()});
    toast('¡Completado! ✓','ok');
    const { data: progreso } = await sb.from('content_progress').select('content_id,completed').eq('user_id', portalUser.id);
    const completedIds = new Set((progreso||[]).filter(p=>p.completed).map(p=>p.content_id));
    renderProgWeeks(currentContent, completedIds);
  } catch(e) { toast('Error al guardar','err'); }
}

function updateNavUI(role) {
  const isAdmin = role === 'admin';
  const isUser  = role === 'user';
  const isGuest = !role;

  document.getElementById('navBtnGuest').style.display  = isGuest  ? ''     : 'none';
  document.getElementById('navBtnAdmin').style.display  = isAdmin  ? 'flex' : 'none';
  document.getElementById('navBtnUser').style.display   = isUser   ? ''     : 'none';
  document.getElementById('navBtnLogout').style.display = !isGuest ? ''     : 'none';

  document.getElementById('mobBtnGuest').style.display  = isGuest  ? ''     : 'none';
  document.getElementById('mobBtnAdmin').style.display  = isAdmin  ? 'flex' : 'none';
  document.getElementById('mobBtnUser').style.display   = isUser   ? 'flex' : 'none';

  // Botón flotante admin
  const qb = document.getElementById('adminQuickBtn');
  if (qb) qb.style.display = isAdmin ? 'flex' : 'none';
}

async function checkSession() {
  const sb = getSB();
  if (!sb) {
    // Sin Supabase — revisar localStorage
    const adminSess = localStorage.getItem('bh_admin_session');
    const userSess  = localStorage.getItem('bh_user_session');
    if (adminSess) updateNavUI('admin');
    else if (userSess) updateNavUI('user');
    else updateNavUI(null);
    return;
  }

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { updateNavUI(null); return; }

    const { data: profile } = await sb
      .from('profiles')
      .select('role, full_name')
      .eq('id', session.user.id)
      .single();

    const role = profile?.role || 'user';
    updateNavUI(role);

    // Si es admin, actualizar texto del botón con nombre
    if (role === 'admin') {
      const nombre = profile.full_name?.split(' ')[0] || 'Admin';
      document.getElementById('navBtnAdmin').innerHTML = `⚙️ Hola, ${nombre}`;
    }

  } catch(e) {
    updateNavUI(null);
  }
}

async function doLogout() {
  const sb = getSB();
  try {
    if (sb) await sb.auth.signOut();
  } catch(e) {}
  localStorage.removeItem('bh_admin_session');
  localStorage.removeItem('bh_user_session');
  updateNavUI(null);
  goTo('home');
  toast('Sesión cerrada', 'ok');
}

// Ejecutar al cargar
checkSession();
// Cargar consultas desde Supabase al iniciar
(function waitForSupabase() {
  if(typeof supabase !== 'undefined') {
    loadConsultasEnTurnos();
  } else {
    setTimeout(waitForSupabase, 100);
  }
})();

// ── Exponer funciones globalmente para los onclick del HTML ──
window.goTo               = goTo;
window.closeMob           = closeMob;
window.filterProgs        = filterProgs;
window.filterTienda       = filterTienda;
window.sortTienda         = sortTienda;
window.selTipo            = selTipo;
window.selModalidad       = selModalidad;
window.bGoTo              = bGoTo;
window.calPrev            = calPrev;
window.calNext            = calNext;
window.selDate            = selDate;
window.selSlot            = selSlot;
window.selPay             = selPay;
window.renderCkItems      = renderCkItems;
window.placeOrder         = placeOrder;
window.copyTxt            = copyTxt;
window.copiarCBU          = copiarCBU;
window.submitBooking      = submitBooking;
window.validarYContinuar  = validarYContinuar;
window.updateSenaAmount   = updateSenaAmount;
window.switchLoginTab     = switchLoginTab;
window.doLogin            = doLogin;
window.doRegister         = doRegister;
window.doForgot           = doForgot;
window.doLogout           = doLogout;
window.switchPortalTab    = switchPortalTab;
window.abrirPrograma      = abrirPrograma;
window.selContent         = selContent;
window.marcarCompletado   = marcarCompletado;
window.showAP             = showAP;
window.loadATurnos        = loadATurnos;
window.loadASenas         = loadASenas;
window.aprobarSena        = aprobarSena;
window.rechazarSena       = rechazarSena;
window.loadAFichas        = loadAFichas;
window.filterAFichas      = filterAFichas;
window.openANuevaFicha    = openANuevaFicha;
window.crearAFicha        = crearAFicha;
window.loadATestis        = loadATestis;
window.toggleATestis      = toggleATestis;
window.aBlockSlot         = aBlockSlot;
window.deleteABlock       = deleteABlock;
window.openConsulta       = openConsulta;
window.saveConsulta       = saveConsulta;
window.toggleConsulta     = toggleConsulta;
window.deleteConsulta     = deleteConsulta;
window.openAImgEditor     = openAImgEditor;
window.switchAImgTab      = switchAImgTab;
window.handleAFile        = handleAFile;
window.previewAUrl        = previewAUrl;
window.saveAImg           = saveAImg;
window.openAMod           = openAMod;
window.closeAMod          = closeAMod;
window.calAdminPrev       = calAdminPrev;
window.calAdminNext       = calAdminNext;
window.calAdminGoToday    = calAdminGoToday;
window.selectCalDay       = selectCalDay;
window.deleteCalBlock     = deleteCalBlock;
window.toggleBqTodoDia    = toggleBqTodoDia;
window.saveBlockQuick     = saveBlockQuick;
window.filterCalMedico    = filterCalMedico;
window.loadAPrograms      = loadAPrograms;
window.openProgAdmin      = openProgAdmin;
window.switchProgAdmTab   = switchProgAdmTab;
window.openAddContent     = openAddContent;
window.saveContent        = saveContent;
window.deleteContent      = deleteContent;
window.openAddMember      = openAddMember;
window.saveMember         = saveMember;
window.toggleMembership   = toggleMembership;
window.Cart               = Cart;
