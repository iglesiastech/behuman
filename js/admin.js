/* ── SEÑAS ── */
const SENA_STATUS_LABELS = { pending:'Pendiente', approved:'Aprobada', rejected:'Rechazada' };
const TURNO_STATUS_LABELS = { pending:'Pendiente', pending_payment:'Esperando pago', pending_transfer:'Esperando transferencia', confirmed:'Confirmado', cancelled:'Cancelado', completed:'Completado' };

async function loadASenas() {
  const filterStatus = document.getElementById('senaFilterStatus')?.value || '';
  const today = new Date().toISOString().split('T')[0];
  const h = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + (_authToken || SUPABASE_ANON),
    'Content-Type': 'application/json'
  };

  try {
    // Pendientes
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/appointments?sena_method=eq.transferencia&sena_status=eq.pending&order=created_at.desc`, {headers:h});
    const pend = await r1.json();

    // Aprobadas hoy
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/appointments?sena_status=eq.approved&updated_at=gte.${today}&select=sena_amount`, {headers:h});
    const aprovHoy = await r2.json();

    // Todas aprobadas (para monto total)
    const r3 = await fetch(`${SUPABASE_URL}/rest/v1/appointments?sena_status=eq.approved&select=sena_amount`, {headers:h});
    const allAprov = await r3.json();

    // Historial con filtro opcional
    const filterQ = filterStatus ? `&sena_status=eq.${filterStatus}` : '';
    const r4 = await fetch(`${SUPABASE_URL}/rest/v1/appointments?sena_method=neq.null${filterQ}&order=created_at.desc`, {headers:h});
    const hist = await r4.json();

    const pendCount = Array.isArray(pend) ? pend.length : 0;
    const el_sp = document.getElementById('sSenaPend');
    const el_sa = document.getElementById('sSenaAprov');
    const el_sm = document.getElementById('sSenaMonto');
    const el_pb = document.getElementById('pendBadgeCount');
    const badge = document.getElementById('senasBadge');

    if(el_sp) el_sp.textContent = pendCount;
    if(el_sa) el_sa.textContent = Array.isArray(aprovHoy) ? aprovHoy.length : 0;
    if(el_sm) el_sm.textContent = fmt((Array.isArray(allAprov)?allAprov:[]).reduce((s,r)=>s+(r.sena_amount||0),0));
    if(el_pb) el_pb.textContent = pendCount;
    if(badge){ badge.textContent=pendCount; badge.style.display=pendCount>0?'':'none'; }

    renderSPend(Array.isArray(pend) ? pend : []);
    renderSHist(Array.isArray(hist) ? hist : []);

  } catch(e) {
    const tb = document.getElementById('sPendBody');
    if(tb) tb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--muted)">Error: ${e.message}</td></tr>`;
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
    const headers = {
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + (_authToken || SUPABASE_ANON),
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sena_status: 'approved',
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
      }
    );

    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.message || res.statusText);
    }

    // Email confirmación al paciente
    try {
      const rAppt = await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}&select=patient_name,patient_email,date,time,type`, {headers});
      const appts = await rAppt.json();
      if(appts?.[0]) {
        const a = appts[0];
        const ML = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const [y,mm,dd] = a.date.split('-');
        const fStr = parseInt(dd)+' de '+ML[parseInt(mm)-1]+' '+y;
        emailTurnoConfirmado(a.patient_name, a.patient_email, fStr, (a.time||'').slice(0,5), a.type||'Consulta');
      }
    } catch(e2) {}

    toast('✓ Turno confirmado y seña aprobada', 'ok', 4000);
    loadASenas();
    loadADash();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function rechazarSena(id) {
  if(!confirm('¿Rechazar esta transferencia? El turno quedará cancelado.')) return;
  try {
    const headers = {
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + (_authToken || SUPABASE_ANON),
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sena_status: 'rejected',
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
      }
    );

    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.message || res.statusText);
    }

    toast('Transferencia rechazada y turno cancelado', 'ok');
    loadASenas();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

/* ── DASHBOARD ── */
let _dashPeriod = 'mes';
let _dashRevenueChart = null;
let _dashConsultaChart = null;

function setDashPeriod(period, btn) {
  _dashPeriod = period;
  document.querySelectorAll('.dash-period-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  loadADash();
}
window.setDashPeriod = setDashPeriod;

async function loadADash() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')||SUPABASE_ANON) };
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calcular rango de fechas
  let desde, hasta = todayStr;
  let chartLabel = '';
  if(_dashPeriod === 'dia') { desde = todayStr; chartLabel = 'hoy'; }
  else if(_dashPeriod === 'semana') { const d=new Date(today); d.setDate(d.getDate()-6); desde=d.toISOString().split('T')[0]; chartLabel='últimos 7 días'; }
  else if(_dashPeriod === 'mes') { const d=new Date(today); d.setDate(d.getDate()-29); desde=d.toISOString().split('T')[0]; chartLabel='últimos 30 días'; }
  else { const d=new Date(today); d.setFullYear(d.getFullYear()-1); desde=d.toISOString().split('T')[0]; chartLabel='último año'; }

  const cp = document.getElementById('dashChartPeriod'); if(cp) cp.textContent = chartLabel;
  const dd = document.getElementById('dashTodayDate');
  if(dd) dd.textContent = today.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});

  try {
    // Cargar datos en paralelo
    const [rAppts, rOrders, rConsultas, rMedicos] = await Promise.all([
      fetch(SUPABASE_URL+'/rest/v1/appointments?date=gte.'+desde+'&date=lte.'+hasta+'&select=date,price,status,type,medico_id,sena_amount,sena_status,patient_name,time,modalidad&limit=1000', {headers:h}).then(r=>r.json()),
      fetch(SUPABASE_URL+'/rest/v1/orders?select=total,status,created_at&limit=500&order=created_at.desc', {headers:h}).then(r=>r.ok?r.json():Promise.resolve([])),
      fetch(SUPABASE_URL+'/rest/v1/consultation_types?select=id,nombre,icono&activo=eq.true', {headers:h}).then(r=>r.json()),
      fetch(SUPABASE_URL+'/rest/v1/medicos?activo=eq.true&select=id,nombre,color', {headers:h}).then(r=>r.json()),
    ]);

    const appts   = Array.isArray(rAppts)   ? rAppts   : [];
    const orders  = Array.isArray(rOrders)  ? rOrders  : [];
    const ctypes  = Array.isArray(rConsultas)? rConsultas : [];
    const medicos = Array.isArray(rMedicos)  ? rMedicos  : [];
    const ctMap   = {}; ctypes.forEach(c=>ctMap[c.id]=c);
    const medMap  = {}; medicos.forEach(m=>medMap[m.id]=m);

    // Turnos confirmados/completados
    const confirmedAppts = appts.filter(a=>['confirmed','completed'].includes(a.status));
    const pendientes     = appts.filter(a=>['pending','pending_transfer'].includes(a.status));

    // Ingresos
    const ingresosTurnos   = confirmedAppts.reduce((s,a)=>s+(a.price||0),0);
    const ingresosPrograms = orders.filter(o=>o.status==='approved'||o.status==='completed').reduce((s,o)=>s+(o.total||o.amount||0),0);
    const totalIngresos    = ingresosTurnos + ingresosPrograms;
    const senasCobradas    = appts.filter(a=>a.sena_status==='approved').reduce((s,a)=>s+(a.sena_amount||0),0);

    // KPIs
    const set = (id,val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
    set('dkTotal',       fmt(totalIngresos));
    set('dkTotalSub',    confirmedAppts.length+' turnos + '+orders.filter(o=>o.status==='approved').length+' programas');
    set('dkTurnos',      fmt(ingresosTurnos));
    set('dkTurnosSub',   confirmedAppts.length+' confirmados');
    set('dkProgramas',   fmt(ingresosPrograms));
    set('dkProgramasSub',orders.length+' inscripciones');
    set('dkSenas',       fmt(senasCobradas));
    set('dkPendientes',  pendientes.length);
    set('dashSenasBadge', appts.filter(a=>a.sena_status==='pending').length||'');

    // ── GRÁFICO DE INGRESOS POR DÍA ──
    const dayMap = {};
    confirmedAppts.forEach(a => { dayMap[a.date]=(dayMap[a.date]||0)+(a.price||0); });
    orders.filter(o=>o.status==='approved').forEach(o => {
      const d=(o.created_at||'').split('T')[0];
      if(d) dayMap[d]=(dayMap[d]||0)+(o.total||o.amount||0);
    });

    // Generar labels según período
    const labels=[], vals=[];
    if(_dashPeriod==='dia') {
      labels.push(todayStr); vals.push(dayMap[todayStr]||0);
    } else {
      const days = _dashPeriod==='semana'?7:_dashPeriod==='mes'?30:365;
      const step = days>60 ? 7 : 1;
      for(let i=days-1;i>=0;i-=step) {
        const d=new Date(today); d.setDate(d.getDate()-i);
        const ds=d.toISOString().split('T')[0];
        const label = days>60 ? d.toLocaleDateString('es-AR',{day:'numeric',month:'short'}) : d.toLocaleDateString('es-AR',{day:'numeric',month:'short'});
        labels.push(label);
        if(step>1) {
          let sum=0;
          for(let j=0;j<step;j++) { const d2=new Date(d); d2.setDate(d2.getDate()+j); sum+=(dayMap[d2.toISOString().split('T')[0]]||0); }
          vals.push(sum);
        } else {
          vals.push(dayMap[ds]||0);
        }
      }
    }

    const ctx1 = document.getElementById('dashRevenueChart');
    if(ctx1) {
      if(_dashRevenueChart) _dashRevenueChart.destroy();
      _dashRevenueChart = new Chart(ctx1, {
        type:'bar',
        data:{ labels, datasets:[{
          label:'Ingresos',
          data: vals,
          backgroundColor:'rgba(58,125,140,.7)',
          borderColor:'rgba(58,125,140,1)',
          borderWidth:1.5,
          borderRadius:6,
        }]},
        options:{
          responsive:true,
          plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>fmt(c.raw)}}},
          scales:{
            y:{ticks:{callback:v=>v>=1000?(v/1000).toFixed(0)+'k':v, font:{size:10}}, grid:{color:'rgba(0,0,0,.05)'}},
            x:{ticks:{font:{size:9},maxRotation:45}, grid:{display:false}}
          }
        }
      });
    }

    // ── DONUT POR TIPO DE CONSULTA ──
    const typeCounts = {};
    appts.forEach(a => { typeCounts[a.type]=(typeCounts[a.type]||0)+1; });
    const typeEntries = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]);
    const COLORS = ['#3A7D8C','#D4853A','#9B6BD4','#4A9B6F','#C4614A','#6B8FB5'];

    const ctx2 = document.getElementById('dashConsultaChart');
    if(ctx2 && typeEntries.length) {
      if(_dashConsultaChart) _dashConsultaChart.destroy();
      _dashConsultaChart = new Chart(ctx2, {
        type:'doughnut',
        data:{
          labels: typeEntries.map(([k])=>ctMap[k]?.nombre||k),
          datasets:[{ data:typeEntries.map(([,v])=>v), backgroundColor:COLORS, borderWidth:2 }]
        },
        options:{ responsive:true, plugins:{legend:{display:false}}, cutout:'65%' }
      });
      const leg = document.getElementById('dashConsultaLegend');
      if(leg) leg.innerHTML = typeEntries.map(([k,v],i)=>
        '<div style="display:flex;align-items:center;gap:.4rem"><div style="width:8px;height:8px;border-radius:50%;background:'+COLORS[i]+';flex-shrink:0"></div>'
        +'<span style="flex:1;color:#3A3530">'+( ctMap[k]?.nombre||k)+'</span>'
        +'<span style="font-weight:600;color:#1C1A18">'+v+'</span></div>'
      ).join('');
    }

    // ── TOP CONSULTAS ──
    const topConsultas = document.getElementById('dashTopConsultas');
    if(topConsultas) {
      if(!typeEntries.length) { topConsultas.innerHTML='<div style="font-size:.78rem;color:var(--muted)">Sin datos</div>'; }
      else topConsultas.innerHTML = typeEntries.slice(0,4).map(([k,v],i)=>{
        const pct = Math.round(v/appts.length*100);
        return '<div>'
          +'<div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:.2rem">'
            +'<span style="color:#3A3530">'+(ctMap[k]?.icono||'📋')+' '+(ctMap[k]?.nombre||k)+'</span>'
            +'<span style="font-weight:600">'+v+' <span style="color:var(--muted);font-weight:400">('+pct+'%)</span></span>'
          +'</div>'
          +'<div style="height:5px;background:var(--cream);border-radius:100px"><div style="width:'+pct+'%;height:100%;background:'+COLORS[i]+';border-radius:100px"></div></div>'
        +'</div>';
      }).join('');
    }

    // ── TOP MÉDICAS ──
    const medCounts = {};
    appts.forEach(a => { if(a.medico_id) medCounts[a.medico_id]=(medCounts[a.medico_id]||0)+1; });
    const topMed = document.getElementById('dashTopMedicas');
    if(topMed) {
      const sorted = Object.entries(medCounts).sort((a,b)=>b[1]-a[1]);
      if(!sorted.length) { topMed.innerHTML='<div style="font-size:.78rem;color:var(--muted)">Sin datos</div>'; }
      else topMed.innerHTML = sorted.slice(0,5).map(([id,v])=>{
        const m = medMap[id]; const color=m?.color||'#3A7D8C';
        return '<div style="display:flex;align-items:center;gap:.6rem;font-size:.78rem">'
          +'<div style="width:8px;height:8px;border-radius:50%;background:'+color+';flex-shrink:0"></div>'
          +'<span style="flex:1;color:#3A3530">'+(m?.nombre||'—')+'</span>'
          +'<span style="font-weight:600;color:#1C1A18">'+v+' turnos</span>'
        +'</div>';
      }).join('');
    }

    // ── TURNOS DE HOY ──
    const todayAppts = appts.filter(a=>a.date===todayStr).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const todayEl = document.getElementById('dashTodayAppts');
    if(todayEl) {
      if(!todayAppts.length) { todayEl.innerHTML='<div style="font-size:.78rem;color:var(--muted);padding:.5rem 0">No hay turnos para hoy.</div>'; }
      else todayEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:.5rem">'
        +todayAppts.map(a=>{
          const sc = {pending:'#D4853A',confirmed:'#4A9B6F',pending_transfer:'#D4853A',completed:'#3A7D8C',cancelled:'#C4614A'}[a.status]||'#8A7F74';
          const sl = {pending:'Pendiente',confirmed:'Confirmado',pending_transfer:'Esperando seña',completed:'Completado',cancelled:'Cancelado'}[a.status]||a.status;
          const m = medMap[a.medico_id];
          return '<div style="display:flex;align-items:center;gap:.85rem;padding:.65rem .85rem;background:var(--cream);border-radius:10px">'
            +'<div style="font-family:var(--fd);font-size:1rem;color:var(--teal);width:50px;flex-shrink:0">'+(a.time||'').slice(0,5)+'</div>'
            +'<div style="flex:1;min-width:0">'
              +'<div style="font-weight:600;font-size:.85rem;color:#1C1A18">'+( a.patient_name||'—')+'</div>'
              +'<div style="font-size:.73rem;color:var(--muted)">'+(ctMap[a.type]?.nombre||a.type||'—')+(m?' · '+m.nombre:'')+'</div>'
            +'</div>'
            +'<span style="font-size:.65rem;font-weight:700;padding:.18rem .55rem;border-radius:100px;background:'+sc+'18;color:'+sc+';border:1px solid '+sc+'30;white-space:nowrap">'+sl+'</span>'
          +'</div>';
        }).join('')
      +'</div>';
    }

  } catch(e) {
    console.error('loadADash:', e);
  }
}

/* ── FOTOS ── */
const SITE_IMGS = [
  {key:'logo',               name:'Logo (arriba a la izquierda)', section:'general'},
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
  {key:'turnos_hero',        name:'Foto página Turnos',    section:'turnos'},
  {key:'blog_hero_bg',       name:'Fondo página Blog',     section:'blog'},
  {key:'pillars_bg',         name:'Fondo sección Pilares', section:'home'},
  {key:'pillar_1',           name:'Pilar 1 — Diagnóstico', section:'home'},
  {key:'pillar_2',           name:'Pilar 2 — Nutrición',   section:'home'},
  {key:'pillar_3',           name:'Pilar 3 — Suplementos', section:'home'},
  {key:'pillar_4',           name:'Pilar 4 — Acompañamiento', section:'home'},
];

async function applySiteImages() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/site_images?select=key,url,updated_at', {headers:h});
    const data = await r.json();
    const cache = {};
    (Array.isArray(data)?data:[]).forEach(row => {
      // versión estable por imagen (cachea en el navegador; sólo cambia si la imagen cambia)
      const ver = row.updated_at ? '?v='+Date.parse(row.updated_at) : '';
      const url = row.url + (row.url.includes('supabase') ? ver : '');
      cache[row.key] = url;
      _applySiteImg(row.key, url);
    });
    try { localStorage.setItem('bh_site_images', JSON.stringify(cache)); } catch(e){}
  } catch(e) {}
}

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
  const sections = [{id:'hero',label:'🏠 Hero — Homepage'},{id:'home',label:'🏠 Home — Secciones'},{id:'programas',label:'📚 Programas'},{id:'turnos',label:'📅 Turnos'},{id:'blog',label:'✍️ Blog'},{id:'tienda',label:'🛍️ Tienda'},{id:'general',label:'👤 General'}];
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
  const btn  = document.getElementById('imgSB');
  btn.disabled = true; btn.textContent = 'Subiendo...';
  try {
    const token = _authToken || localStorage.getItem('bh_token') || SUPABASE_ANON;
    let url;
    if(isUp) {
      if(!aSelFile) { toast('Seleccioná un archivo','err'); btn.disabled=false; btn.textContent='Guardar'; return; }
      const ext  = aSelFile.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
      const path = `${aCurrImgKey}-${Date.now()}.${ext}`;
      const rUp = await fetch(`${SUPABASE_URL}/storage/v1/object/site-media/${path}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': 'Bearer ' + token,
          'Content-Type': aSelFile.type || 'image/jpeg',
        },
        body: aSelFile
      });
      if(!rUp.ok) {
        const err = await rUp.json().catch(()=>({message:rUp.statusText}));
        throw new Error(err.error || err.message || 'Error al subir');
      }
      url = `${SUPABASE_URL}/storage/v1/object/public/site-media/${path}`;
    } else {
      url = document.getElementById('aUI').value.trim();
      if(!url) { toast('Ingresá una URL','err'); btn.disabled=false; btn.textContent='Guardar'; return; }
    }
    const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+token, 'Content-Type':'application/json' };
    // Intentar update primero, si no existe hacer insert
    const rCheck = await fetch(SUPABASE_URL+'/rest/v1/site_images?key=eq.'+aCurrImgKey, {headers:h});
    const existing = await rCheck.json();
    if(Array.isArray(existing) && existing.length) {
      await fetch(SUPABASE_URL+'/rest/v1/site_images?key=eq.'+aCurrImgKey, {method:'PATCH', headers:{...h,'Prefer':'return=minimal'}, body:JSON.stringify({url, updated_at:new Date().toISOString()})});
    } else {
      await fetch(SUPABASE_URL+'/rest/v1/site_images', {method:'POST', headers:{...h,'Prefer':'return=minimal'}, body:JSON.stringify({key:aCurrImgKey, url, updated_at:new Date().toISOString()})});
    }
    document.querySelectorAll('[id="aip-'+aCurrImgKey+'"]').forEach(el=>el.src=url+'?t='+Date.now());
    document.querySelectorAll('[data-site-img="'+aCurrImgKey+'"]').forEach(el=>el.src=url+'?t='+Date.now());
    toast('✓ Imagen actualizada — cerrá y abrí la página para verla','ok',4000);
    closeAMod('imgMod');
    loadAFotos();
    applySiteImages();
  } catch(e) { toast('Error: '+e.message,'err'); }
  finally { btn.disabled=false; btn.textContent='Guardar'; }
}

/* ── UNIVERSAL IMAGE UPLOAD ── */
// Crea un input file oculto y lo dispara. Al completar, pone la URL en el campo destino.
function triggerImgUpload(targetInputId, folder) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*,application/pdf,.pdf'; input.style.display = 'none';
  document.body.appendChild(input);
  input.onchange = async () => {
    const file = input.files[0];
    document.body.removeChild(input);
    if(!file) return;
    const toastId = toast('Subiendo archivo...', 'info', 30000);
    try {
      const token = _authToken || localStorage.getItem('bh_token') || SUPABASE_ANON;
      const ext   = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
      const path  = `${folder||'uploads'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const rUp = await fetch(`${SUPABASE_URL}/storage/v1/object/site-media/${path}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': 'Bearer ' + token,
          'Content-Type': file.type || 'image/jpeg',
        },
        body: file
      });
      if(!rUp.ok) {
        const err = await rUp.json().catch(()=>({message:rUp.statusText}));
        throw new Error(err.error || err.message || 'Error al subir');
      }
      const url = `${SUPABASE_URL}/storage/v1/object/public/site-media/${path}`;
      const el = document.getElementById(targetInputId);
      if(el) { el.value = url; el.dispatchEvent(new Event('input')); }
      toast('✓ Archivo subido correctamente','ok');
    } catch(e) { toast('Error al subir: '+e.message,'err'); }
  };
  input.click();
}
window.triggerImgUpload = triggerImgUpload;

/* ── TÉRMINOS Y CONDICIONES ── */
async function abrirTerminos(e) {
  if(e) e.preventDefault();
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+SUPABASE_ANON };
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/site_settings?key=eq.terminos_url&select=value&limit=1', {headers:h});
    const data = await r.json();
    const url = data?.[0]?.value;
    if(url) window.open(url, '_blank');
    else toast('Los términos y condiciones no están cargados aún.','info');
  } catch(e2) { toast('Error al cargar los términos','err'); }
}
window.abrirTerminos = abrirTerminos;

/* ── ROLES ADMIN ── */
// Secciones visibles por rol
const ROL_SECTIONS = {
  super_admin: null, // null = todas
  medica: ['calendario','fichas'],
};

function applyAdminRol() {
  const rol = _userRol;
  if(!rol || rol === 'super_admin') return; // super_admin ve todo sin cambios

  const allowed = ROL_SECTIONS[rol];
  if(!allowed) return;

  // Ocultar secciones no permitidas
  document.querySelectorAll('.asb-it').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    const match = onclick.match(/showAP\('([^']+)'/);
    const section = match ? match[1] : null;
    if(section && !allowed.includes(section)) btn.style.display = 'none';
  });

  // Badge de rol
  const rolBadge = document.getElementById('adminRolBadge');
  if(rolBadge) { rolBadge.textContent = 'Médica'; rolBadge.style.display = ''; }

  // Ir al calendario
  setTimeout(() => {
    const calBtn = document.querySelector('.asb-it[onclick*="calendario"]');
    showAP('calendario', calBtn);

    // Filtrar por medico_id del perfil
    const token = _authToken || localStorage.getItem('bh_token');
    const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+token };
    fetch(SUPABASE_URL+'/auth/v1/user', {headers:h})
      .then(r=>r.json())
      .then(u => fetch(SUPABASE_URL+'/rest/v1/profiles?id=eq.'+u.id+'&select=medico_id&limit=1', {headers:h}))
      .then(r=>r.json())
      .then(prof => {
        const medicoId = prof?.[0]?.medico_id;
        if(!medicoId) return;
        // Esperar que carguen los botones de médica en el calendario
        let tries = 0;
        const interval = setInterval(() => {
          const btn = document.querySelector(`[data-medico="${medicoId}"]`);
          if(btn) {
            clearInterval(interval);
            btn.click();
            // Ocultar todos los botones de médica menos el suyo y el "Todos"
            document.querySelectorAll('#calMedicoFilters button[data-medico]').forEach(b => {
              if(b.dataset.medico && b.dataset.medico !== medicoId) b.style.display = 'none';
            });
          }
          if(++tries > 30) clearInterval(interval);
        }, 200);
      })
      .catch(() => {});
  }, 200);
}
window.applyAdminRol = applyAdminRol;

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
let _fichas = [];
let _fichaActual = null;

async function loadAFichas() {
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')) };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/fichas_medicas?order=patient_name&select=*`, {headers:h});
    _fichas = await r.json() || [];
    // Cargar evoluciones para cada ficha
    for(let f of _fichas) {
      const r2 = await fetch(`${SUPABASE_URL}/rest/v1/evoluciones?ficha_id=eq.${f.id}&order=fecha.desc&select=*`, {headers:h});
      f.evoluciones = await r2.json() || [];
    }
    renderFichasList(_fichas);
  } catch(e) {
    document.getElementById('fichasList').innerHTML = '<div style="padding:1.5rem;color:var(--muted);font-size:.84rem">Error: '+e.message+'</div>';
  }
}

function renderFichasList(fichas) {
  const el = document.getElementById('fichasList');
  if(!el) return;
  if(!fichas.length) { el.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted);font-size:.84rem">No hay fichas aún.</div>'; return; }
  el.innerHTML = fichas.map(f => {
    const evs = f.evoluciones || [];
    const lastEv = evs[0];
    const lastDate = lastEv ? new Date(lastEv.fecha).toLocaleDateString('es-AR') : '—';
    const isActive = _fichaActual?.id === f.id;
    return '<div onclick="abrirFicha(\''+f.id+'\')" style="padding:.85rem 1rem;border-bottom:1px solid var(--cream-dk);cursor:pointer;transition:.12s;background:'+(isActive?'rgba(58,125,140,.08)':'#fff')+'" onmouseover="if(this.style.background===\'rgb(255,255,255)\')this.style.background=\'#fafaf8\'" onmouseout="if(!this.classList.contains(\'active-ficha\'))this.style.background=\''+(isActive?'rgba(58,125,140,.08)':'#fff')+'\'">'
      +'<div style="font-weight:600;font-size:.88rem;color:#1C1A18">'+f.patient_name+'</div>'
      +'<div style="font-size:.74rem;color:var(--muted);margin-top:.15rem">'+f.patient_email+'</div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-top:.35rem">'
        +'<span style="font-size:.68rem;background:rgba(58,125,140,.1);color:var(--teal);padding:.1rem .45rem;border-radius:100px;font-weight:600">'+evs.length+' consulta'+(evs.length!==1?'s':'')+'</span>'
        +'<span style="font-size:.7rem;color:var(--muted)">Últ: '+lastDate+'</span>'
      +'</div>'
    +'</div>';
  }).join('');
}

function filterFichas() {
  const q = (document.getElementById('fichaSearch')?.value || '').toLowerCase();
  renderFichasList(q ? _fichas.filter(f => f.patient_name.toLowerCase().includes(q) || (f.patient_email||'').toLowerCase().includes(q)) : _fichas);
}

async function abrirFicha(fichaId) {
  const f = _fichas.find(x=>x.id===fichaId);
  if(!f) return;
  _fichaActual = f;
  renderFichasList(_fichas); // re-render to highlight active
  renderFichaDetalle(f);
}

function renderFichaDetalle(f) {
  const el = document.getElementById('fichaDetalle');
  if(!el) return;
  const evs = f.evoluciones || [];
  const lastEv = evs[0];
  const historial = evs.slice(1);

  el.innerHTML =
    // Header
    '<div style="background:#fff;border-bottom:1px solid var(--cream-dk);padding:1.25rem 1.5rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">'
      +'<div>'
        +'<div style="font-family:var(--fd);font-size:1.25rem;color:#1C1A18">'+f.patient_name+'</div>'
        +'<div style="font-size:.78rem;color:var(--muted);margin-top:.2rem">'+f.patient_email+(f.patient_phone?' · '+f.patient_phone:'')+(f.dni?' · DNI '+f.dni:'')+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:.5rem">'
        +'<button onclick="openNuevaConsulta(\''+f.id+'\',\''+f.patient_name.replace(/'/g,'').replace(/"/g,'')+'\',\''+f.patient_email+'\')" style="padding:.5rem 1.1rem;border-radius:100px;font-size:.76rem;font-weight:600;background:var(--teal);color:#fff;border:none;cursor:pointer;font-family:var(--fb)">+ Nueva consulta</button>'
        +'<button onclick="openSuplementos(\''+f.id+'\',\''+f.patient_name.replace(/'/g,'').replace(/"/g,'')+'\',\''+f.patient_email+'\')" style="padding:.5rem 1rem;border-radius:100px;font-size:.76rem;font-weight:600;border:1.5px solid var(--gold);background:rgba(201,147,90,.07);color:var(--gold);cursor:pointer;font-family:var(--fb)">💊 Suplementos</button>'
        +'<button onclick="editarFicha(\''+f.id+'\')" style="padding:.5rem 1rem;border-radius:100px;font-size:.76rem;font-weight:600;border:1.5px solid var(--cream-dk);background:#fff;cursor:pointer;font-family:var(--fb)">✏️ Editar</button>'
      +'</div>'
    +'</div>'

    // Datos básicos
    +'<div style="padding:1.25rem 1.5rem;background:#fff;margin-bottom:.5rem;display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem">'
      +renderDatoFicha('Fecha nac.', f.fecha_nacimiento ? new Date(f.fecha_nacimiento).toLocaleDateString('es-AR') : '—')
      +renderDatoFicha('Sexo', f.sexo||'—')
      +renderDatoFicha('Peso', f.peso_kg ? f.peso_kg+' kg' : '—')
      +renderDatoFicha('Altura', f.altura_cm ? f.altura_cm+' cm' : '—')
    +'</div>'

    // Antecedentes
    +(f.antecedentes_personales||f.medicacion_actual||f.alergias ? renderSeccionFicha('Antecedentes', [
      {label:'Antecedentes personales', val:f.antecedentes_personales},
      {label:'Medicación actual', val:f.medicacion_actual},
      {label:'Alergias', val:f.alergias},
    ]) : '')

    // Última ficha (Historia clínica actual)
    +(lastEv ? '<div style="padding:1.25rem 1.5rem">'
      +'<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.75rem">Última consulta</div>'
      +renderEvolucionCard(lastEv, true)
    +'</div>' : '<div style="padding:1.25rem 1.5rem;color:var(--muted);font-size:.85rem">Sin consultas registradas aún.</div>')

    // Historial de consultas anteriores
    +(historial.length ? '<div style="padding:1.25rem 1.5rem;border-top:1px solid var(--cream-dk)">'
      +'<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.75rem">Historial de consultas anteriores</div>'
      +historial.map(ev=>renderEvolucionCard(ev, false)).join('')
    +'</div>' : '');
}

function renderDatoFicha(label, val) {
  return '<div style="background:var(--cream);border-radius:8px;padding:.65rem .85rem">'
    +'<div style="font-size:.68rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.2rem">'+label+'</div>'
    +'<div style="font-size:.86rem;font-weight:600;color:#1C1A18">'+val+'</div>'
  +'</div>';
}

function renderSeccionFicha(titulo, items) {
  const content = items.filter(i=>i.val).map(i=>'<div style="margin-bottom:.75rem"><div style="font-size:.78rem;font-weight:600;color:#1C1A18;margin-bottom:.2rem">'+i.label+'</div><div style="font-size:.83rem;color:#6B6460;line-height:1.65;white-space:pre-line">'+i.val+'</div></div>').join('');
  if(!content) return '';
  return '<div style="background:#fff;padding:1.25rem 1.5rem;margin-bottom:.5rem">'
    +'<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.85rem">'+titulo+'</div>'
    +content
  +'</div>';
}

function renderEvolucionCard(ev, isLast) {
  const fecha = new Date(ev.fecha).toLocaleDateString('es-AR', {day:'numeric',month:'2-digit',year:'numeric'});
  const hora  = ev.hora || new Date(ev.fecha).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  const archivos = Array.isArray(ev.archivos) ? ev.archivos : (tryParseJSON(ev.archivos)||[]);

  return '<div style="background:#fff;border:1.5px solid '+(isLast?'var(--teal)':'var(--cream-dk)')+';border-radius:14px;overflow:hidden;margin-bottom:.75rem">'
    // Header de la consulta
    +'<div style="background:'+(isLast?'#1C1A18':'var(--cream)')+';padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between">'
      +'<div>'
        +'<div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:'+(isLast?'rgba(240,232,216,.5)':'var(--muted)')+'">Historia Clínica</div>'
        +'<div style="font-size:.82rem;color:'+(isLast?'var(--cream)':'#1C1A18')+';margin-top:.1rem">📅 '+fecha+' - '+hora+'</div>'
        +(ev.medico_nombre ? '<div style="font-size:.76rem;color:'+(isLast?'rgba(240,232,216,.5)':'var(--muted)')+'">👤 '+ev.medico_nombre+'</div>' : '')
      +'</div>'
      +'<div style="display:flex;gap:.4rem">'
        +'<button onclick="editarEvolucion(\''+ev.id+'\')" style="padding:.3rem .7rem;border-radius:8px;font-size:.7rem;border:1.5px solid '+(isLast?'rgba(240,232,216,.2)':'var(--cream-dk)')+';background:transparent;color:'+(isLast?'rgba(240,232,216,.7)':'var(--muted)')+';cursor:pointer">✏️</button>'
        +'<button onclick="verEvolucionDetalle(\''+ev.id+'\')" style="padding:.3rem .7rem;border-radius:8px;font-size:.7rem;border:1.5px solid '+(isLast?'rgba(240,232,216,.2)':'var(--cream-dk)')+';background:transparent;color:'+(isLast?'rgba(240,232,216,.7)':'var(--muted)')+';cursor:pointer">Ver más detalles ›</button>'
      +'</div>'
    +'</div>'
    // Contenido
    +'<div style="padding:1rem">'
      +(ev.motivo ? '<div style="margin-bottom:.75rem"><div style="font-size:.75rem;font-weight:700;color:#1C1A18;margin-bottom:.2rem">Motivo de consulta</div><div style="font-size:.84rem;color:#6B6460">'+ev.motivo+'</div></div>' : '')
      +(ev.observaciones ? '<div style="margin-bottom:.75rem"><div style="font-size:.75rem;font-weight:700;color:#1C1A18;margin-bottom:.2rem">Observaciones</div><div style="font-size:.84rem;color:#6B6460;line-height:1.7;white-space:pre-line">'+ev.observaciones+'</div></div>' : '')
      // Estudios / archivos
      +(archivos.length ? '<div><div style="font-size:.75rem;font-weight:700;color:#1C1A18;margin-bottom:.6rem;padding-top:.5rem;border-top:1px solid var(--cream-dk)">Estudios adjuntos</div>'
        +archivos.map(a=>'<div style="display:flex;align-items:center;gap:.6rem;padding:.45rem .65rem;background:var(--cream);border-radius:8px;margin-bottom:.35rem">'
          +'<span style="font-size:.9rem">📎</span>'
          +'<span style="font-size:.78rem;color:#3A3530;flex:1">'+( a.name||'Archivo')+'</span>'
          +'<a href="'+a.url+'" target="_blank" download style="font-size:.72rem;color:var(--teal);font-weight:600;text-decoration:none">⬇ Descargar</a>'
        +'</div>').join('')
      +'</div>' : '')
    +'</div>'
  +'</div>';
}

// Abrir modal nueva consulta
function openNuevaConsulta(fichaId, pacienteName, pacienteEmail) {
  document.getElementById('ncFichaId').value     = fichaId;
  document.getElementById('ncPaciente').textContent = pacienteName;
  document.getElementById('ncFecha').value       = new Date().toISOString().split('T')[0];
  document.getElementById('ncHora').value        = new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('ncMotivo').value      = '';
  document.getElementById('ncObservaciones').value = '';
  document.getElementById('ncMedico').value      = '';
  document.getElementById('ncArchivosList').innerHTML = '';
  openAMod('ncModal');
}

async function guardarNuevaConsulta() {
  const fichaId = document.getElementById('ncFichaId').value;
  const motivo  = document.getElementById('ncMotivo').value.trim();
  const obs     = document.getElementById('ncObservaciones').value.trim();
  const medico  = document.getElementById('ncMedico').value.trim();
  const fecha   = document.getElementById('ncFecha').value;
  const hora    = document.getElementById('ncHora').value;

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json', 'Prefer':'return=representation' };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/evoluciones`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ ficha_id:fichaId, motivo:motivo||null, observaciones:obs||null, medico_nombre:medico||null, fecha:fecha+'T'+hora+':00', hora, archivos:[] })
    });
    if(!res.ok) throw new Error((await res.json()).message || res.statusText);
    toast('Consulta guardada ✓','ok');
    closeAMod('ncModal');
    await loadAFichas();
    if(_fichaActual?.id === fichaId) renderFichaDetalle(_fichas.find(f=>f.id===fichaId)||_fichaActual);
  } catch(e) { toast('Error: '+e.message,'err'); }
}

function openNuevaFicha(email='', nombre='') {
  document.getElementById('nfN').value = nombre;
  document.getElementById('nfE').value = email;
  document.getElementById('nfModTitle').textContent = email ? 'Nueva ficha: '+nombre : 'Nueva ficha médica';
  openAMod('nfMod');
}
// alias para compatibilidad
const openANuevaFicha = openNuevaFicha;

async function crearAFicha() {
  const nombre = document.getElementById('nfN').value.trim();
  const email  = document.getElementById('nfE').value.trim();
  if(!nombre||!email) { toast('Nombre y email son obligatorios','err'); return; }
  const btn = document.getElementById('nfBtn');
  btn.disabled=true; btn.textContent='Creando...';
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json', 'Prefer':'return=representation' };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fichas_medicas`, {
      method:'POST', headers:h,
      body: JSON.stringify({
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
      })
    });
    if(!res.ok) throw new Error((await res.json()).message||res.statusText);
    toast('Ficha creada ✓','ok');
    closeAMod('nfMod');
    await loadAFichas();
  } catch(e) {
    toast(e.message.includes('duplicate')?'Ya existe una ficha para ese email':e.message,'err');
  } finally { btn.disabled=false; btn.textContent='Crear ficha'; }
}

function verEvolucionDetalle(evId) {
  // Buscar la evolución en la ficha actual
  const ev = _fichaActual?.evoluciones?.find(e=>e.id===evId);
  if(!ev) { toast('No se encontró la consulta','err'); return; }
  editarEvolucionModal(ev);
}

function editarEvolucion(evId) {
  const ev = _fichaActual?.evoluciones?.find(e=>e.id===evId);
  if(!ev) { toast('No se encontró la consulta','err'); return; }
  editarEvolucionModal(ev);
}

function editarEvolucionModal(ev) {
  const archivos = Array.isArray(ev.archivos) ? ev.archivos : (tryParseJSON(ev.archivos)||[]);
  const fecha = ev.fecha ? ev.fecha.split('T')[0] : '';
  const hora  = ev.hora || (ev.fecha ? ev.fecha.split('T')[1]?.slice(0,5) : '');

  // Reusar el modal de nueva consulta, llenarlo con los datos
  document.getElementById('ncFichaId').value        = ev.ficha_id||'';
  document.getElementById('ncPaciente').textContent  = _fichaActual?.patient_name || '';
  document.getElementById('ncFecha').value           = fecha;
  document.getElementById('ncHora').value            = hora;
  document.getElementById('ncMedico').value          = ev.medico_nombre||'';
  document.getElementById('ncMotivo').value          = ev.motivo||'';
  document.getElementById('ncObservaciones').value   = ev.observaciones||'';

  // Archivos existentes
  const list = document.getElementById('ncArchivosList');
  list.innerHTML = archivos.map(a=>
    '<div style="display:flex;align-items:center;gap:.6rem;padding:.45rem .75rem;background:var(--cream);border-radius:8px;font-size:.8rem">'
    +'📎 <span style="flex:1">'+( a.name||'Archivo')+'</span>'
    +'<a href="'+a.url+'" target="_blank" style="font-size:.72rem;color:var(--teal)">⬇</a>'
    +'</div>'
  ).join('');

  // Cambiar el botón guardar para que actualice en vez de crear
  const saveBtn = document.querySelector('#ncModal .amf button:last-child');
  if(saveBtn) {
    saveBtn.textContent = 'Guardar cambios';
    saveBtn.onclick = () => actualizarEvolucion(ev.id);
  }

  openAMod('ncModal');
}

async function actualizarEvolucion(evId) {
  const motivo  = document.getElementById('ncMotivo').value.trim();
  const obs     = document.getElementById('ncObservaciones').value.trim();
  const medico  = document.getElementById('ncMedico').value.trim();
  const fecha   = document.getElementById('ncFecha').value;
  const hora    = document.getElementById('ncHora').value;

  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json' };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/evoluciones?id=eq.${evId}`, {
      method:'PATCH', headers:h,
      body: JSON.stringify({ motivo:motivo||null, observaciones:obs||null, medico_nombre:medico||null, fecha:fecha+'T'+hora+':00', hora })
    });
    if(!res.ok) throw new Error((await res.json()).message||res.statusText);
    toast('Consulta actualizada ✓','ok');
    closeAMod('ncModal');

    // Restaurar botón guardar para nueva consulta
    const saveBtn = document.querySelector('#ncModal .amf button:last-child');
    if(saveBtn) { saveBtn.textContent='Guardar consulta'; saveBtn.onclick=guardarNuevaConsulta; }

    await loadAFichas();
    if(_fichaActual) renderFichaDetalle(_fichas.find(f=>f.id===_fichaActual.id)||_fichaActual);
  } catch(e) { toast('Error: '+e.message,'err'); }
}

function editarFicha(fichaId) {
  const f = _fichas.find(x=>x.id===fichaId);
  if(!f) return;
  // Llenar el modal de nueva ficha con los datos existentes
  document.getElementById('nfN').value  = f.patient_name||'';
  document.getElementById('nfE').value  = f.patient_email||'';
  document.getElementById('nfT').value  = f.patient_phone||'';
  document.getElementById('nfD').value  = f.dni||'';
  document.getElementById('nfNc').value = f.fecha_nacimiento||'';
  document.getElementById('nfSx').value = f.sexo||'';
  document.getElementById('nfP').value  = f.peso_kg||'';
  document.getElementById('nfH').value  = f.altura_cm||'';
  document.getElementById('nfAP').value = f.antecedentes_personales||'';
  document.getElementById('nfMd').value = f.medicacion_actual||'';
  document.getElementById('nfAl').value = f.alergias||'';
  document.getElementById('nfMt').value = f.motivo_consulta_inicial||'';
  document.getElementById('nfModTitle').textContent = 'Editar ficha: '+f.patient_name;

  // Cambiar el botón para actualizar
  const btn = document.getElementById('nfBtn');
  btn.textContent = 'Guardar cambios';
  btn.onclick = () => actualizarFicha(fichaId);

  openAMod('nfMod');
}

async function actualizarFicha(fichaId) {
  const btn = document.getElementById('nfBtn');
  btn.disabled=true; btn.textContent='Guardando...';
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||localStorage.getItem('bh_token')), 'Content-Type':'application/json' };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/fichas_medicas?id=eq.${fichaId}`, {
      method:'PATCH', headers:h,
      body: JSON.stringify({
        patient_name:  document.getElementById('nfN').value.trim(),
        patient_email: document.getElementById('nfE').value.trim(),
        patient_phone: document.getElementById('nfT').value.trim()||null,
        dni:           document.getElementById('nfD').value.trim()||null,
        fecha_nacimiento: document.getElementById('nfNc').value||null,
        sexo:          document.getElementById('nfSx').value||null,
        peso_kg:       parseFloat(document.getElementById('nfP').value)||null,
        altura_cm:     parseInt(document.getElementById('nfH').value)||null,
        antecedentes_personales: document.getElementById('nfAP').value.trim()||null,
        medicacion_actual: document.getElementById('nfMd').value.trim()||null,
        alergias:      document.getElementById('nfAl').value.trim()||null,
        motivo_consulta_inicial: document.getElementById('nfMt').value.trim()||null,
      })
    });
    toast('Ficha actualizada ✓','ok');
    closeAMod('nfMod');
    // Restaurar botón
    btn.textContent='Crear ficha'; btn.onclick=crearAFicha;
    await loadAFichas();
    if(_fichaActual?.id===fichaId) renderFichaDetalle(_fichas.find(f=>f.id===fichaId)||_fichaActual);
  } catch(e){ toast('Error: '+e.message,'err'); }
  finally { btn.disabled=false; }
}

function handleNcArchivos(input) {
  const list = document.getElementById('ncArchivosList');
  [...input.files].forEach(file => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:.6rem;padding:.45rem .75rem;background:var(--cream);border-radius:8px;font-size:.8rem';
    div.innerHTML = '📎 <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+file.name+'</span>'
      +'<button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:.9rem">✕</button>';
    div.dataset.fileName = file.name;
    div.dataset.fileSize = file.size;
    list.appendChild(div);
  });
}
window.handleNcArchivos = handleNcArchivos;
window.filterFichas            = filterFichas;
window.abrirFicha              = abrirFicha;
window.openNuevaFicha          = openNuevaFicha;
window.openANuevaFicha         = openANuevaFicha;
window.crearAFicha             = crearAFicha;
window.openNuevaConsulta       = openNuevaConsulta;
window.guardarNuevaConsulta    = guardarNuevaConsulta;
window.abrirFichaDesdeCalendario = abrirFichaDesdeCalendario;
window.verEvolucionDetalle     = verEvolucionDetalle;
window.editarEvolucion         = editarEvolucion;
window.editarFicha             = editarFicha;

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

  // Si es médica, forzar filtro por su medico_id
  if(_userRol === 'medica') {
    try {
      const token = _authToken || localStorage.getItem('bh_token');
      const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+token };
      const rU = await fetch(SUPABASE_URL+'/auth/v1/user', {headers:h});
      const u  = await rU.json();
      const rP = await fetch(SUPABASE_URL+'/rest/v1/profiles?id=eq.'+u.id+'&select=medico_id&limit=1', {headers:h});
      const pd = await rP.json();
      const medicoId = pd?.[0]?.medico_id;
      if(medicoId) {
        calState.medicoId = medicoId;
        // Ocultar todos los filtros de médica
        const filtersWrap = document.getElementById('calMedicoFilters');
        if(filtersWrap) filtersWrap.style.display = 'none';
        // Ocultar botón "Todos"
        document.querySelector('[data-medico=""]')?.parentElement && (document.getElementById('calMedicoFilters').style.display='none');
      }
    } catch(e) {}
  }

  await loadCalData();
  renderCalAdmin();
}

async function loadMedicos() {
  try {
    const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+(_authToken||SUPABASE_ANON) };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/medicos?activo=eq.true&order=nombre`, {headers:h});
    const data = await r.json();
    calState.medicos = Array.isArray(data) ? data : [];
  } catch(e) {
    calState.medicos = [{ id:'', nombre:'Dra. Mariel Dobenau', color:'#3A7D8C' }];
  }

  // Llenar filtros — limpiar primero para evitar duplicados
  const filters = document.getElementById('calMedicoFilters');
  const bqMedico = document.getElementById('bqMedico');
  // Mantener solo el botón "Todos"
  if(filters) {
    const todos = filters.querySelector('[data-medico=""]');
    filters.innerHTML = '';
    if(todos) filters.appendChild(todos);
  }
  // Limpiar opciones del select salvo "Todos"
  if(bqMedico) {
    while(bqMedico.options.length > 1) bqMedico.remove(1);
  }
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
  const firstDay = `${calState.year}-${String(calState.month+1).padStart(2,'0')}-01`;
  const lastDay  = `${calState.year}-${String(calState.month+1).padStart(2,'0')}-${new Date(calState.year, calState.month+1, 0).getDate()}`;
  const token = _authToken || localStorage.getItem('bh_token') || SUPABASE_ANON;
  const h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer '+token };

  try {
    let consultaIds = [];
    if(calState.medicoId) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/medico_consultas?medico_id=eq.${calState.medicoId}&select=consulta_id`, {headers:h});
      const mc = await r.json();
      consultaIds = Array.isArray(mc) ? mc.map(x=>x.consulta_id) : [];
    }

    let apptUrl = `${SUPABASE_URL}/rest/v1/appointments?date=gte.${firstDay}&date=lte.${lastDay}&order=time&limit=500`;
    if(calState.medicoId) {
      apptUrl += `&medico_id=eq.${calState.medicoId}`;
    }
    const r1 = await fetch(apptUrl, {headers:h});
    const appts = await r1.json();
    calState.appts = Array.isArray(appts) ? appts : [];

    let blockUrl = `${SUPABASE_URL}/rest/v1/blocked_slots?date=gte.${firstDay}&date=lte.${lastDay}`;
    if(calState.medicoId) blockUrl += `&or=(medico_id.eq.${calState.medicoId},medico_id.is.null)`;
    const r2 = await fetch(blockUrl, {headers:h});
    const blocks = await r2.json();
    calState.blocked = Array.isArray(blocks) ? blocks : [];

  } catch(e) {
    console.error('loadCalData:', e);
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
  const bqDate = document.getElementById('bqDate');
  if(bqDate) bqDate.value = dateStr;

  // Renderizar inmediatamente con lo que hay
  renderCalAdmin();
  renderCalSide(dateStr);

  // Si no hay datos, recargar y re-renderizar
  if(!calState.appts || !calState.appts.length) {
    loadCalData().then(() => {
      renderCalAdmin();
      renderCalSide(dateStr);
    });
  }
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
    const statusLabel = {pending:'Pendiente',confirmed:'Confirmado',pending_transfer:'Esperando seña',completed:'Completado',cancelled:'Cancelado'}[a.status] || a.status;
    const statusColor = {pending:'#D4853A',confirmed:'#4A9B6F',pending_transfer:'#D4853A',completed:'#3A7D8C',cancelled:'#C4614A'}[a.status] || '#8A7F74';
    const modalidad = a.modalidad === 'presencial' ? 'Presencial' : 'Virtual';
    const modalColor = a.modalidad === 'presencial' ? '#D4853A' : '#3A7D8C';
    const phone = (a.patient_phone||'').replace(/\D/g,'');
    const waPhone = phone.startsWith('54') ? phone : '54'+phone;
    const precio = a.precio ? fmt(a.precio) : null;
    const durMin = a.duracion || 30;
    const timeStart = (a.time||'').slice(0,5);
    let timeEnd = '';
    if(timeStart) {
      const [hh,mm] = timeStart.split(':').map(Number);
      const end = new Date(2000,0,1,hh,mm+durMin);
      timeEnd = end.getHours().toString().padStart(2,'0')+':'+end.getMinutes().toString().padStart(2,'0');
    }

    const statusBtns = ['pending','pending_transfer','confirmed','completed','cancelled'].map(s => {
      const sc = {pending:'#D4853A',pending_transfer:'#D4853A',confirmed:'#4A9B6F',completed:'#3A7D8C',cancelled:'#C4614A'}[s];
      const sl = {pending:'Pendiente',pending_transfer:'Esperando seña',confirmed:'Confirmado',completed:'Completado',cancelled:'Cancelado'}[s];
      const isActive = a.status === s;
      return '<button onclick="cambiarEstadoAppt(\''+a.id+'\',\''+s+'\')" title="'+sl+'" style="width:18px;height:18px;border-radius:50%;background:'+sc+';border:3px solid '+(isActive?'#1C1A18':sc+'50')+';cursor:pointer;transition:.15s"'+(isActive?' disabled':'')+' data-appt="'+a.id+'" data-s="'+s+'"></button>';
    }).join('');
    // Card compacta con panel expandible
    html += '<div class="cal-appt-card" style="border-left:4px solid '+color+';padding:0;overflow:hidden;cursor:pointer" onclick="toggleApptDetail(\'appt-'+a.id+'\')">'
      // Resumen compacto (siempre visible)
      +'<div style="padding:.75rem .9rem;display:flex;align-items:center;gap:.75rem">'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:1rem;font-weight:700;color:'+color+';font-family:var(--fd)">'+timeStart+' hs</div>'
          +'<div style="font-size:.85rem;font-weight:600;color:#1C1A18;margin-top:.1rem">'+( a.patient_name||'—')+'</div>'
          +'<div style="font-size:.74rem;color:var(--muted)">'+(ATIPO[a.type]||a.type||'—')+'</div>'
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">'
          +'<span style="font-size:.65rem;font-weight:700;padding:.18rem .55rem;border-radius:100px;background:'+statusColor+'18;color:'+statusColor+';border:1px solid '+statusColor+'30">'+statusLabel+'</span>'
          +'<span id="appt-arrow-'+a.id+'" style="color:var(--muted);font-size:.75rem;transition:.2s">▼</span>'
        +'</div>'
      +'</div>'
      // Panel expandible (oculto por defecto)
      +'<div id="appt-'+a.id+'" style="display:none;border-top:1px solid var(--cream-dk)">'
        // Detalles
        +'<div style="padding:.7rem .9rem;display:flex;flex-direction:column;gap:.4rem">'
          +(medico ? '<div style="display:flex;align-items:center;gap:.5rem;font-size:.78rem;color:#3A3530"><span style="width:10px;height:10px;border-radius:50%;background:'+color+';flex-shrink:0;display:inline-block"></span><span>'+medico.nombre+'</span></div>' : '')
          +(timeEnd ? '<div style="font-size:.72rem;color:var(--muted)">⏱ hasta '+timeEnd+' hs · '+durMin+' min</div>' : '')
          +(a.patient_phone ? '<div style="display:flex;align-items:center;gap:.5rem;font-size:.78rem;color:#3A3530"><span>📱</span><span>'+a.patient_phone+'</span><a href="https://wa.me/'+waPhone+'" target="_blank" onclick="event.stopPropagation()" style="margin-left:auto;font-size:.7rem;color:#25D366;font-weight:600;text-decoration:none;background:rgba(37,211,102,.08);padding:.15rem .45rem;border-radius:100px;border:1px solid rgba(37,211,102,.2)">WhatsApp</a></div>' : '')
          +(a.patient_email ? '<div style="display:flex;align-items:center;gap:.5rem;font-size:.78rem;color:#3A3530;overflow:hidden"><span>✉️</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+a.patient_email+'</span></div>' : '')
          +'<div style="font-size:.78rem;color:'+(a.modalidad==='presencial'?'#D4853A':'#3A7D8C')+'">'+(a.modalidad==='presencial'?'📍 Presencial':'💻 Virtual')+'</div>'
          +(a.sena_status==='paid'||a.sena_status==='approved' ? '<div style="font-size:.75rem;color:#4A9B6F">✓ Seña confirmada</div>' : a.sena_status==='pending' ? '<div style="font-size:.75rem;color:#D4853A">⏳ Seña pendiente</div>' : '')
        +'</div>'
        // Botones acción
        +'<div style="border-top:1px solid var(--cream-dk);padding:.5rem .9rem;display:flex;gap:.4rem">'
          +'<button onclick="event.stopPropagation();abrirFichaDesdeCalendario(\''+( a.patient_email||'')+'\',\''+( a.patient_name||'')+'\',\''+( a.patient_phone||'')+'\')" style="flex:1;padding:.4rem .5rem;border-radius:8px;font-size:.7rem;font-weight:600;border:1.5px solid var(--teal);background:rgba(58,125,140,.06);color:var(--teal);cursor:pointer;font-family:var(--fb)">📋 Ficha</button>'
          +'<button onclick="event.stopPropagation();verPagoTurno(\''+a.id+'\')" style="flex:1;padding:.4rem .5rem;border-radius:8px;font-size:.7rem;font-weight:600;border:1.5px solid var(--cream-dk);background:#fff;cursor:pointer;font-family:var(--fb)">$ Pago</button>'
          +'<button onclick="event.stopPropagation();openEditApptModal(\''+a.id+'\')" style="padding:.4rem .6rem;border-radius:8px;font-size:.7rem;border:1.5px solid var(--cream-dk);background:#fff;cursor:pointer">✏️</button>'
          +'<button onclick="event.stopPropagation();deleteAppt(\''+a.id+'\')" style="padding:.4rem .6rem;border-radius:8px;font-size:.7rem;border:1.5px solid #f0d0d0;background:#fff;cursor:pointer;color:#C4614A">🗑</button>'
        +'</div>'
        // Cambiar estado
        +'<div style="border-top:1px solid var(--cream-dk);padding:.45rem .9rem;display:flex;align-items:center;gap:.3rem;flex-wrap:wrap">'
          +'<span style="font-size:.62rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-right:.2rem">Estado:</span>'
          +statusBtns
          +'<span style="font-size:.68rem;color:var(--muted);margin-left:.3rem" id="statusLabel-'+a.id+'">'+statusLabel+'</span>'
        +'</div>'
      +'</div>'
    +'</div>';
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
