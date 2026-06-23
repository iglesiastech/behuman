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
    if(pwEl) pwEl.textContent = `Te damos la bienvenida, ${nombre}`;
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
  const grid    = document.getElementById('portalProgGrid');
  const noProgs = document.getElementById('portalNoProgs');
  if(!grid) return;

  const token = _authToken || localStorage.getItem('bh_token');
  const h = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + token
  };

  try {
    // Traer membresías activas del usuario
    const r1 = await fetch(
      `${SUPABASE_URL}/rest/v1/memberships?user_id=eq.${portalUser.id}&status=eq.active&select=*`,
      {headers: h}
    );
    const memberships = await r1.json();

    if(!Array.isArray(memberships) || !memberships.length) {
      grid.style.display = 'none';
      if(noProgs) noProgs.style.display = '';
      return;
    }

    // Traer datos de cada programa
    const progIds = memberships.map(m => m.program_id).filter(Boolean);
    const r2 = await fetch(
      `${SUPABASE_URL}/rest/v1/programs?id=in.(${progIds.join(',')})&select=*`,
      {headers: h}
    );
    const programs = await r2.json();
    const progMap = {};
    (Array.isArray(programs) ? programs : []).forEach(p => progMap[p.id] = p);

    grid.style.display = '';
    if(noProgs) noProgs.style.display = 'none';

    grid.innerHTML = memberships.map(m => {
      const prog = progMap[m.program_id];
      if(!prog) return '';
      const pct = m.progress || 0;
      return `
        <div class="portal-prog-card" onclick="abrirPrograma('${prog.id}','${m.id}')">
          <div class="portal-prog-img" style="background:var(--dark2);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:140px">
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
    console.error('loadPortalPrograms:', e);
    if(grid) grid.innerHTML = `<div style="color:var(--muted);padding:2rem;font-size:.85rem">Error al cargar tus programas: ${e.message}</div>`;
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


/* ══ CURSO: Estado global ══ */
let cursoState = {
  progId: null,
  progName: '',
  modulos: [],
  leccionActual: null,
  completadas: new Set(),
  downloads: [],
  userId: null,
};

async function abrirPrograma(progId, membId) {
  cursoState.progId = progId;
  goTo('programa-detalle');

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };

  try {
    // Traer datos del programa
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/programs?id=eq.${progId}&limit=1`, {headers:h});
    const progs = await r1.json();
    const prog = Array.isArray(progs) ? progs[0] : null;
    if(prog) {
      cursoState.progName = prog.name;
      document.getElementById('cursoTopTitle').textContent = prog.name;
    }
    renderCursoWelcome(prog);

    // Traer módulos
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/program_modules?program_id=eq.${progId}&order=sort_order`, {headers:h});
    cursoState.modulos = await r2.json() || [];

    // Para cada módulo, traer lecciones
    for(let mod of cursoState.modulos) {
      const r3 = await fetch(`${SUPABASE_URL}/rest/v1/program_lessons?module_id=eq.${mod.id}&order=sort_order`, {headers:h});
      mod.lecciones = await r3.json() || [];
    }

    // Traer usuario actual
    const { data: { user } } = await getSB().auth.getUser();
    cursoState.userId = user?.id;

    // Traer progreso
    if(cursoState.userId) {
      const r4 = await fetch(`${SUPABASE_URL}/rest/v1/lesson_progress?user_id=eq.${cursoState.userId}&completed=eq.true&select=lesson_id`, {headers:h});
      const prog2 = await r4.json();
      cursoState.completadas = new Set(Array.isArray(prog2) ? prog2.map(p=>p.lesson_id) : []);
    }

    // Traer descargables del programa
    const r5 = await fetch(`${SUPABASE_URL}/rest/v1/program_files?program_id=eq.${progId}&order=sort_order`, {headers:h});
    cursoState.downloads = await r5.json() || [];

    renderModulosGrid();
    renderSidebar();
    updateCursoProgress();

  } catch(e) {
    document.getElementById('modulosGrid').innerHTML = `<div style="grid-column:1/-1;padding:2rem;color:var(--muted)">Error al cargar el programa: ${e.message}</div>`;
  }
}

function updateCursoProgress() {
  const total = cursoState.modulos.reduce((s,m)=>s+(m.lecciones?.length||0), 0);
  const done  = cursoState.completadas.size;
  const pct   = total > 0 ? Math.round(done/total*100) : 0;
  const el1 = document.getElementById('cursoProgPct');
  const el2 = document.getElementById('sidebarPct');
  const el3 = document.getElementById('cursoTopProg');
  if(el1) el1.textContent = `${pct}% completado`;
  if(el2) el2.textContent = `${pct}%`;
  if(el3) el3.textContent = `${done}/${total} lecciones`;
}

/* ── Banner de bienvenida (solo Método Indomables) ── */
function renderCursoWelcome(prog) {
  const box = document.getElementById('cursoWelcomeBanner');
  if(!box) return;
  const name = (prog && prog.name) || '';
  if(!(/indomables/i.test(name) && /despierta/i.test(name))) { box.innerHTML = ''; return; }

  const heroImg = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1100&q=80';
  const bf = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M12 7c-1-2.5-3.5-4-6-3.5C3.5 4 2.5 6.5 3.5 9c.8 2 3 3 5 3 1.5 0 3-.8 3.5-2.2"/><path d="M12 7c1-2.5 3.5-4 6-3.5C20.5 4 21.5 6.5 20.5 9c-.8 2-3 3-5 3-1.5 0-3-.8-3.5-2.2"/><path d="M12 12c-1 2-3 3.2-4.8 3-1.6-.2-2.6-1.8-2-3.3"/><path d="M12 12c1 2 3 3.2 4.8 3 1.6-.2 2.6-1.8 2-3.3"/></svg>';

  const pasos = [
    {ic:'📖', t:'Guía de inicio', d:'Prepará tu mente y tu propósito.'},
    {ic:'🌿', t:'Estaciones del método', d:'Recorré las 12 estaciones a tu ritmo.'},
    {ic:'🏋️', t:'Bonus Be Human Performance', d:'10 sesiones para empezar a implementar el movimiento.'},
    {ic:'🎯', t:'Implementar', d:'Tomá acción, creá hábitos y aplicá lo aprendido.'},
    {ic:'⛰️', t:'Construir una nueva identidad', d:'Sostené tu transformación y viví en coherencia.'},
  ];

  let stepsHtml = '';
  pasos.forEach((p,i)=>{
    stepsHtml += '<div class="iw-step">'
      +'<div class="iw-step-ic">'+p.ic+'<span class="iw-step-num">'+(i+1)+'</span></div>'
      +'<div class="iw-step-t">'+p.t+'</div>'
      +'<div class="iw-step-d">'+p.d+'</div>'
    +'</div>';
    if(i < pasos.length-1) stepsHtml += '<div class="iw-step-arrow">→</div>';
  });

  box.innerHTML =
    '<div class="iw">'
      +'<div class="iw-head">'
        +'<div class="iw-logo"><div class="iw-logo-name">Be Human</div><div class="iw-logo-tag">Entre la ciencia y el alma</div></div>'
        +'<div class="iw-brand"><div class="iw-brand-bf">'+bf+'</div><div><div class="iw-brand-name">Indomables</div><div class="iw-brand-tag">El método</div></div></div>'
      +'</div>'
      +'<div class="iw-hero">'
        +'<div class="iw-hero-img" style="background-image:url('+heroImg+')"></div>'
        +'<div class="iw-hero-body">'
          +'<div class="iw-hero-text">'
            +'<div class="iw-eyebrow">Bienvenido al</div>'
            +'<h2 class="iw-title">Método Indomables</h2>'
            +'<p class="iw-tagline">El método para liberar una biología secuestrada.</p>'
            +'<p>Vivimos en un entorno que envía señales equivocadas a nuestro cerebro: ultraprocesados, estrés, sedentarismo, exceso de pantallas, mal descanso y sobreestimulación constante.</p>'
            +'<p>El resultado no es falta de voluntad. <strong>Es una biología que aprendió a sobrevivir.</strong></p>'
            +'<p>En este método no vas a aprender una dieta. Vas a aprender a darle señales correctas a tu cuerpo para que vuelva a trabajar a tu favor.</p>'
            +'<p>No buscamos que comas menos. <strong>Buscamos que tu cerebro vuelva a regular naturalmente el hambre, la energía y el metabolismo.</strong></p>'
            +'<p class="iw-empieza">Tu transformación empieza hoy.</p>'
          +'</div>'
          +'<div class="iw-quote">'
            +'<div class="iw-quote-mark">&ldquo;</div>'
            +'<p class="iw-quote-1">El cerebro siempre responde.</p>'
            +'<div class="iw-quote-div"></div>'
            +'<p class="iw-quote-2">La pregunta es: ¿qué señales le estás dando todos los días?</p>'
            +'<div class="iw-quote-bf">'+bf+'</div>'
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div class="iw-recorrido">'
        +'<div class="iw-recorrido-title"><div class="iw-recorrido-bf">'+bf+'</div> Tu recorrido</div>'
        +'<div class="iw-steps">'+stepsHtml+'</div>'
      +'</div>'
    +'</div>';
}

function renderModulosGrid() {
  const grid = document.getElementById('modulosGrid');
  if(!grid) return;

  if(!cursoState.modulos.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--muted)">Este programa no tiene contenido aún.</div>';
    return;
  }

  // Actualizar progreso total
  const totalLecs = cursoState.modulos.reduce((s,m)=>s+(m.lecciones?.length||0),0);
  const doneLecs  = cursoState.modulos.reduce((s,m)=>s+(m.lecciones||[]).filter(l=>cursoState.completadas.has(l.id)).length,0);
  const pctTotal  = totalLecs > 0 ? Math.round(doneLecs/totalLecs*100) : 0;
  const pctEl = document.getElementById('cursoProgPct');
  if(pctEl) pctEl.textContent = pctTotal + '% completado · ' + doneLecs + ' de ' + totalLecs + ' lecciones';

  grid.innerHTML = cursoState.modulos.map((mod, idx) => {
    const total = mod.lecciones?.length || 0;
    const done  = (mod.lecciones||[]).filter(l=>cursoState.completadas.has(l.id)).length;
    const pct   = total > 0 ? Math.round(done/total*100) : 0;
    const isCompleted = pct === 100;

    return `
      <div class="modulo-card" onclick="abrirModulo('${mod.id}')">
        <div class="modulo-card-img" style="${mod.cover_url ? 'background-image:url('+mod.cover_url+');background-size:cover;background-position:center' : 'background:linear-gradient(135deg,#1C1A18,#2D2A27)'}">
          <div class="modulo-card-img-overlay"></div>
          <div class="modulo-card-img-label">${mod.title}</div>
          ${isCompleted ? '<div style="position:absolute;top:.65rem;right:.65rem;background:rgba(74,155,111,.9);color:#fff;font-size:.65rem;font-weight:700;padding:.2rem .55rem;border-radius:100px;letter-spacing:.05em">COMPLETADO</div>' : ''}
        </div>
        <div class="modulo-card-body">
          <div class="modulo-card-meta">
            <span>${total} lección${total!==1?'es':''}</span>
            <span style="font-weight:600;color:${isCompleted?'#4A9B6F':pct>0?'var(--teal)':'var(--muted)'}">${pct}%</span>
          </div>
          <div class="modulo-card-bar"><div class="modulo-card-bar-fill" style="width:${pct}%;background:${isCompleted?'#4A9B6F':'var(--teal)'}"></div></div>
          ${mod.description ? '<div style="font-size:.74rem;color:var(--muted);margin-top:.4rem;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">'+mod.description+'</div>' : ''}
        </div>
      </div>`;
  }).join('');
}

function filterCursoModules() {
  const q = document.getElementById('cursoSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.modulo-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function getYTThumb(url) {
  if(!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?\s]+)/);
  return m ? 'https://img.youtube.com/vi/'+m[1]+'/mqdefault.jpg' : null;
}
function fmtDur(sec) {
  if(!sec) return '';
  const m = Math.floor(sec/60), s = sec%60;
  return m+':'+(s<10?'0':'')+s;
}
function renderSidebar() {
  const container = document.getElementById('sidebarModulos');
  if(!container) return;
  container.innerHTML = cursoState.modulos.map((mod, idx) => {
    const total  = mod.lecciones?.length || 0;
    const done   = (mod.lecciones||[]).filter(l=>cursoState.completadas.has(l.id)).length;
    const pct    = total > 0 ? Math.round(done/total*100) : 0;
    const isOpen = cursoState.leccionActual && mod.lecciones?.some(l=>l.id===cursoState.leccionActual?.id);
    const leccionesHtml = (mod.lecciones||[]).map(l => {
      const isDone   = cursoState.completadas.has(l.id);
      const isActive = cursoState.leccionActual?.id === l.id;
      const thumb    = l.thumbnail_url || getYTThumb(l.video_url);
      const dur      = fmtDur(l.duration_sec);
      const thumbHtml = thumb
        ? '<img src="'+thumb+'" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0"><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25)"><div style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;font-size:.55rem;color:#1C1A18">▶</div></div>'+(dur?'<div style="position:absolute;bottom:2px;right:3px;background:rgba(0,0,0,.75);color:#fff;font-size:.6rem;padding:1px 3px;border-radius:3px">'+dur+'</div>':'')
        : '<div class="sidebar-leccion-thumb-play">▶</div>';
      return '<div class="sidebar-leccion'+(isActive?' active':'')+'" onclick="abrirLeccion(\''+mod.id+'\',\''+l.id+'\')">'
        +'<div class="sidebar-leccion-thumb">'+thumbHtml+'</div>'
        +'<div class="sidebar-leccion-info"><div class="sidebar-leccion-title">'+l.title+'</div></div>'
        +'<div class="sidebar-leccion-check'+(isDone?' done':isActive?' active-icon':'')+'">'+( isDone?'✓':'')+'</div>'
        +'</div>';
    }).join('');
    return '<div class="sidebar-modulo">'
      +'<div class="sidebar-modulo-header" onclick="toggleSidebarModulo(\'mod-'+mod.id+'\')">'
      +'<div class="sidebar-modulo-num">'+( idx+1)+'</div>'
      +'<div style="flex:1"><div class="sidebar-modulo-name">'+mod.title+'</div>'+(pct>0?'<div style="font-size:.68rem;color:var(--muted);margin-top:.1rem">'+pct+'%</div>':'')+'</div>'
      +'<div style="font-size:.7rem;color:var(--muted)" id="chevron-'+mod.id+'">'+(isOpen?'∧':'∨')+'</div>'
      +'</div>'
      +'<div class="sidebar-modulo-bar"><div class="sidebar-modulo-bar-fill" style="width:'+pct+'%"></div></div>'
      +'<div class="sidebar-lecciones'+(isOpen?' open':'')+'" id="mod-'+mod.id+'">'+leccionesHtml+'</div>'
      +'</div>';
  }).join('');
}
function toggleSidebarModulo(id) {
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.toggle('open');
  const modId = id.replace('mod-','');
  const ch = document.getElementById('chevron-'+modId);
  if(ch) ch.textContent = el.classList.contains('open') ? '∧' : '∨';
}


function filterSidebar() {
  const q = document.getElementById('sidebarSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('.sidebar-leccion').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
  // Abrir todos los módulos cuando busca
  if(q) document.querySelectorAll('.sidebar-lecciones').forEach(el=>el.classList.add('open'));
}

function abrirModulo(modId) {
  const mod = cursoState.modulos.find(m=>m.id===modId);
  if(!mod) return;
  // Mostrar landing del módulo
  mostrarLandingModulo(mod);
}

function mostrarLandingModulo(mod) {
  cursoState.moduloActual = mod;
  document.getElementById('cursoModulosView').style.display   = 'none';
  document.getElementById('cursoPlayerView').style.display    = 'none';
  document.getElementById('cursoModuloLanding').style.cssText = 'display:grid;grid-template-columns:1fr 340px;height:calc(100vh - 115px);overflow:hidden';
  // En landing: ocultar sidebar global (la landing tiene su propio layout)
  const gs = document.getElementById('cursoSidebar');
  if(gs) gs.style.display = 'none';
  const wrap = document.querySelector('.curso-wrap');
  if(wrap) wrap.style.gridTemplateColumns = '1fr';
  const tbL = document.getElementById('cursoTopbarEl');
  if(tbL) { tbL.style.display = ''; document.getElementById('cursoBackBtn').textContent = '← Módulos'; }
  document.getElementById('cursoMain')?.scrollTo({top:0, behavior:'smooth'});

  const total = mod.lecciones?.length || 0;
  const done  = (mod.lecciones||[]).filter(l=>cursoState.completadas.has(l.id)).length;
  const pct   = total > 0 ? Math.round(done/total*100) : 0;

  // Header
  const metaEl  = document.getElementById('landingModuloMeta');
  const titleEl = document.getElementById('landingModuloTitle');
  const sideEl  = document.getElementById('landingModuloTitleSide');
  const pctEl   = document.getElementById('landingModuloPct');
  const pctSEl  = document.getElementById('landingModuloPctSide');
  const barEl   = document.getElementById('landingModuloBar');
  const descEl  = document.getElementById('landingModuloDesc');

  if(metaEl)  metaEl.textContent  = total + ' lección' + (total!==1?'es':'');
  if(titleEl) titleEl.textContent = mod.title;
  if(sideEl)  sideEl.textContent  = mod.title;
  if(pctEl)   pctEl.textContent   = pct + '%';
  if(pctSEl)  pctSEl.textContent  = pct + '%';
  if(barEl)   barEl.style.width   = pct + '%';
  if(descEl)  { descEl.innerHTML = (mod.description||'').replace(/\n/g,'<br>'); descEl.style.display = mod.description ? '' : 'none'; }

  // Botón empezar/continuar
  const btnEmpezar = document.getElementById('landingBtnEmpezar');
  if(btnEmpezar) {
    const primera = (mod.lecciones||[]).find(l=>!cursoState.completadas.has(l.id)) || mod.lecciones?.[0];
    if(primera) {
      btnEmpezar.textContent = done > 0 ? 'Continuar' : 'Empezar';
      btnEmpezar.onclick = () => abrirLeccion(mod.id, primera.id);
    }
  }

  // Preview del primer video en el player de la landing
  const landingPlayer = document.getElementById('landingPlayer');
  const primeraLec = mod.lecciones?.[0];
  if(landingPlayer && primeraLec?.video_url) {
    let eu = primeraLec.video_url;
    eu = extractVideoSrc(primeraLec.video_url) || eu;
    const yt = eu.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
    const vi = parseVimeoId(eu);
    if(yt) eu = 'https://www.youtube.com/embed/'+yt[1]+'?rel=0&modestbranding=1';
    else if(vi) eu = 'https://player.vimeo.com/video/'+vi[0]+(vi[1]?'?h='+vi[1]:'');
    landingPlayer.innerHTML = '<iframe src="'+eu+'" allowfullscreen allow="autoplay; fullscreen" style="width:100%;height:100%;border:none"></iframe>';
  } else if(landingPlayer) {
    const thumb = primeraLec ? (primeraLec.thumbnail_url || getYTThumb(primeraLec.video_url)) : null;
    if(thumb) {
      landingPlayer.innerHTML = '<div style="width:100%;height:100%;background:url('+thumb+') center/cover;position:relative;display:flex;align-items:center;justify-content:center"><div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;font-size:1.5rem;cursor:pointer" onclick="landingBtnEmpezar.click()">▶</div></div>';
    } else {
      landingPlayer.innerHTML = '<div class="curso-player-placeholder"><div style="font-size:2.5rem;margin-bottom:.5rem">📚</div><div>'+mod.title+'</div></div>';
    }
  }

  // Archivos descargables del módulo
  const modFiles = (cursoState.downloads||[]).filter(d=>!d.lesson_id);
  const dlSection = document.getElementById('landingDownloadsSection');
  const dlList    = document.getElementById('landingDownloadsList');
  if(dlSection && dlList) {
    if(modFiles.length) {
      dlSection.style.display = '';
      const icons = {pdf:'📄',doc:'📝',xls:'📊',zip:'📦',img:'🖼️',otro:'📎'};
      dlList.innerHTML = modFiles.map(d =>
        '<a href="'+d.file_url+'" target="_blank" download class="download-item">'
        +'<div class="download-icon" style="background:rgba(58,125,140,.08)">'+(icons[d.file_type]||'📎')+'</div>'
        +'<div><div class="download-name">'+d.title+'</div><div class="download-type">'+(d.file_type?.toUpperCase()||'Archivo')+'</div></div>'
        +'<div style="margin-left:auto;font-size:.8rem;color:var(--teal);font-weight:500">⬇ Descargar</div>'
        +'</a>'
      ).join('');
    } else { dlSection.style.display = 'none'; }
  }

  // Sidebar: lista de lecciones con mismo estilo que el player
  const lista = document.getElementById('landingLeccionesList');
  if(lista) {
    if(!mod.lecciones?.length) {
      lista.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted);font-size:.84rem">Sin lecciones aún.</div>';
    } else {
      lista.innerHTML = mod.lecciones.map(l => {
        const isDone   = cursoState.completadas.has(l.id);
        const thumb    = l.thumbnail_url || getYTThumb(l.video_url);
        const dur      = fmtDur(l.duration_sec);
        const thumbHtml = thumb
          ? '<img src="'+thumb+'" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0">'
            +'<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25)">'
            +'<div style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;font-size:.55rem;color:#1C1A18">▶</div></div>'
            +(dur?'<div style="position:absolute;bottom:2px;right:3px;background:rgba(0,0,0,.75);color:#fff;font-size:.6rem;padding:1px 3px;border-radius:3px">'+dur+'</div>':'')
          : '<div class="sidebar-leccion-thumb-play">▶</div>';
        return '<div class="sidebar-leccion" onclick="abrirLeccion(\''+mod.id+'\',\''+l.id+'\')">'
          +'<div class="sidebar-leccion-thumb">'+thumbHtml+'</div>'
          +'<div class="sidebar-leccion-info"><div class="sidebar-leccion-title">'+l.title+'</div></div>'
          +'<div class="sidebar-leccion-check'+(isDone?' done':'')+'">'+( isDone?'✓':'')+'</div>'
          +'</div>';
      }).join('');
    }
  }

  // Back button
  const backBtn = document.getElementById('cursoBackBtn');
  if(backBtn) backBtn.textContent = '← Módulos';

  renderSidebar();
  const sidebarMod = document.getElementById('mod-'+mod.id);
  if(sidebarMod) sidebarMod.classList.add('open');
}

function filterLandingSearch() {
  const q = document.getElementById('landingSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('#landingLeccionesList .sidebar-leccion').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function abrirLeccion(modId, leccionId) {
  const mod = cursoState.modulos.find(m=>m.id===modId);
  const leccion = mod?.lecciones?.find(l=>l.id===leccionId);
  if(!leccion) return;

  cursoState.leccionActual = leccion;

  // Cambiar vista
  document.getElementById('cursoModulosView').style.display   = 'none';
  document.getElementById('cursoModuloLanding').style.display = 'none';
  document.getElementById('cursoPlayerView').style.display    = '';
  // En player: mostrar sidebar con lecciones del módulo, 2 columnas
  const gs = document.getElementById('cursoSidebar');
  if(gs) gs.style.display = '';
  const wrap = document.querySelector('.curso-wrap');
  if(wrap) wrap.style.gridTemplateColumns = '1fr 340px';
  const tb = document.getElementById('cursoTopbarEl');
  if(tb) tb.style.display = '';

  // Actualizar botón volver
  const backBtn = document.getElementById('cursoBackBtn');
  if(backBtn) backBtn.textContent = '← ' + mod.title;

  // Nombre del módulo
  const badgeEl = document.getElementById('leccionModuloBadge');
  if(badgeEl) badgeEl.textContent = mod.title;

  // Título de la lección
  const titleEl = document.getElementById('leccionTitulo');
  if(titleEl) titleEl.textContent = leccion.title;

  // Player (con detección de fin de video para auto-completar la lección)
  setupLessonVideo(leccion);

  // Descripción
  const descWrap = document.getElementById('leccionDescWrap');
  const descEl   = document.getElementById('leccionDesc');
  if(leccion.description) {
    if(descWrap) descWrap.style.display = '';
    if(descEl) descEl.innerHTML = leccion.description.replace(/\n/g,'<br>');
  } else {
    if(descWrap) descWrap.style.display = 'none';
  }

  // Descargables
  renderLeccionDownloads();

  // Navegación entre lecciones + ocultar el cartel de "siguiente"
  updateLeccionNav();
  const _nc = document.getElementById('leccionNextCard'); if(_nc) _nc.style.display = 'none';

  // Botón concluir
  const isDone = cursoState.completadas.has(leccionId);
  const btnC = document.getElementById('btnConcluir');
  const btnCI = document.getElementById('btnConcluirIcon');
  const btnCT = document.getElementById('btnConcluirTxt');
  if(btnC) btnC.className = 'btn-concluir' + (isDone?' done':'');
  if(btnCI) btnCI.textContent = isDone ? '✓' : '○';
  if(btnCT) btnCT.textContent = isDone ? 'Completada' : 'Concluir';

  // Actualizar sidebar
  renderSidebar();

  // Abrir el módulo en el sidebar
  const sidebarMod = document.getElementById('mod-'+modId);
  if(sidebarMod) sidebarMod.classList.add('open');

  // Scroll al top
  document.getElementById('cursoMain')?.scrollTo({top:0, behavior:'smooth'});
}

function renderLeccionDownloads() {
  const wrap = document.getElementById('leccionDownloads');
  const list = document.getElementById('leccionDownloadsList');
  if(!wrap || !list) return;
  const lid = cursoState.leccionActual?.id;
  const files = (cursoState.downloads||[]).filter(d => d.lesson_id === lid);
  if(!files.length) { wrap.style.display='none'; return; }
  wrap.style.display = '';
  const icons = {pdf:'📄',doc:'📝',xls:'📊',zip:'📦',mp3:'🎧',default:'📎'};
  list.innerHTML = files.map(d => {
    const icon = icons[d.file_type?.toLowerCase()] || icons.default;
    return `<a href="${d.file_url}" target="_blank" download class="download-item">
      <div class="download-icon" style="background:rgba(58,125,140,.1)">${icon}</div>
      <div>
        <div class="download-name">${d.title}</div>
        <div class="download-type">${d.description||d.file_type||'Archivo'}</div>
      </div>
      <div style="margin-left:auto;font-size:.75rem;color:var(--teal)">⬇ Descargar</div>
    </a>`;
  }).join('');
}

function updateConcluirBtn(done){
  const btnC=document.getElementById('btnConcluir'), btnCI=document.getElementById('btnConcluirIcon'), btnCT=document.getElementById('btnConcluirTxt');
  if(btnC) btnC.className = 'btn-concluir' + (done?' done':'');
  if(btnCI) btnCI.textContent = done ? '✓' : '○';
  if(btnCT) btnCT.textContent = done ? 'Completada' : 'Concluir';
}

async function marcarCompletada(leccionId, done){
  if(!leccionId || !cursoState.userId) return;
  const h = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON),
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal'
  };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/lesson_progress`, {
      method:'POST', headers:h,
      body: JSON.stringify({ user_id: cursoState.userId, lesson_id: leccionId, completed: done, updated_at: new Date().toISOString() })
    });
    if(done) cursoState.completadas.add(leccionId); else cursoState.completadas.delete(leccionId);
    if(cursoState.leccionActual?.id === leccionId) updateConcluirBtn(done);
    renderSidebar();
    updateCursoProgress();
  } catch(e){ console.warn('marcarCompletada:', e.message); }
}

async function concluirLeccion() {
  const leccionId = cursoState.leccionActual?.id;
  if(!leccionId || !cursoState.userId) { toast('Necesitás iniciar sesión para guardar el progreso','err'); return; }
  const ya = cursoState.completadas.has(leccionId);
  await marcarCompletada(leccionId, !ya);
  if(!ya){ toast('¡Lección completada! ✓','ok'); showNextLessonCard(); }
}

// ── Navegación entre lecciones (anterior / siguiente / cartel final) ──
function _flatLessons(){
  const arr=[];
  (cursoState.modulos||[]).forEach(m => (m.lecciones||[]).forEach(l => arr.push({ modId:m.id, lessonId:l.id, title:l.title })));
  return arr;
}
function _adjacentLessons(){
  const flat=_flatLessons();
  const i=flat.findIndex(x => x.lessonId === cursoState.leccionActual?.id);
  return { prev: i>0 ? flat[i-1] : null, next: (i>=0 && i<flat.length-1) ? flat[i+1] : null };
}
function updateLeccionNav(){
  const {prev,next}=_adjacentLessons();
  const pb=document.getElementById('leccionPrevBtn');
  const nb=document.getElementById('leccionNextBtn');
  if(pb) pb.style.visibility = prev ? 'visible' : 'hidden';
  if(nb) nb.style.visibility = next ? 'visible' : 'hidden';
}
function lncGoNext(){ const {next}=_adjacentLessons(); if(next) abrirLeccion(next.modId, next.lessonId); }
function lncGoPrev(){ const {prev}=_adjacentLessons(); if(prev) abrirLeccion(prev.modId, prev.lessonId); }
function lncReplay(){
  const nc=document.getElementById('leccionNextCard'); if(nc) nc.style.display='none';
  try {
    if(_ytPlayer && _ytPlayer.seekTo){ _ytPlayer.seekTo(0); _ytPlayer.playVideo(); }
    else if(_vimeoPlayer){ _vimeoPlayer.setCurrentTime(0).then(()=>_vimeoPlayer.play()).catch(()=>{}); }
  } catch(e){}
}
function showNextLessonCard(){
  const nc=document.getElementById('leccionNextCard'); if(!nc) return;
  const {next}=_adjacentLessons();
  const titleEl=document.getElementById('lncNextTitle');
  const labelEl=document.getElementById('lncNextLabel');
  const btn=document.getElementById('lncBtn');
  if(next){
    if(titleEl) titleEl.textContent = next.title;
    if(labelEl) labelEl.style.display='';
    if(btn){ btn.style.display=''; btn.textContent='Ir a la siguiente →'; }
  } else {
    if(titleEl) titleEl.textContent = '¡Completaste todas las lecciones! 🎉';
    if(labelEl) labelEl.style.display='none';
    if(btn) btn.style.display='none';
  }
  nc.style.display='';
}
function onLessonVideoEnded(){
  const id=cursoState.leccionActual?.id;
  if(id && cursoState.userId && !cursoState.completadas.has(id)) marcarCompletada(id, true);
  showNextLessonCard();
}

// ── Reproductor con detección de fin de video (YouTube / Vimeo) ──
let _ytPlayer=null, _vimeoPlayer=null, _ytApiLoading=false, _ytApiCbs=[], _vimeoApiLoading=false, _vimeoApiCbs=[];
// Si el input es un código <iframe>, extrae el src. Si no, lo devuelve como está.
function extractVideoSrc(input) {
  if(!input) return null;
  const t = input.trim();
  if(t.includes('<iframe')) {
    const m = t.match(/src=["']([^"']+)["']/);
    return m ? m[1] : null;
  }
  return t;
}
// Extrae [videoId, hash|null] de cualquier URL de Vimeo, incluidas URLs del panel de admin
function parseVimeoId(url) {
  if(!url) return null;
  // URL del panel: vimeo.com/manage/...?video=123456
  const mgr = url.match(/[?&]video=(\d+)/);
  if(mgr) return [mgr[1], null];
  // URL normal: vimeo.com/123456 o vimeo.com/123456/hash o player.vimeo.com/video/123456
  const std = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
  if(std) return [std[1], std[2]||null];
  return null;
}
function ensureYTApi(cb){
  if(window.YT && window.YT.Player){ cb(); return; }
  _ytApiCbs.push(cb);
  if(_ytApiLoading) return;
  _ytApiLoading=true;
  const prev=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=function(){ if(typeof prev==='function')prev(); _ytApiCbs.forEach(f=>f()); _ytApiCbs=[]; };
  const s=document.createElement('script'); s.src='https://www.youtube.com/iframe_api'; document.head.appendChild(s);
}
function ensureVimeoApi(cb){
  if(window.Vimeo && window.Vimeo.Player){ cb(); return; }
  _vimeoApiCbs.push(cb);
  if(_vimeoApiLoading) return;
  _vimeoApiLoading=true;
  const s=document.createElement('script'); s.src='https://player.vimeo.com/api/player.js';
  s.onload=function(){ _vimeoApiCbs.forEach(f=>f()); _vimeoApiCbs=[]; };
  document.head.appendChild(s);
}
function setupLessonVideo(leccion){
  const player=document.getElementById('cursoPlayer');
  if(!player) return;
  try { if(_ytPlayer && _ytPlayer.destroy) _ytPlayer.destroy(); } catch(e){}
  try { if(_vimeoPlayer && _vimeoPlayer.unload) _vimeoPlayer.unload(); } catch(e){}
  _ytPlayer=null; _vimeoPlayer=null;
  const url=extractVideoSrc(leccion.video_url);
  if(!url){ player.innerHTML='<div class="curso-player-placeholder"><div style="font-size:2rem;margin-bottom:.5rem">📄</div><div>'+(leccion.title||'')+'</div></div>'; return; }
  const yt=url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  const vim=parseVimeoId(url);
  if(yt){
    player.innerHTML='<iframe id="cursoVideoIframe" src="https://www.youtube.com/embed/'+yt[1]+'?rel=0&modestbranding=1&enablejsapi=1" allowfullscreen allow="autoplay; fullscreen"></iframe>';
    ensureYTApi(function(){ try { _ytPlayer=new YT.Player('cursoVideoIframe', { events:{ onStateChange:function(e){ if(e.data===YT.PlayerState.ENDED) onLessonVideoEnded(); } } }); } catch(err){} });
  } else if(vim){
    player.innerHTML='<iframe id="cursoVideoIframe" src="https://player.vimeo.com/video/'+vim[0]+(vim[1]?'?h='+vim[1]:'')+'" allowfullscreen allow="autoplay; fullscreen"></iframe>';
    ensureVimeoApi(function(){ try { _vimeoPlayer=new Vimeo.Player('cursoVideoIframe'); _vimeoPlayer.on('ended', onLessonVideoEnded); } catch(err){} });
  } else {
    player.innerHTML='<iframe src="'+url+'" allowfullscreen allow="autoplay; fullscreen"></iframe>';
  }
}

function irSiguienteLeccion() {
  const id = cursoState.leccionActual?.id;
  for(let mod of cursoState.modulos) {
    const idx = mod.lecciones?.findIndex(l=>l.id===id);
    if(idx >= 0) {
      const sig = mod.lecciones[idx+1];
      if(sig) { setTimeout(()=>abrirLeccion(mod.id, sig.id), 600); return; }
      // Buscar en el siguiente módulo
      const modIdx = cursoState.modulos.indexOf(mod);
      const nextMod = cursoState.modulos[modIdx+1];
      if(nextMod?.lecciones?.length) { setTimeout(()=>abrirLeccion(nextMod.id, nextMod.lecciones[0].id), 600); }
      return;
    }
  }
}

function volverAModulos() {
  document.getElementById('cursoModulosView').style.display   = '';
  document.getElementById('cursoPlayerView').style.display    = 'none';
  document.getElementById('cursoModuloLanding').style.display = 'none';
  // En módulos: ocultar sidebar, usar ancho completo
  const gs = document.getElementById('cursoSidebar');
  if(gs) gs.style.display = 'none';
  const wrap = document.querySelector('.curso-wrap');
  if(wrap) wrap.style.gridTemplateColumns = '1fr';
  const tb = document.getElementById('cursoTopbarEl');
  if(tb) tb.style.display = 'none';
  renderModulosGrid();
}

function volverALanding() {
  const mod = cursoState.moduloActual;
  if(!mod) { volverAModulos(); return; }
  document.getElementById('cursoModulosView').style.display   = 'none';
  document.getElementById('cursoPlayerView').style.display    = 'none';
  document.getElementById('cursoModuloLanding').style.cssText = 'display:grid;grid-template-columns:1fr 340px;height:calc(100vh - 115px);overflow:hidden';
  mostrarLandingModulo(mod);
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
  if(qb) qb.style.display = isAdmin ? 'flex' : 'none';
  const fab = document.getElementById('adminFab');
  if(fab) fab.style.display = isAdmin ? 'flex' : 'none';

  // Bloquear acceso al admin si no es admin
  if(!isAdmin && document.getElementById('page-admin')?.classList.contains('active')) {
    goTo('home');
  }
}

let _userRol = 'user'; // 'super_admin' | 'medica' | 'user'

async function checkSession() {
  const token = localStorage.getItem('bh_token');
  if(!token) { updateNavUI(null); return; }
  _authToken = token;

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+token };
  try {
    const rUser = await fetch(SUPABASE_URL+'/auth/v1/user', {headers:{...h,'Authorization':'Bearer '+token}});
    if(!rUser.ok) { localStorage.removeItem('bh_token'); updateNavUI(null); return; }
    const user = await rUser.json();

    const rProf = await fetch(SUPABASE_URL+'/rest/v1/profiles?id=eq.'+user.id+'&select=rol,full_name,email&limit=1', {headers:h});
    const prof = await rProf.json();
    const profile = Array.isArray(prof) ? prof[0] : null;

    _userRol = profile?.rol || 'user';
    const nombre = (profile?.full_name||'').split(' ')[0] || profile?.email?.split('@')[0] || 'Admin';
    const admName = document.getElementById('admName');
    if(admName) admName.textContent = nombre;

    if(_userRol === 'super_admin' || _userRol === 'medica') {
      updateNavUI('admin');
      const nombre = (profile?.full_name||'').split(' ')[0] || 'Admin';
      const navBtn = document.getElementById('navBtnAdmin');
      if(navBtn) navBtn.innerHTML = '⚙️ Hola, '+nombre;
    } else {
      updateNavUI('user');
    }

    // Si está en el admin, aplicar restricciones de rol
    if(document.getElementById('page-admin')?.classList.contains('active')) {
      applyAdminRol();
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

// Ejecutar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  try {
    const hamburger = document.getElementById('hamburger');
    const mobClose  = document.getElementById('mobClose');
    const cartOv    = document.getElementById('cartOv');
    const cartX     = document.getElementById('cartX');
    if(hamburger) hamburger.onclick = ()=>document.getElementById('mobMenu').classList.add('open');
    if(mobClose)  mobClose.onclick  = closeMob;
    if(cartOv)    cartOv.onclick    = ()=>Cart.closeDrawer();
    if(cartX)     cartX.onclick     = ()=>Cart.closeDrawer();
    if(typeof Cart !== 'undefined') Cart.ui();
    initReveal();
    checkSession();
    loadConsultasEnTurnos();
    applySiteImages();
    loadHomeProgs();
    if(typeof loadEcosistema === 'function') loadEcosistema();
    if(typeof checkMPReturn === 'function') checkMPReturn();

    // ── Botón "atrás" del navegador ──
    window.addEventListener('popstate', (e) => {
      const id = (e.state && e.state.page) || 'home';
      goTo(PAGES.includes(id) ? id : 'home', true);
    });
    // Restaurar página pública por hash al recargar (deep-link); admin/portal/detalle arrancan en home
    const h0 = (location.hash || '').slice(1);
    const restorable = ['home','programas','tienda','turnos','blog'];
    if(restorable.includes(h0) && h0 !== 'home'){ goTo(h0, true); history.replaceState({ page:h0 }, '', '#'+h0); }
    else { history.replaceState({ page:'home' }, '', '#home'); }
  } catch(e) {
    console.error('DOMContentLoaded error:', e);
  }
});

// ── Exponer funciones globalmente para los onclick del HTML ──
window.goTo               = goTo;
window.closeMob           = closeMob;
window.filterProgs        = function(){};  // replaced by marca system
window.filterTienda       = filterTienda;
window.sortTienda         = sortTienda;
window.selTipo            = selTipo;
window.selModalidad       = selModalidad;
window.bGoTo              = bGoTo;
window.calPrev            = calPrev;
window.calNext            = calNext;
window.selDate            = selDate;
window.selSlot            = selSlot;
window.inscribirsePrograma     = inscribirsePrograma;
window.confirmarCompraPrograma = confirmarCompraPrograma;
window.openEditProgram         = openEditProgram;
window.saveProgram             = saveProgram;
window.toggleProgram           = toggleProgram;
window.addModule               = addModule;
window.editModule              = editModule;
window.openEditModuleModal     = openEditModuleModal;
window.deleteModule            = deleteModule;
window.toggleSidebarModulo     = toggleSidebarModulo;
window.volverAModulos          = volverAModulos;
window.irSiguienteLeccion      = irSiguienteLeccion;
window.openAddLesson           = openAddLesson;
window.editLesson              = editLesson;
window.saveLesson              = saveLesson;
window.deleteLesson            = deleteLesson;
window.openAddDownload         = openAddDownload;
window.saveDownload            = saveDownload;
window.deleteDownload          = deleteDownload;
window.filterCursoModules      = filterCursoModules;
window.filterSidebar           = filterSidebar;
function cursoGoBack() {
  const playerVisible  = document.getElementById('cursoPlayerView')?.style.display !== 'none';
  const landingVisible = document.getElementById('cursoModuloLanding')?.style.display !== 'none';
  if(playerVisible)  { volverALanding(); return; }
  if(landingVisible) { volverAModulos(); return; }
  goTo('portal');
}

window.cursoGoBack          = cursoGoBack;
window.volverAModulos       = volverAModulos;
window.volverALanding       = volverALanding;
window.filterLandingSearch  = filterLandingSearch;
window.mostrarLandingModulo = mostrarLandingModulo;
window.abrirModulo          = abrirModulo;
window.abrirLeccion            = abrirLeccion;
window.concluirLeccion         = concluirLeccion;
window.selPay             = selPay;
window.selCuota           = selCuota;
window.openATurno         = openATurno;
window.openBlockModal     = openBlockModal;
window.toast              = toast;
window.renderCkItems      = renderCkItems;
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
window.selContent         = function(id) {
  // Buscar la lección en todos los módulos
  for(const mod of (cursoState?.modulos||[])) {
    const l = mod.lecciones?.find(l=>l.id===id);
    if(l) { abrirLeccion(mod.id, id); return; }
  }
};
window.marcarCompletado   = concluirLeccion;
window.showAP             = showAP;
window.loadATurnos        = loadATurnos;
window.loadASenas         = loadASenas;
window.aprobarSena        = aprobarSena;
window.rechazarSena       = rechazarSena;
window.loadAFichas        = loadAFichas;
window.filterAFichas      = filterFichas;
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
window.openAddContent     = openAddLesson;
window.saveContent        = saveLesson;
window.deleteContent      = deleteLesson;
window.openAddMember      = openAddMember;
window.saveMember         = saveMember;
window.toggleMembership   = toggleMembership;
window.Cart               = Cart;

// Registrar funciones reales y activar app
window._goTo              = goTo;
window._closeMob          = closeMob;
window._filterProgs       = filterProgs;
window._filterTienda      = filterTienda;
window._sortTienda        = sortTienda;
window._selTipo           = selTipo;
window._selModalidad      = selModalidad;
window._bGoTo             = _bGoTo;
window._calPrev           = calPrev;
window._calNext           = calNext;
window._selDate           = selDate;
window._selSlot           = selSlot;
window._selPay            = selPay;
window._placeOrder        = placeOrder;
window._copyTxt           = copyTxt;
window._copiarCBU         = copiarCBU;
window._submitBooking     = submitBooking;
window._validarYContinuar = validarYContinuar;
window._switchLoginTab    = switchLoginTab;
window._doLogin           = doLogin;
window._doRegister        = doRegister;
window._doForgot          = doForgot;
window._doLogout          = doLogout;
window._switchPortalTab   = switchPortalTab;
window._abrirPrograma     = abrirPrograma;
window._selContent        = window.selContent;
window._marcarCompletado  = concluirLeccion;
window._showAP            = showAP;
window._loadATurnos       = loadATurnos;
window._loadASenas        = loadASenas;
window._aprobarSena       = aprobarSena;
window._rechazarSena      = rechazarSena;
window._openANuevaFicha   = openANuevaFicha;
window._crearAFicha       = crearAFicha;
window._toggleATestis     = toggleATestis;
window._aBlockSlot        = aBlockSlot;
window._deleteABlock      = deleteABlock;
window._deleteCalBlock    = deleteCalBlock;
window._openConsulta      = openConsulta;
window._saveConsulta      = saveConsulta;
window._toggleConsulta    = toggleConsulta;
window._deleteConsulta    = deleteConsulta;
window._openAImgEditor    = openAImgEditor;
window._switchAImgTab     = switchAImgTab;
window._handleAFile       = handleAFile;
window._previewAUrl       = previewAUrl;
window._saveAImg          = saveAImg;
window._openAMod          = openAMod;
window._closeAMod         = closeAMod;
window._calAdminPrev      = calAdminPrev;
window._calAdminNext      = calAdminNext;
window._calAdminGoToday   = calAdminGoToday;
window._selectCalDay      = selectCalDay;
window._toggleBqTodoDia   = toggleBqTodoDia;
window._saveBlockQuick    = saveBlockQuick;
window._filterCalMedico   = filterCalMedico;
window._openProgAdmin     = openProgAdmin;
window._switchProgAdmTab  = switchProgAdmTab;
window._openAddContent    = openAddContent;
window._saveContent       = saveContent;
window._deleteContent     = deleteContent;
window._openAddMember     = openAddMember;
window._saveMember        = saveMember;
window._toggleMembership  = toggleMembership;
window._filterAFichas     = filterFichas;
window._updateSenaAmount  = updateSenaAmount;

// App lista — ejecutar navegación pendiente si la hubo
window._appReady = true;
if(window._pendingNav){ window._goTo(window._pendingNav); window._pendingNav=null; }
