/* ── SELECCIÓN DE MÉDICA ── */
function bGoTo(n) {
  if (n === 2 && !BS.medicoId) { mostrarSeleccionMedica(); return; }
  _bGoTo(n);
}

function _bGoTo(n) {
  ['1','15','2','3','4'].forEach(i => {
    const el = document.getElementById('bstep'+i);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById('bstep'+n);
  if (target) target.style.display = '';

  // Update stepper indicators
  const stepMap = {1:'si1', 15:'si15', 2:'si2', 3:'si3', 4:'si4'};
  const stepOrder = [1, 15, 2, 3, 4];
  const currentIdx = stepOrder.indexOf(n);
  stepOrder.forEach((s, idx) => {
    const si = document.getElementById(stepMap[s]);
    if(!si) return;
    si.classList.remove('active','done');
    if(idx === currentIdx) si.classList.add('active');
    else if(idx < currentIdx) si.classList.add('done');
  });

  if (n===2) renderCal();
  if (n===4) updateSenaAmount();
}

async function mostrarSeleccionMedica() {
  // Mostrar paso 1.5, ocultar el resto
  ['1','2','3','4'].forEach(i => {
    const el = document.getElementById('bstep'+i);
    if (el) el.style.display = 'none';
  });
  document.getElementById('bstep15').style.display = '';
  document.getElementById('bstep15sub').textContent = 'Consulta: ' + (TIPO_NAMES[BS.tipo] || BS.tipo);
  // Update stepper
  ['si1','si15','si2','si3','si4'].forEach((id,idx) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('active','done');
    if(idx === 1) el.classList.add('active');
    else if(idx < 1) el.classList.add('done');
  });
  document.getElementById('si1')?.classList.remove('active');
  document.getElementById('si1')?.classList.add('done');
  document.getElementById('si15')?.classList.add('active');

  const grid = document.getElementById('bstep15Grid');
  grid.innerHTML = '<div style="color:var(--muted);font-size:.84rem">Cargando...</div>';

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON };

  try {
    // Médicas asignadas a esta consulta
    const url = SUPABASE_URL + '/rest/v1/medico_consultas?consulta_id=eq.' + encodeURIComponent(BS.tipo) + '&select=medico_id,precio';
    const r1 = await fetch(url, { headers: h });
    const mc = await r1.json();

    // Si no hay médicas asignadas, usar todas las activas
    let medicoIds, precios = {};
    if (Array.isArray(mc) && mc.length) {
      medicoIds = mc.map(x => x.medico_id);
      mc.forEach(x => { if (x.precio) precios[x.medico_id] = x.precio; });
    } else {
      const r0 = await fetch(SUPABASE_URL + '/rest/v1/medicos?activo=eq.true&select=id', { headers: h });
      const all = await r0.json();
      medicoIds = Array.isArray(all) ? all.map(m => m.id) : [];
    }

    if (!medicoIds.length) {
      // No hay médicas en absoluto → saltar al calendario
      volverAlStep1();
      _bGoTo(2);
      return;
    }

    // Datos de las médicas
    const r2 = await fetch(SUPABASE_URL + '/rest/v1/medicos?id=in.(' + medicoIds.join(',') + ')&activo=eq.true&select=id,nombre,color,especialidad&order=nombre', { headers: h });
    const meds = await r2.json();

    if (!Array.isArray(meds) || !meds.length) {
      volverAlStep1(); _bGoTo(2); return;
    }

    grid.innerHTML = meds.map(m => {
      const precio = precios[m.id] || BS.precio || 0;
      const color  = m.color || '#3A7D8C';
      const inicial = (m.nombre || '?')[0];
      return '<button onclick="elegirMedicaInline(\'' + m.id + '\',\'' + m.nombre.replace(/'/g, '') + '\',' + precio + ',\'' + color + '\')"'
        + ' style="background:#fff;border:2px solid #e8e8e8;border-radius:14px;padding:1.25rem 1rem;'
        + 'text-align:center;cursor:pointer;font-family:var(--fb);width:100%;transition:.15s;display:block"'
        + ' onmouseover="this.style.borderColor=\'' + color + '\'"'
        + ' onmouseout="this.style.borderColor=\'#e8e8e8\'">'
        + '<div style="width:56px;height:56px;border-radius:50%;background:' + color + '20;border:2.5px solid ' + color + ';'
        + 'margin:0 auto .65rem;display:flex;align-items:center;justify-content:center;'
        + 'font-size:1.3rem;font-weight:700;color:' + color + '">' + inicial + '</div>'
        + '<div style="font-weight:700;font-size:.88rem;color:#1C1A18;margin-bottom:.15rem">' + m.nombre + '</div>'
        + (m.especialidad ? '<div style="font-size:.72rem;color:#888;margin-bottom:.4rem">' + m.especialidad + '</div>' : '')
        + (precio ? '<div style="font-family:var(--fd);font-size:1.05rem;color:' + color + ';font-weight:700">' + fmt(precio) + '</div>' : '')
        + '</button>';
    }).join('');

  } catch (e) {
    console.error('mostrarSeleccionMedica error:', e);
    volverAlStep1(); _bGoTo(2);
  }
}

function volverAlStep1() {
  document.getElementById('bstep15').style.display = 'none';
  document.getElementById('bstep1').style.display = '';
}

function elegirMedicaInline(medicoId, medicoNombre, precio, color) {
  BS.medicoId     = medicoId;
  BS.medicoNombre = medicoNombre;
  BS.precio       = precio || BS.precio;
  BS.medicoColor  = color;
  BS.fecha = null;
  BS.hora  = null;
  BS.calY  = new Date().getFullYear();
  BS.calM  = new Date().getMonth();
  BS.diasPermitidos = null;

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };

  Promise.all([
    fetch(SUPABASE_URL+'/rest/v1/medico_consultas?medico_id=eq.'+medicoId+'&consulta_id=eq.'+BS.tipo+'&select=dias_presencial,dias_virtual', {headers:h}).then(r=>r.json()),
    fetch(SUPABASE_URL+'/rest/v1/medico_horarios?medico_id=eq.'+medicoId, {headers:h}).then(r=>r.json())
  ]).then(function(results) {
    var mc = results[0], hs = results[1];
    if(Array.isArray(mc) && mc.length) {
      const row = mc[0];
      // Elegir días según la modalidad seleccionada
      const diasArr = BS.modalidad === 'virtual' ? row.dias_virtual : row.dias_presencial;
      if(diasArr && diasArr.length > 0 && diasArr.length < 7)
        BS.diasPermitidos = diasArr.map(Number);
      else
        BS.diasPermitidos = null;
    }
    if(!window._medicoHorariosCache) window._medicoHorariosCache = {};
    window._medicoHorariosCache[medicoId] = {};
    if(Array.isArray(hs)) hs.forEach(function(cfg){ window._medicoHorariosCache[medicoId][cfg.dia_semana] = cfg.activo; });
    renderCal();
  }).catch(function(){ renderCal(); });

  updateSum();
  ['1','15','3','4'].forEach(function(i){
    var el = document.getElementById('bstep'+i);
    if(el) el.style.display = 'none';
  });
  var s2 = document.getElementById('bstep2');
  if(s2) s2.style.display = '';
  var sw = document.getElementById('slotsWrap');
  if(sw) sw.style.display = 'none';
  _bGoTo(2);
}


window.bGoTo             = bGoTo;
window._bGoTo            = _bGoTo;
window.volverAlStep1     = volverAlStep1;
window.elegirMedicaInline = elegirMedicaInline;

function renderCal(){
  const {calY:y,calM:m}=BS;
  document.getElementById('calMonth').textContent=MONTHS[m]+' '+y;
  const grid=document.getElementById('calGrid');
  const today=new Date(); today.setHours(0,0,0,0);
  const firstDay=new Date(y,m,1).getDay();
  const dim=new Date(y,m+1,0).getDate();
  let h=DAYS.map(d=>'<div class="cal-dayname">'+d+'</div>').join('');
  for(let i=0;i<firstDay;i++) h+='<div class="cal-day empty"></div>';
  for(let d=1;d<=dim;d++){
    const dt=new Date(y,m,d); const ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const isT=dt.getTime()===today.getTime();
    const noAtiende = BS.medicoId && window._medicoHorariosCache &&
      window._medicoHorariosCache[BS.medicoId] &&
      window._medicoHorariosCache[BS.medicoId][dt.getDay()] === false;
    const diaNoPermitido = BS.diasPermitidos && BS.diasPermitidos.length > 0 &&
      !BS.diasPermitidos.map(Number).includes(dt.getDay());
    const dis = dt<today || dt.getDay()===0 || noAtiende || diaNoPermitido;
    const sel=BS.fecha===ds;
    h+='<div class="cal-day'+(isT?' today':'')+(dis?' disabled':'')+(sel?' selected':'')+'" onclick="'+(dis?'':'selDate(\''+ds+'\')')+'">'+(d)+'</div>';
  }
  grid.innerHTML=h;
}
function calPrev(){ BS.calM--; if(BS.calM<0){BS.calM=11;BS.calY--;} BS.fecha=null;BS.hora=null; renderCal(); document.getElementById('slotsWrap').style.display='none'; }
function calNext(){ BS.calM++; if(BS.calM>11){BS.calM=0;BS.calY++;} BS.fecha=null;BS.hora=null; renderCal(); document.getElementById('slotsWrap').style.display='none'; }
function selSlot(btn,h){
  document.querySelectorAll('.slot').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected'); BS.hora=h;
  const b2=document.getElementById('btnBs2');
  if(b2){ b2.disabled=false; b2.style.opacity='1'; b2.style.cursor='pointer'; }
  updateSum();
}
window.calPrev = calPrev;
window.calNext = calNext;
window.selSlot = selSlot;

async function selDate(ds){
  BS.fecha=ds; BS.hora=null; BS.nutriNombre=null; renderCal(); updateSum();

  // Cargar nutri del día si la consulta lo requiere
  const hNutri = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
  fetch(SUPABASE_URL+'/rest/v1/consultation_types?id=eq.'+BS.tipo+'&select=incluye_nutri,offset_nutri_minutos', {headers:hNutri})
    .then(r=>r.json()).then(async ct => {
      if(!ct?.[0]?.incluye_nutri) return;
      BS.nutriOffset = ct[0].offset_nutri_minutos || 30;
      const diaSem = new Date(ds+'T12:00:00').getDay();
      const rN = await fetch(SUPABASE_URL+'/rest/v1/nutri_dias?dia_semana=eq.'+diaSem+'&select=medico_id', {headers:hNutri});
      const nd = await rN.json();
      if(!nd?.[0]?.medico_id) return;
      const rM = await fetch(SUPABASE_URL+'/rest/v1/medicos?id=eq.'+nd[0].medico_id+'&select=nombre', {headers:hNutri});
      const mm = await rM.json();
      BS.nutriNombre = mm?.[0]?.nombre;
      updateSum();
    }).catch(()=>{});
  const sw=document.getElementById('slotsWrap'); sw.style.display='block';
  const [,mm,dd]=ds.split('-');
  document.getElementById('slotsTitle').textContent='Horarios para el '+parseInt(dd)+' de '+MONTHS[parseInt(mm)-1];

  const ALL_SLOTS=['09:00','09:45','10:30','11:15','12:00','14:00','14:45','15:30','16:15','17:00'];
  const grid = document.getElementById('slotsGrid');
  grid.innerHTML='<div style="font-size:.78rem;color:var(--muted);grid-column:1/-1">Cargando...</div>';

  let ocupados=[], bloqueados=[], todoBloqueado=false;
  let slotsPermitidos = [...ALL_SLOTS];

  try {
    const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };

    // Traer turnos del día con duración de la consulta
    let apptUrl = SUPABASE_URL+'/rest/v1/appointments?date=eq.'+ds+'&select=time,type&status=neq.cancelled';
    if(BS.medicoId) apptUrl += '&medico_id=eq.'+BS.medicoId;
    const r1 = await fetch(apptUrl, {headers:h});
    const appts = await r1.json();

    // Traer duraciones de los tipos de consulta
    const rCt = await fetch(SUPABASE_URL+'/rest/v1/consultation_types?select=id,duracion', {headers:h});
    const ctList = await rCt.json();
    const durMap = {};
    (Array.isArray(ctList)?ctList:[]).forEach(ct => {
      // Parsear duración: "60 min" → 60, "30 min" → 30
      const m = (ct.duracion||'').match(/(\d+)/);
      durMap[ct.id] = m ? parseInt(m[1]) : 30;
    });

    // Para cada turno, bloquear todos los slots dentro de su duración
    const ocupadosSet = new Set();
    (Array.isArray(appts)?appts:[]).forEach(a => {
      const timeStr = (a.time||'').slice(0,5);
      if(!timeStr) return;
      const [hh,mm] = timeStr.split(':').map(Number);
      const dur = durMap[a.type] || 30;
      // Bloquear desde el inicio hasta el fin del turno
      ALL_SLOTS.forEach(slot => {
        const [sh,sm] = slot.split(':').map(Number);
        const slotMin  = sh*60+sm;
        const startMin = hh*60+mm;
        const endMin   = startMin+dur;
        // Slot está ocupado si cae dentro del rango [start, end)
        if(slotMin >= startMin && slotMin < endMin) {
          ocupadosSet.add(slot);
        }
      });
    });
    ocupados = [...ocupadosSet];

    let blockUrl = SUPABASE_URL+'/rest/v1/blocked_slots?date=eq.'+ds+'&select=time,todo_el_dia';
    if(BS.medicoId) blockUrl += '&or=(medico_id.eq.'+BS.medicoId+',medico_id.is.null)';
    const r2 = await fetch(blockUrl, {headers:h});
    const blocks = await r2.json();
    if(Array.isArray(blocks) && blocks.some(b=>b.todo_el_dia)) todoBloqueado=true;
    else bloqueados = Array.isArray(blocks) ? blocks.map(b=>(b.time||'').slice(0,5)).filter(Boolean) : [];

    // Horario personalizado de la médica
    if(BS.medicoId) {
      const diaSemana = new Date(ds+'T12:00:00').getDay();
      const rh = await fetch(SUPABASE_URL+'/rest/v1/medico_horarios?medico_id=eq.'+BS.medicoId+'&dia_semana=eq.'+diaSemana, {headers:h});
      const hs = await rh.json();
      if(Array.isArray(hs) && hs.length) {
        const cfg = hs[0];
        if(cfg.activo === false) {
          grid.innerHTML='<div style="font-size:.82rem;color:#C4614A;grid-column:1/-1;background:rgba(196,97,74,.08);padding:.75rem 1rem;border-radius:10px">🚫 La profesional no atiende este día</div>';
          return;
        }
        if(cfg.hora_inicio && cfg.hora_fin) {
          slotsPermitidos = ALL_SLOTS.filter(s=>s>=cfg.hora_inicio && s<=cfg.hora_fin);
        }
      }
    }
  } catch(e){ console.warn('selDate error:', e.message); }

  if(todoBloqueado){
    grid.innerHTML='<div style="font-size:.82rem;color:#C4614A;grid-column:1/-1;background:rgba(196,97,74,.08);padding:.75rem 1rem;border-radius:10px">🚫 Este día no tiene turnos disponibles</div>';
    return;
  }

  grid.innerHTML=slotsPermitidos.map(s=>{
    const noDisp=ocupados.includes(s)||bloqueados.includes(s);
    const label=ocupados.includes(s)?s+' (ocupado)':bloqueados.includes(s)?s+' (no disp.)':s;
    return '<button class="slot'+(noDisp?' disabled':'')+'" '
      +(noDisp?'disabled style="opacity:.35;cursor:not-allowed;text-decoration:line-through"':'')
      +' onclick="'+(noDisp?'':'selSlot(this,\''+s+'\')')+'">'+(label)+'</button>';
  }).join('');
}
window.selDate = selDate;

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

  // Mostrar info de nutri si aplica
  const nutriRow = document.getElementById('sumNutriRow');
  if(nutriRow) {
    if(BS.hora && BS.nutriNombre) {
      const [hh,mm] = BS.hora.split(':').map(Number);
      const offset = BS.nutriOffset || 30;
      const nd = new Date(2000,0,1,hh,mm+offset);
      const nutriHora = nd.getHours().toString().padStart(2,'0')+':'+nd.getMinutes().toString().padStart(2,'0');
      nutriRow.style.display = '';
      nutriRow.querySelector('.nutri-val').textContent = 'Con '+BS.nutriNombre+' a las '+nutriHora+' hs';
    } else {
      nutriRow.style.display = 'none';
    }
  }
}

// Consultas que requieren paciente previo — se carga dinámicamente desde Supabase
// Este array es el fallback si no hay conexión
const CONSULTAS_SOLO_PREVIOS = ['espontanea'];

async function validarYContinuar() {
  const nom   = document.getElementById('pNombre').value.trim();
  const email = document.getElementById('pEmail').value.trim();
  const tel   = document.getElementById('pTel').value.trim();
  if(!nom||!email||!tel){ toast('Completá nombre, email y teléfono','err'); return; }

  const btn = document.getElementById('btnToStep4');
  btn.disabled = true; btn.textContent = 'Verificando...';

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };

  try {
    // Verificar si esta consulta requiere paciente previo
    let requierePrevio = CONSULTAS_SOLO_PREVIOS.includes(BS.tipo);

    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/consultation_types?id=eq.${BS.tipo}&select=solo_pacientes_previos`, {headers:h});
      const cts = await r.json();
      if(cts?.[0]) requierePrevio = !!cts[0].solo_pacientes_previos;
    } catch(e) {}

    if(requierePrevio) {
      // Verificar si tiene ficha médica con ese email
      // Verificar si tiene turnos anteriores confirmados O ficha médica
      const [r2, r3] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/fichas_medicas?patient_email=eq.${encodeURIComponent(email)}&select=id&limit=1`, {headers:h}),
        fetch(`${SUPABASE_URL}/rest/v1/appointments?patient_email=eq.${encodeURIComponent(email)}&status=in.(confirmed,completed)&select=id&limit=1`, {headers:h})
      ]);
      const fichas = await r2.json();
      const prevAppts = await r3.json();
      const esPrevio = (Array.isArray(fichas) && fichas.length > 0) || (Array.isArray(prevAppts) && prevAppts.length > 0);

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

    btn.disabled = false; btn.textContent = 'Continuar → Seña';
    bGoTo(4);

  } catch(e) {
    btn.disabled = false; btn.textContent = 'Continuar → Seña';
    toast('Error al verificar: '+e.message, 'err');
  }
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
    medico_id:     BS.medicoId || null,
    transfer_name: apellido,
  };

  const hFetch = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON, 'Content-Type':'application/json', 'Prefer':'return=representation' };

  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/appointments', {
      method: 'POST', headers: hFetch, body: JSON.stringify(apptData)
    });
    if(!r.ok) { const err = await r.json(); throw new Error(err.message||r.statusText); }
    const [appt] = await r.json();

    // Crear turno de nutri automáticamente si la consulta lo requiere
    try {
      const hAnon = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON, 'Content-Type':'application/json', 'Prefer':'return=minimal' };
      const rCt = await fetch(SUPABASE_URL+'/rest/v1/consultation_types?id=eq.'+BS.tipo+'&select=incluye_nutri,offset_nutri_minutos', {headers:hAnon});
      const ctData = await rCt.json();
      const ct = ctData?.[0];
      console.log('[NUTRI] incluye_nutri:', ct?.incluye_nutri, 'tipo:', BS.tipo);
      if(ct?.incluye_nutri) {
        const diaSem = new Date(BS.fecha+'T12:00:00').getDay();
        const rN = await fetch(SUPABASE_URL+'/rest/v1/nutri_dias?dia_semana=eq.'+diaSem+'&select=medico_id', {headers:hAnon});
        const nutriData = await rN.json();
        const nutriId = nutriData?.[0]?.medico_id;
        console.log('[NUTRI] diaSem:', diaSem, 'nutriId:', nutriId);
        if(nutriId) {
          const [hh,mm2] = BS.hora.split(':').map(Number);
          const offset = ct.offset_nutri_minutos || 30;
          const nd = new Date(2000,0,1,hh,mm2+offset);
          const nutriHora = nd.getHours().toString().padStart(2,'0')+':'+nd.getMinutes().toString().padStart(2,'0');
          const rNutri = await fetch(SUPABASE_URL+'/rest/v1/appointments', {
            method: 'POST', headers: hAnon,
            body: JSON.stringify({
              type: BS.tipo, date: BS.fecha, time: nutriHora+':00',
              modalidad: BS.modalidad||'presencial', status: 'confirmed',
              patient_name: nom+' '+apellido, patient_email: email, patient_phone: tel,
              medico_id: nutriId, price: 0, notes: 'Turno nutri automatico', sena_status: 'approved'
            })
          });
          if(!rNutri.ok) console.warn('[NUTRI] Error:', await rNutri.text());
          else console.log('[NUTRI] Turno creado OK a las', nutriHora);
        }
      }
    } catch(e2) { console.warn('[NUTRI] Exception:', e2.message); }

    // Crear ficha si no existe (en segundo plano)
    setTimeout(async () => {
      try {
        const rF = await fetch(SUPABASE_URL+'/rest/v1/fichas_medicas?patient_email=eq.'+encodeURIComponent(email)+'&select=id&limit=1', {headers:hFetch});
        const fe = await rF.json();
        if(!fe||!fe.length) {
          await fetch(SUPABASE_URL+'/rest/v1/fichas_medicas', {
            method:'POST', headers:hFetch,
            body: JSON.stringify({ patient_name:nom, patient_email:email, patient_phone:tel })
          });
        }
      } catch(e2){}
    }, 500);

    // Email al paciente — turno pendiente
    const [,mm2,dd2] = BS.fecha.split('-');
    const fStr = parseInt(dd2)+' de '+MONTHS[parseInt(mm2)-1]+' '+BS.fecha.split('-')[0];
    emailTurnoPendiente(nom, email, fStr, BS.hora, TIPO_NAMES[BS.tipo]||BS.tipo, fmt(sena), fmt(precio), apellido);

    // Email a Mariel — nuevo turno pendiente de seña
    sendEmail('behuman.medicinafuncional@gmail.com',
      'Nuevo turno pendiente · ' + (TIPO_NAMES[BS.tipo]||BS.tipo),
      '<div style="font-family:Arial,sans-serif;padding:24px;max-width:500px">'
      +'<h2 style="color:#1C1A18;font-family:Georgia,serif">Nuevo turno pendiente de seña</h2>'
      +'<p><strong>Consulta:</strong> '+(TIPO_NAMES[BS.tipo]||BS.tipo)+'</p>'
      +'<p><strong>Paciente:</strong> '+nom+' '+apellido+'</p>'
      +'<p><strong>Email:</strong> '+email+'</p>'
      +'<p><strong>Fecha:</strong> '+fStr+' a las '+BS.hora+' hs</p>'
      +'<p><strong>Seña:</strong> '+fmt(sena)+'</p>'
      +'<p style="margin-top:1rem"><a href="https://iglesiastech-behuman.vercel.app" style="background:#3A7D8C;color:#fff;padding:10px 20px;border-radius:100px;text-decoration:none;font-weight:600">Ir al panel admin →</a></p>'
      +'</div>'
    );

    showConfirmacionSena(nom, email, sena, fechaStr, precio);

  } catch(e){
    console.error('Error al guardar turno:', e);
    btn.disabled = false;
    btn.textContent = 'Confirmar y pagar seña ✓';
    toast('Error: ' + (e.message||'No se pudo guardar el turno.'), 'err', 6000);
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

/* ── FUNCIONES FALTANTES ── */
/* openATurno definida en la sección admin */
function openBlockModal() {
  // Scroll al formulario de bloqueo rápido en el calendario
  document.getElementById('bqDate')?.scrollIntoView({behavior:'smooth'});
  document.getElementById('bqDate')?.focus();
}
/* filterTienda y sortTienda definidas arriba */
let ckPayMethod = 'mp';
let ckCuotas = 1;

function selPay(method, el){
  ckPayMethod = method;
  document.querySelectorAll('.pay-method').forEach(m=>m.classList.remove('selected'));
  if(el) el.classList.add('selected');
  const ckCuotasEl = document.getElementById('ck-cuotas');
  const ckTransEl  = document.getElementById('ck-transfer');
  if(ckCuotasEl) ckCuotasEl.style.display = method==='mp' ? '' : 'none';
  if(ckTransEl)  ckTransEl.style.display  = method==='transferencia' ? '' : 'none';
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
    const token = localStorage.getItem('bh_token');
    const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(token||SUPABASE_ANON) };
    const rP = await fetch(SUPABASE_URL+'/rest/v1/profiles?id=eq.'+user.id+'&select=rol,full_name&limit=1', {headers:h});
    const pd = await rP.json();
    const profile = Array.isArray(pd) ? pd[0] : null;

    const rol    = profile?.rol || 'user';
    const nombre = profile?.full_name?.split(' ')[0] || user.email;
    _userRol = rol;

    if(rol === 'super_admin' || rol === 'medica'){
      setLoginLoading(true, '¡Bienvenida!');
      localStorage.setItem('bh_admin_session', JSON.stringify({
        email: user.email, id: user.id, name: profile?.full_name || user.email
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

  if(!nom||!email||!p1){ showErr('Completá todos los campos'); return; }
  if(p1 !== p2)         { showErr('Las contraseñas no coinciden'); return; }
  if(p1.length < 6)     { showErr('La contraseña debe tener al menos 6 caracteres'); return; }

  const btn = document.getElementById('rBtn');
  btn.disabled = true; btn.textContent = 'Creando cuenta...';

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: p1, data: { full_name: nom } })
    });
    const data = await res.json();

    if(!res.ok) {
      const msgs = {
        'User already registered': 'Ya existe una cuenta con ese email. Iniciá sesión.',
        'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
        'email rate limit exceeded': 'Demasiados intentos. Esperá unos minutos.',
      };
      throw new Error(msgs[data.msg||data.error_description] || data.msg || data.error_description || 'Error al crear la cuenta');
    }

    if(data.access_token) {
      // Sin verificación de email — loguear directo
      _authToken = data.access_token;
      localStorage.setItem('bh_token', data.access_token);
      if(data.refresh_token) localStorage.setItem('bh_refresh', data.refresh_token);
      // Crear perfil
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+data.access_token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ id: data.user.id, full_name: nom, email })
        });
      } catch(e2) {}
      await afterLogin(data.user);

    } else if(data.id || (data.user && data.user.id)) {
      // Requiere confirmación de email
      const userId = data.id || data.user?.id;
      document.getElementById('loginErr').style.display = 'none';
      const div = document.createElement('div');
      div.style.cssText = 'background:rgba(74,155,111,.08);border:1.5px solid rgba(74,155,111,.2);border-radius:12px;padding:1rem 1.1rem;font-size:.84rem;color:#2E7A52;line-height:1.65;margin-top:1rem;text-align:center';
      div.innerHTML = '✅ <strong>¡Cuenta creada!</strong><br>Te enviamos un email a <strong>'+email+'</strong>.<br><span style="font-size:.78rem">Revisá tu bandeja de entrada y spam, y hacé clic en el link de confirmación.</span>';
      btn.parentElement.insertBefore(div, btn.nextSibling);
    } else {
      throw new Error('Respuesta inesperada. Intentá de nuevo.');
    }
  } catch(e) {
    showErr(e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Crear cuenta';
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
/* ══ ADMIN JS ══ */
const ATITLES = {dash:'Dashboard',fotos:'Fotos del sitio',turnos:'Turnos',senas:'Señas y transferencias',fichas:'Fichas médicas','programas-adm':'Programas','ordenes-programas':'Órdenes de programas',usuarios:'Usuarios',suplementos:'Suplementos',blog:'Blog',testis:'Testimonios',calendario:'Calendario','medico-horarios':'Horarios por médica','nutri-dias':'Nutri por día',horarios:'Horarios bloqueados',consultas:'Tipos de consulta',terminos:'Términos y condiciones'};

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
  if (id==='horarios')          loadABlocked();
  if (id==='medico-horarios')   loadMedicoHorarios();
  if (id==='nutri-dias')        loadNutriDias();
  if (id==='calendario')    initCalendario();
  if (id==='consultas')     loadAConsultas();
  if (id==='terminos')      loadATerminos();
  if (id==='programas-adm')    loadAPrograms();
  if (id==='ordenes-programas') loadOrdenesProgramas();
  if (id==='usuarios')          loadUsuarios();
  if (id==='suplementos')       loadAdmSuplementos();
  if (id==='blog')              loadAdmBlog();
  if (id==='dash')     loadADash();
}
