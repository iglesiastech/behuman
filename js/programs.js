/* ── PROGRAMAS ADMIN ── */
let currentAdmProgId = null;

async function loadAPrograms() {
  const sb = getSB();
  const grid = document.getElementById('apProgGrid');
  if(!grid) return;
  try {
    const { data: progs } = await sb.from('programs').select('id,name,subtitle,description,price,duration,level,image_url,active,slug,marca').order('sort_order');
    if(!progs?.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)">
        <div style="font-size:2rem;margin-bottom:.75rem">📚</div>
        <p>No hay programas cargados aún.</p>
        <button onclick="openEditProgram(null)" style="margin-top:1rem;padding:.6rem 1.4rem;border-radius:100px;font-size:.78rem;font-weight:600;background:var(--gold);color:#fff;border:none;cursor:pointer;font-family:var(--fb)">+ Crear primer programa</button>
      </div>`;
      return;
    }
    grid.innerHTML = progs.map(p => `
      <div style="background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(28,26,24,.07);overflow:hidden">
        <div style="background:var(--dark);padding:1.5rem;position:relative;overflow:hidden;min-height:100px">
          ${p.image_url?`<img src="${p.image_url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.3">`:''}
          <div style="position:relative;z-index:2">
            <div style="font-size:.65rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(201,147,90,.7);margin-bottom:.3rem">${p.duration||''} · ${p.level||''}</div>
            <div style="font-family:var(--fd);font-size:1.1rem;color:var(--cream)">${p.name}</div>
            <div style="margin-top:.4rem"><span style="font-size:.7rem;padding:.18rem .55rem;border-radius:100px;font-weight:600;background:${p.active?'rgba(74,155,111,.2)':'rgba(196,97,74,.2)'};color:${p.active?'#7DC99A':'#E07A66'}">${p.active?'● Activo':'● Inactivo'}</span></div>
          </div>
        </div>
        <div style="padding:1rem 1.25rem">
          <div style="font-size:.82rem;color:var(--muted);margin-bottom:.75rem;line-height:1.5">${(p.description||'').slice(0,90)}...</div>
          <div style="font-family:var(--fd);font-size:1.3rem;color:var(--gold);margin-bottom:.85rem">${fmt(p.price||0)}</div>
          <div style="display:flex;gap:.5rem">
            <button onclick="openEditProgram(${JSON.stringify(p).replace(/"/g,'&quot;')})" style="flex:1;padding:.45rem;border-radius:8px;font-size:.74rem;font-weight:600;background:var(--teal);color:#fff;border:none;cursor:pointer;font-family:var(--fb)">✏️ Editar</button>
            <button onclick="openProgAdmin('${p.id}','${p.name}')" style="flex:1;padding:.45rem;border-radius:8px;font-size:.74rem;font-weight:600;background:var(--gold);color:#fff;border:none;cursor:pointer;font-family:var(--fb)">📋 Contenido</button>
            <button onclick="toggleProgram('${p.id}',${!p.active})" style="padding:.45rem .7rem;border-radius:8px;font-size:.74rem;font-weight:600;background:#fff;color:${p.active?'#C4614A':'#4A9B6F'};border:1.5px solid ${p.active?'rgba(196,97,74,.3)':'rgba(74,155,111,.3)'};cursor:pointer;font-family:var(--fb)">${p.active?'⊘':'✓'}</button>
          </div>
        </div>
      </div>`).join('');
  } catch(e) {
    grid.innerHTML = `<div style="color:var(--muted);padding:2rem;grid-column:1/-1">Error: ${e.message}</div>`;
  }
}

let progCheckoutData = { nombre:'', slug:'', precio:0, progId:'' };

async function inscribirsePrograma(btn) {
  // Los datos están en el propio botón (data-prog-name / data-prog-id / data-prog-price)
  let nombre = btn?.dataset?.progName || '';
  let precio = parseInt(btn?.dataset?.progPrice || '0') || 0;
  let progId = btn?.dataset?.progId || '';
  const slug = btn?.dataset?.progSlug || '';

  // Fallback: si faltara el id o el precio, buscarlo en la BD por nombre
  if((!progId || !precio) && nombre) {
    try {
      const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
      const r = await fetch(SUPABASE_URL+'/rest/v1/programs?name=eq.'+encodeURIComponent(nombre)+'&select=id,price', {headers:h});
      const progs = await r.json();
      if(progs?.[0]) { progId = progId || progs[0].id; if(!precio) precio = progs[0].price || 0; }
    } catch(e) {}
  }
  if(!nombre) nombre = 'el programa';

  progCheckoutData = { nombre, slug: progId||slug, precio, progId };

  // Verificar si está logueado
  const token = localStorage.getItem('bh_token');
  if(!token) {
    _loginIntent = { type:'prog', nombre };
    goTo('login');
    return;
  }

  // Ir al checkout de programa
  goTo('prog-checkout');
  initProgCheckout();
}

function initProgCheckout() {
  const { nombre, precio } = progCheckoutData;

  ['pcNombre'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=nombre; });
  ['pcPrecio','pcPrecio2','pcSena'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=fmt(precio); });

  // Pre-llenar email si está logueado
  const token = localStorage.getItem('bh_token');
  if(token) {
    getSB().auth.getUser().then(({data:{user}})=>{
      if(user) { const em=document.getElementById('pcEmail'); if(em) em.value=user.email; }
    }).catch(()=>{});
  }

  const fw = document.getElementById('pcFormWrap');
  const sc = document.getElementById('pcSuccess');
  if(fw) fw.style.display='';
  if(sc) sc.style.display='none';
  if(typeof selectPayMethod === 'function') selectPayMethod('transfer');
}

async function confirmarCompraPrograma() {
  const nom   = document.getElementById('pcNom')?.value.trim();
  const ape   = document.getElementById('pcApe')?.value.trim();
  const email = document.getElementById('pcEmail')?.value.trim();
  if(!nom||!ape||!email){ toast('Completá nombre, apellido y email','err'); return; }

  const btn = document.getElementById('pcConfirmBtn');
  btn.disabled=true; btn.textContent='Registrando...';

  const { nombre, slug, precio } = progCheckoutData;
  const token = _authToken || localStorage.getItem('bh_token') || SUPABASE_ANON;

  const h = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const orderData = {
    customer_name:  nom + ' ' + ape,
    customer_email: email,
    total:          precio,
    payment_method: 'transferencia',
    status:         'awaiting_payment',
    items:          JSON.stringify([{programa: nombre, slug, precio}]),
    created_at:     new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify(orderData)
    });

    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      // Si falla por política RLS, intentar con anon key directo
      console.warn('Error orders:', err);
      // Guardar igual en localStorage como backup
      const pending = JSON.parse(localStorage.getItem('bh_pending_orders')||'[]');
      pending.push({...orderData, savedAt: new Date().toISOString()});
      localStorage.setItem('bh_pending_orders', JSON.stringify(pending));
    }
  } catch(e) {
    console.warn('Error al guardar orden:', e.message);
    // Guardar en localStorage como backup
    const pending = JSON.parse(localStorage.getItem('bh_pending_orders')||'[]');
    pending.push({...orderData, savedAt: new Date().toISOString()});
    localStorage.setItem('bh_pending_orders', JSON.stringify(pending));
  }

  // Email al cliente — programa pendiente
  emailProgramaPendiente(nom+' '+ape, email, nombre, fmt(precio));

  // Email a Mariel — nueva orden para aprobar
  sendEmail('behuman.medicinafuncional@gmail.com',
    'Nueva inscripción pendiente · ' + nombre,
    `<div style="font-family:Arial,sans-serif;padding:24px;max-width:500px">
      <h2 style="color:#1C1A18;font-family:Georgia,serif">Nueva inscripción pendiente</h2>
      <p><strong>Programa:</strong> ${nombre}</p>
      <p><strong>Cliente:</strong> ${nom} ${ape}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Monto:</strong> ${fmt(precio)}</p>
      <p style="margin-top:1rem"><a href="https://iglesiastech-behuman.vercel.app" style="background:#3A7D8C;color:#fff;padding:10px 20px;border-radius:100px;text-decoration:none;font-weight:600">Ir al panel admin →</a></p>
    </div>`
  );

  const wa = document.getElementById('pcWhatsApp');
  if(wa) wa.href = `https://wa.me/5491176179836?text=Hola!%20Soy%20${encodeURIComponent(nom+' '+ape)}%20e%20hice%20la%20transferencia%20para%20inscribirme%20en%20${encodeURIComponent(nombre)}.%20Adjunto%20el%20comprobante.`;

  const fw = document.getElementById('pcFormWrap');
  const sc = document.getElementById('pcSuccess');
  if(fw) fw.style.display='none';
  if(sc) sc.style.display='block';
  btn.disabled=false;
}

// ── Método de pago en el checkout del programa ──
function selectPayMethod(m){
  const isMP = m === 'mp';
  [['pcTransferBlock',!isMP],['pcTransferConfirm',!isMP],['pcMPBlock',isMP]].forEach(([id,show])=>{
    const el = document.getElementById(id); if(el) el.style.display = show ? '' : 'none';
  });
  const setTab = (el,on)=>{ if(!el) return;
    el.style.borderColor = on ? 'var(--teal)' : 'var(--cream-dk)';
    el.style.background  = on ? 'rgba(58,125,140,.08)' : '#fff';
    el.style.color       = on ? 'var(--teal)' : 'var(--muted)';
    el.style.fontWeight  = on ? '700' : '500';
  };
  setTab(document.getElementById('pcTabTransfer'), !isMP);
  setTab(document.getElementById('pcTabMP'), isMP);
}

async function pagarConMercadoPago(){
  const nom   = document.getElementById('pcNom')?.value.trim();
  const ape   = document.getElementById('pcApe')?.value.trim();
  const email = document.getElementById('pcEmail')?.value.trim();
  if(!nom || !ape || !email){ toast('Completá nombre, apellido y email','err'); return; }
  const progId = progCheckoutData.progId || progCheckoutData.slug;
  if(!progId){ toast('No se pudo identificar el programa','err'); return; }

  // user_id desde la sesión (necesario para darte el acceso al pagar)
  let userId = null;
  try {
    const token = _authToken || localStorage.getItem('bh_token');
    const r = await fetch(SUPABASE_URL+'/auth/v1/user', { headers:{ 'apikey':SUPABASE_ANON, 'Authorization':'Bearer '+token } });
    const u = await r.json(); userId = u && u.id;
  } catch(e){}
  if(!userId){ _loginIntent = { type:'prog', nombre: progCheckoutData.nombre }; toast('Iniciá sesión para pagar','err'); goTo('login'); return; }

  const btn = document.getElementById('pcMPBtn');
  const orig = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = 'Redirigiendo a Mercado Pago…'; }
  try {
    const r = await fetch(SUPABASE_URL+'/functions/v1/mp-crear-pago', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'apikey':SUPABASE_ANON, 'Authorization':'Bearer '+(_authToken||localStorage.getItem('bh_token')||SUPABASE_ANON) },
      body: JSON.stringify({ program_id: progId, user_id: userId, email, name: nom+' '+ape })
    });
    const data = await r.json().catch(()=>({}));
    if(data && data.init_point){ window.location.href = data.init_point; return; }
    toast('No se pudo iniciar el pago: '+((data && data.error) || 'error'),'err',7000);
  } catch(e){ toast('Error al conectar con el pago: '+e.message,'err',6000); }
  if(btn){ btn.disabled = false; btn.textContent = orig; }
}

// Al volver de Mercado Pago (back_urls): ?mp=success|pending|failure
function checkMPReturn(){
  let mp;
  try { mp = new URLSearchParams(location.search).get('mp'); } catch(e){ return; }
  if(!mp) return;
  try { history.replaceState({}, '', location.pathname + location.hash); } catch(e){}
  if(mp === 'success'){
    toast('¡Pago aprobado! 🎉 Estamos activando tu acceso al programa…','ok',7000);
    setTimeout(()=>goTo('portal'), 1400);
  } else if(mp === 'pending'){
    toast('Tu pago quedó pendiente de acreditación. Te avisamos cuando se confirme.','ok',8000);
  } else if(mp === 'failure'){
    toast('El pago no se completó. Podés intentarlo de nuevo.','err',6000);
  }
}
window.selectPayMethod     = selectPayMethod;
window.pagarConMercadoPago = pagarConMercadoPago;
window.checkMPReturn       = checkMPReturn;

async function toggleProgram(id, active) {
  try {
    await getSB().from('programs').update({active}).eq('id',id);
    toast(active ? 'Programa activado ✓' : 'Programa desactivado','ok');
    loadAPrograms();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function openProgAdmin(progId, progName) {
  currentAdmProgId = progId;
  document.getElementById('progAdmModTitle').textContent = progName;
  openAMod('progAdmMod');
  switchProgAdmTab('contenido', document.getElementById('ptab-contenido'));
  loadProgContent();
}

function openEditProgram(p) {
  const isNew = !p;
  document.getElementById('editProgTitle').textContent = isNew ? 'Nuevo programa' : 'Editar: '+p.name;
  document.getElementById('epId').value       = p ? p.id : '';
  document.getElementById('epNombre').value   = p ? p.name : '';
  document.getElementById('epSubtitulo').value= p ? (p.subtitle||'') : '';
  document.getElementById('epDesc').value     = p ? (p.description||'') : '';
  document.getElementById('epPrecio').value   = p ? (p.price||'') : '';
  document.getElementById('epDuracion').value = p ? (p.duration||'') : '';
  document.getElementById('epNivel').value    = p ? (p.level||'') : '';
  document.getElementById('epSlug').value     = p ? (p.slug||'') : '';
  document.getElementById('epImg').value      = p ? (p.image_url||'') : '';
  document.getElementById('epActivo').value   = (p && p.active===false) ? 'false' : 'true';
  document.getElementById('epMarca').value    = p ? (p.marca||'') : '';
  openAMod('editProgMod');
}

async function saveProgram() {
  const nombre = document.getElementById('epNombre').value.trim();
  const precio = parseFloat(document.getElementById('epPrecio').value);
  if(!nombre) { toast('El nombre es obligatorio','err'); return; }
  const id = document.getElementById('epId').value;
  const data = {
    name:        nombre,
    subtitle:    document.getElementById('epSubtitulo').value.trim()||null,
    description: document.getElementById('epDesc').value.trim()||null,
    price:       precio||0,
    duration:    document.getElementById('epDuracion').value.trim()||null,
    level:       document.getElementById('epNivel').value.trim()||null,
    slug:        document.getElementById('epSlug').value.trim()||null,
    image_url:   document.getElementById('epImg').value.trim()||null,
    active:      document.getElementById('epActivo').value==='true',
    marca:       document.getElementById('epMarca').value||null,
  };
  const btn = document.getElementById('epSaveBtn');
  btn.disabled=true; btn.textContent='Guardando...';
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json', 'Prefer':'return=minimal' };
  try {
    if(id) {
      await fetch(SUPABASE_URL+'/rest/v1/programs?id=eq.'+id, {method:'PATCH',headers:h,body:JSON.stringify(data)});
      toast('Programa actualizado ✓','ok');
    } else {
      data.sort_order = Math.floor(Date.now()/1000)%1000000;
      await fetch(SUPABASE_URL+'/rest/v1/programs', {method:'POST',headers:h,body:JSON.stringify(data)});
      toast('Programa creado ✓','ok');
    }
    closeAMod('editProgMod');
    _allPrograms = [];
    loadAPrograms();
  } catch(e) { toast('Error: '+e.message,'err'); }
  finally { btn.disabled=false; btn.textContent='Guardar programa'; }
}

function switchProgAdmTab(tab, btn) {
  document.querySelectorAll('#progAdmMod .portal-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('progAdm-contenido').style.display = tab==='contenido' ? '' : 'none';
  document.getElementById('progAdm-miembros').style.display  = tab==='miembros'  ? '' : 'none';
  document.getElementById('progAdm-landing').style.display   = tab==='landing'   ? '' : 'none';
  document.getElementById('progAdm-preview').style.display   = tab==='preview'   ? '' : 'none';
  if(tab==='contenido') loadProgContent();
  if(tab==='miembros')  loadProgMembers();
  if(tab==='landing')   loadLandingData();
  if(tab==='preview')   loadAdmPreview();
}


/* ── ADMIN: CONTENIDO DE PROGRAMAS (Módulos + Lecciones + Descargables) ── */

let currentAdmModId  = null;
let currentAdmLessonId = null; // lección a la que se adjunta el descargable (null = general del programa)

async function loadProgContent() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };
  const list = document.getElementById('progAdmContentList');
  if(!list) return;
  list.innerHTML = '<div style="color:var(--muted);font-size:.84rem;padding:.5rem">Cargando...</div>';

  try {
    // Traer módulos
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/program_modules?program_id=eq.${currentAdmProgId}&order=sort_order`, {headers:h});
    const modulos = await r1.json();

    // Para cada módulo, traer lecciones
    for(let mod of (Array.isArray(modulos)?modulos:[])) {
      const r2 = await fetch(`${SUPABASE_URL}/rest/v1/program_lessons?module_id=eq.${mod.id}&order=sort_order`, {headers:h});
      mod.lecciones = await r2.json() || [];
    }

    // Traer descargables
    const r3 = await fetch(`${SUPABASE_URL}/rest/v1/program_files?program_id=eq.${currentAdmProgId}&order=sort_order`, {headers:h});
    const downloads = await r3.json() || [];

    if(!Array.isArray(modulos)||!modulos.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--muted)">
          <div style="font-size:1.5rem;margin-bottom:.5rem">📚</div>
          <p style="font-size:.85rem">Sin módulos todavía. Creá el primero.</p>
        </div>`;
    } else {
      list.innerHTML = modulos.map(mod=>`
        <div style="border:1.5px solid var(--cream-dk);border-radius:12px;overflow:hidden;margin-bottom:.85rem">
          <!-- Header módulo -->
          <div style="background:var(--dark);padding:.85rem 1.1rem;display:flex;align-items:center;gap:.75rem">
            <div style="font-family:var(--fd);color:var(--cream);font-size:.95rem;flex:1">${mod.title}</div>
            <div style="display:flex;gap:.4rem">
              <button onclick="openAddLesson('${mod.id}')" style="padding:.32rem .7rem;border-radius:100px;font-size:.68rem;font-weight:600;background:rgba(201,147,90,.2);color:var(--gold);border:none;cursor:pointer;font-family:var(--fb)">+ Lección</button>
              <button onclick="openEditModuleModal('${mod.id}')" style="padding:.32rem .7rem;border-radius:100px;font-size:.68rem;font-weight:600;background:rgba(255,255,255,.1);color:#fff;border:none;cursor:pointer;font-family:var(--fb)">✏️</button>
              <button onclick="deleteModule('${mod.id}')" style="padding:.32rem .7rem;border-radius:100px;font-size:.68rem;font-weight:600;background:rgba(196,97,74,.2);color:#E07A66;border:none;cursor:pointer;font-family:var(--fb)">🗑️</button>
            </div>
          </div>
          <!-- Lecciones -->
          <div style="padding:.6rem">
            ${mod.lecciones.length ? mod.lecciones.map((l,i)=>{
              const lf = (Array.isArray(downloads)?downloads:[]).filter(d=>d.lesson_id===l.id);
              return `
              <div style="background:#fff;border-radius:8px;margin-bottom:.4rem;border:1px solid #f0f0f0;overflow:hidden">
                <div style="display:flex;align-items:center;gap:.65rem;padding:.6rem .75rem">
                  <div style="width:24px;height:24px;border-radius:50%;background:rgba(58,125,140,.1);color:var(--teal);font-size:.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:.84rem;font-weight:500">${l.title}</div>
                    <div style="font-size:.7rem;color:var(--muted)">${l.video_url?'▶ Video':'📄 Sin video'} ${l.duration_sec?'· '+Math.round(l.duration_sec/60)+' min':''} · 📎 ${lf.length} archivo${lf.length!==1?'s':''}</div>
                  </div>
                  <div style="display:flex;gap:.3rem;flex-shrink:0">
                    <button onclick="openAddDownload('${l.id}')" title="Agregar archivo descargable a esta lección" style="padding:.28rem .55rem;border-radius:6px;font-size:.68rem;font-weight:600;background:rgba(58,125,140,.12);color:var(--teal);border:none;cursor:pointer;font-family:var(--fb)">📎 + Archivo</button>
                    <button onclick="editLesson(${JSON.stringify(l).replace(/"/g,'&quot;')})" style="padding:.28rem .6rem;border-radius:6px;font-size:.68rem;font-weight:600;background:var(--teal);color:#fff;border:none;cursor:pointer;font-family:var(--fb)">✏️</button>
                    <button onclick="deleteLesson('${l.id}')" style="padding:.28rem .6rem;border-radius:6px;font-size:.68rem;font-weight:600;background:rgba(196,97,74,.1);color:#C4614A;border:1px solid rgba(196,97,74,.2);cursor:pointer;font-family:var(--fb)">✕</button>
                  </div>
                </div>
                ${lf.length ? `<div style="padding:0 .75rem .55rem 3.05rem;display:flex;flex-direction:column;gap:.28rem">
                  ${lf.map(d=>`<div style="display:flex;align-items:center;gap:.5rem;font-size:.74rem;background:rgba(58,125,140,.06);padding:.35rem .6rem;border-radius:6px">
                    <span>📄</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#3A3530">${d.title}</span>
                    <a href="${d.file_url}" target="_blank" style="color:var(--teal);text-decoration:none;font-weight:600">abrir</a>
                    <button onclick="deleteDownload('${d.id}')" title="Quitar archivo" style="background:none;border:none;color:#C4614A;cursor:pointer;font-size:.85rem;padding:0 .15rem">✕</button>
                  </div>`).join('')}
                </div>` : ''}
              </div>`;
            }).join('')
            : '<div style="padding:.5rem .75rem;font-size:.8rem;color:var(--muted)">Sin lecciones en este módulo</div>'}
          </div>
        </div>`).join('');
    }

    // Sección descargables GENERALES del programa (sin lección). Los de cada lección van arriba.
    const generales = (Array.isArray(downloads)?downloads:[]).filter(d=>!d.lesson_id);
    list.innerHTML += `
      <div style="margin-top:1.25rem;border-top:2px solid var(--cream-dk);padding-top:1rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem">
          <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">📎 Archivos generales del programa</div>
          <button onclick="openAddDownload(null)" style="padding:.35rem .85rem;border-radius:100px;font-size:.72rem;font-weight:600;background:var(--teal);color:#fff;border:none;cursor:pointer;font-family:var(--fb)">+ Agregar</button>
        </div>
        <div style="font-size:.72rem;color:var(--muted);margin-bottom:.7rem;line-height:1.5">Opcional — para archivos de todo el programa. Los descargables de <strong>cada lección</strong> se agregan con el botón <strong>📎 + Archivo</strong> de cada lección.</div>
        <div id="downloadsList">${generales.length ? generales.map(d=>`
          <div style="display:flex;align-items:center;gap:.65rem;padding:.6rem .75rem;background:#fff;border-radius:8px;margin-bottom:.35rem;border:1px solid #f0f0f0">
            <div style="font-size:1.1rem">📄</div>
            <div style="flex:1">
              <div style="font-size:.84rem;font-weight:500">${d.title}</div>
              <div style="font-size:.7rem;color:var(--muted)">${d.description||d.file_type||''}</div>
            </div>
            <button onclick="deleteDownload('${d.id}')" style="padding:.28rem .6rem;border-radius:6px;font-size:.68rem;background:rgba(196,97,74,.1);color:#C4614A;border:1px solid rgba(196,97,74,.2);cursor:pointer;font-family:var(--fb)">✕</button>
          </div>`).join('') : '<div style="font-size:.8rem;color:var(--muted);padding:.35rem">Sin archivos generales</div>'}
        </div>
      </div>`;

  } catch(e) { list.innerHTML = `<div style="color:var(--muted)">Error: ${e.message}</div>`; }
}

// ── Módulos ──
async function addModule() {
  await ensureFreshToken();
  const title = document.getElementById('modTitle')?.value.trim();
  const cover = document.getElementById('modCover')?.value.trim();
  const desc  = document.getElementById('modDesc')?.value.trim();
  if(!title){ toast('El nombre del módulo es obligatorio','err'); return; }
  if(!currentAdmProgId){ toast('Error: no hay programa seleccionado','err'); return; }

  const h = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON),
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/program_modules`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        program_id:  currentAdmProgId,
        title,
        cover_url:   cover||null,
        description: desc||null,
        sort_order:  Math.floor(Date.now() / 1000) % 1000000
      })
    });

    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.message || err.hint || res.statusText);
    }

    document.getElementById('modTitle').value = '';
    document.getElementById('modCover').value = '';
    if(document.getElementById('modDesc')) document.getElementById('modDesc').value = '';
    document.getElementById('addModuleForm').style.display = 'none';
    toast('Módulo creado ✓','ok');
    await loadProgContent();
  } catch(e){
    toast('Error al crear módulo: '+e.message,'err');
    console.error('addModule error:', e);
  }
}

function openEditModuleModal(id) {
  // Buscar el módulo por ID en el state
  const mod = cursoState?.modulos?.find(m=>m.id===id);
  const title = mod?.title || prompt('Nombre del módulo:');
  if(title) editModule(id, title);
}

async function editModule(id, currentTitle) {
  const title = prompt('Nombre del módulo:', currentTitle);
  if(!title) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON), 'Content-Type':'application/json' };
  await fetch(`${SUPABASE_URL}/rest/v1/program_modules?id=eq.${id}`, { method:'PATCH', headers:h, body: JSON.stringify({title}) });
  toast('Módulo actualizado ✓','ok');
  loadProgContent();
}

async function deleteModule(id) {
  if(!confirm('¿Eliminar este módulo y todas sus lecciones?')) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };
  await fetch(`${SUPABASE_URL}/rest/v1/program_modules?id=eq.${id}`, { method:'DELETE', headers:h });
  toast('Módulo eliminado','ok');
  loadProgContent();
}

// ── Lecciones ──
function openAddLesson(modId) {
  currentAdmModId = modId;
  document.getElementById('lessonId').value        = '';
  document.getElementById('lessonTitle').value     = '';
  document.getElementById('lessonVideo').value     = '';
  document.getElementById('lessonThumb').value     = '';
  document.getElementById('lessonDur').value       = '';
  document.getElementById('lessonDesc').value      = '';
  document.getElementById('lessonPreview').checked = false;
  document.getElementById('lessonModTitle').textContent = 'Nueva lección';
  openAMod('lessonMod');
}

function editLesson(l) {
  currentAdmModId = l.module_id;
  document.getElementById('lessonId').value        = l.id;
  document.getElementById('lessonTitle').value     = l.title||'';
  document.getElementById('lessonVideo').value     = l.video_url||'';
  document.getElementById('lessonThumb').value     = l.thumbnail_url||'';
  document.getElementById('lessonDur').value       = l.duration_sec ? Math.round(l.duration_sec/60) : '';
  document.getElementById('lessonDesc').value      = l.description||'';
  document.getElementById('lessonPreview').checked = !!l.is_preview;
  document.getElementById('lessonModTitle').textContent = 'Editar lección';
  openAMod('lessonMod');
}

async function saveLesson() {
  await ensureFreshToken();
  const title = document.getElementById('lessonTitle').value.trim();
  if(!title){ toast('El título es obligatorio','err'); return; }
  const id = document.getElementById('lessonId').value;
  const data = {
    module_id:    currentAdmModId,
    program_id:   currentAdmProgId,
    title,
    video_url:     document.getElementById('lessonVideo').value.trim()||null,
    thumbnail_url: document.getElementById('lessonThumb').value.trim()||null,
    duration_sec:  (parseInt(document.getElementById('lessonDur').value)||0)*60,
    description:  document.getElementById('lessonDesc').value.trim()||null,
    is_preview:   document.getElementById('lessonPreview').checked,
    sort_order: Math.floor(Date.now() / 1000) % 1000000,
  };
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON), 'Content-Type':'application/json', 'Prefer':'return=minimal' };
  try {
    if(id) {
      await fetch(`${SUPABASE_URL}/rest/v1/program_lessons?id=eq.${id}`, { method:'PATCH', headers:h, body: JSON.stringify(data) });
      toast('Lección actualizada ✓','ok');
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/program_lessons`, { method:'POST', headers:h, body: JSON.stringify(data) });
      toast('Lección creada ✓','ok');
    }
    closeAMod('lessonMod');
    loadProgContent();
  } catch(e){ toast('Error: '+e.message,'err'); }
}

async function deleteLesson(id) {
  if(!confirm('¿Eliminar esta lección?')) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };
  await fetch(`${SUPABASE_URL}/rest/v1/program_lessons?id=eq.${id}`, { method:'DELETE', headers:h });
  toast('Lección eliminada','ok');
  loadProgContent();
}

// ── Descargables ──
function openAddDownload(lessonId) {
  currentAdmLessonId = lessonId || null;
  document.getElementById('dlTitle').value = '';
  document.getElementById('dlUrl').value   = '';
  if(document.getElementById('dlDesc')) document.getElementById('dlDesc').value = '';
  document.getElementById('dlType').value  = 'pdf';
  const t = document.getElementById('downloadModTitle');
  if(t) t.textContent = currentAdmLessonId ? '📎 Archivo descargable de la lección' : '📎 Archivo general del programa';
  openAMod('downloadMod');
}

async function saveDownload() {
  await ensureFreshToken();
  const title = document.getElementById('dlTitle').value.trim();
  const url   = document.getElementById('dlUrl').value.trim();
  if(!title||!url){ toast('Título y URL son obligatorios','err'); return; }
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON), 'Content-Type':'application/json', 'Prefer':'return=minimal' };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/program_files`, { method:'POST', headers:h,
      body: JSON.stringify({ program_id: currentAdmProgId, lesson_id: currentAdmLessonId, title, file_url: url, file_type: document.getElementById('dlType').value, sort_order: Math.floor(Date.now() / 1000) % 1000000 }) });
    toast('Archivo agregado ✓','ok');
    closeAMod('downloadMod');
    loadProgContent();
  } catch(e){ toast('Error: '+e.message,'err'); }
}

async function deleteDownload(id) {
  if(!confirm('¿Eliminar este archivo?')) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };
  await fetch(`${SUPABASE_URL}/rest/v1/program_files?id=eq.${id}`, { method:'DELETE', headers:h });
  toast('Archivo eliminado','ok');
  loadProgContent();
}

// Subir un archivo (cualquier tipo) desde la PC a Supabase (bucket site-media)
function triggerFileUpload(targetInputId, folder, onUploaded){
  const input = document.createElement('input');
  input.type = 'file'; input.style.display = 'none';
  document.body.appendChild(input);
  input.onchange = async () => {
    const file = input.files[0];
    document.body.removeChild(input);
    if(!file) return;
    toast('Subiendo archivo…','info',30000);
    try {
      const token = _authToken || localStorage.getItem('bh_token') || SUPABASE_ANON;
      const ext = (file.name.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'') || 'bin';
      const path = `${folder||'archivo'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const rUp = await fetch(`${SUPABASE_URL}/storage/v1/object/site-media/${path}`, {
        method:'POST',
        headers:{ 'apikey':SUPABASE_ANON, 'Authorization':'Bearer '+token, 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      if(!rUp.ok){ const err = await rUp.json().catch(()=>({message:rUp.statusText})); throw new Error(err.error || err.message || 'Error al subir'); }
      const url = `${SUPABASE_URL}/storage/v1/object/public/site-media/${path}`;
      const el = document.getElementById(targetInputId);
      if(el){ el.value = url; el.dispatchEvent(new Event('input')); }
      if(typeof onUploaded === 'function') onUploaded({ url, name: file.name, ext });
      toast('✓ Archivo subido','ok');
    } catch(e){ toast('Error al subir: '+e.message,'err'); }
  };
  input.click();
}

// Subir archivo descargable desde la PC (modal de descargable de la lección)
function subirArchivoDescargable(){
  triggerFileUpload('dlUrl', 'material', ({ name, ext }) => {
    const t = document.getElementById('dlTitle');
    if(t && !t.value.trim()) t.value = name.replace(/\.[^.]+$/, '');
    const map = { pdf:'pdf', doc:'doc', docx:'doc', xls:'xls', xlsx:'xls', csv:'xls', zip:'zip', rar:'zip', png:'img', jpg:'img', jpeg:'img', webp:'img', mp3:'mp3', wav:'mp3', m4a:'mp3' };
    const sel = document.getElementById('dlType');
    if(sel && map[ext]) sel.value = map[ext];
  });
}
window.triggerFileUpload = triggerFileUpload;
window.subirArchivoDescargable = subirArchivoDescargable;

// ── Miembros ──
async function loadProgMembers() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };
  const list = document.getElementById('progAdmMemberList');
  if(!list) return;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/memberships?program_id=eq.${currentAdmProgId}&order=created_at.desc`, {headers:h});
    const members = await r.json();
    if(!Array.isArray(members)||!members.length){ list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.85rem">Sin miembros aún.</div>'; return; }
    const SC={active:'#4A9B6F',cancelled:'#C4614A',expired:'#D4853A',pending:'#8A7F74'};
    const SL={active:'Activo',cancelled:'Cancelado',expired:'Vencido',pending:'Pendiente'};
    const AT={purchased:'Comprado',manual:'Manual',gift:'Regalo'};
    list.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.83rem">
      <thead><tr style="background:var(--cream)">
        <th style="padding:.6rem .85rem;text-align:left;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Usuario</th>
        <th style="padding:.6rem .85rem;text-align:left;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Acceso</th>
        <th style="padding:.6rem .85rem;text-align:left;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Estado</th>
        <th style="padding:.6rem .85rem;text-align:left;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Notas</th>
        <th style="padding:.6rem .85rem"></th>
      </tr></thead>
      <tbody>${members.map(m=>{
        const sc=SC[m.status]||'#8A7F74';
        return `<tr style="border-bottom:1px solid var(--cream-dk)">
          <td style="padding:.75rem .85rem"><div style="font-weight:500">${m.user_id||'—'}</div><div style="font-size:.72rem;color:var(--muted)">${m.progress||0}% completado</div></td>
          <td style="padding:.75rem .85rem"><span style="font-size:.72rem;background:rgba(201,147,90,.1);color:var(--gold-dk);padding:.18rem .55rem;border-radius:100px;font-weight:600">${AT[m.access_type]||m.access_type}</span></td>
          <td style="padding:.75rem .85rem"><span style="font-size:.72rem;background:${sc}18;color:${sc};padding:.18rem .55rem;border-radius:100px;font-weight:600">${SL[m.status]||m.status}</span></td>
          <td style="padding:.75rem .85rem;font-size:.78rem;color:var(--muted)">${m.notes||'—'}</td>
          <td style="padding:.75rem .85rem">
            ${m.status==='active'
              ?`<button onclick="toggleMembership('${m.id}','cancelled')" style="padding:.32rem .7rem;border-radius:100px;font-size:.68rem;font-weight:600;background:rgba(196,97,74,.1);color:#C4614A;border:1.5px solid rgba(196,97,74,.25);cursor:pointer;font-family:var(--fb)">Desactivar</button>`
              :`<button onclick="toggleMembership('${m.id}','active')" style="padding:.32rem .7rem;border-radius:100px;font-size:.68rem;font-weight:600;background:rgba(74,155,111,.1);color:#2E7A52;border:1.5px solid rgba(74,155,111,.25);cursor:pointer;font-family:var(--fb)">Activar</button>`}
          </td>
        </tr>`;}).join('')}
      </tbody></table>`;
  } catch(e){ list.innerHTML=`<div style="color:var(--muted)">Error: ${e.message}</div>`; }
}

function openAddMember() { document.getElementById('addMemberForm').style.display=''; }

async function saveMember() {
  const email   = document.getElementById('mbEmail').value.trim();
  const notes   = document.getElementById('mbNotes').value.trim();
  const type    = document.getElementById('mbType').value;
  const expires = document.getElementById('mbExpires').value || null;
  if(!email){ toast('Ingresá el email del usuario','err'); return; }

  const token = _authToken || localStorage.getItem('bh_token');
  const h = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  try {
    // Buscar user_id por email usando RPC
    const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_id_by_email`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ p_email: email })
    });
    const userId = rpc.ok ? await rpc.json() : null;

    if(!userId) {
      toast('No se encontró ningún usuario registrado con ese email. El usuario debe registrarse primero en la web.','err', 6000);
      return;
    }

    // Crear membresía real
    const res = await fetch(`${SUPABASE_URL}/rest/v1/memberships`, {
      method: 'POST',
      headers: {...h, 'Prefer': 'return=minimal'},
      body: JSON.stringify({
        program_id:  currentAdmProgId,
        user_id:     userId,
        status:      'active',
        access_type: type,
        notes:       notes || 'Acceso manual',
        expires_at:  expires ? new Date(expires).toISOString() : null,
      })
    });

    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.message || err.hint || 'No se pudo crear la membresía');
    }

    toast('✓ Acceso otorgado — ' + email + ' ya puede ver el programa', 'ok', 5000);
    document.getElementById('addMemberForm').style.display = 'none';
    document.getElementById('mbEmail').value = '';
    document.getElementById('mbNotes').value = '';
    loadProgMembers();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function toggleMembership(id, newStatus) {
  if(!confirm(newStatus==='cancelled'?'¿Desactivar el acceso?':'¿Reactivar el acceso?')) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON), 'Content-Type':'application/json' };
  await fetch(`${SUPABASE_URL}/rest/v1/memberships?id=eq.${id}`, { method:'PATCH', headers:h, body: JSON.stringify({status:newStatus}) });
  toast(newStatus==='active'?'Acceso activado ✓':'Acceso desactivado','ok');
  loadProgMembers();
}


/* ── ÓRDENES DE PROGRAMAS ── */
async function loadOrdenesProgramas() {
  const token = _authToken || localStorage.getItem('bh_token');
  if(!token) { toast('Necesitás iniciar sesión para ver las órdenes','err'); return; }
  const h = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + token
  };
  const today = new Date().toISOString().split('T')[0];

  try {
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/orders?order=created_at.desc&limit=100`, {headers:h});
    if(!r1.ok) {
      const err = await r1.json().catch(()=>({}));
      throw new Error(err.message || err.hint || 'Error '+r1.status+' - verificá que hayas iniciado sesión como admin');
    }
    const orders = await r1.json();
    if(!Array.isArray(orders)) throw new Error('Respuesta inválida de la base de datos');

    const pending  = orders.filter(o=>o.status==='awaiting_payment');
    const approved = orders.filter(o=>o.status==='completed' && o.updated_at?.startsWith(today));
    const total    = orders.filter(o=>o.status==='completed').reduce((s,o)=>s+(o.total||0),0);

    // Stats
    document.getElementById('opPend').textContent  = pending.length;
    document.getElementById('opAprov').textContent = approved.length;
    document.getElementById('opTotal').textContent = fmt(total);
    const badge = document.getElementById('opPendBadge');
    if(badge){ badge.textContent=pending.length; badge.style.display=pending.length?'':'none'; }

    // Tabla pendientes
    const tbody = document.getElementById('opPendBody');
    if(!pending.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">No hay órdenes pendientes ✓</td></tr>';
    } else {
      tbody.innerHTML = pending.map(o => {
        const items = tryParseJSON(o.items);
        const progName = items?.[0]?.programa || '—';
        const slug     = items?.[0]?.slug || '';
        const hace     = timeAgo(o.created_at);
        return `<tr style="border-bottom:1px solid var(--cream-dk)">
          <td style="padding:.75rem 1rem">
            <div style="font-weight:500">${o.customer_name||'—'}</div>
            <div style="font-size:.74rem;color:var(--muted)">${o.customer_email||''}</div>
          </td>
          <td style="padding:.75rem 1rem">
            <div style="font-weight:500">${progName}</div>
          </td>
          <td style="padding:.75rem 1rem;font-family:var(--fd);font-size:1rem;color:var(--gold)">${fmt(o.total||0)}</td>
          <td style="padding:.75rem 1rem;font-size:.78rem;color:var(--muted)">${hace}</td>
          <td style="padding:.75rem 1rem">
            <div style="display:flex;flex-direction:column;gap:.4rem">
              <button onclick="aprobarOrdenPrograma('${o.id}','${o.customer_email}','${slug}','${(o.customer_name||'').replace(/'/g,'').replace(/"/g,'')}','${progName.replace(/'/g,'').replace(/"/g,'')}')" style="padding:.4rem .85rem;border-radius:100px;font-size:.72rem;font-weight:600;background:rgba(74,155,111,.1);color:#2E7A52;border:1.5px solid rgba(74,155,111,.3);cursor:pointer;font-family:var(--fb)">✓ Aprobar y dar acceso</button>
              <button onclick="rechazarOrdenPrograma('${o.id}')" style="padding:.4rem .85rem;border-radius:100px;font-size:.72rem;font-weight:600;background:rgba(196,97,74,.08);color:#C4614A;border:1.5px solid rgba(196,97,74,.2);cursor:pointer;font-family:var(--fb)">✕ Rechazar</button>
              <a href="https://wa.me/${(o.customer_email||'').replace(/[^0-9]/g,'')}" target="_blank" style="padding:.4rem .85rem;border-radius:100px;font-size:.72rem;font-weight:600;background:rgba(37,211,102,.08);color:#25D366;border:1.5px solid rgba(37,211,102,.2);cursor:pointer;font-family:var(--fb);text-decoration:none;text-align:center">💬 WhatsApp</a>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    // Historial
    const hist = document.getElementById('opHistBody');
    const SC = {awaiting_payment:'#D4853A', completed:'#4A9B6F', cancelled:'#C4614A'};
    const SL = {awaiting_payment:'Pendiente', completed:'Aprobada', cancelled:'Cancelada'};
    hist.innerHTML = orders.slice(0,20).map(o => {
      const items = tryParseJSON(o.items);
      const progName = items?.[0]?.programa || '—';
      const sc = SC[o.status]||'#8A7F74';
      const [y,mm,dd] = (o.created_at||'').split('T')[0].split('-');
      const fecha = dd && mm && y ? `${dd}/${mm}/${y}` : '—';
      return `<tr style="border-bottom:1px solid var(--cream-dk)">
        <td style="padding:.65rem 1rem">
          <div style="font-weight:500">${o.customer_name||'—'}</div>
          <div style="font-size:.72rem;color:var(--muted)">${o.customer_email||''}</div>
        </td>
        <td style="padding:.65rem 1rem;font-size:.83rem">${progName}</td>
        <td style="padding:.65rem 1rem;font-weight:600">${fmt(o.total||0)}</td>
        <td style="padding:.65rem 1rem"><span style="font-size:.72rem;font-weight:600;padding:.18rem .55rem;border-radius:100px;background:${sc}18;color:${sc}">${SL[o.status]||o.status}</span></td>
        <td style="padding:.65rem 1rem;font-size:.78rem;color:var(--muted)">${fecha}</td>
      </tr>`;
    }).join('');

  } catch(e) {
    document.getElementById('opPendBody').innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">Error: ${e.message}</td></tr>`;
  }
}

async function aprobarOrdenPrograma(orderId, email, slug, customerName, progName) {
  if(!confirm('¿Aprobar la orden y dar acceso al programa a '+email+'?')) return;
  const token = _authToken || localStorage.getItem('bh_token');
  const h = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Marcar orden como completada
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ status: 'completed', updated_at: new Date().toISOString() })
    });
    if(!r1.ok) throw new Error('No se pudo actualizar la orden');

    // 2. Buscar el programa — intentar por ID (UUID), luego por slug, luego por nombre
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    let progId = null;

    if(isUUID) {
      // Es un UUID directo
      progId = slug;
    } else {
      // Buscar por slug
      const r2a = await fetch(`${SUPABASE_URL}/rest/v1/programs?slug=eq.${encodeURIComponent(slug)}&select=id`, {headers:h});
      const p2a = await r2a.json();
      if(p2a?.[0]?.id) progId = p2a[0].id;
    }

    // Si todavía no lo encontró, buscar por nombre del programa en la orden
    if(!progId && progName) {
      const r2b = await fetch(`${SUPABASE_URL}/rest/v1/programs?name=eq.${encodeURIComponent(progName)}&select=id`, {headers:h});
      const p2b = await r2b.json();
      if(p2b?.[0]?.id) progId = p2b[0].id;
    }

    // Si aún no: listar todos y buscar por nombre parcial
    if(!progId) {
      const r2c = await fetch(`${SUPABASE_URL}/rest/v1/programs?select=id,name,slug`, {headers:h});
      const allProgs = await r2c.json();
      if(Array.isArray(allProgs)) {
        const match = allProgs.find(p =>
          p.slug === slug ||
          p.name === progName ||
          p.name?.toLowerCase().includes((progName||'').toLowerCase().slice(0,10))
        );
        if(match) progId = match.id;
      }
    }

    if(!progId) {
      toast('Orden aprobada pero no se encontró el programa "'+progName+'". Agregá el acceso manualmente desde Programas → Miembros.','ok', 8000);
      loadOrdenesProgramas();
      return;
    }

    // 3. Buscar user_id por email — buscar en auth.users via admin API
    // Primero intentar en profiles (si tiene email guardado)
    let userId = null;

    // Buscar en auth usando el service role no es posible desde cliente
    // Solución: guardar el user_id en la orden cuando se hace el checkout
    // Por ahora buscar en profiles por cualquier campo que tenga el email
    const r3a = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id`, {
      headers: {...h, 'Accept': 'application/json'}
    });
    const allProfiles = await r3a.json();

    // Como profiles no tiene email, buscar el usuario que hizo el checkout
    // usando el email guardado en la orden
    // La mejor alternativa: usar la función RPC que puede acceder a auth.users
    const rRpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_id_by_email`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ p_email: email })
    });

    if(rRpc.ok) {
      const rpcResult = await rRpc.json();
      userId = rpcResult;
    }

    if(!userId) {
      toast('Orden aprobada ✓ — El usuario aún no tiene cuenta registrada. Cuando se registre con '+email+' verá el programa.','ok',8000);
      loadOrdenesProgramas();
      return;
    }

    // 4. Crear membresía
    const r4 = await fetch(`${SUPABASE_URL}/rest/v1/memberships`, {
      method: 'POST',
      headers: {...h, 'Prefer':'return=minimal'},
      body: JSON.stringify({
        user_id:     userId,
        program_id:  progId,
        status:      'active',
        access_type: 'purchased',
        notes:       'Aprobado por admin · Orden '+orderId
      })
    });

    if(!r4.ok) {
      const err = await r4.json().catch(()=>({}));
      throw new Error('Membresía: '+(err.message||err.hint||r4.status));
    }

    // Email al cliente — programa aprobado
    emailProgramaConfirmado(customerName || email.split('@')[0], email, progName || slug || 'el programa');

    toast('✓ Orden aprobada — '+email+' ya tiene acceso al programa', 'ok', 5000);
    loadOrdenesProgramas();
  } catch(e) {
    toast('Error: '+e.message, 'err');
    console.error('aprobarOrden:', e);
  }
}

async function rechazarOrdenPrograma(orderId) {
  if(!confirm('¿Rechazar esta orden?')) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON), 'Content-Type':'application/json' };
  await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
    method: 'PATCH', headers: h,
    body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() })
  });
  toast('Orden rechazada', 'ok');
  loadOrdenesProgramas();
}

function tryParseJSON(str) {
  try { return typeof str === 'string' ? JSON.parse(str) : str; } catch(e) { return null; }
}

function timeAgo(iso) {
  if(!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000);
  if(m < 1)  return 'ahora';
  if(m < 60) return `hace ${m}m`;
  const h = Math.floor(m/60);
  if(h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h/24)}d`;
}

window.loadOrdenesProgramas  = loadOrdenesProgramas;
window.aprobarOrdenPrograma  = aprobarOrdenPrograma;
window.rechazarOrdenPrograma = rechazarOrdenPrograma;

/* ── PROGRAMAS DINÁMICOS ── */
let _allPrograms = [];
let _progFilter  = null;


// Configuración de marcas — SOLO DOS, todo dinámico por campo `marca`
const MARCAS = {
  indomables: {
    nombre: 'Indomables',
    tagline: 'Nutrición funcional y planes de alimentación',
    descripcion: 'Programas de alimentación diseñados por expertas. Recuperá tu metabolismo, tu energía y tu relación con la comida.',
    color: '#2C4A3E',
    colorAccent: '#3A7D8C',
    bg: 'linear-gradient(135deg,#1C3A30 0%,#2C4A3E 100%)',
    img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80',
  },
  reset: {
    nombre: 'Reset',
    tagline: 'El primer paso de tu transformación',
    descripcion: 'Programas de 21 días para ordenar tu biología, recuperar energía y empezar tu transformación desde adentro.',
    color: '#1C3A18',
    colorAccent: '#7C9E73',
    bg: 'linear-gradient(135deg,#1C3A18 0%,#2D5016 100%)',
    img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80',
  },
  performance: {
    nombre: 'Be Human Performance',
    tagline: 'Entrenamiento funcional y composición corporal',
    descripcion: 'Planes diseñados para transformar tu cuerpo con un enfoque científico. Fuerza, rendimiento y resultados reales.',
    color: '#1C1A18',
    colorAccent: '#D4853A',
    bg: 'linear-gradient(135deg,#1C1A18 0%,#2C2820 100%)',
    img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80',
  },
};

const PROG_IMG_DEFAULTS = {
  'activacion-muscular': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  'indomables':          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  'reset-21':            'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
  'reset-mujer':         'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
};

async function loadProgramasPage() {
  const container = document.getElementById('progMarcasContainer');
  const filterReset = _progFilter === 'reset';
  _progFilter = null;
  const applyFilter = ps => filterReset ? ps.filter(p=>/reset/i.test(p.name||'')) : ps;
  if(_allPrograms.length) { renderMarcas(applyFilter(_allPrograms)); return; }
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/programs?order=name&select=*', {headers:h});
    const progs = await r.json();
    _allPrograms = Array.isArray(progs) ? progs.filter(p=>p.is_active!==false) : [];
    renderMarcas(applyFilter(_allPrograms));
  } catch(e) {
    if(container) container.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--muted)">Error al cargar programas.</div>';
  }
}
function goToResets() { _progFilter = 'reset'; goTo('programas'); }

// Programas destacados del HOME — dinámico desde la base (se actualiza solo)
async function loadHomeProgs() {
  const grid = document.getElementById('homeProgGrid');
  if(!grid) return;
  let progs = _allPrograms;
  if(!progs || !progs.length) {
    try {
      const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
      const r = await fetch(SUPABASE_URL+'/rest/v1/programs?order=name&select=*', {headers:h});
      const data = await r.json();
      progs = Array.isArray(data) ? data.filter(p=>p.is_active!==false) : [];
      _allPrograms = progs;
    } catch(e) { return; }
  }
  const orden = { indomables:0, performance:1 };
  const sorted = [...progs].sort((a,b)=>{
    const oa = orden[a.marca]!==undefined?orden[a.marca]:2, ob = orden[b.marca]!==undefined?orden[b.marca]:2;
    if(oa!==ob) return oa-ob;
    return (a.price||0)-(b.price||0);
  });
  if(!sorted.length){ grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted)">Próximamente nuevos programas.</div>'; return; }
  const esc = s => String(s||'').replace(/'/g,"\\'").replace(/</g,'&lt;');
  grid.innerHTML = sorted.map(p=>{
    const img = p.image_url || PROG_IMG_DEFAULTS[p.slug] || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=80';
    const price = p.price ? '$'+Number(p.price).toLocaleString('es-AR') : 'A consultar';
    const meta = [p.level, p.category].filter(Boolean);
    return '<div class="prog-card rv" onclick="abrirLandingPrograma(\''+p.id+'\')">'
      +'<img class="prog-img" src="'+img+'" alt="'+esc(p.name)+'" loading="lazy">'
      +'<div class="prog-ov"></div>'
      +'<div class="prog-body">'
        +(p.duration?'<div class="prog-tag">'+esc(p.duration)+'</div>':'')
        +'<div class="prog-name">'+esc(p.name)+'</div>'
        +'<div class="prog-meta">'+meta.map(m=>'<span>'+esc(m)+'</span>').join('<span>·</span>')+'<div class="prog-price">'+price+'</div></div>'
      +'</div>'
      +'<div class="prog-arrow">→</div>'
    +'</div>';
  }).join('');
  if(typeof initReveal==='function') setTimeout(initReveal,50);
}
window.loadHomeProgs = loadHomeProgs;

/* ── ECOSISTEMA (home) — cuadro completo, precios dinámicos y routing ── */
async function loadEcosistema() {
  const cols = document.getElementById('ecoCols');
  if(!cols) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };

  // Programas (reusa cache si existe)
  let progs = _allPrograms;
  if(!progs || !progs.length) {
    try {
      const r = await fetch(SUPABASE_URL+'/rest/v1/programs?order=name&select=*', {headers:h});
      const data = await r.json();
      progs = Array.isArray(data) ? data.filter(p=>p.is_active!==false) : [];
      _allPrograms = progs;
    } catch(e) { progs = []; }
  }

  // Precio mínimo de la Consulta Integral (base + precios por médica), mismo criterio que turnos
  let consultaPrice = 0;
  try {
    const [rc, rm] = await Promise.all([
      fetch(SUPABASE_URL+'/rest/v1/consultation_types?id=eq.integral&select=precio', {headers:h}),
      fetch(SUPABASE_URL+'/rest/v1/medico_consultas?consulta_id=eq.integral&select=precio', {headers:h})
    ]);
    const ct = await rc.json(), mc = await rm.json();
    const base = (Array.isArray(ct) && ct[0] && ct[0].precio) || 0;
    const med  = (Array.isArray(mc) ? mc : []).map(x=>x.precio).filter(Boolean);
    const all  = [...med, ...(base?[base]:[])];
    consultaPrice = all.length ? Math.min(...all) : 0;
  } catch(e) {}

  const fmtMoney = n => '$'+Number(n).toLocaleString('es-AR');
  // precio mínimo de un set de programas (ignora valores de prueba <= 1)
  const priceOf = (arr, forzarDesde) => {
    const vals = arr.map(p=>Number(p.price)).filter(v=>v>1);
    if(!vals.length) return { label:'A consultar', prefix:'' };
    return { label: fmtMoney(Math.min(...vals)), prefix: (forzarDesde || vals.length>1) ? 'Desde' : '' };
  };

  // Matching contra la base
  const resets = progs.filter(p=>/reset/i.test(p.name));
  const indom  = progs.filter(p=>/indomables/i.test(p.name) && !/reset/i.test(p.name));
  const perf   = progs.filter(p=>p.marca==='performance');
  const flagIndom = indom[0];

  const pReset    = priceOf(resets, true);
  const pPerf     = priceOf(perf, true);
  const pIndom    = (flagIndom && Number(flagIndom.price)>1) ? { label:fmtMoney(flagIndom.price), prefix:'' } : { label:'A consultar', prefix:'' };
  const pConsulta = consultaPrice>0 ? { label:fmtMoney(consultaPrice), prefix:'Desde' } : { label:'A consultar', prefix:'' };

  const cards = [
    { num:1, ac:'#7C9E73', soft:'rgba(124,158,115,.14)', icon:'🔥',
      eyb:'Quiero empezar', eys:'A ordenar mi energía y alimentación',
      title:'Reset Energético', subbox:'♀ Reset Mujer',
      price:pReset, priceTop:'21 días', priceSuffix:'c/u',
      desc:'Para recuperar tu energía, mejorar tu metabolismo y crear nuevos hábitos.',
      feats:[], onclick:"goToResets()" },
    { num:2, ac:'#C9935A', soft:'rgba(201,147,90,.14)', icon:'🦋',
      eyb:'Quiero transformarme', eys:'Y aprender el método completo',
      title:'Método Indomables',
      price:pIndom,
      desc:'Un método integral para transformar tu metabolismo, tu cuerpo, tu mente y tu relación con la vida.',
      feats:['Nutrición · Estrés · Hormonas','Intestino · Movimiento · Emociones','Suplementación · Acción','Planificación · Y mucho más'],
      onclick: flagIndom ? "abrirLandingPrograma('"+flagIndom.id+"')" : "goTo('programas')" },
    { num:3, ac:'#8E7A9E', soft:'rgba(142,122,158,.14)', icon:'🩺',
      eyb:'Necesito personalizarlo', eys:'Y una estrategia adaptada a mí',
      title:'Consulta Integral Be Human',
      price:pConsulta,
      desc:'Evaluación médica y nutricional completa para diseñar un plan personalizado y efectivo.',
      feats:['Historia clínica completa','Análisis de laboratorio','Plan nutricional y suplementación','Estrategia personalizada'],
      onclick:"goTo('turnos')" },
    { num:4, ac:'#3A7D8C', soft:'rgba(58,125,140,.13)', icon:'🏋️',
      eyb:'Quiero potenciarme', eys:'Y llevarlo al máximo con entrenamiento inteligente',
      title:'Be Human Performance', boxsub:'Online o presencial',
      price:pPerf,
      desc:'Programas de entrenamiento para fuerza, salud metabólica y rendimiento.',
      feats:['Fuerza y composición corporal','Salud metabólica','Movilidad y bienestar','Acompañamiento profesional'],
      onclick:"goTo('programas')" },
  ];

  const colHtml = c =>
    '<div class="eco-col rv" style="--eco-ac:'+c.ac+';--eco-ac-soft:'+c.soft+'" onclick="'+c.onclick+'">'
      +'<div class="eco-col-num">'+c.num+'</div>'
      +'<div class="eco-col-ic">'+c.icon+'</div>'
      +'<div class="eco-col-eyb">'+c.eyb+'</div>'
      +'<div class="eco-col-eys">'+c.eys+'</div>'
      +'<div class="eco-col-box"><div class="eco-col-title">'+c.title+'</div>'+(c.boxsub?'<div style="font-size:.62rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:.25rem">'+c.boxsub+'</div>':'')+'</div>'
      +(c.subbox?'<div class="eco-col-subbox">'+c.subbox+'</div>':'')
      +'<div class="eco-col-price">'+(c.priceTop?'<small>'+c.priceTop+'</small>':'')+(c.price.prefix?c.price.prefix+' ':'')+c.price.label+(c.priceSuffix&&c.price.label!=='A consultar'?' '+c.priceSuffix:'')+'</div>'
      +'<div class="eco-col-desc">'+c.desc+'</div>'
      +(c.feats.length?'<ul class="eco-col-feats">'+c.feats.map(f=>'<li>'+f+'</li>').join('')+'</ul>':'')
    +'</div>';

  // columnas con flechas intercaladas (color = acento de la columna izquierda)
  let html = '';
  cards.forEach((c,i)=>{
    html += colHtml(c);
    if(i < cards.length-1) html += '<div class="eco-col-arrow" style="--eco-arrow:'+c.ac+'">→</div>';
  });
  cols.innerHTML = html;
  if(typeof initReveal==='function') setTimeout(initReveal,50);
}
window.loadEcosistema = loadEcosistema;

function renderMarcas(progs) {
  const container = document.getElementById('progMarcasContainer');
  if(!container) return;

  // Agrupar por marca según el campo `marca` de la DB (editable desde el admin)
  const byMarca = {};
  progs.forEach(p => {
    const m = p.marca || 'sin-categoria';
    if(!byMarca[m]) byMarca[m] = [];
    byMarca[m].push(p);
  });

  const marcasOrden = ['indomables','reset','performance', ...Object.keys(byMarca).filter(k=>!['indomables','reset','performance'].includes(k))];
  let html = '';

  marcasOrden.forEach(marcaKey => {
    const progsMarca = byMarca[marcaKey];
    if(!progsMarca || !progsMarca.length) return;

    const cfg = MARCAS[marcaKey];
    if(cfg) {
      // Sección con diseño de marca
      html += renderMarcaSection(marcaKey, cfg, progsMarca);
    } else {
      // Sin categoría — lista simple
      html += '<section style="padding:4rem clamp(1.5rem,5vw,5rem);background:#fff">'
        +'<div style="max-width:1200px;margin:0 auto">'
        +'<h2 style="font-family:var(--fd);font-size:1.8rem;color:#1C1A18;margin:0 0 2rem">Otros programas</h2>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem">'
        +progsMarca.map(p=>renderProgCard(p,'#3A7D8C')).join('')
        +'</div></div></section>';
    }
  });

  if(!html) html = '<div style="text-align:center;padding:4rem;color:var(--muted)">No hay programas disponibles.</div>';
  container.innerHTML = html;
  setTimeout(initReveal, 50);
}

function renderMarcaSection(marcaKey, cfg, progs) {
  return '<section style="background:#F8F5F0" class="rv">'
    // Header de la marca
    +'<div style="position:relative;min-height:320px;background:'+cfg.bg+';display:flex;align-items:flex-end;overflow:hidden">'
      +'<img src="'+cfg.img+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.25">'
      +'<div style="position:absolute;inset:0;background:'+cfg.bg+';opacity:.7"></div>'
      +'<div style="position:relative;z-index:2;padding:3rem clamp(1.5rem,5vw,5rem);max-width:700px">'
        +'<span style="font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:'+cfg.colorAccent+';display:block;margin-bottom:.65rem">Línea de programas</span>'
        +'<h2 style="font-family:var(--fd);font-size:clamp(2rem,4vw,3rem);color:#F0E8D8;margin:0 0 .75rem;line-height:1.1">'+cfg.nombre+'</h2>'
        +'<p style="font-family:var(--fd);font-style:italic;font-size:1.1rem;color:'+cfg.colorAccent+';margin:0 0 .75rem">'+cfg.tagline+'</p>'
        +'<p style="font-size:.88rem;color:rgba(240,232,216,.6);margin:0;max-width:480px;line-height:1.7">'+cfg.descripcion+'</p>'
      +'</div>'
    +'</div>'
    // Grid de programas
    +'<div style="padding:3rem clamp(1.5rem,5vw,5rem)">'
      +'<div style="max-width:1200px;margin:0 auto">'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem">'
          +progs.map(p=>renderProgCard(p,cfg.colorAccent)).join('')
        +'</div>'
      +'</div>'
    +'</div>'
  +'</section>';
}

function renderProgCard(prog, accentColor) {
  const img = prog.image_url || PROG_IMG_DEFAULTS[prog.slug] || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80';
  const benefits = Array.isArray(prog.benefits) ? prog.benefits : (tryParseJSON(prog.benefits)||[]);
  const price = prog.price ? fmt(prog.price) : 'A consultar';

  return '<div class="rv" onclick="abrirLandingPrograma(\''+prog.id+'\')" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.07);transition:.2s;cursor:pointer" onmouseover="this.style.transform=\'translateY(-4px)\';this.style.boxShadow=\'0 8px 32px rgba(0,0,0,.12)\'" onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'0 2px 16px rgba(0,0,0,.07)\'">'
    +'<div style="position:relative;height:200px;overflow:hidden">'
      +'<img src="'+img+'" style="width:100%;height:100%;object-fit:cover;transition:.3s" loading="lazy">'
      +(prog.duration?'<div style="position:absolute;top:.75rem;left:.75rem;background:rgba(28,26,24,.7);backdrop-filter:blur(4px);color:#F0E8D8;font-size:.7rem;font-weight:600;padding:.25rem .65rem;border-radius:100px">'+prog.duration+'</div>':'')
    +'</div>'
    +'<div style="padding:1.25rem">'
      +'<h3 style="font-family:var(--fd);font-size:1.15rem;color:#1C1A18;margin:0 0 .4rem;line-height:1.2">'+prog.name+'</h3>'
      +(prog.subtitle?'<p style="font-family:var(--fd);font-style:italic;font-size:.82rem;color:'+accentColor+';margin:0 0 .65rem">'+prog.subtitle+'</p>':'')
      +(prog.description?'<p style="font-size:.81rem;color:#6B6460;line-height:1.6;margin:0 0 .85rem">'+prog.description+'</p>':'')
      +(benefits.length?'<ul style="margin:0 0 1rem;padding:0;list-style:none;display:flex;flex-direction:column;gap:.3rem">'
        +benefits.slice(0,3).map(b=>'<li style="font-size:.77rem;color:#6B6460;display:flex;align-items:flex-start;gap:.4rem"><span style="color:'+accentColor+';font-weight:700;flex-shrink:0">✓</span>'+b+'</li>').join('')
      +'</ul>':'')
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding-top:.85rem;border-top:1px solid #f0ebe3">'
        +'<div><div style="font-family:var(--fd);font-size:1.3rem;font-weight:700;color:'+accentColor+'">'+price+'</div><div style="font-size:.68rem;color:var(--muted)">ARS · Pago único</div></div>'
        +'<div style="display:flex;gap:.5rem">'
          +'<button onclick="event.stopPropagation();abrirLandingPrograma(\''+prog.id+'\')" style="padding:.5rem 1rem;border-radius:100px;font-size:.75rem;font-weight:600;border:1.5px solid '+accentColor+';color:'+accentColor+';background:transparent;cursor:pointer;font-family:var(--fb)">Más info</button>'
          +'<button onclick="event.stopPropagation();inscribirsePrograma(this)" data-prog-name="'+prog.name+'" data-prog-id="'+prog.id+'" data-prog-price="'+(prog.price||0)+'" style="padding:.5rem 1rem;border-radius:100px;font-size:.75rem;font-weight:600;border:none;background:'+accentColor+';color:#fff;cursor:pointer;font-family:var(--fb)">Inscribirme</button>'
        +'</div>'
      +'</div>'
    +'</div>'
  +'</div>';
}


/* ── LANDING INDIVIDUAL DE PROGRAMA ── */
let _currentLandingProg = null;

async function abrirLandingPrograma(progId) {
  goTo('prog-landing');
  const content = document.getElementById('plContent');
  if(content) content.innerHTML = '<div style="text-align:center;padding:6rem;color:var(--muted)">Cargando...</div>';

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/programs?id=eq.${progId}`, {headers:h});
    const progs = await r.json();
    const prog = progs?.[0];
    if(!prog) throw new Error('Programa no encontrado');
    _currentLandingProg = prog;

    // Traer módulos del programa
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/program_modules?program_id=eq.${progId}&order=sort_order`, {headers:h});
    const modules = await r2.json() || [];

    renderProgLanding(prog, modules);
  } catch(e) {
    if(content) content.innerHTML = `<div style="text-align:center;padding:6rem;color:var(--muted)">Error: ${e.message}</div>`;
  }
}

function renderProgLanding(prog, modules) {
  const content = document.getElementById('plContent');
  if(!content) return;

  // Landing especial: Método Indomables — Despierta y Acciona
  if(/indomables/i.test(prog.name||'') && /despierta/i.test(prog.name||'')) {
    return renderIndomablesLanding(prog);
  }
  // Landings especiales: Reset Mujer y Reset Energético
  if(/reset/i.test(prog.name||'') && /mujer/i.test(prog.name||'')) {
    return renderResetMujerLanding(prog);
  }
  if(/reset/i.test(prog.name||'')) {
    return renderResetEnergeticoLanding(prog);
  }

  const benefits = Array.isArray(prog.benefits) ? prog.benefits : (tryParseJSON(prog.benefits)||[]);
  const faqs     = Array.isArray(prog.faqs)     ? prog.faqs     : (tryParseJSON(prog.faqs)||[]);
  const gallery  = Array.isArray(prog.gallery)  ? prog.gallery  : (tryParseJSON(prog.gallery)||[]);
  const price    = prog.price ? fmt(prog.price) : '';
  const heroImg  = prog.hero_image_url || prog.image_url || '';
  const color    = '#3A7D8C';

  let html = '';

  // Topbar
  html += '<div style="background:#fff;border-bottom:1px solid #e8e8e8;padding:.7rem 1.5rem;display:flex;align-items:center;gap:.75rem;position:sticky;top:70px;z-index:10">';
  html += '<button onclick="goTo(\'programas\')" style="font-size:.8rem;color:var(--muted);background:none;border:1.5px solid var(--cream-dk);border-radius:100px;padding:.35rem .85rem;cursor:pointer;font-family:var(--fb)">&#8592; Programas</button>';
  html += '<span style="font-size:.9rem;font-weight:600;color:#1C1A18;flex:1">' + prog.name + '</span>';
  html += '<button class="btn-gold" style="padding:.55rem 1.4rem;font-size:.76rem" onclick="inscribirmeLanding()">Inscribirme ahora</button>';
  html += '</div>';

  // Hero
  html += '<div style="position:relative;min-height:480px;background:#1C1A18;display:flex;align-items:center;overflow:hidden">';
  if(heroImg) html += '<img src="' + heroImg + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.45">';
  html += '<div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(28,26,24,.85) 40%,rgba(28,26,24,.4))"></div>';
  html += '<div style="position:relative;z-index:2;max-width:720px;padding:4rem clamp(1.5rem,5vw,5rem)">';
  if(prog.category) html += '<div style="font-size:.65rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:1rem">' + prog.category + '</div>';
  html += '<h1 style="font-family:var(--fd);font-size:clamp(2rem,5vw,3.2rem);color:#F0E8D8;line-height:1.1;margin:0 0 1rem">' + prog.name + '</h1>';
  if(prog.subtitle) html += '<p style="font-family:var(--fd);font-style:italic;font-size:1.2rem;color:var(--gold);margin:0 0 1.5rem">' + prog.subtitle + '</p>';
  if(prog.description) html += '<p style="font-size:1rem;color:rgba(240,232,216,.75);line-height:1.75;max-width:560px;margin:0 0 2rem">' + prog.description + '</p>';
  html += '<div style="display:flex;gap:1rem;flex-wrap:wrap">';
  html += '<button class="btn-gold" style="padding:.85rem 2rem;font-size:.82rem" onclick="inscribirmeLanding()">Inscribirme ahora</button>';
  html += '<a href="https://wa.me/5491176179836" target="_blank" style="padding:.85rem 2rem;border-radius:100px;font-family:var(--fb);font-size:.82rem;font-weight:600;border:2px solid rgba(240,232,216,.3);color:#F0E8D8;text-decoration:none">Consultar &rarr;</a>';
  html += '</div></div></div>';

  // Beneficios
  if(benefits.length) {
    html += '<section style="background:#fff;padding:4rem clamp(1.5rem,5vw,5rem)">';
    html += '<div style="max-width:1100px;margin:0 auto">';
    html += '<div style="text-align:center;margin-bottom:2.5rem"><h2 style="font-family:var(--fd);font-size:2rem;color:#1C1A18;margin:0">Todo lo que vas a recibir</h2></div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">';
    benefits.forEach(function(b) {
      html += '<div style="display:flex;align-items:flex-start;gap:.85rem;padding:1rem 1.25rem;background:var(--cream);border-radius:12px">';
      html += '<div style="width:22px;height:22px;border-radius:50%;background:var(--teal);display:flex;align-items:center;justify-content:center;font-size:.65rem;color:#fff;font-weight:700;flex-shrink:0;margin-top:.1rem">&#10003;</div>';
      html += '<span style="font-size:.88rem;color:#3A3530;line-height:1.55">' + b + '</span></div>';
    });
    html += '</div></div></section>';
  }

  // Para quién
  if(prog.for_who) {
    html += '<section style="background:var(--cream);padding:4rem clamp(1.5rem,5vw,5rem)">';
    html += '<div style="max-width:800px;margin:0 auto;text-align:center">';
    html += '<h2 style="font-family:var(--fd);font-size:2rem;color:#1C1A18;margin:0 0 1.5rem">Para quién es este programa</h2>';
    html += '<div style="font-size:.95rem;color:#6B6460;line-height:1.9;white-space:pre-line">' + prog.for_who + '</div>';
    html += '</div></section>';
  }

  // Descripción larga
  if(prog.description_long) {
    html += '<section style="background:#fff;padding:4rem clamp(1.5rem,5vw,5rem)">';
    html += '<div style="max-width:800px;margin:0 auto">';
    html += '<h2 style="font-family:var(--fd);font-size:2rem;color:#1C1A18;margin:0 0 1.5rem">Sobre el programa</h2>';
    html += '<div style="font-size:.95rem;color:#6B6460;line-height:1.9;white-space:pre-line">' + prog.description_long + '</div>';
    html += '</div></section>';
  }

  // Módulos
  if(modules && modules.length) {
    html += '<section style="background:var(--cream);padding:4rem clamp(1.5rem,5vw,5rem)">';
    html += '<div style="max-width:1100px;margin:0 auto">';
    html += '<div style="text-align:center;margin-bottom:2.5rem"><h2 style="font-family:var(--fd);font-size:2rem;color:#1C1A18;margin:0">Contenido del programa</h2></div>';
    html += '<div style="display:flex;flex-direction:column;gap:.75rem">';
    modules.forEach(function(m, i) {
      html += '<div style="background:#fff;border-radius:14px;padding:1.25rem 1.5rem;display:flex;align-items:center;gap:1.25rem;box-shadow:0 1px 4px rgba(0,0,0,.06)">';
      html += '<div style="width:36px;height:36px;border-radius:50%;background:var(--teal);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:#fff;flex-shrink:0">' + (i+1) + '</div>';
      html += '<div><div style="font-weight:600;color:#1C1A18;font-size:.9rem">' + m.title + '</div>';
      if(m.description) html += '<div style="font-size:.78rem;color:var(--muted);margin-top:.2rem">' + m.description + '</div>';
      html += '</div></div>';
    });
    html += '</div></div></section>';
  }

  // Precio CTA
  html += '<section style="background:#1C1A18;padding:4rem clamp(1.5rem,5vw,5rem);text-align:center">';
  html += '<div style="max-width:600px;margin:0 auto">';
  html += '<h2 style="font-family:var(--fd);font-size:2.5rem;color:#F0E8D8;margin:0 0 .5rem">' + prog.name + '</h2>';
  if(prog.subtitle) html += '<p style="font-family:var(--fd);font-style:italic;color:var(--gold);font-size:1.1rem;margin:0 0 2rem">' + prog.subtitle + '</p>';
  if(price) {
    html += '<div style="font-family:var(--fd);font-size:3.5rem;color:#F0E8D8;line-height:1;margin:1.5rem 0 .35rem">' + price + '</div>';
    html += '<div style="font-size:.78rem;color:rgba(240,232,216,.4);text-transform:uppercase;letter-spacing:.1em;margin-bottom:2rem">ARS &middot; Pago &uacute;nico</div>';
  }
  html += '<button class="btn-gold" style="padding:1rem 3rem;font-size:.85rem;letter-spacing:.1em" onclick="inscribirmeLanding()">Inscribirme ahora</button>';
  html += '<div style="margin-top:1.25rem"><a href="https://wa.me/5491176179836" target="_blank" style="font-size:.82rem;color:rgba(240,232,216,.4);text-decoration:none">Tens dudas? Escribinos &rarr;</a></div>';
  html += '</div></section>';

  // FAQs
  if(faqs.length) {
    html += '<section style="background:var(--cream);padding:4rem clamp(1.5rem,5vw,5rem)">';
    html += '<div style="max-width:800px;margin:0 auto">';
    html += '<h2 style="font-family:var(--fd);font-size:2rem;color:#1C1A18;margin:0 0 2rem;text-align:center">Preguntas frecuentes</h2>';
    faqs.forEach(function(faq, i) {
      html += '<div style="border-bottom:1px solid #E4D9C5;padding:1.25rem 0" id="faq-' + i + '">';
      html += '<button onclick="toggleFaq(' + i + ')" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:1rem;font-family:var(--fb);font-size:.95rem;font-weight:600;color:#1C1A18;padding:0">';
      html += '<span>' + (faq.q||faq) + '</span>';
      html += '<span id="faqIcon-' + i + '" style="font-size:1.1rem;color:var(--teal);flex-shrink:0">+</span>';
      html += '</button>';
      html += '<div id="faqBody-' + i + '" style="display:none;font-size:.88rem;color:#6B6460;line-height:1.75;padding-top:.85rem">' + (faq.a||'') + '</div>';
      html += '</div>';
    });
    html += '</div></section>';
  }

  content.innerHTML = html;
}

/* ── LANDING DEDICADA: MÉTODO INDOMABLES — DESPIERTA Y ACCIONA ── */
function renderIndomablesLanding(prog) {
  const content = document.getElementById('plContent');
  if(!content) return;
  const heroImg = prog.hero_image_url || prog.image_url || '';

  const bf = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M12 7c-1-2.5-3.5-4-6-3.5C3.5 4 2.5 6.5 3.5 9c.8 2 3 3 5 3 1.5 0 3-.8 3.5-2.2"/><path d="M12 7c1-2.5 3.5-4 6-3.5C20.5 4 21.5 6.5 20.5 9c-.8 2-3 3-5 3-1.5 0-3-.8-3.5-2.2"/><path d="M12 12c-1 2-3 3.2-4.8 3-1.6-.2-2.6-1.8-2-3.3"/><path d="M12 12c1 2 3 3.2 4.8 3 1.6-.2 2.6-1.8 2-3.3"/></svg>';

  const recibir1 = [
    {ic:'🎬', t:'12 estaciones grabadas', d:'Contenido exclusivo en video para que avances a tu ritmo.'},
    {ic:'📖', t:'Workbooks y guías prácticas', d:'Material descargable para aplicar cada enseñanza.'},
    {ic:'📚', t:'Recursos complementarios', d:'Meditaciones, audios, lecturas y herramientas de apoyo.'},
    {ic:'✅', t:'Seguimiento de tu progreso', d:'Marca tus estaciones, lleva registro y celebra tus avances.'},
    {ic:'🤖', t:'Coach 4H', d:'Tu agente IA entrenado por la Dra. Mariel Dobenau para acompañarte 24/7 en tu transformación.', badge:'Exclusivo'},
  ];
  const recibir2 = [
    {ic:'🍽️', t:'Estrategias nutricionales', list:['Keto / Low Carb / Ciclado','Cálculo de proteínas','Reemplazos inteligentes','Guías completas','Cómo adaptar y sostener tu estrategia']},
    {ic:'🍲', t:'Recetas prácticas y deliciosas', d:'Recetas simples, nutritivas y antiinflamatorias para tu día a día.'},
    {ic:'🛒', t:'Listas de compras inteligentes', d:'Organizadas por estrategia para que tengas todo claro y ahorres tiempo.'},
    {ic:'🌿', t:'Educación aplicada y profunda', d:'Para entender tu biología y tomar decisiones con criterio.'},
  ];
  const estaciones = [
    {ic:'🌅', t:'Despertar', d:'No podés cambiar aquello que no podés ver.'},
    {ic:'🧬', t:'Biología vs Entorno', d:'Entender tu biología para dejar de pelear con ella.'},
    {ic:'🧘', t:'Volver a la Calma', d:'Regular tu estrés para recuperar tu energía.'},
    {ic:'🌙', t:'Recuperar el Ritmo', d:'Dormir, luz, movimiento y rutinas que sanan.'},
    {ic:'🦠', t:'El Segundo Cerebro', d:'Alimentar tu intestino para transformar tu salud.'},
    {ic:'⚖️', t:'Hormonas y Energía', d:'Equilibrar tus hormonas para recuperar tu vitalidad.'},
    {ic:'⏳', t:'Ayuno Consciente', d:'Usar el ayuno como herramienta, no como castigo.'},
    {ic:'💪', t:'El Músculo es Medicina', d:'Entrenar tu cuerpo para proteger tu futuro.'},
    {ic:'💊', t:'Suplementar con Criterio', d:'Suplementos sí, pero con estrategia y propósito.'},
    {ic:'❤️', t:'Emociones y Coherencia', d:'Sanar tu mundo emocional para sanar tu cuerpo.'},
    {ic:'🧩', t:'Integrar', d:'Convertir lo aprendido en un estilo de vida.'},
    {ic:'🎯', t:'Tu Plan de Acción', d:'Diseñar tu plan para sostener tu transformación.'},
  ];
  const bonus = [
    {ic:'📅', t:'10 sesiones del Método Be Human Performance', d:'Entrenamiento integral para elevar tu rendimiento físico, mental y emocional.'},
    {ic:'🎯', t:'Guía de Enfoque', d:'Claridad para definir prioridades y avanzar sin dispersarte.'},
    {ic:'⛰️', t:'Guía de No Abandono', d:'Estrategias para sostener tu motivación y atravesar los momentos clave.'},
    {ic:'🗓️', t:'Plan de los Próximos 90 Días', d:'Una hoja de ruta práctica para integrar el método a tu vida y sostener tus cambios.'},
    {ic:'🤖', t:'Coach 4H IA', d:'Acompañamiento 24/7 para resolver dudas, reforzar conceptos y seguir avanzando.'},
    {ic:'📖', t:'Biblioteca de recursos Be Human', d:'Meditaciones, guías, audios y materiales exclusivos.'},
  ];

  const card = c =>
    '<div class="indo-card'+(c.badge?' indo-card--excl':'')+'">'
      +(c.badge?'<span class="indo-card-badge">'+c.badge+'</span>':'')
      +'<div class="indo-card-ic">'+c.ic+'</div>'
      +'<div class="indo-card-t">'+c.t+'</div>'
      +(c.list?'<ul class="indo-card-list">'+c.list.map(x=>'<li>'+x+'</li>').join('')+'</ul>'
              :'<div class="indo-card-d">'+c.d+'</div>')
    +'</div>';

  let html = '';

  // Topbar
  html += '<div class="indo-top">'
    +'<button class="indo-back" onclick="goTo(\'programas\')">&#8592; Programas</button>'
    +'<span class="indo-top-title">Método Indomables — Despierta y Acciona</span>'
    +'<button class="btn-gold indo-top-cta" onclick="inscribirmeLanding()">Inscribirme ahora</button>'
  +'</div>';

  // Hero
  html += '<section class="indo-hero">'
    +(heroImg?'<img class="indo-hero-img" src="'+heroImg+'" alt="">':'')
    +'<div class="indo-hero-ov"></div>'
    +'<div class="indo-hero-inner">'
      +'<div class="indo-hero-text">'
        +'<div class="indo-eyebrow">12 semanas de transformación</div>'
        +'<h1 class="indo-h1">Método Indomables<br>Despierta y Acciona</h1>'
        +'<p class="indo-hero-sub">El método para liberar una biología secuestrada y recuperar <em>tu energía, tu salud y tu libertad.</em></p>'
        +'<div class="indo-hero-btns">'
          +'<button class="btn-gold" onclick="inscribirmeLanding()">Inscribirme ahora</button>'
          +'<button class="indo-btn-ghost" onclick="document.getElementById(\'indoRecibir\').scrollIntoView({behavior:\'smooth\'})">Ver programa</button>'
        +'</div>'
      +'</div>'
      +'<div class="indo-seal">'
        +'<div class="indo-seal-top">Método Indomables</div>'
        +'<div class="indo-seal-bf">'+bf+'</div>'
        +'<div class="indo-seal-list"><span>Transformación</span><span>Ciencia</span><span>Acción</span><span>Autonomía</span></div>'
      +'</div>'
    +'</div>'
  +'</section>';

  // Todo lo que vas a recibir
  html += '<section class="indo-sec" id="indoRecibir"><div class="indo-wrap">'
    +'<h2 class="indo-h2 indo-h2--orn">Todo lo que vas a recibir</h2>'
    +'<div class="indo-grid5">'+recibir1.map(card).join('')+'</div>'
    +'<div class="indo-grid4">'+recibir2.map(card).join('')+'</div>'
  +'</div></section>';

  // Para quién + Coach 4H
  html += '<section class="indo-sec indo-sec--cream"><div class="indo-wrap indo-2col">'
    +'<div class="indo-quien">'
      +'<div class="indo-quien-ic">👤</div>'
      +'<div><h3 class="indo-block-t">Para quién es este programa</h3>'
      +'<p class="indo-block-d">Para quienes buscan una transformación profunda y sostenida en el tiempo, con respaldo médico, ciencia y un enfoque integral que trabaja cuerpo, mente, emociones y entorno.</p></div>'
    +'</div>'
    +'<div class="indo-coach">'
      +'<div class="indo-coach-badge"><span>Coach 4H</span><div class="indo-coach-bf">'+bf+'</div><span>Indomables</span></div>'
      +'<div><h3 class="indo-block-t">Conocé a tu Coach 4H (24/7)</h3>'
      +'<p class="indo-block-d">Tu agente de inteligencia artificial entrenado por la Dra. Mariel Dobenau con todo el Método Indomables. Responde tus dudas, te guía, te recuerda tus señales y te ayuda a tomar mejores decisiones todos los días.</p></div>'
    +'</div>'
  +'</div></section>';

  // Contenido del programa
  html += '<section class="indo-sec"><div class="indo-wrap">'
    +'<h2 class="indo-h2">Contenido del programa</h2>'
    +'<p class="indo-sub-center">Un recorrido de 12 semanas para reprogramar tu biología y construir una nueva identidad.</p>'
    +'<div class="indo-timeline">'
    + estaciones.map((e,i)=>
        '<div class="indo-station">'
          +'<div class="indo-station-num">'+(i+1)+'</div>'
          +'<div class="indo-station-ic">'+e.ic+'</div>'
          +'<div class="indo-station-t">'+e.t+'</div>'
          +'<div class="indo-station-d">'+e.d+'</div>'
        +'</div>'
      ).join('')
    +'</div>'
  +'</div></section>';

  // Bonus exclusivos
  html += '<section class="indo-bonus"><div class="indo-wrap">'
    +'<h2 class="indo-bonus-title">Bonus exclusivos</h2>'
    +'<div class="indo-bonus-grid">'
    + bonus.map(b=>
        '<div class="indo-bonus-it">'
          +'<div class="indo-bonus-ic">'+b.ic+'</div>'
          +'<div><div class="indo-bonus-t">'+b.t+'</div><div class="indo-bonus-d">'+b.d+'</div></div>'
        +'</div>'
      ).join('')
    +'</div>'
  +'</div></section>';

  // Cierre
  html += '<section class="indo-close">'
    +'<p class="indo-close-1">Este no es un programa más.</p>'
    +'<p class="indo-close-2">Es el método para recuperar tu salud, tu energía y tu libertad.</p>'
    +'<button class="btn-gold indo-close-cta" onclick="inscribirmeLanding()">Inscribirme ahora</button>'
  +'</section>';

  content.innerHTML = html;
  if(typeof initReveal==='function') setTimeout(initReveal,50);
}


function toggleFaq(i) {
  const body = document.getElementById('faqBody-'+i);
  const icon = document.getElementById('faqIcon-'+i);
  if(!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : '';
  if(icon) icon.textContent = open ? '+' : '−';
}

async function inscribirmeLanding() {
  if(!_currentLandingProg) return;
  // Simular clic en inscribirsePrograma con los datos del programa actual
  const prog = _currentLandingProg;
  // Setear datos del checkout ANTES del check (para poder volver acá tras el login)
  progCheckoutData = {
    nombre: prog.name,
    slug:   prog.id,
    precio: prog.price || 0,
    progId: prog.id
  };
  const token = localStorage.getItem('bh_token');
  if(!token) {
    _loginIntent = { type:'prog', nombre: prog.name };
    goTo('login');
    return;
  }
  goTo('prog-checkout');
  setTimeout(()=>{
    const n = document.getElementById('pcProgName'); if(n) n.textContent = prog.name;
    const p = document.getElementById('pcProgPrice'); if(p) p.textContent = fmt(prog.price||0);
  }, 100);
}

function renderResetEnergeticoLanding(prog) {
  const content = document.getElementById('plContent');
  if(!content) return;
  const heroImg = prog.hero_image_url || prog.image_url || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80';
  const price = prog.price && Number(prog.price) > 1 ? fmt(prog.price) : null;
  const G = '#2D5016', GA = '#4A7C2A';
  const ben = (ic,t) => '<div style="display:flex;flex-direction:column;align-items:center;gap:.4rem;text-align:center;min-width:72px"><div style="font-size:1.4rem">'+ic+'</div><div style="font-size:.68rem;color:rgba(240,232,216,.7);max-width:80px;line-height:1.3">'+t+'</div></div>';
  const recCard = (ic,t,d) => '<div style="background:#fff;border-radius:14px;padding:1.25rem;box-shadow:0 2px 10px rgba(0,0,0,.06)"><div style="font-size:1.8rem;margin-bottom:.6rem">'+ic+'</div><div style="font-weight:700;font-size:.84rem;color:#1C1A18;margin-bottom:.35rem">'+t+'</div><div style="font-size:.77rem;color:var(--muted);line-height:1.5">'+d+'</div></div>';
  const check = (t) => '<div style="display:flex;gap:.6rem;margin-bottom:.55rem"><span style="color:'+G+';font-weight:700;flex-shrink:0">✓</span><span style="font-size:.84rem;color:#3A3530;line-height:1.45">'+t+'</span></div>';
  let html = '';
  // Topbar
  html += '<div style="background:#fff;border-bottom:1px solid #e8e8e8;padding:.7rem 1.5rem;display:flex;align-items:center;gap:.75rem;position:sticky;top:70px;z-index:10"><button onclick="goTo(\'programas\')" style="font-size:.8rem;color:var(--muted);background:none;border:1.5px solid var(--cream-dk);border-radius:100px;padding:.35rem .85rem;cursor:pointer;font-family:var(--fb)">&#8592; Programas</button><span style="font-size:.9rem;font-weight:600;color:#1C1A18;flex:1">Reset Energético</span><button class="btn-gold" style="padding:.55rem 1.4rem;font-size:.76rem" onclick="inscribirmeLanding()">Inscribirme ahora</button></div>';
  // Hero
  html += '<section style="position:relative;min-height:520px;background:#1C2E10;display:flex;align-items:center;overflow:hidden">';
  if(heroImg) html += '<img src="'+heroImg+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.3">';
  html += '<div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(28,46,16,.95) 40%,rgba(28,46,16,.5))"></div>';
  html += '<div style="position:relative;z-index:2;padding:3.5rem clamp(1.5rem,5vw,5rem);max-width:700px">';
  html += '<span style="display:inline-block;background:'+G+';color:#fff;font-size:.62rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;padding:.25rem .8rem;border-radius:100px;margin-bottom:1.1rem">Programa Online</span>';
  html += '<h1 style="font-family:var(--fd);font-size:clamp(2.4rem,5.5vw,4rem);font-weight:700;color:#F0E8D8;line-height:1.05;margin:0 0 .5rem">RESET ENERGÉTICO</h1>';
  html += '<p style="font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:'+GA+';margin:0 0 1.2rem;line-height:1.5">21 días para ordenar tu biología,<br>recuperar energía y sentirte mejor</p>';
  html += '<p style="font-size:.92rem;color:rgba(240,232,216,.75);line-height:1.75;margin:0 0 2rem;max-width:520px">Dale a tu cuerpo las señales correctas para desinflamarte, recuperar claridad mental y volver a una pura versión de vos con más energía y vitalidad.</p>';
  html += '<div style="display:flex;gap:1.5rem;flex-wrap:wrap">';
  [['⚡','Más energía y vitalidad'],['🧠','Claridad mental'],['🔻','Menos inflamación'],['⚖️','Mejor composición'],['🥗','Mejor relación con la comida']].forEach(([ic,t])=>{ html += ben(ic,t); });
  html += '</div></div>';
  // Hero right panel
  html += '<div style="position:relative;z-index:2;padding:2rem clamp(1rem,3vw,3rem);display:flex;flex-direction:column;gap:1rem;margin-left:auto;min-width:240px;max-width:300px">';
  html += '<div style="background:'+G+';color:#fff;border-radius:14px;padding:1.4rem;text-align:center"><div style="font-size:.6rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:.3rem">Para vos</div><div style="font-family:var(--fd);font-size:1.15rem;font-weight:700;margin-bottom:.5rem">UN GRAN<br>PRIMER PASO</div><div style="font-size:.77rem;line-height:1.55;color:rgba(255,255,255,.8)">para ordenar tu biología y empezar tu transformación. El punto de partida que tu cuerpo necesita.</div></div>';
  html += '<div style="background:var(--cream);border:2px solid var(--gold);border-radius:14px;padding:1.2rem;text-align:center"><div style="font-size:1.4rem;margin-bottom:.35rem">🎁</div><div style="font-size:.6rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-bottom:.3rem">Bonus Exclusivo</div><div style="font-family:var(--fd);font-size:.95rem;font-weight:600;color:#1C1A18;line-height:1.3">10 sesiones de entrenamiento en BHP</div></div>';
  html += '</div></section>';
  // Tu camino
  html += '<section style="background:#fff;padding:3rem clamp(1.5rem,5vw,4rem)"><div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center">';
  html += '<div><div style="font-size:.62rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:'+G+';margin-bottom:.75rem">Tu punto de partida</div><h2 style="font-family:var(--fd);font-size:1.75rem;color:#1C1A18;margin:0 0 1rem;line-height:1.2">EL PRIMER PASO<br>DE TU TRANSFORMACIÓN</h2><p style="font-size:.88rem;color:#5A544E;line-height:1.7;margin:0 0 .75rem"><strong>Reset Energético</strong> es la puerta de entrada al cambio. En 21 días vas a ordenar tu biología, recuperar energía y aprender las bases para construir hábitos que te acompañen toda la vida.</p><p style="font-size:.87rem;color:#5A544E;line-height:1.7;margin:0"><strong>Luego, podrás profundizar tu transformación con el Método Indomables.</strong></p></div>';
  html += '<div><div style="font-size:.6rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem;text-align:center">Tu camino en Be Human</div><div style="display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;justify-content:center">';
  [{ic:'🌿',t:'Reset Energético',active:true},{ic:'🦋',t:'Método Indomables'},{ic:'🩺',t:'Consulta Personalizada'},{ic:'🏋️',t:'Be Human Performance'}].forEach((s,i,arr)=>{
    html += '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:.3rem;min-width:75px;max-width:90px;padding:.55rem .35rem;border-radius:10px;background:'+(s.active?G:'var(--cream)')+';border:1.5px solid '+(s.active?G:'var(--cream-dk)')+'"><div style="font-size:1rem">'+s.ic+'</div><div style="font-size:.58rem;font-weight:700;color:'+(s.active?'#fff':'#1C1A18')+';line-height:1.2">'+s.t+'</div></div>';
    if(i<arr.length-1) html += '<div style="color:var(--muted);font-size:.9rem;flex-shrink:0">→</div>';
  });
  html += '</div></div></div></section>';
  // Todo lo que vas a recibir
  html += '<section style="background:var(--cream);padding:3.5rem clamp(1.5rem,5vw,4rem)"><div style="max-width:1100px;margin:0 auto"><h2 style="font-family:var(--fd);font-size:1.85rem;color:#1C1A18;text-align:center;margin:0 0 2.5rem;letter-spacing:.03em">TODO LO QUE VAS A RECIBIR</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.2rem">';
  [['📅','Menú Keto Estratégico de 21 días','Dos semanas con menús completos para recuperar energía, mejorar la saciedad y reducir los antojos.'],['🌱','Semana 3: Transición a la autonomía','Aprendés a construir tus propios platos y tomar decisiones sin depender de un menú fijo.'],['🥗','Versión vegetariana completa','Con menús y guías específicas para quienes eligen hacer una alimentación vegetariana.'],['💪','Guía para calcular tu proteína','Aprendé cuánto necesitás y cómo distribuirla para mejorar energía, composición corporal y saciedad.'],['🔄','Guía de reemplazos inteligentes','Para adaptar el programa a tu vida real y mantener flexibilidad sin perder estructura.'],['📆','Calendario de seguimiento de 21 días','Una herramienta simple para acompañar el proceso y sostener hábitos.']].forEach(([ic,t,d])=>{ html += recCard(ic,t,d); });
  html += '</div></div></section>';
  // Cápsulas en video
  html += '<section style="background:#fff;padding:3.5rem clamp(1.5rem,5vw,4rem)"><div style="max-width:1100px;margin:0 auto"><h2 style="font-family:var(--fd);font-size:1.85rem;color:#1C1A18;text-align:center;margin:0 0 .4rem;letter-spacing:.03em">CÁPSULAS EN VIDEO INCLUIDAS</h2><p style="text-align:center;color:var(--muted);font-size:.8rem;margin:0 0 2rem">Videos breves, claros y fáciles de implementar.</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:.75rem">';
  [['🥦','Pilares fundamentales de la alimentación'],['🍽️','Alimentación eficiente'],['⏱️','Ayuno inteligente'],['🌙','Ritmos circadianos'],['🏃','Actividad física'],['❤️','Emociones y hábitos'],['🥑','Alimentación baja en carbohidratos'],['🫙','Cetoadaptación'],['🍳','Cómo armar un plato eficiente'],['🎥','Videorecetas saludables']].forEach(([ic,t])=>{
    html += '<div style="background:var(--cream);border-radius:12px;padding:.8rem .45rem;display:flex;flex-direction:column;align-items:center;gap:.3rem;text-align:center"><div style="font-size:1.4rem">'+ic+'</div><div style="font-size:.68rem;color:#3A3530;line-height:1.3">'+t+'</div></div>';
  });
  html += '</div></div></section>';
  // Qué puede darte
  html += '<section style="background:var(--cream);padding:3.5rem clamp(1.5rem,5vw,4rem)"><div style="max-width:1100px;margin:0 auto"><h2 style="font-family:var(--fd);font-size:1.85rem;color:#1C1A18;text-align:center;margin:0 0 2.5rem">¿QUÉ PUEDE DARTE ESTE RESET?</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:2.5rem">';
  html += '<div>';
  ['Más energía y vitalidad','Menos inflamación y retención','Mayor claridad mental','Menos hambre y ansiedad por la comida'].forEach(t=>{ html += check(t); });
  html += '</div><div>';
  ['Mejor composición corporal','Una relación más simple con la alimentación','Herramientas para toda la vida'].forEach(t=>{ html += check(t); });
  html += '<div style="background:linear-gradient(135deg,'+G+','+GA+');color:#fff;border-radius:16px;padding:1.5rem;margin-top:1.5rem"><div style="font-size:.6rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.65);margin-bottom:.35rem">Bonus Exclusivo</div><div style="font-family:var(--fd);font-size:1.1rem;margin-bottom:.5rem">10 sesiones de entrenamiento en Be Human Performance</div><div style="font-size:.8rem;line-height:1.6;color:rgba(255,255,255,.82)">Porque la salud no se construye solamente con comida. Vas a recibir 10 clases de entrenamiento para empezar a desarrollar fuerza, mejorar tu metabolismo y experimentar el movimiento como una herramienta de salud.</div></div>';
  html += '</div></div></div></section>';
  // Cierre
  html += '<section style="background:'+G+';padding:4rem clamp(1.5rem,5vw,5rem);text-align:center"><div style="max-width:720px;margin:0 auto"><p style="font-family:var(--fd);font-size:1.3rem;color:#fff;line-height:1.65;margin:0 0 1.2rem"><strong>El objetivo no es hacer una dieta durante 21 días.</strong><br>El objetivo es volver a darle a tu cuerpo las señales correctas para recuperar energía, claridad mental y desinflamarte. Ese es el primer paso para tu transformación.</p><p style="font-family:var(--fd);font-style:italic;font-size:1.35rem;color:var(--gold)">Pequeñas decisiones. Grandes cambios. 💚</p></div></section>';
  // Footer icons + CTA
  html += '<section style="background:#fff;padding:3rem clamp(1.5rem,5vw,4rem)"><div style="max-width:900px;margin:0 auto"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;margin-bottom:2.5rem;text-align:center">';
  [['📱','100% Online','Accedé desde donde estés y a tu ritmo.'],['♾️','Acceso para siempre','Volvé al contenido cada vez que lo necesites.'],['✅','Simple y práctico','Herramientas claras para aplicar en tu vida real.'],['🔬','Ciencia y humanidad','Basado en evidencia y en nuestra experiencia.']].forEach(([ic,t,d])=>{
    html += '<div><div style="font-size:1.7rem;margin-bottom:.4rem">'+ic+'</div><div style="font-weight:700;font-size:.8rem;color:#1C1A18;margin-bottom:.2rem">'+t+'</div><div style="font-size:.73rem;color:var(--muted);line-height:1.4">'+d+'</div></div>';
  });
  html += '</div><div style="text-align:center"><p style="font-family:var(--fd);font-size:1.05rem;color:#1C1A18;margin:0 0 .3rem">¿LISTO PARA DAR TU PRIMER GRAN PASO?</p>';
  if(price) html += '<p style="font-size:1.4rem;font-family:var(--fd);color:var(--gold);margin:.3rem 0 1rem">'+price+'</p>';
  html += '<button onclick="inscribirmeLanding()" style="background:'+G+';color:#fff;border:none;padding:1rem 2.5rem;border-radius:100px;font-size:.87rem;font-weight:700;cursor:pointer;font-family:var(--fb);letter-spacing:.04em">QUIERO MI RESET ENERGÉTICO ⚡</button><p style="font-size:.73rem;color:var(--muted);margin:.7rem 0 0">Acceso inmediato y para siempre</p></div></div></section>';
  content.innerHTML = html;
  if(typeof initReveal === 'function') setTimeout(initReveal, 50);
}

function renderResetMujerLanding(prog) {
  const content = document.getElementById('plContent');
  if(!content) return;
  const heroImg = prog.hero_image_url || prog.image_url || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80';
  const price = prog.price && Number(prog.price) > 1 ? fmt(prog.price) : null;
  const ROSE = '#B85070', ROSESOFT = 'rgba(184,80,112,.12)', GREEN = '#2C4A3A';
  const check = (t) => '<div style="display:flex;gap:.6rem;margin-bottom:.5rem"><span style="color:'+ROSE+';font-weight:700;flex-shrink:0">✓</span><span style="font-size:.83rem;color:#3A3530;line-height:1.45">'+t+'</span></div>';
  const videoItem = (t) => '<div style="display:flex;align-items:center;gap:.6rem;padding:.45rem 0;border-bottom:1px solid '+ROSESOFT+'"><div style="width:18px;height:18px;border-radius:50%;background:'+ROSE+';display:flex;align-items:center;justify-content:center;font-size:.45rem;color:#fff;flex-shrink:0">▶</div><span style="font-size:.82rem;color:#3A3530">'+t+'</span></div>';
  const recItem = (ic,t,d) => '<div style="display:flex;gap:.8rem;margin-bottom:1rem"><div style="width:34px;height:34px;border-radius:50%;background:'+ROSESOFT+';display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0">'+ic+'</div><div><div style="font-weight:600;font-size:.84rem;color:#1C1A18;margin-bottom:.18rem">'+t+'</div><div style="font-size:.75rem;color:var(--muted);line-height:1.4">'+d+'</div></div></div>';
  let html = '';
  // Topbar
  html += '<div style="background:#fff;border-bottom:1px solid #e8e8e8;padding:.7rem 1.5rem;display:flex;align-items:center;gap:.75rem;position:sticky;top:70px;z-index:10"><button onclick="goTo(\'programas\')" style="font-size:.8rem;color:var(--muted);background:none;border:1.5px solid var(--cream-dk);border-radius:100px;padding:.35rem .85rem;cursor:pointer;font-family:var(--fb)">&#8592; Programas</button><span style="font-size:.9rem;font-weight:600;color:#1C1A18;flex:1">Reset Mujer</span><button style="background:'+ROSE+';color:#fff;border:none;padding:.55rem 1.4rem;border-radius:100px;font-size:.76rem;font-weight:700;cursor:pointer;font-family:var(--fb)" onclick="inscribirmeLanding()">Inscribirme ahora</button></div>';
  // Hero
  html += '<section style="position:relative;min-height:560px;background:#2A1A20;display:flex;align-items:center;overflow:hidden">';
  html += '<img src="'+heroImg+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.32">';
  html += '<div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(28,14,20,.92) 40%,rgba(28,14,20,.45))"></div>';
  html += '<div style="position:relative;z-index:2;padding:3.5rem clamp(1.5rem,5vw,5rem);max-width:680px">';
  html += '<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1.4rem"><div style="font-size:1.2rem">🦋</div><div><div style="font-size:.52rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:'+ROSE+';line-height:1">Indomables</div><div style="font-size:.52rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);line-height:1.4">By Be Human</div></div></div>';
  html += '<h1 style="font-family:var(--fd);font-size:clamp(2.4rem,5.5vw,4rem);font-weight:700;color:#F0E8D8;line-height:1;margin:0 0 .5rem">RESET MUJER ♀</h1>';
  html += '<p style="font-family:var(--fd);font-size:clamp(1rem,2.4vw,1.35rem);color:rgba(240,232,216,.7);margin:0 0 1.1rem;line-height:1.4">21 días para recuperar tu <em style="color:'+ROSE+'">energía hormonal</em></p>';
  html += '<p style="font-size:.95rem;font-weight:700;color:#F0E8D8;margin:0 0 .6rem">No estás fallando. Tu cuerpo cambió y necesita nuevas estrategias.</p>';
  html += '<p style="font-size:.87rem;color:rgba(240,232,216,.68);line-height:1.72;margin:0 0 1.8rem;max-width:480px">Este programa fue diseñado para acompañarte en la transición hormonal con ciencia, alimentación real y hábitos que respetan tu fisiología.</p>';
  html += '<div style="display:flex;gap:1.1rem;flex-wrap:wrap">';
  [['⚡','Más energía y claridad mental'],['🔻','Menos inflamación y ansiedad por dulces'],['🌙','Mejor descanso y humor'],['💪','Más fuerza y masa muscular'],['💚','Volver a sentirte vos']].forEach(([ic,t])=>{
    html += '<div style="display:flex;flex-direction:column;align-items:center;gap:.32rem;text-align:center;min-width:68px"><div style="width:38px;height:38px;border-radius:50%;background:rgba(184,80,112,.25);display:flex;align-items:center;justify-content:center;font-size:1rem">'+ic+'</div><div style="font-size:.63rem;color:rgba(240,232,216,.62);max-width:78px;line-height:1.3">'+t+'</div></div>';
  });
  html += '</div></div></section>';
  // Banner
  html += '<div style="background:var(--cream-dk);padding:1.2rem clamp(1.5rem,5vw,4rem);text-align:center"><p style="font-family:var(--fd);font-size:1.1rem;color:#1C1A18;margin:0">No es una dieta. Es un primer paso para <em style="color:'+ROSE+'">recuperar tu poder.</em></p></div>';
  // 2-col: recibir + videos
  html += '<section style="background:#fff;padding:3.5rem clamp(1.5rem,5vw,4rem)"><div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:3rem">';
  html += '<div><div style="background:'+GREEN+';color:#fff;border-radius:10px;padding:.5rem 1rem;display:flex;align-items:center;gap:.5rem;margin-bottom:1.4rem"><span style="font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase">¿Qué vas a recibir?</span><span style="margin-left:auto">🌿</span></div>';
  [['📚','Guía completa Reset Mujer','Con explicación de los cambios hormonales y cómo acompañarlos con alimentación, músculo y hábitos.'],['🍽️','Menú de 21 días','Con estrategia keto flexible y low carb inteligente.'],['📅','Calendario semanal de seguimiento','Para acompañar tus hábitos diarios y observar tu evolución.'],['🌿','Guía práctica de gestión del estrés','Herramientas simples para regular el sistema nervioso y recuperar la calma.'],['💪','Estrategia de proteína y composición corporal','Aprendé cuánto necesitás y cómo distribuirla para preservar masa muscular.'],['🔄','Flexibilidad metabólica','Aprendé a usar los carbohidratos a tu favor, sin miedo y sin extremos.'],['🏋️','10 sesiones de entrenamiento BHP','Rutinas cortas, efectivas y funcionales para ganar fuerza, energía y confianza.']].forEach(([ic,t,d])=>{ html += recItem(ic,t,d); });
  html += '</div>';
  html += '<div><div style="background:'+ROSE+';color:#fff;border-radius:10px;padding:.5rem 1rem;display:flex;align-items:center;gap:.5rem;margin-bottom:1.4rem"><span style="font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Cápsulas en video incluidas</span><span style="margin-left:auto">▶</span></div>';
  ['Pilares fundamentales','Entendiendo la biología femenina','Alimentación eficiente','Ritmo circadiano','Ayuno inteligente','Actividad física','Emociones y hábitos','¿Por qué una dieta baja en carbohidratos?','Cómo armar un plato eficiente','Videorecetas saludables'].forEach(t=>{ html += videoItem(t); });
  html += '<div style="background:'+ROSESOFT+';border-radius:10px;padding:.8rem 1rem;margin-top:.85rem;display:flex;align-items:center;gap:.65rem"><span style="font-size:1.1rem">🎬</span><span style="font-size:.76rem;color:var(--muted);line-height:1.4">Videos breves, claros y fáciles de implementar.</span></div>';
  html += '</div></div></section>';
  // Este reset no busca que hagas más
  html += '<section style="background:var(--cream);padding:3.5rem clamp(1.5rem,5vw,4rem);text-align:center"><div style="max-width:960px;margin:0 auto"><h2 style="font-family:var(--fd);font-size:1.7rem;color:#1C1A18;margin:0 0 .35rem">ESTE RESET NO BUSCA QUE HAGAS MÁS</h2><p style="color:var(--muted);font-size:.82rem;margin:0 0 2rem">Busca darle a tu cuerpo las señales correctas para que pueda:</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:1rem">';
  [['🔥','Desinflamarse'],['⚡','Recuperar energía'],['🧠','Ganar claridad mental'],['🌙','Dormir mejor'],['💪','Preservar músculo'],['❤️','Mejorar tu relación con la comida']].forEach(([ic,t])=>{
    html += '<div style="background:#fff;border-radius:14px;padding:1.2rem .7rem;box-shadow:0 2px 8px rgba(0,0,0,.05)"><div style="font-size:1.7rem;margin-bottom:.45rem">'+ic+'</div><div style="font-size:.76rem;font-weight:600;color:#3A3530;line-height:1.3">'+t+'</div></div>';
  });
  html += '</div></div></section>';
  // Primer paso + ideal si hoy sentís
  html += '<section style="background:#fff;padding:3.5rem clamp(1.5rem,5vw,4rem)"><div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:3rem">';
  html += '<div style="background:'+GREEN+';border-radius:16px;padding:2rem;color:#fff"><div style="font-size:.6rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:.55rem">Tu transformación</div><h2 style="font-family:var(--fd);font-size:1.4rem;margin:0 0 1rem;line-height:1.2">EL PRIMER PASO DE TU TRANSFORMACIÓN 🦋</h2><p style="font-size:.83rem;line-height:1.65;color:rgba(255,255,255,.82);margin:0 0 .7rem"><strong>RESET MUJER</strong> es la puerta de entrada.</p><p style="font-size:.83rem;line-height:1.65;color:rgba(255,255,255,.82);margin:0 0 .7rem">En 21 días vas a empezar a ordenar tu biología, comprender tu etapa hormonal y construir hábitos sostenibles.</p><p style="font-size:.83rem;line-height:1.65;color:rgba(255,255,255,.82);margin:0 0 1.4rem">Y cuando estés lista, podrás profundizar tu transformación con el Método Indomables.</p><button onclick="inscribirmeLanding()" style="background:'+ROSE+';color:#fff;border:none;padding:.8rem 1.4rem;border-radius:100px;font-size:.76rem;font-weight:700;cursor:pointer;font-family:var(--fb)">🦋 TRANSFORMÁ TU ETAPA EN TU MEJOR VERSIÓN</button></div>';
  html += '<div><div style="background:var(--cream);border-radius:14px;padding:1.5rem"><h3 style="font-family:var(--fd);font-size:1.05rem;color:#1C1A18;margin:0 0 1rem">IDEAL SI HOY SENTÍS</h3>';
  ['Fatiga constante','Más ansiedad por dulces o harinas','Dificultad para perder grasa abdominal','Alteraciones del sueño','Sofocos y cambios de humor','Menos fuerza y energía','Que haciendo lo mismo de siempre ya no obtenés los mismos resultados'].forEach(t=>{ html += check(t); });
  html += '</div>';
  if(price) html += '<div style="text-align:center;margin-top:1rem;background:linear-gradient(135deg,'+GREEN+','+ROSE+');border-radius:14px;padding:1.4rem;color:#fff"><div style="font-family:var(--fd);font-size:1.7rem;margin-bottom:.3rem">'+price+'</div><button onclick="inscribirmeLanding()" style="background:#fff;color:'+ROSE+';border:none;padding:.65rem 1.6rem;border-radius:100px;font-size:.78rem;font-weight:700;cursor:pointer;font-family:var(--fb);margin-top:.7rem">Inscribirme ahora</button></div>';
  html += '</div></div></section>';
  // Footer quote
  html += '<section style="background:#1C1A18;padding:4rem clamp(1.5rem,5vw,5rem);text-align:center"><div style="max-width:680px;margin:0 auto"><p style="font-family:var(--fd);font-size:1.15rem;color:rgba(240,232,216,.7);margin:0 0 .4rem">No estás perdiendo tu vitalidad.</p><p style="font-family:var(--fd);font-size:1.65rem;font-style:italic;color:'+ROSE+';margin:0 0 .7rem">La menopausia no es el final. ♡</p><p style="font-size:.88rem;color:rgba(240,232,216,.55);margin:0 0 1.5rem">Es el comienzo de una nueva forma de cuidar tu cuerpo.</p><p style="font-family:var(--fd);font-size:1rem;color:rgba(240,232,216,.4)">Pequeñas decisiones. Grandes cambios.</p><div style="margin-top:.5rem;font-size:1.4rem">🦋</div></div></section>';
  content.innerHTML = html;
  if(typeof initReveal === 'function') setTimeout(initReveal, 50);
}

window.abrirLandingPrograma = abrirLandingPrograma;
window.inscribirmeLanding   = inscribirmeLanding;
window.toggleFaq            = toggleFaq;
window.loadProgramasPage    = loadProgramasPage;
window.goToResets           = goToResets;

/* ── ADMIN: EDITOR DE LANDING DE PROGRAMA ── */
async function loadLandingData() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/programs?id=eq.${currentAdmProgId}`, {headers:h});
    const progs = await r.json();
    const p = progs?.[0];
    if(!p) return;
    document.getElementById('plSubtitle').value   = p.subtitle||'';
    const plMarca = document.getElementById('plMarca');
    if(plMarca) plMarca.value = p.marca||'';
    document.getElementById('plCategory').value   = p.category||'';
    document.getElementById('plDuration').value   = p.duration||'';
    document.getElementById('plLevel').value       = p.level||'';
    document.getElementById('plImageUrl').value   = p.image_url||'';
    document.getElementById('plHeroImage').value  = p.hero_image_url||'';
    document.getElementById('plDesc').value        = p.description||'';
    document.getElementById('plDescLong').value   = p.description_long||'';
    document.getElementById('plForWho').value      = p.for_who||'';
    const benefits = Array.isArray(p.benefits) ? p.benefits : (tryParseJSON(p.benefits)||[]);
    document.getElementById('plBenefits').value   = benefits.join('\n');
    const gallery = Array.isArray(p.gallery) ? p.gallery : (tryParseJSON(p.gallery)||[]);
    document.getElementById('plGallery').value    = gallery.join('\n');
    const faqs = Array.isArray(p.faqs) ? p.faqs : (tryParseJSON(p.faqs)||[]);
    renderFaqRows(faqs);
  } catch(e) { toast('Error cargando landing: '+e.message,'err'); }
}

function renderFaqRows(faqs) {
  const wrap = document.getElementById('plFaqsWrap');
  if(!wrap) return;
  wrap.innerHTML = faqs.map((faq,i)=>
    '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:.5rem;align-items:start" id="faqRow-'+i+'">'
    +'<input type="text" class="form-input" placeholder="Pregunta" value="'+(faq.q||'').replace(/"/g,'&quot;')+'" style="font-size:.8rem">'
    +'<input type="text" class="form-input" placeholder="Respuesta" value="'+(faq.a||'').replace(/"/g,'&quot;')+'" style="font-size:.8rem">'
    +'<button onclick="this.closest(\'[id]\').remove()" style="padding:.45rem .65rem;border-radius:8px;border:1.5px solid #f0d0d0;background:#fff;color:#C4614A;cursor:pointer;font-size:.8rem">✕</button>'
    +'</div>'
  ).join('');
}

function addFaqRow() {
  const wrap = document.getElementById('plFaqsWrap');
  if(!wrap) return;
  const i = wrap.children.length;
  const div = document.createElement('div');
  div.id = 'faqRow-'+i;
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:.5rem;align-items:start';
  div.innerHTML = '<input type="text" class="form-input" placeholder="Pregunta" style="font-size:.8rem">'
    +'<input type="text" class="form-input" placeholder="Respuesta" style="font-size:.8rem">'
    +'<button onclick="this.closest(\'[id]\').remove()" style="padding:.45rem .65rem;border-radius:8px;border:1.5px solid #f0d0d0;background:#fff;color:#C4614A;cursor:pointer;font-size:.8rem">✕</button>';
  wrap.appendChild(div);
}

async function saveLandingData() {
  const benefits = document.getElementById('plBenefits').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const gallery  = document.getElementById('plGallery').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const faqRows  = document.querySelectorAll('#plFaqsWrap > div');
  const faqs     = [...faqRows].map(row=>{
    const inputs = row.querySelectorAll('input');
    return { q: inputs[0]?.value.trim()||'', a: inputs[1]?.value.trim()||'' };
  }).filter(f=>f.q);

  const data = {
    subtitle:         document.getElementById('plSubtitle').value.trim()||null,
    marca:            document.getElementById('plMarca')?.value||null,
    category:         document.getElementById('plCategory')?.value.trim()||null,
    duration:         document.getElementById('plDuration').value.trim()||null,
    level:            document.getElementById('plLevel').value.trim()||null,
    image_url:        document.getElementById('plImageUrl').value.trim()||null,
    hero_image_url:   document.getElementById('plHeroImage').value.trim()||null,
    description:      document.getElementById('plDesc').value.trim()||null,
    description_long: document.getElementById('plDescLong').value.trim()||null,
    for_who:          document.getElementById('plForWho').value.trim()||null,
    benefits, gallery, faqs,
  };

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON), 'Content-Type':'application/json' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/programs?id=eq.${currentAdmProgId}`, {
      method:'PATCH', headers:h, body:JSON.stringify(data)
    });
    if(!r.ok) throw new Error('Error al guardar');
    toast('Landing guardada ✓','ok');
    _allPrograms = [];
  } catch(e){ toast('Error: '+e.message,'err'); }
}

window.loadLandingData  = loadLandingData;
window.saveLandingData  = saveLandingData;
window.addFaqRow        = addFaqRow;
