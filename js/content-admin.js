/* ── ADMIN PREVIEW ── */
let admPreviewState = { modulos:[], downloads:[], moduloActual:null };

async function loadAdmPreview() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };
  try {
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/program_modules?program_id=eq.${currentAdmProgId}&order=sort_order`, {headers:h});
    admPreviewState.modulos = await r1.json() || [];
    for(let mod of admPreviewState.modulos) {
      const r2 = await fetch(`${SUPABASE_URL}/rest/v1/program_lessons?module_id=eq.${mod.id}&order=sort_order`, {headers:h});
      mod.lecciones = await r2.json() || [];
    }
    const r3 = await fetch(`${SUPABASE_URL}/rest/v1/program_files?program_id=eq.${currentAdmProgId}&order=sort_order`, {headers:h});
    admPreviewState.downloads = await r3.json() || [];
  } catch(e) {}
  renderAdmPreviewGrid();
}

function renderAdmPreviewGrid() {
  admPreviewState.moduloActual = null;
  document.getElementById('admPreviewModulos').style.display  = '';
  document.getElementById('admPreviewLanding').style.display  = 'none';
  document.getElementById('admPreviewPlayer').style.display   = 'none';

  const grid = document.getElementById('admPreviewGrid');
  if(!admPreviewState.modulos.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted);font-size:.85rem">Sin módulos aún.</div>';
    return;
  }
  grid.innerHTML = admPreviewState.modulos.map((mod, idx) => {
    const total = mod.lecciones?.length || 0;
    const coverStyle = mod.cover_url
      ? `background-image:url(${mod.cover_url});background-size:cover;background-position:center`
      : `background:#1C1A18`;
    return `<div onclick="admPreviewOpenModulo('${mod.id}')" style="background:#fff;border-radius:10px;overflow:hidden;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:.18s" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
      <div style="aspect-ratio:16/9;${coverStyle};display:flex;align-items:flex-end;justify-content:space-between;padding:.5rem .6rem">
        <span style="font-size:.62rem;font-weight:700;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.06em">${idx+1}</span>
        <span style="font-size:.62rem;color:rgba(255,255,255,.6)">${total} lec.</span>
      </div>
      <div style="padding:.65rem .75rem">
        <div style="font-size:.82rem;font-weight:600;color:#1C1A18;line-height:1.3">${mod.title}</div>
      </div>
    </div>`;
  }).join('');
}

function admPreviewOpenModulo(modId) {
  const mod = admPreviewState.modulos.find(m=>m.id===modId);
  if(!mod) return;
  admPreviewState.moduloActual = mod;

  document.getElementById('admPreviewModulos').style.display  = 'none';
  document.getElementById('admPreviewLanding').style.display  = '';
  document.getElementById('admPreviewPlayer').style.display   = 'none';

  const total = mod.lecciones?.length || 0;
  const metaEl  = document.getElementById('admLandingModMeta');
  const titleEl = document.getElementById('admLandingModTitle');
  const sideEl  = document.getElementById('admLandingSideTitle');
  const barEl   = document.getElementById('admLandingBar');
  const pctEl   = document.getElementById('admLandingPct');
  const descEl  = document.getElementById('admLandingModDesc');

  if(metaEl)  metaEl.textContent  = total + ' lección' + (total!==1?'es':'');
  if(titleEl) titleEl.textContent = mod.title;
  if(sideEl)  sideEl.textContent  = mod.title;
  if(barEl)   barEl.style.width   = '0%';
  if(pctEl)   pctEl.textContent   = total + ' lecciones';
  if(descEl)  { descEl.innerHTML = (mod.description||'').replace(/\n/g,'<br>'); descEl.style.display = mod.description ? '' : 'none'; }

  // Player — mostrar primer video
  const playerWrap = document.getElementById('admLandingPlayerWrap');
  const primeraLec = mod.lecciones?.[0];
  if(playerWrap && primeraLec?.video_url) {
    let eu = primeraLec.video_url;
    const yt = primeraLec.video_url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
    const vi = primeraLec.video_url.match(/vimeo\.com\/(\d+)(?:\/(\w+))?/);
    if(yt) eu = 'https://www.youtube.com/embed/'+yt[1]+'?rel=0';
    else if(vi) eu = 'https://player.vimeo.com/video/'+vi[1]+(vi[2]?'?h='+vi[2]:'');
    playerWrap.innerHTML = '<iframe src="'+eu+'" style="width:100%;height:100%;border:none" allowfullscreen></iframe>';
  } else if(playerWrap) {
    const thumb = primeraLec ? (primeraLec.thumbnail_url || getYTThumb(primeraLec.video_url)) : null;
    playerWrap.innerHTML = thumb
      ? '<div style="width:100%;height:100%;background:url('+thumb+') center/cover"></div>'
      : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.3);font-size:.9rem">Sin video cargado</div>';
  }

  // Archivos
  const modFiles = admPreviewState.downloads.filter(d=>!d.lesson_id);
  const filesEl  = document.getElementById('admLandingFiles');
  const filesListEl = document.getElementById('admLandingFilesList');
  if(filesEl && filesListEl) {
    if(modFiles.length) {
      filesEl.style.display = '';
      const icons = {pdf:'📄',doc:'📝',xls:'📊',zip:'📦',img:'🖼️',otro:'📎'};
      filesListEl.innerHTML = modFiles.map(d =>
        '<a href="'+d.file_url+'" target="_blank" class="download-item" style="text-decoration:none">'
        +'<div class="download-icon" style="background:rgba(58,125,140,.08)">'+(icons[d.file_type]||'📎')+'</div>'
        +'<div><div class="download-name">'+d.title+'</div></div>'
        +'<div style="margin-left:auto;font-size:.8rem;color:var(--teal)">⬇ Descargar</div>'
        +'</a>'
      ).join('');
    } else { filesEl.style.display = 'none'; }
  }

  // Sidebar: lecciones con thumbnails
  const lecEl = document.getElementById('admLandingLecciones');
  if(lecEl) {
    if(!mod.lecciones?.length) {
      lecEl.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--muted);font-size:.82rem">Sin lecciones en este módulo.</div>';
    } else {
      lecEl.innerHTML = mod.lecciones.map((l,i) => {
        const thumb = l.thumbnail_url || getYTThumb(l.video_url);
        const dur   = fmtDur(l.duration_sec);
        const thumbHtml = thumb
          ? '<img src="'+thumb+'" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0">'
            +(dur?'<div style="position:absolute;bottom:2px;right:3px;background:rgba(0,0,0,.75);color:#fff;font-size:.6rem;padding:1px 3px;border-radius:3px">'+dur+'</div>':'')
          : '<div style="color:rgba(255,255,255,.4);font-size:.9rem">▶</div>';
        return '<div class="sidebar-leccion" onclick="admPreviewOpenLeccion(\''+l.id+'\')">'
          +'<div class="sidebar-leccion-thumb">'+thumbHtml+'</div>'
          +'<div class="sidebar-leccion-info"><div class="sidebar-leccion-title">'+l.title+'</div>'
          +(l.description?'<div class="sidebar-leccion-dur">'+l.description.split('\n')[0].slice(0,40)+'</div>':'')
          +'</div>'
          +'<div class="sidebar-leccion-check"></div>'
          +'</div>';
      }).join('');
    }
  }
}
function admPreviewOpenLeccion(leccionId) {
  const mod = admPreviewState.moduloActual;
  const l   = mod?.lecciones?.find(l=>l.id===leccionId);
  if(!l) return;

  document.getElementById('admPreviewLanding').style.display = 'none';
  document.getElementById('admPreviewPlayer').style.display  = '';

  document.getElementById('admPlayerLecTitle').textContent = l.title;

  // Player
  const wrap = document.getElementById('admPlayerWrap');
  if(l.video_url) {
    let eu = l.video_url;
    const yt = l.video_url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
    const vi = l.video_url.match(/vimeo\.com\/(\d+)(?:\/(\w+))?/);
    if(yt) eu = 'https://www.youtube.com/embed/'+yt[1]+'?rel=0';
    else if(vi) eu = 'https://player.vimeo.com/video/'+vi[1]+(vi[2]?'?h='+vi[2]:'');
    wrap.innerHTML = `<iframe src="${eu}" style="width:100%;height:100%;border:none" allowfullscreen></iframe>`;
  } else {
    wrap.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.3);font-size:.9rem">Sin video cargado</div>';
  }

  // Descripción
  const descEl = document.getElementById('admPlayerDesc');
  descEl.innerHTML = (l.description||'').replace(/\n/g,'<br>');

  // Archivos
  const modFiles = admPreviewState.downloads.filter(d=>d.lesson_id===l.id);
  const pf = document.getElementById('admPlayerFiles');
  const pfl = document.getElementById('admPlayerFilesList');
  if(modFiles.length) {
    pf.style.display = '';
    const icons = {pdf:'📄',doc:'📝',xls:'📊',zip:'📦',img:'🖼️',otro:'📎'};
    pfl.innerHTML = modFiles.map(d=>`
      <a href="${d.file_url}" target="_blank" class="download-item" style="text-decoration:none">
        <div class="download-icon" style="background:rgba(58,125,140,.08)">${icons[d.file_type]||'📎'}</div>
        <div><div class="download-name">${d.title}</div></div>
        <div style="margin-left:auto;font-size:.8rem;color:var(--teal);font-weight:500">⬇ Descargar</div>
      </a>`).join('');
  } else { pf.style.display = 'none'; }
}

function admPreviewBack() {
  document.getElementById('admPreviewLanding').style.display = 'none';
  document.getElementById('admPreviewModulos').style.display = '';
}

function admPreviewBackToLanding() {
  document.getElementById('admPreviewPlayer').style.display  = 'none';
  document.getElementById('admPreviewLanding').style.display = '';
  if(admPreviewState.moduloActual) admPreviewOpenModulo(admPreviewState.moduloActual.id);
}

function resetAdmPreview() { renderAdmPreviewGrid(); }

window.loadAdmPreview         = loadAdmPreview;
window.admPreviewOpenModulo   = admPreviewOpenModulo;
window.admPreviewOpenLeccion  = admPreviewOpenLeccion;
window.admPreviewBack         = admPreviewBack;
window.admPreviewBackToLanding= admPreviewBackToLanding;
window.resetAdmPreview        = resetAdmPreview;

function toggleApptDetail(id) {
  const panel = document.getElementById(id);
  const arrow  = document.getElementById('appt-arrow-'+id.replace('appt-',''));
  if(!panel) return;
  const isOpen = panel.style.display !== 'none';
  // Cerrar todos los demás
  document.querySelectorAll('[id^="appt-"]').forEach(el => {
    if(el.id !== id && !el.id.includes('arrow')) {
      el.style.display = 'none';
      const a = document.getElementById('appt-arrow-'+el.id.replace('appt-',''));
      if(a) a.textContent = '▼';
    }
  });
  panel.style.display = isOpen ? 'none' : '';
  if(arrow) arrow.textContent = isOpen ? '▼' : '▲';
}
window.toggleApptDetail = toggleApptDetail;

async function cambiarEstadoAppt(id, newStatus) {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json' };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}`, { method:'PATCH', headers:h, body:JSON.stringify({status:newStatus}) });
    // Si confirman el turno, mandar email
    if(newStatus === 'confirmed') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}&select=patient_name,patient_email,date,time,type`, {headers:h});
      const appts = await r.json();
      if(appts?.[0]) {
        const a = appts[0];
        const ML = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const [y,mm,dd] = (a.date||'').split('-');
        const fStr = parseInt(dd)+' de '+ML[parseInt(mm)-1]+' '+y;
        emailTurnoConfirmado(a.patient_name, a.patient_email, fStr, (a.time||'').slice(0,5), a.type||'Consulta');
      }
    }
    toast('Estado actualizado ✓','ok');
    await loadCalData();
    renderCalAdmin();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function deleteAppt(id) {
  if(!confirm('¿Eliminar este turno?')) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}`, { method:'DELETE', headers:h });
  toast('Turno eliminado ✓','ok');
  await loadCalData();
  renderCalAdmin();
}

function openEditApptModal(id) {
  const appt = calState.appts?.find(a=>a.id===id);
  if(!appt) { toast('Turno no encontrado','err'); return; }
  openATurno(appt);
}

async function abrirFichaDesdeCalendario(email, nombre, tel) {
  // Ir a fichas
  showAP('fichas', document.querySelector('[onclick*="fichas"]'));

  // Esperar que carguen las fichas
  await new Promise(r => setTimeout(r, 500));
  if(!_fichas.length) await loadAFichas();

  // Buscar ficha por email
  const ficha = _fichas.find(f => (f.patient_email||'').toLowerCase() === (email||'').toLowerCase());

  if(ficha) {
    // Ficha encontrada → abrirla directo
    abrirFicha(ficha.id);
  } else {
    // No existe → crear una nueva y abrirla
    const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json', 'Prefer':'return=representation' };
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/fichas_medicas`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ patient_name: nombre||email, patient_email: email, patient_phone: tel||null })
      });
      const data = await res.json();
      toast('Ficha creada automáticamente ✓', 'ok');
      await loadAFichas();
      const nueva = _fichas.find(f => (f.patient_email||'').toLowerCase() === (email||'').toLowerCase());
      if(nueva) abrirFicha(nueva.id);
    } catch(e) {
      // Si falla, al menos mostrar la búsqueda
      const s = document.getElementById('fichaSearch');
      if(s) { s.value = email; filterFichas(); }
    }
  }
}

function verPagoTurno(id) {
  showAP('senas', document.querySelector('[onclick*="senas"]'));
}

window.cambiarEstadoAppt      = cambiarEstadoAppt;
window.deleteAppt              = deleteAppt;
window.openEditApptModal       = openEditApptModal;
window.abrirFichaDesdeCalendario = abrirFichaDesdeCalendario;
window.verPagoTurno            = verPagoTurno;

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

async function openConsulta(c) {
  document.getElementById('cEditId').value         = c?.id||'';
  document.getElementById('cNombre').value         = c?.nombre||'';
  document.getElementById('cDesc').value           = c?.descripcion||'';
  document.getElementById('cPrecio').value         = c?.precio||'';
  document.getElementById('cDuracion').value       = c?.duracion||'';
  document.getElementById('cModalidad').value      = c?.modalidad||'ambas';
  document.getElementById('cSoloPrevios').value    = c?.solo_pacientes_previos ? 'true' : 'false';
  document.getElementById('cIcono').value          = c?.icono||'';
  document.getElementById('cActivo').value         = c?.activo!==false?'true':'false';
  const incluyeNutri = document.getElementById('cIncluyeNutri');
  if(incluyeNutri) { incluyeNutri.checked = !!(c?.incluye_nutri); toggleNutriOffset(); }
  const offsetNutri = document.getElementById('cOffsetNutri');
  if(offsetNutri) offsetNutri.value = c?.offset_nutri_minutos || 30;
  document.getElementById('consultaModTitle').textContent = c?.id ? 'Editar: '+c.nombre : 'Nueva consulta';

  // Cargar médicas con checkboxes
  const wrap = document.getElementById('cMedicasWrap');
  if(wrap) {
    wrap.innerHTML = '<div style="font-size:.78rem;color:var(--muted)">Cargando...</div>';
    try {
      const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + (_authToken||SUPABASE_ANON) };
      const r1 = await fetch(SUPABASE_URL+'/rest/v1/medicos?activo=eq.true&order=nombre', {headers:h});
      const medicos = await r1.json();
      let asignadas = [];
      let preciosPorMedica = {};
      let diasPresPorMedica = {}, diasVirtPorMedica = {};
      if(c?.id) {
        const r2 = await fetch(SUPABASE_URL+'/rest/v1/medico_consultas?consulta_id=eq.'+c.id+'&select=medico_id,precio,dias_presencial,dias_virtual', {headers:h});
        const mc = await r2.json();
        (Array.isArray(mc)?mc:[]).forEach(x => {
          asignadas.push(x.medico_id);
          if(x.precio) preciosPorMedica[x.medico_id] = x.precio;
          if(x.dias_presencial && x.dias_presencial.length) diasPresPorMedica[x.medico_id] = x.dias_presencial.map(Number);
          if(x.dias_virtual    && x.dias_virtual.length)    diasVirtPorMedica[x.medico_id]  = x.dias_virtual.map(Number);
        });
      }

      const DIAS_ABR = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
      const DIAS_ORD = [1,2,3,4,5,6,0];

      if(!Array.isArray(medicos)||!medicos.length) {
        wrap.innerHTML = '<div style="font-size:.78rem;color:var(--muted)">No hay médicas cargadas aún.</div>';
      } else {
        wrap.innerHTML = medicos.map(m => {
          const checked   = asignadas.includes(m.id);
          const precioEsp = preciosPorMedica[m.id] || '';
          const diasPres  = diasPresPorMedica[m.id] || [];
          const diasVirt  = diasVirtPorMedica[m.id]  || [];

          function dRow(tipo, sel) {
            return '<div style="display:flex;align-items:center;gap:.3rem;padding-left:1.5rem;margin-top:.25rem">'
              +'<span style="font-size:.7rem;color:var(--muted);width:56px;flex-shrink:0">'+(tipo==='pres'?'📍 Pres:':'💻 Virt:')+'</span>'
              +DIAS_ORD.map(d=>
                '<label style="display:flex;flex-direction:column;align-items:center;gap:.1rem;cursor:pointer;font-size:.62rem;color:var(--muted)">'
                +'<input type="checkbox" '+(sel.includes(d)?'checked':'')+' class="cMedica'+tipo+'" data-mid="'+m.id+'" data-dia="'+d+'" style="accent-color:var(--teal);width:12px;height:12px">'
                +DIAS_ABR[d]+'</label>'
              ).join('')
              +'<span style="font-size:.62rem;color:var(--muted);margin-left:.35rem">(vacío=todos)</span>'
            +'</div>';
          }

          return '<div style="border-bottom:1px solid var(--cream-dk);padding:.6rem 0">'
            +'<div style="display:grid;grid-template-columns:1fr 140px;gap:.5rem;align-items:center;margin-bottom:.2rem">'
              +'<label style="display:flex;align-items:center;gap:.5rem;font-size:.84rem;cursor:pointer">'
                +'<input type="checkbox" value="'+m.id+'" '+(checked?'checked':'')+' class="cMedicaChk" style="accent-color:var(--teal);width:15px;height:15px">'
                +'<span style="width:10px;height:10px;border-radius:50%;background:'+(m.color||'#3A7D8C')+';flex-shrink:0;display:inline-block"></span>'
                +' '+m.nombre
              +'</label>'
              +'<input type="number" placeholder="Precio (opc.)" value="'+precioEsp+'" data-medica-id="'+m.id+'" class="cMedicaPrecio" style="padding:.3rem .55rem;border:1.5px solid var(--cream-dk);border-radius:8px;font-size:.78rem;font-family:var(--fb);width:100%;outline:none" min="0">'
            +'</div>'
            +dRow('pres', diasPres)
            +dRow('virt', diasVirt)
          +'</div>';
        }).join('');
      }
    } catch(e) {
      wrap.innerHTML = '<div style="font-size:.78rem;color:var(--muted)">Error: '+e.message+'</div>';
    }
  }
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
    incluye_nutri:          !!(document.getElementById('cIncluyeNutri')?.checked),
    offset_nutri_minutos:   parseInt(document.getElementById('cOffsetNutri')?.value)||30,
    activo:                 document.getElementById('cActivo').value==='true',
  };
  const btn = document.getElementById('cSaveBtn');
  btn.disabled=true; btn.textContent='Guardando...';
  try {
    const sb = getSB();
    let consultaId = id;
    if(id){
      await sb.from('consultation_types').update(data).eq('id',id);
      toast('Consulta actualizada ✓','ok');
    } else {
      data.sort_order = Math.floor(Date.now() / 1000) % 1000000;
      const { data: nueva } = await sb.from('consultation_types').insert(data);
      consultaId = nueva?.id || id;
      toast('Consulta creada ✓','ok');
    }

    // Guardar médicas asignadas
    if(consultaId) {
      const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON), 'Content-Type':'application/json' };
      // Borrar asignaciones anteriores
      await fetch(`${SUPABASE_URL}/rest/v1/medico_consultas?consulta_id=eq.${consultaId}`, { method:'DELETE', headers:h });
      // Insertar las nuevas
      const checks = [...document.querySelectorAll('#cMedicasWrap .cMedicaChk:checked')];
      if(checks.length) {
        const rows = checks.map(cb => {
          const precioInput = document.querySelector('#cMedicasWrap .cMedicaPrecio[data-medica-id="'+cb.value+'"]');
          const precio = precioInput ? (parseInt(precioInput.value)||null) : null;
          const diasChecks = [...document.querySelectorAll('#cMedicasWrap .cMedicaDia[data-mid="'+cb.value+'"]:checked')];
          const diasPresChecks = [...document.querySelectorAll('#cMedicasWrap .cMedicapres[data-mid="'+cb.value+'"]:checked')];
          const diasVirtChecks = [...document.querySelectorAll('#cMedicasWrap .cMedicavirt[data-mid="'+cb.value+'"]:checked')];
          const diasPres = diasPresChecks.map(d=>parseInt(d.dataset.dia));
          const diasVirt = diasVirtChecks.map(d=>parseInt(d.dataset.dia));
          const diasFinal = (diasPres.length===0||diasPres.length===7) ? null : diasPres;
          const diasVirtFinal = (diasVirt.length===0||diasVirt.length===7) ? null : diasVirt;
          return { medico_id: cb.value, consulta_id: consultaId, precio, dias_presencial: diasFinal, dias_virtual: diasVirtFinal };
        });
        await fetch(`${SUPABASE_URL}/rest/v1/medico_consultas`, {
          method: 'POST', headers: {...h, 'Prefer':'return=minimal'},
          body: JSON.stringify(rows)
        });
      }
    }

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
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/consultation_types?activo=eq.true&order=sort_order`, {headers:h});
    if(r.ok) {
      const data = await r.json();
      consultas = Array.isArray(data) && data.length ? data : CONSULTAS_DEFAULT;
    } else throw new Error('HTTP '+r.status);
  } catch(e){ consultas = CONSULTAS_DEFAULT; }

  // Precios mínimos por médica
  let preciosMin = {};
  try {
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/medico_consultas?select=consulta_id,precio`, {headers:h});
    if(r2.ok) {
      const mc = await r2.json();
      if(Array.isArray(mc)) mc.forEach(x => {
        if(!x.precio) return;
        if(!preciosMin[x.consulta_id] || x.precio < preciosMin[x.consulta_id])
          preciosMin[x.consulta_id] = x.precio;
      });
    }
  } catch(e) {}

  const container = document.querySelector('#tipoOptions');
  if(!container) return;
  container.innerHTML = consultas.map(c => {
    const minPrecio  = preciosMin[c.id];
    const precioBase = c.precio || 0;
    const precioMin  = minPrecio ? Math.min(minPrecio, precioBase||Infinity) : precioBase;
    const variantes  = minPrecio && minPrecio !== precioBase;
    const label      = precioMin > 0 ? (variantes?'Desde ':'')+fmt(precioMin) : 'A confirmar';
    return '<button class="tipo-opt" data-tipo="'+c.id+'" data-precio="'+(precioMin||0)+'" data-dur="'+(c.duracion||'45 min')+'" data-modalidad="'+(c.modalidad||'ambas')+'" onclick="selTipo(this)">'
      +'<div class="tipo-icon">'+(c.icono||'📋')+'</div>'
      +'<div class="tipo-info"><div class="tipo-name">'+c.nombre+'</div><div class="tipo-desc">'+(c.descripcion||'')+' · '+(c.duracion||'')+'</div></div>'
      +'<div class="tipo-price">'+label+'</div>'
      +'<div class="tipo-check">→</div>'
    +'</button>';
  }).join('');
}


/* ── EMAIL VIA SUPABASE EDGE FUNCTION ──
   El envío de mails se hace server-side en la Edge Function `send-email`
   (que guarda la RESEND_KEY como secreto). El cliente NO maneja la key. */

async function sendEmail(to, subject, html) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON,
      },
      body: JSON.stringify({ to, subject, html })
    });
    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      console.warn('Email error:', err);
    }
  } catch(e) {
    console.warn('Email no enviado:', e.message);
  }
}

function emailTurnoPendiente(nombre, email, fecha, hora, consulta, sena, total, apellido) {
  const html = `<!DOCTYPE html><!-- v2.4 --><html><body style="margin:0;padding:0;background:#F0E8D8;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#1C1A18;padding:32px 40px;text-align:center">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,232,216,.5);margin-bottom:6px">Medicina Funcional</div>
      <div style="font-family:Georgia,serif;font-size:26px;color:#F0E8D8">Be Human</div>
    </td></tr>
    <tr><td style="padding:36px 40px;text-align:center">
      <div style="font-size:36px;margin-bottom:12px">⏳</div>
      <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;color:#1C1A18;margin:0 0 8px">Turno registrado</h1>
      <p style="font-size:15px;color:#8A7F74;margin:0">Hola <strong style="color:#1C1A18">${nombre}</strong>, recibimos tu solicitud.</p>
    </td></tr>
    <tr><td style="padding:0 40px 28px">
      <table width="100%" style="background:#F0E8D8;border-radius:12px;padding:20px;border-collapse:collapse">
        <tr><td style="padding:8px 0;border-bottom:1px solid #E4D9C5;font-size:14px;color:#8A7F74">Consulta</td><td style="padding:8px 0;border-bottom:1px solid #E4D9C5;text-align:right;font-weight:600;color:#1C1A18">${consulta}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #E4D9C5;font-size:14px;color:#8A7F74">Fecha</td><td style="padding:8px 0;border-bottom:1px solid #E4D9C5;text-align:right;font-weight:600;color:#1C1A18">${fecha}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #E4D9C5;font-size:14px;color:#8A7F74">Hora</td><td style="padding:8px 0;border-bottom:1px solid #E4D9C5;text-align:right;font-weight:600;color:#1C1A18">${hora} hs</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#8A7F74">Seña a transferir</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#C9935A;font-size:18px">${sena}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 40px 28px">
      <div style="background:rgba(212,133,58,.08);border:1.5px solid rgba(212,133,58,.2);border-radius:12px;padding:18px 20px;font-size:14px;color:#8A5020;line-height:1.7">
        <strong>Próximos pasos:</strong><br>
        1. Transferí la seña de <strong>${sena}</strong> al alias <strong>behuman.pagos</strong><br>
        2. Enviá el comprobante por WhatsApp al <strong>+54 9 11 7617-9836</strong><br>
        3. Esperá el mail de confirmación
      </div>
    </td></tr>
    <tr><td style="background:#F0E8D8;padding:20px 40px;text-align:center;font-size:12px;color:#8A7F74">
      Be Human · Medicina Funcional · +54 9 11 7617-9836
    </td></tr>
  </table></td></tr></table></body></html>`;
  sendEmail(email, '⏳ Tu turno está pendiente de confirmación · Be Human', html);
}

function emailTurnoConfirmado(nombre, email, fecha, hora, consulta) {
  const html = `<!DOCTYPE html><!-- v2.4 --><html><body style="margin:0;padding:0;background:#F0E8D8;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#1C1A18;padding:32px 40px;text-align:center">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,232,216,.5);margin-bottom:6px">Medicina Funcional</div>
      <div style="font-family:Georgia,serif;font-size:26px;color:#F0E8D8">Be Human</div>
    </td></tr>
    <tr><td style="padding:36px 40px;text-align:center">
      <div style="font-size:36px;margin-bottom:12px">✅</div>
      <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;color:#1C1A18;margin:0 0 8px">¡Turno confirmado!</h1>
      <p style="font-size:15px;color:#8A7F74;margin:0">Hola <strong style="color:#1C1A18">${nombre}</strong>, tu turno está confirmado. ¡Te esperamos!</p>
    </td></tr>
    <tr><td style="padding:0 40px 28px">
      <table width="100%" style="background:#F0E8D8;border-radius:12px;padding:20px;border-collapse:collapse">
        <tr><td style="padding:8px 0;border-bottom:1px solid #E4D9C5;font-size:14px;color:#8A7F74">Consulta</td><td style="padding:8px 0;border-bottom:1px solid #E4D9C5;text-align:right;font-weight:600;color:#1C1A18">${consulta}</td></tr>
        <tr><td style="padding:12px 0;border-bottom:1px solid #E4D9C5;font-size:14px;color:#8A7F74">Fecha</td><td style="padding:12px 0;border-bottom:1px solid #E4D9C5;text-align:right;font-family:Georgia,serif;font-size:22px;color:#C9935A">${fecha}</td></tr>
        <tr><td style="padding:12px 0;font-size:14px;color:#8A7F74">Hora</td><td style="padding:12px 0;text-align:right;font-family:Georgia,serif;font-size:22px;color:#C9935A">${hora} hs</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 40px 28px;text-align:center">
      <a href="https://wa.me/5491176179836" style="display:inline-block;background:#3A7D8C;color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:14px;font-weight:600">Escribir a Mariel</a>
    </td></tr>
    <tr><td style="background:#F0E8D8;padding:20px 40px;text-align:center;font-size:12px;color:#8A7F74">
      Be Human · Medicina Funcional · +54 9 11 7617-9836
    </td></tr>
  </table></td></tr></table></body></html>`;
  sendEmail(email, '✅ ¡Tu turno está confirmado! · Be Human', html);
}

function emailProgramaPendiente(nombre, email, programa, total) {
  const html = `<!DOCTYPE html><!-- v2.4 --><html><body style="margin:0;padding:0;background:#F0E8D8;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <tr><td style="background:#1C1A18;padding:32px 40px;text-align:center">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,232,216,.5);margin-bottom:6px">Medicina Funcional</div>
      <div style="font-family:Georgia,serif;font-size:28px;color:#F0E8D8">Be Human</div>
    </td></tr>
    <tr><td style="padding:36px 40px 24px;text-align:center">
      <div style="width:56px;height:56px;border-radius:50%;background:#FFF3E0;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px">⏳</div>
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1C1A18;margin:0 0 10px">Inscripción registrada</h1>
      <p style="font-size:15px;color:#6B6460;margin:0">Hola <strong style="color:#1C1A18">${nombre}</strong>, recibimos tu solicitud de inscripción al programa.</p>
    </td></tr>
    <tr><td style="padding:0 40px 24px">
      <table width="100%" style="background:#F8F4EE;border-radius:12px;border-collapse:collapse">
        <tr><td style="padding:16px 20px;border-bottom:1px solid #EAE0D0">
          <div style="font-size:12px;color:#8A7F74;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Programa</div>
          <div style="font-size:16px;font-weight:600;color:#1C1A18">${programa}</div>
        </td></tr>
        <tr><td style="padding:16px 20px">
          <div style="font-size:12px;color:#8A7F74;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Total</div>
          <div style="font-size:24px;font-family:Georgia,serif;color:#C9935A">${total}</div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 40px 28px">
      <div style="background:#FFF8F0;border-left:4px solid #C9935A;border-radius:0 8px 8px 0;padding:16px 20px">
        <div style="font-size:13px;font-weight:600;color:#8A5020;margin-bottom:8px">Próximos pasos para activar tu acceso:</div>
        <div style="font-size:13px;color:#8A5020;line-height:1.8">
          1. Realizá la transferencia de <strong>${total}</strong> al alias <strong>behuman.pagos</strong><br>
          2. Enviá el comprobante por WhatsApp al <strong>+54 9 11 7617-9836</strong><br>
          3. En menos de 24hs hábiles activamos tu acceso y te avisamos por email
        </div>
      </div>
    </td></tr>
    <tr><td style="padding:0 40px 32px;text-align:center">
      <a href="https://wa.me/5491176179836" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:13px 28px;border-radius:100px;font-size:13px;font-weight:600">Enviar comprobante por WhatsApp</a>
    </td></tr>
    <tr><td style="background:#F0E8D8;padding:20px 40px;text-align:center;font-size:12px;color:#8A7F74;line-height:1.6">
      Be Human · Medicina Funcional<br>+54 9 11 7617-9836 · behuman.com.ar
    </td></tr>
  </table></td></tr></table></body></html>`;
  sendEmail(email, 'Tu inscripción a ' + programa + ' está pendiente · Be Human', html);
}

function emailProgramaConfirmado(nombre, email, programa) {
  const html = `<!DOCTYPE html><!-- v2.4 --><html><body style="margin:0;padding:0;background:#F0E8D8;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <tr><td style="background:#1C1A18;padding:32px 40px;text-align:center">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,232,216,.5);margin-bottom:6px">Medicina Funcional</div>
      <div style="font-family:Georgia,serif;font-size:28px;color:#F0E8D8">Be Human</div>
    </td></tr>
    <tr><td style="padding:36px 40px 24px;text-align:center">
      <div style="width:56px;height:56px;border-radius:50%;background:#E8F5E9;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px">✅</div>
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#1C1A18;margin:0 0 10px">¡Tu acceso está activo!</h1>
      <p style="font-size:15px;color:#6B6460;margin:0">Hola <strong style="color:#1C1A18">${nombre}</strong>, confirmamos tu pago y ya tenés acceso completo al programa.</p>
    </td></tr>
    <tr><td style="padding:0 40px 24px">
      <table width="100%" style="background:#F8F4EE;border-radius:12px;border-collapse:collapse">
        <tr><td style="padding:16px 20px">
          <div style="font-size:12px;color:#8A7F74;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Programa activo</div>
          <div style="font-size:18px;font-weight:600;color:#1C1A18">${programa}</div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 40px 28px">
      <div style="background:#F0F7F0;border-left:4px solid #4A9B6F;border-radius:0 8px 8px 0;padding:16px 20px;font-size:13px;color:#2E6B4A;line-height:1.7">
        Ingresá a la plataforma con tu email y contraseña. En <strong>Mi cuenta → Mis programas</strong> vas a encontrar todo el contenido disponible.
      </div>
    </td></tr>
    <tr><td style="padding:0 40px 32px;text-align:center">
      <a href="https://iglesiastech-behuman.vercel.app" style="display:inline-block;background:#3A7D8C;color:#fff;text-decoration:none;padding:13px 28px;border-radius:100px;font-size:13px;font-weight:600;margin-right:8px">Ir al portal</a>
      <a href="https://wa.me/5491176179836" style="display:inline-block;background:#fff;color:#3A7D8C;text-decoration:none;padding:13px 28px;border-radius:100px;font-size:13px;font-weight:600;border:2px solid #3A7D8C">Contactar a Mariel</a>
    </td></tr>
    <tr><td style="background:#F0E8D8;padding:20px 40px;text-align:center;font-size:12px;color:#8A7F74;line-height:1.6">
      Be Human · Medicina Funcional<br>+54 9 11 7617-9836 · behuman.com.ar
    </td></tr>
  </table></td></tr></table></body></html>`;
  sendEmail(email, '¡Tu acceso a ' + programa + ' está activo! · Be Human', html);
}

/* ── USUARIOS ── */
let _usuarios = [];

async function loadUsuarios() {
  const token = _authToken || localStorage.getItem('bh_token');
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+token };
  const tbody = document.getElementById('usuariosBody');

  try {
    // Traer perfiles
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/profiles?order=created_at.desc&select=id,full_name,email,created_at,rol,medico_id`, {headers:h});
    const profiles = await r1.json();
    if(!Array.isArray(profiles)) throw new Error('No se pudieron cargar los usuarios');

    // Traer membresías activas
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/memberships?status=eq.active&select=user_id,program_id,programs(name)`, {headers:h});
    const membs = await r2.json() || [];

    // Traer turnos por email
    const r3 = await fetch(`${SUPABASE_URL}/rest/v1/appointments?select=patient_email,date,type&order=date.desc`, {headers:h});
    const appts = await r3.json() || [];

    _usuarios = profiles.map(p => {
      const userMembs = Array.isArray(membs) ? membs.filter(m=>m.user_id===p.id) : [];
      const userAppts = Array.isArray(appts) ? appts.filter(a=>a.patient_email===p.email) : [];
      return {...p, membs: userMembs, appts: userAppts};
    });

    renderUsuarios(_usuarios);
  } catch(e) {
    if(tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted)">Error: ${e.message}</td></tr>`;
  }
}

function renderUsuarios(users) {
  const tbody = document.getElementById('usuariosBody');
  if(!tbody) return;
  if(!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">No hay usuarios registrados aún.</td></tr>';
    return;
  }
  const ROL_LABELS = { super_admin:'⭐ Super Admin', medica:'👩‍⚕️ Médica', user:'👤 Usuario' };
  const ROL_COLORS = { super_admin:'rgba(201,147,90,.15)', medica:'rgba(58,125,140,.1)', user:'rgba(138,127,116,.1)' };
  const ROL_TEXT   = { super_admin:'var(--gold)', medica:'var(--teal)', user:'#8A7F74' };

  tbody.innerHTML = users.map(u => {
    const fecha   = u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '—';
    const progs   = u.membs?.map(m=>m.programs?.name||'—').join(', ') || '—';
    const nTurnos = u.appts?.length || 0;
    const rol     = u.rol || 'user';
    return `<tr style="border-bottom:1px solid var(--cream-dk)">
      <td style="padding:.75rem 1rem">
        <div style="font-weight:500;color:#1C1A18">${u.full_name||'Sin nombre'}</div>
        <div style="font-size:.74rem;color:var(--muted)">${u.email||'—'}</div>
      </td>
      <td style="padding:.75rem 1rem">
        <span style="font-size:.68rem;font-weight:600;padding:.2rem .6rem;border-radius:100px;background:${ROL_COLORS[rol]};color:${ROL_TEXT[rol]}">${ROL_LABELS[rol]||rol}</span>
      </td>
      <td style="padding:.75rem 1rem;font-size:.8rem;color:var(--muted)">${fecha}</td>
      <td style="padding:.75rem 1rem;font-size:.82rem">${progs}</td>
      <td style="padding:.75rem 1rem;font-size:.82rem;color:var(--muted)">${nTurnos} turno${nTurnos!==1?'s':''}</td>
      <td style="padding:.75rem 1rem">
        <div style="display:flex;flex-direction:column;gap:.35rem">
          <select onchange="cambiarRolUsuario('${u.id}',this.value)" style="padding:.3rem .6rem;border:1.5px solid var(--cream-dk);border-radius:8px;font-size:.73rem;font-family:var(--fb);outline:none;background:#fff">
            <option value="user"${rol==='user'?' selected':''}>Usuario</option>
            <option value="medica"${rol==='medica'?' selected':''}>Médica</option>
            <option value="super_admin"${rol==='super_admin'?' selected':''}>Super Admin</option>
          </select>
          <div id="medicaSel-${u.id}" style="display:${rol==='medica'?'block':'none'}">
            <select onchange="asignarMedicaAUsuario('${u.id}',this.value)" id="medicoSel-${u.id}" data-current="${u.medico_id||''}" style="padding:.3rem .6rem;border:1.5px solid rgba(58,125,140,.4);border-radius:8px;font-size:.73rem;font-family:var(--fb);outline:none;background:rgba(58,125,140,.04);color:var(--teal);width:100%">
              <option value="">— ¿Cuál médica es? —</option>
            </select>
          </div>
          <button onclick="openEditUser('${u.id}','${(u.full_name||'').replace(/'/g,'')}','${u.email||''}')" style="padding:.3rem .75rem;border-radius:100px;font-size:.72rem;font-weight:600;background:rgba(58,125,140,.08);color:var(--teal);border:1.5px solid rgba(58,125,140,.2);cursor:pointer;font-family:var(--fb)">✏️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Poblar los selects de médica
  poblarSelectsMedica();
}

async function poblarSelectsMedica() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/medicos?activo=eq.true&select=id,nombre&order=nombre', {headers:h});
    const medicos = await r.json();
    if(!Array.isArray(medicos)) return;
    document.querySelectorAll('[id^="medicoSel-"]').forEach(sel => {
      const current = sel.dataset.current || '';
      sel.innerHTML = '<option value="">— ¿Cuál médica es? —</option>'
        + medicos.map(m=>`<option value="${m.id}"${m.id===current?' selected':''}>${m.nombre}</option>`).join('');
    });
  } catch(e) {}
}
window.poblarSelectsMedica = poblarSelectsMedica;

async function asignarMedicaAUsuario(userId, medicoId) {
  const token = _authToken || localStorage.getItem('bh_token');
  const h = { 'apikey': SUPABASE_ANON, 'Authorization':'Bearer '+token, 'Content-Type':'application/json', 'Prefer':'return=minimal' };
  try {
    await fetch(SUPABASE_URL+'/rest/v1/profiles?id=eq.'+userId, {method:'PATCH', headers:h, body:JSON.stringify({medico_id: medicoId||null})});
    toast('Médica asignada ✓','ok');
    const u = _usuarios.find(x=>x.id===userId);
    if(u) u.medico_id = medicoId;
  } catch(e) { toast('Error: '+e.message,'err'); }
}
window.asignarMedicaAUsuario = asignarMedicaAUsuario;

async function cambiarRolUsuario(userId, nuevoRol) {
  const token = _authToken || localStorage.getItem('bh_token');
  const h = { 'apikey': SUPABASE_ANON, 'Authorization':'Bearer '+token, 'Content-Type':'application/json', 'Prefer':'return=minimal' };
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/profiles?id=eq.'+userId, {method:'PATCH', headers:h, body:JSON.stringify({rol:nuevoRol})});
    if(!r.ok) {
      const err = await r.json().catch(()=>({}));
      throw new Error(err.message || err.error || r.statusText);
    }
    toast('Rol actualizado ✓','ok');
    const u = _usuarios.find(x=>x.id===userId);
    if(u) u.rol = nuevoRol;
    // Mostrar/ocultar selector de médica
    const medicaSel = document.getElementById('medicaSel-'+userId);
    if(medicaSel) {
      medicaSel.style.display = nuevoRol === 'medica' ? 'block' : 'none';
      if(nuevoRol === 'medica') poblarSelectsMedica();
    }
  } catch(e) { toast('Error: '+e.message,'err'); }
}

function filterUsuarios() {
  const filtered = _usuarios.filter(u=>
    (u.full_name||'').toLowerCase().includes(q) ||
    (u.email||'').toLowerCase().includes(q)
  );
  renderUsuarios(filtered);
}

function openEditUser(id, name, email) {
  document.getElementById('editUserId').value    = id;
  document.getElementById('editUserName').value  = name;
  document.getElementById('editUserEmail').value = email;
  document.getElementById('editUserPass').value  = '';
  document.getElementById('editUserModal').style.display = 'flex';
}

function closeEditUser() {
  document.getElementById('editUserModal').style.display = 'none';
}

async function saveEditUser() {
  const id    = document.getElementById('editUserId').value;
  const name  = document.getElementById('editUserName').value.trim();
  const email = document.getElementById('editUserEmail').value.trim();
  const pass  = document.getElementById('editUserPass').value;

  if(!email) { toast('El email es obligatorio','err'); return; }
  if(pass && pass.length < 6) { toast('La contraseña debe tener al menos 6 caracteres','err'); return; }

  const token = _authToken || localStorage.getItem('bh_token');
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+token, 'Content-Type':'application/json' };

  try {
    // Actualizar perfil
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ full_name: name, email })
    });

    // Cambiar email en auth via RPC si cambió
    const user = _usuarios.find(u=>u.id===id);
    if(user && user.email !== email) {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_update_user_email`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ p_user_id: id, p_email: email })
      });
    }

    // Cambiar contraseña si se ingresó
    if(pass) {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_update_user_password`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ p_user_id: id, p_password: pass })
      });
    }

    toast('Usuario actualizado ✓', 'ok');
    closeEditUser();
    loadUsuarios();
  } catch(e) {
    toast('Error: '+e.message, 'err');
  }
}

window.loadUsuarios   = loadUsuarios;
window.filterUsuarios = filterUsuarios;
window.openEditUser   = openEditUser;
window.closeEditUser  = closeEditUser;
window.saveEditUser   = saveEditUser;

/* ── SUPLEMENTOS ── */
let _suplementos = [];
let _suplFichaId = null;
let _suplEmail   = null;
let _suplNombre  = null;

async function loadSuplementos() {
  if(_suplementos.length) return _suplementos;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/suplementos?activo=eq.true&order=sort_order,nombre`, {headers:h});
  _suplementos = await r.json() || [];
  return _suplementos;
}

async function openSuplementos(fichaId, nombre, email) {
  _suplFichaId = fichaId;
  _suplEmail   = email;
  _suplNombre  = nombre;
  document.getElementById('suplPacienteNombre').textContent = nombre + ' · ' + email;
  openAMod('suplModal');

  const wrap = document.getElementById('suplListWrap');
  wrap.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">Cargando...</div>';

  try {
    const supls = await loadSuplementos();
    const ficha = _fichas.find(f=>f.id===fichaId);
    const selIds = Array.isArray(ficha?.suplementos_ids) ? ficha.suplementos_ids : (tryParseJSON(ficha?.suplementos_ids)||[]);
    document.getElementById('suplNotas').value = ficha?.suplementos_notas || '';

    if(!supls.length) {
      wrap.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">No hay suplementos cargados. Agregálos desde Admin → Suplementos.</div>';
      return;
    }

    // Agrupar por categoría
    const cats = {};
    supls.forEach(s => {
      const cat = s.categoria || 'General';
      if(!cats[cat]) cats[cat] = [];
      cats[cat].push(s);
    });

    wrap.innerHTML = Object.entries(cats).map(([cat, items]) =>
      '<div style="margin-bottom:1.25rem">'
      +'<div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:.6rem;padding-bottom:.4rem;border-bottom:1px solid var(--cream-dk)">'+cat+'</div>'
      +items.map(s => {
        const checked = selIds.includes(s.id);
        return '<label style="display:flex;align-items:flex-start;gap:.85rem;padding:.75rem;border-radius:10px;cursor:pointer;transition:.12s;border:1.5px solid '+(checked?'var(--teal)':'transparent')+';background:'+(checked?'rgba(58,125,140,.05)':'#fff')+'" id="suplLabel-'+s.id+'" onclick="toggleSupl(\''+s.id+'\')">'
          +'<input type="checkbox" value="'+s.id+'" '+(checked?'checked':'')+' style="accent-color:var(--teal);width:16px;height:16px;margin-top:.1rem;flex-shrink:0" id="suplChk-'+s.id+'">'
          +'<div style="flex:1">'
            +'<div style="font-weight:600;font-size:.88rem;color:#1C1A18">'+s.nombre+'</div>'
            +(s.dosis?'<div style="font-size:.76rem;color:var(--teal);margin-top:.1rem">Dosis: '+s.dosis+'</div>':'')
            +(s.descripcion?'<div style="font-size:.76rem;color:var(--muted);margin-top:.15rem;line-height:1.5">'+s.descripcion+'</div>':'')
            +(s.marca?'<div style="font-size:.72rem;color:var(--muted);margin-top:.1rem">Marca: '+s.marca+'</div>':'')
          +'</div>'
          +(s.link?'<a href="'+s.link+'" target="_blank" onclick="event.stopPropagation()" style="font-size:.72rem;color:var(--teal);text-decoration:none;white-space:nowrap;padding:.25rem .6rem;border:1px solid var(--teal);border-radius:100px;flex-shrink:0">Ver →</a>':'')
        +'</label>';
      }).join('')
      +'</div>'
    ).join('');
  } catch(e) {
    wrap.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">Error: '+e.message+'</div>';
  }
}

function toggleSupl(id) {
  const chk = document.getElementById('suplChk-'+id);
  const lbl = document.getElementById('suplLabel-'+id);
  if(!chk) return;
  chk.checked = !chk.checked;
  if(lbl) {
    lbl.style.border = chk.checked ? '1.5px solid var(--teal)' : '1.5px solid transparent';
    lbl.style.background = chk.checked ? 'rgba(58,125,140,.05)' : '#fff';
  }
}

function getSuplSeleccionados() {
  return _suplementos.filter(s => document.getElementById('suplChk-'+s.id)?.checked);
}

async function guardarSuplementos() {
  const selIds = getSuplSeleccionados().map(s=>s.id);
  const notas  = document.getElementById('suplNotas').value.trim();
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json' };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/fichas_medicas?id=eq.${_suplFichaId}`, {
      method:'PATCH', headers:h,
      body: JSON.stringify({ suplementos_ids: selIds, suplementos_notas: notas||null })
    });
    // Actualizar local
    const f = _fichas.find(x=>x.id===_suplFichaId);
    if(f) { f.suplementos_ids = selIds; f.suplementos_notas = notas; }
    toast('Suplementos guardados ✓','ok');
    closeAMod('suplModal');
    if(_fichaActual?.id===_suplFichaId) renderFichaDetalle(_fichas.find(f=>f.id===_suplFichaId)||_fichaActual);
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function enviarSuplementosPorMail() {
  const sel = getSuplSeleccionados();
  if(!sel.length) { toast('Seleccioná al menos un suplemento','err'); return; }
  await guardarSuplementos();

  const notas = document.getElementById('suplNotas').value.trim();
  const fecha = new Date().toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});

  const itemsHtml = sel.map((s,i) =>
    '<tr>'
    +'<td style="padding:14px 16px;border-bottom:1px solid #f0ebe3;vertical-align:top">'
      +'<div style="display:flex;align-items:center;gap:12px">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:#3A7D8C;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;flex-shrink:0">'+(i+1)+'</div>'
        +'<div>'
          +'<div style="font-weight:600;color:#1C1A18;font-size:15px">'+s.nombre+'</div>'
          +(s.dosis?'<div style="color:#3A7D8C;font-size:13px;margin-top:2px">Dosis: '+s.dosis+'</div>':'')
          +(s.descripcion?'<div style="color:#8A7F74;font-size:12px;margin-top:3px;line-height:1.5">'+s.descripcion+'</div>':'')
          +(s.marca?'<div style="color:#8A7F74;font-size:12px;margin-top:2px">Marca: '+s.marca+'</div>':'')
        +'</div>'
      +'</div>'
    +'</td>'
    +(s.link?'<td style="padding:14px 16px;border-bottom:1px solid #f0ebe3;text-align:right;vertical-align:middle;white-space:nowrap"><a href="'+s.link+'" style="font-size:12px;color:#3A7D8C;text-decoration:none;border:1.5px solid #3A7D8C;padding:5px 12px;border-radius:100px">Ver →</a></td>':'<td style="border-bottom:1px solid #f0ebe3"></td>')
    +'</tr>'
  ).join('');

  const html = `<!DOCTYPE html><!-- v2.4 --><html><body style="margin:0;padding:0;background:#F0E8D8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 30px rgba(0,0,0,.1)">
  <tr><td style="background:#1C1A18;padding:36px 44px">
    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:rgba(201,147,90,.6);margin-bottom:8px">Medicina Funcional</div>
    <div style="font-family:Georgia,serif;font-size:30px;color:#F0E8D8;margin-bottom:4px">Be Human</div>
    <div style="font-size:13px;color:rgba(240,232,216,.4)">Plan de suplementación personalizado</div>
  </td></tr>

  <tr><td style="padding:36px 44px 24px">
    <div style="font-size:12px;color:#8A7F74;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Para</div>
    <div style="font-family:Georgia,serif;font-size:24px;color:#1C1A18;margin-bottom:4px">${_suplNombre}</div>
    <div style="font-size:13px;color:#8A7F74">Fecha: ${fecha}</div>
  </td></tr>

  <tr><td style="padding:0 44px 24px">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#8A7F74;margin-bottom:12px">Suplementos recomendados</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #f0ebe3;border-radius:12px;overflow:hidden">
      ${itemsHtml}
    </table>
  </td></tr>

  ${notas ? `<tr><td style="padding:0 44px 28px">
    <div style="background:#F8F4EE;border-radius:12px;padding:18px 22px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#8A7F74;margin-bottom:8px">Indicaciones adicionales</div>
      <div style="font-size:14px;color:#3A3530;line-height:1.8;white-space:pre-line">${notas}</div>
    </div>
  </td></tr>` : ''}

  <tr><td style="padding:0 44px 36px;text-align:center">
    <div style="border-top:1px solid #f0ebe3;padding-top:24px">
      <div style="font-size:13px;color:#8A7F74;line-height:1.7">¿Tenés dudas sobre tu plan de suplementación?<br>Contactanos por WhatsApp o respondiendo este mail.</div>
      <a href="https://wa.me/5491176179836" style="display:inline-block;margin-top:16px;background:#25D366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:100px;font-size:13px;font-weight:600">Escribir a Mariel por WhatsApp</a>
    </div>
  </td></tr>

  <tr><td style="background:#F0E8D8;padding:20px 44px;text-align:center;font-size:11px;color:#8A7F74;line-height:1.7">
    Be Human · Medicina Funcional · +54 9 11 7617-9836<br>behuman.com.ar
  </td></tr>
</table></td></tr></table></body></html>`;

  try {
    await sendEmail(_suplEmail, 'Tu plan de suplementación · Be Human', html);
    toast('Mail enviado a '+_suplEmail+' ✓','ok', 4000);
    closeAMod('suplModal');
  } catch(e) { toast('Error al enviar: '+e.message,'err'); }
}

window.openSuplementos          = openSuplementos;
window.toggleSupl               = toggleSupl;
window.guardarSuplementos       = guardarSuplementos;
window.enviarSuplementosPorMail = enviarSuplementosPorMail;

/* ── BLOG ── */
let _blogPosts = [];
let _blogCurrentPost = null;

async function loadBlogPage() {
  if(_blogPosts.length) { renderBlogGrid(_blogPosts); renderBlogCats(_blogPosts); return; }
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/blog_posts?published=eq.true&order=sort_order.desc,created_at.desc', {headers:h});
    _blogPosts = await r.json() || [];
    renderBlogGrid(_blogPosts);
    renderBlogCats(_blogPosts);
  } catch(e) {
    const g = document.getElementById('blogGrid');
    if(g) g.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--muted)">Error al cargar artículos.</div>';
  }
}

function renderBlogCats(posts) {
  const tabs = document.getElementById('blogCatTabs');
  if(!tabs) return;
  const cats = [...new Set(posts.map(p=>p.category).filter(Boolean))];
  tabs.innerHTML = '<button class="ftab active" onclick="filterBlog(\'all\',this)">Todos</button>'
    + cats.map(c=>'<button class="ftab" onclick="filterBlog(\''+c+'\',this)">'+c+'</button>').join('');
}

function renderBlogGrid(posts) {
  const grid = document.getElementById('blogGrid');
  if(!grid) return;
  if(!posts.length) { grid.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--muted)">No hay artículos publicados aún.</div>'; return; }

  // Primer post destacado (featured o el más reciente)
  const featured = posts.find(p=>p.featured) || posts[0];
  const rest     = posts.filter(p=>p.id !== featured.id);

  let html = '';

  // Card featured grande
  html += '<div onclick="abrirBlogPost(\''+featured.id+'\')" style="cursor:pointer;background:#fff;border-radius:20px;overflow:hidden;display:grid;grid-template-columns:1.2fr 1fr;margin-bottom:2rem;box-shadow:0 4px 24px rgba(0,0,0,.08);transition:.2s" onmouseover="this.style.transform=\'translateY(-3px)\'" onmouseout="this.style.transform=\'none\'">'
    +'<div style="position:relative;min-height:320px;overflow:hidden">'
      +(featured.cover_url?'<img src="'+featured.cover_url+'" style="width:100%;height:100%;object-fit:cover">':'<div style="width:100%;height:100%;background:linear-gradient(135deg,#1C1A18,#3A7D8C)"></div>')
      +'<div style="position:absolute;top:1rem;left:1rem"><span style="background:var(--gold);color:#fff;font-size:.65rem;font-weight:700;padding:.3rem .75rem;border-radius:100px;text-transform:uppercase;letter-spacing:.1em">'+(featured.featured?'⭐ Destacado':'Reciente')+'</span></div>'
    +'</div>'
    +'<div style="padding:2.5rem;display:flex;flex-direction:column;justify-content:center">'
      +(featured.category?'<span style="font-size:.65rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--teal);margin-bottom:.75rem;display:block">'+featured.category+'</span>':'')
      +'<h2 style="font-family:var(--fd);font-size:1.6rem;color:#1C1A18;margin:0 0 1rem;line-height:1.2">'+featured.title+'</h2>'
      +(featured.excerpt?'<p style="font-size:.88rem;color:#6B6460;line-height:1.7;margin:0 0 1.5rem">'+featured.excerpt+'</p>':'')
      +'<div style="display:flex;align-items:center;gap:.75rem">'
        +'<div style="width:36px;height:36px;border-radius:50%;background:var(--teal);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.8rem;font-weight:700">'+(featured.author||'M')[0]+'</div>'
        +'<div><div style="font-size:.82rem;font-weight:600;color:#1C1A18">'+(featured.author||'Dra. Mariel Dobenau')+'</div>'
        +'<div style="font-size:.72rem;color:var(--muted)">'+new Date(featured.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})+'</div></div>'
        +'<div style="margin-left:auto;font-size:.78rem;font-weight:600;color:var(--teal)">Leer →</div>'
      +'</div>'
    +'</div>'
  +'</div>';

  // Grid del resto
  if(rest.length) {
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem">';
    rest.forEach(post => {
      html += '<div onclick="abrirBlogPost(\''+post.id+'\')" style="cursor:pointer;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);transition:.2s" onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 8px 28px rgba(0,0,0,.1)\'" onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'0 2px 12px rgba(0,0,0,.06)\'">'
        +'<div style="height:200px;overflow:hidden;background:linear-gradient(135deg,#2C4A3E,#3A7D8C)">'
          +(post.cover_url?'<img src="'+post.cover_url+'" style="width:100%;height:100%;object-fit:cover;transition:.3s" loading="lazy">':'')
        +'</div>'
        +'<div style="padding:1.25rem">'
          +(post.category?'<span style="font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);display:block;margin-bottom:.5rem">'+post.category+'</span>':'')
          +'<h3 style="font-family:var(--fd);font-size:1.1rem;color:#1C1A18;margin:0 0 .6rem;line-height:1.3">'+post.title+'</h3>'
          +(post.excerpt?'<p style="font-size:.8rem;color:#6B6460;line-height:1.6;margin:0 0 1rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'+post.excerpt+'</p>':'')
          +'<div style="display:flex;align-items:center;justify-content:space-between">'
            +'<div style="font-size:.72rem;color:var(--muted)">'+new Date(post.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'short'})+'</div>'
            +'<div style="font-size:.75rem;font-weight:600;color:var(--teal)">Leer →</div>'
          +'</div>'
        +'</div>'
      +'</div>';
    });
    html += '</div>';
  }

  grid.innerHTML = html;
}

function filterBlog(cat, btn) {
  document.querySelectorAll('#blogCatTabs .ftab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const filtered = cat==='all' ? _blogPosts : _blogPosts.filter(p=>p.category===cat);
  renderBlogGrid(filtered);
}

async function abrirBlogPost(postId) {
  goTo('blog-post');
  const content = document.getElementById('blogPostContent');
  if(content) content.innerHTML = '<div style="text-align:center;padding:6rem;color:var(--muted)">Cargando...</div>';

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/blog_posts?id=eq.'+postId+'&select=*', {headers:h});
    const posts = await r.json();
    const post = posts?.[0];
    if(!post) throw new Error('Artículo no encontrado');
    _blogCurrentPost = post;
    renderBlogPost(post);
  } catch(e) {
    if(content) content.innerHTML = '<div style="text-align:center;padding:6rem;color:var(--muted)">Error: '+e.message+'</div>';
  }
}

function renderBlogPost(post) {
  const content = document.getElementById('blogPostContent');
  if(!content) return;
  const fecha = new Date(post.created_at).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'});

  let ex = {};
  try { ex = typeof post.content==='string' ? JSON.parse(post.content) : (post.content||{}); } catch(e){}

  function g(k) { return ex[k]||''; }

  function sec(titulo, texto, foto) {
    if(!titulo && !texto) return '';
    return '<div style="margin:2.5rem 0">'
      +(titulo?'<h2 style="font-family:var(--fd);font-size:1.5rem;color:#1C1A18;margin:0 0 1rem;line-height:1.2">'+titulo+'</h2>':'')
      +(foto?'<img src="'+foto+'" style="width:100%;border-radius:14px;margin-bottom:1.25rem;display:block;max-height:420px;object-fit:cover">':'')
      +(texto?'<p style="font-size:.95rem;color:#3A3530;line-height:1.9;white-space:pre-line;margin:0">'+texto+'</p>':'')
    +'</div>';
  }

  const spotifyEmbed = g('spotify') ? (() => { const m=g('spotify').match(/spotify\.com\/(episode|show|track)\/([A-Za-z0-9]+)/); return m?'https://open.spotify.com/embed/'+m[1]+'/'+m[2]+'?utm_source=generator&theme=0':null; })() : null;

  content.innerHTML =
    // Topbar
    '<div style="background:#fff;border-bottom:1px solid #e8e8e8;padding:.7rem 1.5rem;display:flex;align-items:center;gap:.75rem;position:sticky;top:70px;z-index:10">'
      +'<button onclick="goTo(\'blog\')" style="font-size:.8rem;color:var(--muted);background:none;border:1.5px solid var(--cream-dk);border-radius:100px;padding:.35rem .85rem;cursor:pointer;font-family:var(--fb)">← Blog</button>'
      +'<span style="font-size:.85rem;font-weight:600;color:#1C1A18;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+post.title+'</span>'
    +'</div>'
    // Hero
    +'<div style="position:relative;min-height:480px;background:#1C1A18;display:flex;align-items:flex-end;overflow:hidden">'
      +(post.cover_url?'<img src="'+post.cover_url+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.45">':'')
      +'<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(28,26,24,.97) 30%,rgba(28,26,24,.1))"></div>'
      +'<div style="position:relative;z-index:2;padding:3.5rem clamp(1.5rem,5vw,5rem);max-width:800px">'
        +(post.category?'<span style="font-size:.62rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);display:block;margin-bottom:.85rem">'+post.category+'</span>':'')
        +'<h1 style="font-family:var(--fd);font-size:clamp(1.9rem,4vw,3.2rem);color:#F0E8D8;margin:0 0 1rem;line-height:1.1">'+post.title+'</h1>'
        +(post.excerpt?'<p style="font-size:.95rem;color:rgba(240,232,216,.6);line-height:1.7;margin:0 0 1.5rem;max-width:560px">'+post.excerpt+'</p>':'')
        +'<div style="display:flex;align-items:center;gap:.85rem">'
          +'<div style="width:40px;height:40px;border-radius:50%;background:var(--teal);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.9rem;font-weight:700">'+(post.author||'M')[0].toUpperCase()+'</div>'
          +'<div><div style="font-size:.85rem;font-weight:600;color:#F0E8D8">'+(post.author||'Dra. Mariel Dobenau')+'</div>'
          +'<div style="font-size:.74rem;color:rgba(240,232,216,.45)">'+fecha+'</div></div>'
        +'</div>'
      +'</div>'
    +'</div>'
    // Contenido
    +'<div style="background:#fff;padding:3.5rem clamp(1.5rem,5vw,5rem)">'
      +'<div style="max-width:780px;margin:0 auto">'
        +(g('intro')?'<p style="font-size:1.05rem;color:#3A3530;line-height:1.9;white-space:pre-line;margin:0 0 2rem">'+g('intro')+'</p>':'')
        +sec(g('s1_titulo'),g('s1_texto'),g('s1_foto'))
        +sec(g('s2_titulo'),g('s2_texto'),g('s2_foto'))
        +sec(g('s3_titulo'),g('s3_texto'),g('s3_foto'))
        +(g('cita')?'<blockquote style="border-left:4px solid var(--teal);margin:2.5rem 0;padding:1.25rem 1.5rem;background:rgba(58,125,140,.05);border-radius:0 14px 14px 0;font-size:1.05rem;font-style:italic;color:#3A3530;line-height:1.75">'+g('cita')+'</blockquote>':'')
        +(g('conclusion')?'<div style="margin:2.5rem 0"><h2 style="font-family:var(--fd);font-size:1.5rem;color:#1C1A18;margin:0 0 1rem">Para cerrar</h2><p style="font-size:.95rem;color:#3A3530;line-height:1.9;white-space:pre-line;margin:0">'+g('conclusion')+'</p></div>':'')
        +(spotifyEmbed?'<div style="margin:2.5rem 0"><h3 style="font-family:var(--fd);font-size:1.1rem;color:#1C1A18;margin:0 0 .75rem">🎵 Escuchá el episodio</h3><iframe src="'+spotifyEmbed+'" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen" style="border-radius:12px"></iframe></div>':'')
        +(g('dl_url')?'<a href="'+g('dl_url')+'" target="_blank" download style="display:flex;align-items:center;gap:1rem;padding:1.1rem 1.4rem;background:rgba(58,125,140,.07);border:1.5px solid rgba(58,125,140,.25);border-radius:14px;text-decoration:none;margin:2rem 0;transition:.15s" onmouseover="this.style.background=\'rgba(58,125,140,.12)\'" onmouseout="this.style.background=\'rgba(58,125,140,.07)\'">'
          +'<div style="width:44px;height:44px;background:var(--teal);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">📄</div>'
          +'<div style="flex:1"><div style="font-weight:600;color:#1C1A18;font-size:.9rem">'+(g('dl_nombre')||'Descargar material')+'</div>'
          +(g('dl_size')?'<div style="font-size:.76rem;color:var(--muted)">'+g('dl_size')+'</div>':'')+'</div>'
          +'<span style="font-size:.82rem;font-weight:600;color:var(--teal)">Descargar ↓</span>'
        +'</a>':'')
        +(post.tags&&post.tags.length?'<div style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--cream-dk);display:flex;flex-wrap:wrap;gap:.5rem">'
          +post.tags.map(t=>'<span style="font-size:.72rem;font-weight:600;padding:.3rem .75rem;border-radius:100px;background:rgba(58,125,140,.08);color:var(--teal);border:1.5px solid rgba(58,125,140,.2)">#'+t+'</span>').join('')
        +'</div>':'')
      +'</div>'
    +'</div>'
    // CTA
    +'<section style="background:var(--teal);padding:4rem clamp(1.5rem,5vw,5rem);text-align:center">'
      +'<div style="max-width:560px;margin:0 auto">'
        +'<h2 style="font-family:var(--fd);font-size:2rem;color:#fff;margin:0 0 .75rem">¿Querés profundizar?</h2>'
        +'<p style="font-size:.9rem;color:rgba(255,255,255,.75);margin:0 0 1.75rem">Reservá una consulta con nuestras especialistas.</p>'
        +'<button onclick="goTo(\'turnos\')" style="padding:.9rem 2.5rem;border-radius:100px;font-family:var(--fb);font-size:.82rem;font-weight:600;background:#fff;color:var(--teal);border:none;cursor:pointer">Reservar turno</button>'
      +'</div>'
    +'</section>';
}
window.loadBlogPage   = loadBlogPage;
window.filterBlog     = filterBlog;
window.abrirBlogPost  = abrirBlogPost;

/* ── BLOG ADMIN ── */
let _admBlogPosts = [];

/* ── BLOG FIELDS MAPPING ── */
const BF = ['intro','s1_titulo','s1_texto','s1_foto','s2_titulo','s2_texto','s2_foto','s3_titulo','s3_texto','s3_foto','cita','conclusion','spotify','dl_nombre','dl_size','dl_url'];

function getBF(key) { return document.getElementById('bf_'+key)?.value || ''; }
function setBF(key, val) { const el=document.getElementById('bf_'+key); if(el) el.value=val||''; }

async function loadAdmBlog() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  const list = document.getElementById('admBlogList');
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/blog_posts?order=created_at.desc', {headers:h});
    _admBlogPosts = await r.json() || [];
    if(!_admBlogPosts.length) { if(list) list.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted)">Sin artículos. Creá el primero.</div>'; return; }
    if(list) list.innerHTML = _admBlogPosts.map(p => {
      const st = p.published
        ? '<span style="font-size:.68rem;font-weight:600;padding:.2rem .6rem;border-radius:100px;background:rgba(74,155,111,.1);color:#4A9B6F">Publicado</span>'
        : '<span style="font-size:.68rem;font-weight:600;padding:.2rem .6rem;border-radius:100px;background:rgba(138,127,116,.1);color:#8A7F74">Borrador</span>';
      return '<div style="background:#fff;border-radius:12px;border:1.5px solid var(--cream-dk);padding:.85rem 1.1rem;display:flex;align-items:center;gap:.85rem">'
        +(p.cover_url?'<img src="'+p.cover_url+'" style="width:64px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0">':'<div style="width:64px;height:48px;border-radius:8px;background:var(--cream);flex-shrink:0;display:flex;align-items:center;justify-content:center">✍️</div>')
        +'<div style="flex:1;min-width:0"><div style="font-weight:600;color:#1C1A18;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.title+'</div>'
        +'<div style="font-size:.73rem;color:var(--muted);margin-top:.15rem">'+(p.category||'Sin categoría')+' · '+new Date(p.created_at).toLocaleDateString('es-AR')+'</div></div>'
        +'<div style="display:flex;align-items:center;gap:.4rem">'+st
        +(p.featured?'<span style="font-size:.68rem;padding:.2rem .5rem;border-radius:100px;background:rgba(201,147,90,.1);color:var(--gold)">⭐</span>':'')
        +'<button onclick="openAdmBlogPost(\''+p.id+'\')" style="padding:.35rem .7rem;border-radius:8px;border:1.5px solid var(--cream-dk);background:#fff;cursor:pointer;font-size:.75rem;font-family:var(--fb)">Editar</button>'
        +'<button onclick="deleteAdmBlogPost(\''+p.id+'\')" style="width:28px;height:28px;border-radius:8px;border:1.5px solid #f0d0d0;background:#fff;cursor:pointer;font-size:.8rem">🗑</button>'
        +'</div></div>';
    }).join('');
  } catch(e) { if(list) list.innerHTML='<div style="color:var(--muted)">Error: '+e.message+'</div>'; }
}

function openAdmBlogPost(id) {
  const p = id ? _admBlogPosts.find(x=>x.id===id) : null;
  document.getElementById('admBlogId').value        = p?.id||'';
  document.getElementById('admBlogTitle').value     = p?.title||'';
  document.getElementById('admBlogExcerpt').value   = p?.excerpt||'';
  document.getElementById('admBlogCat').value       = p?.category||'';
  document.getElementById('admBlogAuthor').value    = p?.author||'Dra. Mariel Dobenau';
  document.getElementById('admBlogCover').value     = p?.cover_url||'';
  document.getElementById('admBlogTags').value      = (p?.tags||[]).join(', ');
  document.getElementById('admBlogPublished').value = p?.published?'true':'false';
  document.getElementById('admBlogFeatured').checked= !!(p?.featured);
  document.getElementById('admBlogModTitle').textContent = p ? 'Editar: '+p.title : 'Nuevo artículo';

  // Cargar campos de contenido
  let extra = {};
  try { extra = typeof p?.content === 'string' ? JSON.parse(p.content) : (p?.content || {}); } catch(e){}
  BF.forEach(k => setBF(k, extra[k]||''));

  updateBlogPreview();
  openAMod('admBlogMod');
}

async function saveAdmBlogPost() {
  const title = document.getElementById('admBlogTitle').value.trim();
  if(!title) { toast('El título es obligatorio','err'); return; }
  const id = document.getElementById('admBlogId').value;
  const tagsRaw = document.getElementById('admBlogTags').value.trim();
  const extra = {};
  BF.forEach(k => { const v=getBF(k); if(v) extra[k]=v; });

  const data = {
    title,
    excerpt:   document.getElementById('admBlogExcerpt').value.trim()||null,
    category:  document.getElementById('admBlogCat').value.trim()||null,
    author:    document.getElementById('admBlogAuthor').value.trim()||'Dra. Mariel Dobenau',
    cover_url: document.getElementById('admBlogCover').value.trim()||null,
    tags:      tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [],
    published: document.getElementById('admBlogPublished').value==='true',
    featured:  !!(document.getElementById('admBlogFeatured').checked),
    content:   JSON.stringify(extra),
    updated_at: new Date().toISOString(),
  };
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json', 'Prefer':'return=minimal' };
  try {
    if(id) await fetch(SUPABASE_URL+'/rest/v1/blog_posts?id=eq.'+id, {method:'PATCH',headers:h,body:JSON.stringify(data)});
    else   await fetch(SUPABASE_URL+'/rest/v1/blog_posts', {method:'POST',headers:h,body:JSON.stringify(data)});
    toast('Artículo guardado ✓','ok');
    _blogPosts = [];
    loadAdmBlog();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

async function deleteAdmBlogPost(id) {
  if(!confirm('¿Eliminar este artículo?')) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  await fetch(SUPABASE_URL+'/rest/v1/blog_posts?id=eq.'+id, {method:'DELETE',headers:h});
  _blogPosts = []; loadAdmBlog(); toast('Artículo eliminado','ok');
}

function getSpotifyEmbed(url) {
  const m = url.match(/spotify\.com\/(episode|show|track)\/([A-Za-z0-9]+)/);
  return m ? 'https://open.spotify.com/embed/'+m[1]+'/'+m[2]+'?utm_source=generator&theme=0' : null;
}

function updateBlogPreview() {
  const preview = document.getElementById('blogPostPreview');
  if(!preview) return;
  const title   = document.getElementById('admBlogTitle')?.value || 'Sin título';
  const excerpt = document.getElementById('admBlogExcerpt')?.value || '';
  const cat     = document.getElementById('admBlogCat')?.value || '';
  const author  = document.getElementById('admBlogAuthor')?.value || 'Dra. Mariel Dobenau';
  const cover   = document.getElementById('admBlogCover')?.value || '';

  function sec(titulo, texto, foto) {
    if(!titulo && !texto) return '';
    return '<div style="margin:2rem 0">'
      +(titulo?'<h2 style="font-family:var(--fd);font-size:1.35rem;color:#1C1A18;margin:0 0 .85rem;line-height:1.2">'+titulo+'</h2>':'')
      +(foto?'<img src="'+foto+'" style="width:100%;border-radius:12px;margin-bottom:1rem;display:block">':'')
      +(texto?'<p style="font-size:.9rem;color:#3A3530;line-height:1.85;white-space:pre-line;margin:0">'+texto+'</p>':'')
    +'</div>';
  }

  const spotify = getBF('spotify');
  const dlUrl   = getBF('dl_url');
  const cita    = getBF('cita');
  const concl   = getBF('conclusion');

  preview.innerHTML =
    // Hero mini
    '<div style="position:relative;min-height:200px;background:#1C1A18;display:flex;align-items:flex-end;overflow:hidden">'
      +(cover?'<img src="'+cover+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.4">':'')
      +'<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(28,26,24,.97) 25%,rgba(28,26,24,.1))"></div>'
      +'<div style="position:relative;z-index:2;padding:1.25rem">'
        +(cat?'<span style="font-size:.6rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);display:block;margin-bottom:.4rem">'+cat+'</span>':'')
        +'<h2 style="font-family:var(--fd);font-size:1.15rem;color:#F0E8D8;margin:0 0 .4rem;line-height:1.2">'+title+'</h2>'
        +'<div style="font-size:.7rem;color:rgba(240,232,216,.45)">'+author+'</div>'
      +'</div>'
    +'</div>'
    // Cuerpo
    +'<div style="padding:1.25rem">'
      +(excerpt?'<p style="font-size:.84rem;font-style:italic;color:#3A3530;border-left:3px solid var(--teal);padding-left:.85rem;margin:0 0 1.25rem;line-height:1.7">'+excerpt+'</p>':'')
      +(getBF('intro')?'<p style="font-size:.9rem;color:#3A3530;line-height:1.85;white-space:pre-line;margin:0 0 1.5rem">'+getBF('intro')+'</p>':'')
      +sec(getBF('s1_titulo'),getBF('s1_texto'),getBF('s1_foto'))
      +sec(getBF('s2_titulo'),getBF('s2_texto'),getBF('s2_foto'))
      +sec(getBF('s3_titulo'),getBF('s3_texto'),getBF('s3_foto'))
      +(cita?'<blockquote style="border-left:4px solid var(--teal);margin:1.5rem 0;padding:.85rem 1rem;background:rgba(58,125,140,.05);border-radius:0 10px 10px 0;font-size:.9rem;font-style:italic;color:#3A3530;line-height:1.7">'+cita+'</blockquote>':'')
      +(concl?'<div style="margin:1.5rem 0"><h2 style="font-family:var(--fd);font-size:1.15rem;color:#1C1A18;margin:0 0 .75rem">Para cerrar</h2><p style="font-size:.9rem;color:#3A3530;line-height:1.85;white-space:pre-line;margin:0">'+concl+'</p></div>':'')
      +(spotify&&getSpotifyEmbed(spotify)?'<div style="margin:1.5rem 0"><iframe src="'+getSpotifyEmbed(spotify)+'" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen" style="border-radius:12px" loading="lazy"></iframe></div>':'')
      +(dlUrl?'<a href="'+dlUrl+'" target="_blank" style="display:flex;align-items:center;gap:.85rem;padding:.85rem 1rem;background:rgba(58,125,140,.06);border:1.5px solid rgba(58,125,140,.2);border-radius:12px;text-decoration:none;margin:1rem 0">'
        +'<div style="width:36px;height:36px;background:var(--teal);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">📄</div>'
        +'<div><div style="font-weight:600;color:#1C1A18;font-size:.84rem">'+(getBF('dl_nombre')||'Descargar archivo')+'</div>'
        +(getBF('dl_size')?'<div style="font-size:.72rem;color:var(--muted)">'+getBF('dl_size')+'</div>':'')+'</div>'
        +'<span style="margin-left:auto;font-size:.75rem;font-weight:600;color:var(--teal)">Descargar ↓</span>'
      +'</a>':'')
    +'</div>';
}
window.updateBlogPreview = updateBlogPreview;
window.loadAdmBlog       = loadAdmBlog;
window.openAdmBlogPost   = openAdmBlogPost;
window.saveAdmBlogPost   = saveAdmBlogPost;
window.deleteAdmBlogPost = deleteAdmBlogPost;

/* ── SUPLEMENTOS ADMIN CRUD ── */
async function loadAdmSuplementos() {
  _suplementos = [];
  const supls = await loadSuplementos();
  const grid = document.getElementById('admSuplGrid');
  if(!grid) return;
  if(!supls.length) { grid.innerHTML = '<div style="color:var(--muted);font-size:.84rem;padding:1rem">Sin suplementos. Agregá el primero.</div>'; return; }
  grid.innerHTML = supls.map(s =>
    '<div style="background:#fff;border-radius:14px;border:1.5px solid var(--cream-dk);padding:1.1rem;display:flex;flex-direction:column;gap:.5rem">'
      +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem">'
        +'<div><div style="font-weight:600;color:#1C1A18;font-size:.92rem">'+s.nombre+'</div>'
        +(s.categoria?'<span style="font-size:.65rem;background:rgba(201,147,90,.12);color:var(--gold);padding:.1rem .45rem;border-radius:100px;font-weight:600">'+s.categoria+'</span>':'')+'</div>'
        +'<div style="display:flex;gap:.3rem;flex-shrink:0">'
          +'<button onclick="openAdmSupl(\''+s.id+'\')" style="width:28px;height:28px;border-radius:7px;border:1.5px solid var(--cream-dk);background:#fff;cursor:pointer;font-size:.8rem">✏️</button>'
          +'<button onclick="deleteAdmSupl(\''+s.id+'\')" style="width:28px;height:28px;border-radius:7px;border:1.5px solid #f0d0d0;background:#fff;cursor:pointer;font-size:.8rem">🗑</button>'
        +'</div></div>'
      +(s.dosis?'<div style="font-size:.78rem;color:var(--teal);font-weight:500">Dosis: '+s.dosis+'</div>':'')
      +(s.descripcion?'<div style="font-size:.78rem;color:var(--muted);line-height:1.5">'+s.descripcion+'</div>':'')
      +(s.marca?'<div style="font-size:.74rem;color:var(--muted)">Marca: '+s.marca+'</div>':'')
      +(s.link?'<a href="'+s.link+'" target="_blank" style="font-size:.72rem;color:var(--teal);text-decoration:none">Ver producto →</a>':'')
    +'</div>'
  ).join('');
}

function openAdmSupl(id) {
  const s = _suplementos.find(x=>x.id===id);
  document.getElementById('admSuplId').value     = s?.id||'';
  document.getElementById('admSuplNombre').value  = s?.nombre||'';
  document.getElementById('admSuplDosis').value   = s?.dosis||'';
  document.getElementById('admSuplMarca').value   = s?.marca||'';
  document.getElementById('admSuplCat').value     = s?.categoria||'';
  document.getElementById('admSuplDesc').value    = s?.descripcion||'';
  document.getElementById('admSuplLink').value    = s?.link||'';
  document.getElementById('admSuplModTitle').textContent = s ? 'Editar suplemento' : 'Nuevo suplemento';
  openAMod('admSuplMod');
}

async function saveAdmSupl() {
  const nombre = document.getElementById('admSuplNombre').value.trim();
  if(!nombre) { toast('El nombre es obligatorio','err'); return; }
  const id = document.getElementById('admSuplId').value;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json', 'Prefer':'return=minimal' };
  const data = { nombre, dosis:document.getElementById('admSuplDosis').value.trim()||null, marca:document.getElementById('admSuplMarca').value.trim()||null, categoria:document.getElementById('admSuplCat').value.trim()||null, descripcion:document.getElementById('admSuplDesc').value.trim()||null, link:document.getElementById('admSuplLink').value.trim()||null, activo:true };
  try {
    if(id) await fetch(`${SUPABASE_URL}/rest/v1/suplementos?id=eq.${id}`,{method:'PATCH',headers:h,body:JSON.stringify(data)});
    else   await fetch(`${SUPABASE_URL}/rest/v1/suplementos`,{method:'POST',headers:h,body:JSON.stringify(data)});
    toast('Suplemento guardado ✓','ok');
    closeAMod('admSuplMod');
    _suplementos = [];
    loadAdmSuplementos();
  } catch(e){ toast('Error: '+e.message,'err'); }
}

async function deleteAdmSupl(id) {
  if(!confirm('¿Eliminar este suplemento?')) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  await fetch(`${SUPABASE_URL}/rest/v1/suplementos?id=eq.${id}`,{method:'DELETE',headers:h});
  _suplementos = []; loadAdmSuplementos();
  toast('Suplemento eliminado','ok');
}

window.loadAdmSuplementos = loadAdmSuplementos;
window.openAdmSupl        = openAdmSupl;
window.saveAdmSupl        = saveAdmSupl;
window.deleteAdmSupl      = deleteAdmSupl;

/* ── NUTRI POR DÍA ── */
const DIAS_SEMANA_N = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function toggleNutriOffset() {
  const chk = document.getElementById('cIncluyeNutri');
  const wrap = document.getElementById('nutriOffsetWrap');
  if(wrap) wrap.style.display = chk?.checked ? '' : 'none';
}
window.toggleNutriOffset = toggleNutriOffset;

async function loadNutriDias() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  const wrap = document.getElementById('nutriDiasWrap');
  try {
    const [r1, r2] = await Promise.all([
      fetch(SUPABASE_URL+'/rest/v1/nutri_dias?order=dia_semana', {headers:h}).then(r=>r.json()),
      fetch(SUPABASE_URL+'/rest/v1/medicos?activo=eq.true&order=nombre&select=id,nombre', {headers:h}).then(r=>r.json())
    ]);
    const nutriMap = {};
    (Array.isArray(r1)?r1:[]).forEach(n => nutriMap[n.dia_semana] = n.medico_id);
    const medicos = Array.isArray(r2) ? r2 : [];
    const optsHtml = '<option value="">— Sin nutri —</option>' + medicos.map(m=>'<option value="'+m.id+'">'+m.nombre+'</option>').join('');

    wrap.innerHTML = [1,2,3,4,5,6,0].map(dia => {
      const sel = nutriMap[dia] || '';
      return '<div style="display:grid;grid-template-columns:130px 1fr;gap:.75rem;align-items:center;padding:.65rem .85rem;background:#fff;border-radius:10px;border:1.5px solid var(--cream-dk)">'
        +'<div style="font-weight:500;font-size:.88rem;color:#1C1A18">'+DIAS_SEMANA_N[dia]+'</div>'
        +'<select data-dia="'+dia+'" class="nutriDiaSel" style="padding:.4rem .65rem;border:1.5px solid var(--cream-dk);border-radius:8px;font-size:.82rem;font-family:var(--fb);outline:none;background:#fff">'
          +optsHtml.replace('value="'+sel+'"', 'value="'+sel+'" selected')
        +'</select>'
      +'</div>';
    }).join('');
  } catch(e) {
    if(wrap) wrap.innerHTML = '<div style="color:var(--muted)">Error: '+e.message+'</div>';
  }
}

async function guardarNutriDias() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json' };
  const rows = [...document.querySelectorAll('.nutriDiaSel')].map(sel => ({
    dia_semana: parseInt(sel.dataset.dia),
    medico_id:  sel.value || null
  }));
  try {
    // Delete all and reinsert
    await fetch(SUPABASE_URL+'/rest/v1/nutri_dias', { method:'DELETE', headers:h });
    const toInsert = rows.filter(r => r.medico_id);
    if(toInsert.length) {
      await fetch(SUPABASE_URL+'/rest/v1/nutri_dias', {
        method:'POST', headers:{...h,'Prefer':'return=minimal'}, body:JSON.stringify(toInsert)
      });
    }
    toast('Configuración guardada ✓','ok');
  } catch(e) { toast('Error: '+e.message,'err'); }
}

window.loadNutriDias    = loadNutriDias;
window.guardarNutriDias = guardarNutriDias;

/* ── TÉRMINOS Y CONDICIONES ADMIN ── */
async function loadATerminos() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/site_settings?key=eq.terminos_url&select=value&limit=1', {headers:h});
    const data = await r.json();
    const url = data?.[0]?.value;
    const wrap = document.getElementById('terminosActualUrl');
    const link = document.getElementById('terminosActualLink');
    if(url && wrap && link) {
      wrap.style.display = '';
      link.href = url;
      link.textContent = 'Ver documento actual →';
    }
  } catch(e) {}
}

function uploadTerminosPDF() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.pdf,application/pdf'; input.style.display = 'none';
  document.body.appendChild(input);
  input.onchange = async () => {
    const file = input.files[0];
    document.body.removeChild(input);
    if(!file) return;
    toast('Subiendo PDF...', 'info', 30000);
    try {
      const token = _authToken || localStorage.getItem('bh_token');
      const path = 'terminos-'+Date.now()+'.pdf';
      const rUp = await fetch(`${SUPABASE_URL}/storage/v1/object/site-media/${path}`, {
        method:'POST',
        headers:{ 'apikey':SUPABASE_ANON, 'Authorization':'Bearer '+token, 'Content-Type':'application/pdf' },
        body: file
      });
      if(!rUp.ok) { const e=await rUp.json().catch(()=>({})); throw new Error(e.error||e.message||'Error al subir'); }
      const url = `${SUPABASE_URL}/storage/v1/object/public/site-media/${path}`;
      document.getElementById('terminosUrlInput').value = url;
      await saveTerminosUrl();
    } catch(e) { toast('Error: '+e.message,'err'); }
  };
  input.click();
}

async function saveTerminosUrl() {
  const url = document.getElementById('terminosUrlInput').value.trim();
  if(!url) { toast('Ingresá o subí un PDF primero','err'); return; }
  const token = _authToken || localStorage.getItem('bh_token');
  const h = { 'apikey': SUPABASE_ANON, 'Authorization':'Bearer '+token, 'Content-Type':'application/json' };
  try {
    const rCheck = await fetch(SUPABASE_URL+'/rest/v1/site_settings?key=eq.terminos_url&select=id', {headers:h});
    const existing = await rCheck.json();
    if(Array.isArray(existing) && existing.length) {
      await fetch(SUPABASE_URL+'/rest/v1/site_settings?key=eq.terminos_url', {method:'PATCH', headers:{...h,'Prefer':'return=minimal'}, body:JSON.stringify({value:url})});
    } else {
      await fetch(SUPABASE_URL+'/rest/v1/site_settings', {method:'POST', headers:{...h,'Prefer':'return=minimal'}, body:JSON.stringify({key:'terminos_url',value:url})});
    }
    toast('✓ Términos actualizados','ok');
    loadATerminos();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

window.loadATerminos    = loadATerminos;
window.uploadTerminosPDF = uploadTerminosPDF;
window.saveTerminosUrl  = saveTerminosUrl;

/* ── HORARIOS POR MÉDICA ── */
const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const ALL_SLOTS_H = ['09:00','09:45','10:30','11:15','12:00','13:00','14:00','14:45','15:30','16:15','17:00','18:00'];

async function loadMedicoHorarios() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/medicos?activo=eq.true&select=id,nombre&order=nombre`, {headers:h});
  const medicos = await r.json() || [];
  const sel = document.getElementById('mhMedicoSel');
  if(!sel) return;
  sel.innerHTML = '<option value="">Seleccioná una médica...</option>'
    + medicos.map(m=>`<option value="${m.id}">${m.nombre}</option>`).join('');
}

async function loadMedicoHorariosDetalle() {
  const medicoId = document.getElementById('mhMedicoSel').value;
  const detalle  = document.getElementById('mhDetalle');
  if(!medicoId) { detalle.style.display='none'; return; }
  detalle.style.display = '';

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/medico_horarios?medico_id=eq.${medicoId}`, {headers:h});
  const horarios = await r.json() || [];
  const horariosMap = {};
  horarios.forEach(h2 => horariosMap[h2.dia_semana] = h2);

  const wrap = document.getElementById('mhDiasWrap');
  wrap.innerHTML = [1,2,3,4,5,6,0].map(dia => {
    const cfg     = horariosMap[dia] || {};
    const activo  = cfg.activo !== false;
    const desde   = cfg.hora_inicio || '09:00';
    const hasta   = cfg.hora_fin   || '17:00';
    return `<div style="display:grid;grid-template-columns:140px 100px 1fr 1fr;gap:1rem;align-items:center;padding:.7rem 1.25rem;border-top:1px solid var(--cream-dk)">
      <div style="font-size:.88rem;font-weight:500;color:#1C1A18">${DIAS_SEMANA[dia]}</div>
      <label style="display:flex;align-items:center;gap:.45rem;cursor:pointer">
        <input type="checkbox" data-dia="${dia}" class="mhActivo" ${activo?'checked':''} style="accent-color:var(--teal);width:16px;height:16px">
        <span style="font-size:.78rem;color:var(--muted)">${activo?'Sí':'No'}</span>
      </label>
      <select class="mhDesde" data-dia="${dia}" style="padding:.4rem .65rem;border:1.5px solid var(--cream-dk);border-radius:8px;font-size:.8rem;font-family:var(--fb);outline:none">
        ${ALL_SLOTS_H.map(s=>`<option value="${s}" ${s===desde?'selected':''}>${s}</option>`).join('')}
      </select>
      <select class="mhHasta" data-dia="${dia}" style="padding:.4rem .65rem;border:1.5px solid var(--cream-dk);border-radius:8px;font-size:.8rem;font-family:var(--fb);outline:none">
        ${ALL_SLOTS_H.map(s=>`<option value="${s}" ${s===hasta?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>`;
  }).join('');

  // Actualizar label cuando cambia checkbox
  wrap.querySelectorAll('.mhActivo').forEach(chk => {
    chk.onchange = () => {
      const label = chk.nextElementSibling;
      if(label) label.textContent = chk.checked ? 'Sí' : 'No';
    };
  });
}

async function guardarMedicoHorarios() {
  const medicoId = document.getElementById('mhMedicoSel').value;
  if(!medicoId) return;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json' };

  const rows = [...document.querySelectorAll('.mhActivo')].map(chk => ({
    medico_id:   medicoId,
    dia_semana:  parseInt(chk.dataset.dia),
    activo:      chk.checked,
    hora_inicio: document.querySelector('.mhDesde[data-dia="'+chk.dataset.dia+'"]')?.value || '09:00',
    hora_fin:    document.querySelector('.mhHasta[data-dia="'+chk.dataset.dia+'"]')?.value || '17:00',
  }));

  try {
    // Borrar registros existentes de esta médica y volver a insertar
    await fetch(`${SUPABASE_URL}/rest/v1/medico_horarios?medico_id=eq.${medicoId}`, {
      method: 'DELETE', headers: h
    });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/medico_horarios`, {
      method: 'POST',
      headers: { ...h, 'Prefer': 'return=minimal' },
      body: JSON.stringify(rows)
    });
    if(!r.ok) throw new Error((await r.json()).message || r.statusText);
    toast('Horarios guardados ✓', 'ok');
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

window.loadMedicoHorarios        = loadMedicoHorarios;
window.loadMedicoHorariosDetalle = loadMedicoHorariosDetalle;
window.guardarMedicoHorarios     = guardarMedicoHorarios;

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
