
/* =========================================================================
   1) SIMBOLOGÍA — tabla única de traducción. Ajusten estos valores según
      como definan la simbología real del estudio; todo lo demás del motor
      de layout depende solo de estos tres diccionarios.
   ========================================================================= */
const FISICA = {
  'contencion-cerrada': {label:'Contención cerrada', distance:14},
  'contencion-abierta': {label:'Contención abierta', distance:34},
  'contiguo-cerrada':   {label:'Contiguo cerrada',   distance:58},
  'contiguo-abierta':   {label:'Contiguo abierta',   distance:84},
  'neutro':             {label:'Neutro',             distance:150},
  'separacion-barrera': {label:'Separación por barrera especial', distance:230},
  'separacion-locacion':{label:'Separación por locación',         distance:360},
  'por-decidir':        {label:'Por decidir',        distance:150},
};
const IMPORTANCIA = {
  'mandatoria':  {label:'Mandatoria',  strength:1.0,  width:3,   dash:null,          color:'var(--ink)'},
  'deseable':    {label:'Deseable',    strength:0.55, width:2.5, dash:null,          color:'var(--ink-soft)'},
  'neutral':     {label:'Neutral',     strength:0.2,  width:1.5, dash:'0.1 3',       color:'var(--ink-faint)'},
  'negativa':    {label:'Negativa/Separatoria', strength:0, width:2, dash:'0.1 2.5',   color:'var(--negativa)'},
  'por-decidir': {label:'Por decidir', strength:0.1,  width:1, dash:'0.1 3.5',       color:'var(--ink-faint)'},
};
const PLANTA_COLOR = { baja: 'var(--baja)', alta: 'var(--alta)' };

/* escalas arquitectónicas estándar disponibles para el pie de plano */
const STANDARD_SCALES = [50,75,100,125,150,200,250,300,400,500,750,1000];

/* colores planos para la vista de Matrices (rombos rellenos: no pueden usar
   var(--x) porque el navegador no las resuelve dentro de un string SVG
   generado por template literal en algunos exportadores) */
const MATRIZ_COLOR = {
  mandatoria:   '#2F6D9C',
  deseable:     '#E08A2B',
  neutral:      '#B9BEC7',
  negativa:     '#B5432E',
  'por-decidir': null
};

/* paleta rotativa para distinguir plantas/niveles (ya no solo baja/alta) */
const PLANTA_PALETTE = ['#B9862E','#3E6E8E','#6E8E3E','#8E3E6E','#3E8E86','#8E6B3E','#5B4E8E'];
let plantaColors = {};
function plantaColor(planta){
  if(plantaColors[planta]) return plantaColors[planta];
  const i = Math.max(0, plantas.indexOf(planta));
  return PLANTA_PALETTE[i % PLANTA_PALETTE.length];
}

/* =========================================================================
   2) DATOS — estructura mínima. Reemplacen cargarEjemplo() por su propio
      parser del export de Google Sheets cuando definan el formato final
      (misma forma de objeto: nodes[] y edges[]). IMPORTANTE: cada nodo debe
      incluir el campo numérico `num` (ID único e incremental, ver punto 5).
   ========================================================================= */
let nodes = [];
let edges = [];
let plantas = ['Baja','Alta'];
let nextNodeId = 1; // NUEVO — contador de IDs numéricos, nunca se reutiliza

function renderPlantaChips(){
  const el = document.getElementById('plantaChips');
  el.innerHTML = plantas.map((p,i)=>`
    <span style="display:inline-flex; align-items:center; gap:6px; font:11px var(--mono); border:1px solid var(--border); padding:4px 8px; background:#fff;">
      <input type="color" data-color-planta="${i}" value="${plantaColor(p)}" style="width:16px; height:16px; padding:0; border:none; cursor:pointer;">
      ${p}<span data-del-planta="${i}" style="cursor:pointer; color:var(--ink-faint);" title="Quitar planta">✕</span>
    </span>`).join('');
  el.querySelectorAll('[data-del-planta]').forEach(x=>{
    x.onclick = ()=>{
      if(plantas.length<=1) return;
      const i = +x.dataset.delPlanta;
      const removed = plantas[i];
      plantas.splice(i,1);
      delete plantaColors[removed];
      nodes.forEach(n=>{ if(n.planta===removed) n.planta = plantas[0]; });
      renderPlantaChips(); renderTables(); autoGenerate();
    };
  });
  el.querySelectorAll('[data-color-planta]').forEach(x=>{
    x.onchange = ()=>{
      const p = plantas[+x.dataset.colorPlanta];
      plantaColors[p] = x.value;
      if(currentConfigs.length){ renderGrid(); renderDetail(); }
      refreshMatricesIfVisible();
    };
  });
}

function ejemplo(){
  plantas = ['Baja','Alta'];
  plantaColors = {Baja: PLANTA_PALETTE[0], Alta: PLANTA_PALETTE[1]};
  nodes = [
    {id:'Cochera', area:28, planta:'Baja'},
    {id:'Vestíbulo', area:3.5, planta:'Baja'},
    {id:'Medio baño', area:2.5, planta:'Baja'},
    {id:'Sala', area:14, planta:'Baja'},
    {id:'Comedor', area:12, planta:'Baja'},
    {id:'Cocina', area:10, planta:'Baja'},
    {id:'Lavado', area:4, planta:'Baja'},
    {id:'Escalera', area:3, planta:'Baja'},
    {id:'Patio', area:35, planta:'Baja'},
    {id:'Hall alto', area:7, planta:'Alta'},
    {id:'Oficina', area:9, planta:'Alta'},
    {id:'Rec. secundaria', area:12, planta:'Alta'},
    {id:'Baño completo', area:4.5, planta:'Alta'},
    {id:'Rec. principal', area:15, planta:'Alta'},
    {id:'Vestidor', area:6, planta:'Alta'},
    {id:'Baño principal', area:8.5, planta:'Alta'},
  ];
  // NUEVO — asigna el ID numérico persistente en el orden de creación
  nodes = nodes.map((n,i)=>({...n, num:i+1}));
  nextNodeId = nodes.length + 1;

  edges = [
    ['Cochera','Vestíbulo','1 — acceso directo desde el auto','contiguo-abierta','mandatoria'],
    ['Vestíbulo','Sala','1 — recorrido de acceso','contiguo-abierta','mandatoria'],
    ['Vestíbulo','Medio baño','4 — conveniencia para visitas','contiguo-cerrada','deseable'],
    ['Sala','Comedor','5 — integración open-plan','contencion-abierta','mandatoria'],
    ['Comedor','Cocina','5 — integración open-plan','contiguo-abierta','mandatoria'],
    ['Cocina','Lavado','2 — instalación hidrosanitaria compartida','contiguo-cerrada','deseable'],
    ['Sala','Patio','5 — integración open-plan','contencion-abierta','deseable'],
    ['Comedor','Patio','5 — integración open-plan','contiguo-abierta','deseable'],
    ['Vestíbulo','Escalera','1 — recorrido de acceso','contiguo-abierta','deseable'],
    ['Escalera','Hall alto','1 — recorrido vertical','contencion-abierta','mandatoria'],
    ['Hall alto','Oficina','4 — conveniencia','contiguo-abierta','deseable'],
    ['Hall alto','Rec. secundaria','4 — conveniencia','contiguo-abierta','deseable'],
    ['Hall alto','Rec. principal','4 — conveniencia','contiguo-abierta','deseable'],
    ['Rec. secundaria','Baño completo','2 — instalación hidrosanitaria compartida','contiguo-cerrada','mandatoria'],
    ['Oficina','Baño completo','2 — instalación hidrosanitaria compartida','contiguo-cerrada','deseable'],
    ['Rec. principal','Vestidor','1 — recorrido privado','contencion-cerrada','mandatoria'],
    ['Vestidor','Baño principal','2 — instalación hidrosanitaria compartida','contiguo-cerrada','mandatoria'],
    ['Oficina','Rec. principal','3 — aislamiento acústico durante jornadas de trabajo','separacion-barrera','negativa'],
    ['Cochera','Rec. principal','3 — ruido/vibración indeseable','separacion-locacion','negativa'],
  ].map(([source,target,motivo,fisica,importancia])=>({source,target,motivo,fisica,importancia}));
  document.getElementById('fMotivos').value =
    '1. Continuidad de recorrido / acceso\n2. Instalación hidrosanitaria compartida\n3. Aislamiento acústico / ruido indeseable\n4. Conveniencia funcional\n5. Integración visual open-plan';
  renderPlantaChips();
  renderTables();
  autoGenerate();
}

/* =========================================================================
   3) MOTOR DE LAYOUT — d3-force con parámetros derivados de la simbología
   ========================================================================= */
function mulberry32(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* CORREGIDO — el radio es puramente el que hace que el ÁREA del círculo
   (π·r²) sea proporcional al área real en m² del espacio, sin piso mínimo
   de legibilidad. Aplicado tras el ajuste a la hoja tabloide. */
function radiusFor(area, kScale){ return Math.sqrt(area) * kScale; }

/* =========================================================================
   MOTOR DE LAYOUT — acomodo MATEMÁTICO gobernado por la matriz de distancias
   objetivo (escalamiento multidimensional, SMACOF):

     1. MaTRIZ OBJETIVO  D[i][j]  ←  FISICA[d.fisica].distance
        (un mismo espacio "contenido" busca D≈14, "contiguo" ≈58/84,
         "neutro"≈150, "separado"≈230/360). Los pares sin relación usan
         una distancia base ~95 (≠ la "repulsión general" con el slider).
     2. SMACOF — minimiza el estrés:  Σ w_ij·(‖x_i−x_j‖ − D_ij)²
        La posición de cada burbuja se itera según la suma ponderada de
        las demás ("Guttman transform"), de modo que la distancia REAL en
        el plano queda dictada por la simbología, no por el azar.
     3. COLISIÓN circular: con r = √área·k los discos no pueden
        superponerse; se separan físicamente (como si fueran sólidos).
     4. ENMARCADO TABLOIDE: todo el conjunto (posiciones + radios) se
        escala homotéticamente y se centra en la ventana TABLOIDE
        (11×17″ → 1440×932 px en pantalla, proporción 1.545:1).
   ========================================================================= */
const TABLO_W  = 1440;                              // tabloide horizontal 17″
const TABLO_H  = 932;                               // 11″ → proporción 1.5455
const TABLO_PAD = 30;                               // margen interior
const SMACOF_ITERS = 140;                           // iteraciones de convergencia
const COLLIDE_ITERS = 220;                           // iteraciones anti-solape

function runSMACOF(simNodes, allEdges, rnd, chargeStrength){
  const n = simNodes.length;
  if(n===0) return;
  const idx = new Map(simNodes.map((nd,i)=>[nd.id,i]));

  // distancia base para pares sin relación (slider "Repulsión general" = 40..260)
  const baseD = Math.min(210, Math.max(55, 110*(charge/130)));
  const baseW = 1/(baseD*baseD) * 0.10;

  const D  = Array.from({length:n},()=>Array(n).fill(0));
  const W_ = Array.from({length:n},()=>Array(n).fill(0));
  for(let i=0;i<n;i++){
    for(let j=0;j<n;j++){
      if(i===j){ D[i][j]=0; W_[i][j]=0; }
      else     { D[i][j]=baseD; W_[i][j]=baseW; }
    }
  }
  (allEdges||[]).forEach(e=>{
    const i = idx.get(e.source.id||e.source), j = idx.get(e.target.id||e.target);
    if(i==null || j==null || i===j) return;
    const d = FISICA[e.fisica].distance;
    D[i][j]=D[j][i]=d;
    const w = 1/(d*d);
    W_[i][j]=W_[j][i]=w;
  });

  // posición inicial agrupada por planta y repartida con la semilla
  const pos = simNodes.map(nd=>{
    const gi = Math.max(0, plantas.indexOf(nd.planta));
    return {
      x: TABLO_W*(gi+1)/(plantas.length+1) + (rnd()-0.5)*TABLO_W*0.35,
      y: TABLO_H*0.5 + (rnd()-0.5)*TABLO_H*0.4
    };
  });

  // SMACOF — iteraciones de Guttman (gradiente del estrés).
  // x_i^{t+1} = Σ_j w_ij·( x_j + D_ij·(x_i−x_j)/‖x_i−x_j‖ ) / Σ_j w_ij
  for(let it=0; it<SMACOF_ITERS; it++){
    const damping = it<30 ? 0.5 : 0.9;
    for(let i=0;i<n;i++){
      let nx=0, ny=0, sw=0;
      for(let j=0;j<n;j++){
        if(i===j || W_[i][j]<=0) continue;
        const dx=pos[i].x-pos[j].x, dy=pos[i].y-pos[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy)||1e-6;
        const ux=dx/dist, uy=dy/dist;
        nx += W_[i][j]*(pos[j].x + D[i][j]*ux);
        ny += W_[i][j]*(pos[j].y + D[i][j]*uy);
        sw += W_[i][j];
      }
      if(sw>0){
        const tx = nx/sw, ty = ny/sw;
        const pull = (tx-pos[i].x)*damping*0.5, pu2 = (ty-pos[i].y)*damping*0.5;
        const tol = TABLO_W*0.02;
        pos[i].x += (pull> tol || pull < -tol) ? (tx-pos[i].x)*damping : pull*0.5;
        pos[i].y += (pu2> tol || pu2 < -tol) ? (ty-pos[i].y)*damping : pu2*0.5;
      }
    }
  }
  simNodes.forEach((nd,i)=>{ nd.x=pos[i].x; nd.y=pos[i].y; });
}

/* separación física de discos (colisión) y encuadre en página tabloide */
function applyCollisionsAndTabloid(simNodes, kScale){
  const n = simNodes.length;
  const rs = simNodes.map(nd=>Math.sqrt(nd.area)*kScale);
  for(let it=0; it<COLLIDE_ITERS; it++){
    let moved=false;
    for(let i=0;i<n;i++){
      for(let j=i+1;j<n;j++){
        const dx=simNodes[j].x-simNodes[i].x, dy=simNodes[j].y-simNodes[i].y;
        const dist=Math.sqrt(dx*dx+dy*dy)||1e-6;
        const minDist=(rs[i]+rs[j])*1.06;
        if(dist<minDist){
          const push=(minDist-dist)/dist*0.5;
          simNodes[i].x -= dx*push; simNodes[i].y -= dy*push;
          simNodes[j].x += dx*push; simNodes[j].y += dy*push;
          moved=true;
        }
      }
    }
    if(!moved) break;
  }
  const minX=Math.min(...simNodes.map((p,i)=>p.x-rs[i])), maxX=Math.max(...simNodes.map((p,i)=>p.x+rs[i]));
  const minY=Math.min(...simNodes.map((p,i)=>p.y-rs[i])), maxY=Math.max(...simNodes.map((p,i)=>p.y+rs[i]));
  const bboxW=Math.max(1,maxX-minX), bboxH=Math.max(1,maxY-minY);
  const availW=TABLO_W-2*TABLO_PAD, availH=TABLO_H-2*TABLO_PAD;
  const sFit=Math.min(availW/bboxW, availH/bboxH);
  const offX=(TABLO_W-bboxW*sFit)/2, offY=(TABLO_H-bboxH*sFit)/2;
  simNodes.forEach((p,i)=>{
    p.x = (p.x-minX)*sFit + offX;
    p.y = (p.y-minY)*sFit + offY;
  });
}

/* CORREGIDO — constructor de una variante completa (SMACOF → colisión → tabloide) */
function buildSimulation(seedIndex, charge, W, H){
  const rnd = mulberry32(1000 + seedIndex*97);
  const simNodes = nodes.map(n=>({...n}));
  runSMACOF(simNodes, edges, rnd, charge);
  const kScale = 3.6;
  applyCollisionsAndTabloid(simNodes, kScale);
  const linkEdges = (edges||[]).map(e=>({...e}));
  return {nodes: simNodes, edges: linkEdges, kScale};
}

/* NUEVO — cuenta cruces reales entre segmentos de línea (adyacencias).
   El diagrama de burbujas solo puede quedar 100% libre de cruces si el
   grafo de relaciones es planar; cuando no lo es, esto elige, de entre
   muchos intentos aleatorios, la disposición con el MENOR número de
   cruces posible (y 0 si el grafo lo permite). */
function segmentsIntersect(p1,p2,p3,p4){
  function ccw(a,b,c){ return (c.y-a.y)*(b.x-a.x) - (b.y-a.y)*(c.x-a.x); }
  const d1=ccw(p3,p4,p1), d2=ccw(p3,p4,p2), d3_=ccw(p1,p2,p3), d4=ccw(p1,p2,p4);
  if(((d1>0&&d2<0)||(d1<0&&d2>0)) && ((d3_>0&&d4<0)||(d3_<0&&d4>0))) return true;
  return false;
}
function countCrossings(result){
  const idx = new Map(result.nodes.map(n=>[n.id,n]));
  const segs = [];
  result.edges.forEach(e=>{
    const a = idx.get(e.source.id||e.source), b = idx.get(e.target.id||e.target);
    if(a&&b) segs.push([a,b]);
  });
  let crossings = 0;
  for(let i=0;i<segs.length;i++){
    for(let j=i+1;j<segs.length;j++){
      const [a1,a2]=segs[i], [b1,b2]=segs[j];
      if(a1===b1||a1===b2||a2===b1||a2===b2) continue; // comparten nodo: no cuenta
      if(segmentsIntersect(a1,a2,b1,b2)) crossings++;
    }
  }
  return crossings;
}

function scoreLayout(result){
  const idx = new Map(result.nodes.map(n=>[n.id,n]));
  let ok=0, total=0;
  edges.forEach(e=>{
    const a=idx.get(e.source.id||e.source), b=idx.get(e.target.id||e.target);
    if(!a||!b) return;
    const d = Math.hypot(a.x-b.x, a.y-b.y);
    const target = FISICA[e.fisica].distance;
    if(e.importancia==='mandatoria'||e.importancia==='deseable'){
      total++; if(d <= target*1.4) ok++;
    } else if(e.importancia==='negativa'){
      total++; if(d >= target*0.75) ok++;
    }
  });
  return total? ok/total : 1;
}

function signatureOf(result){
  const idx = new Map(result.nodes.map(n=>[n.id,n]));
  return result.nodes.map(n=>{
    let best=null, bd=Infinity;
    result.nodes.forEach(m=>{ if(m.id===n.id) return; const d=Math.hypot(n.x-m.x,n.y-m.y); if(d<bd){bd=d;best=m.id;} });
    return n.id+'>'+best;
  }).sort().join('|');
}

/* MODIFICADO — genera más candidatos y ordena primero por MENOS cruces de
   líneas y, como criterio de desempate, por mayor cumplimiento de
   adyacencias. Así las variantes mostradas son las más "limpias" posibles. */
function generateConfigs(count, chargeStrength){
  const W=1440,H=932;
  const candidates=[];
  const tries = Math.max(count*10, 40);
  for(let i=0;i<tries;i++){
    const r = buildSimulation(i, chargeStrength, W, H);
    candidates.push({result:r, score:scoreLayout(r), crossings:countCrossings(r), sig:signatureOf(r), seed:i});
  }
  candidates.sort((a,b)=> (a.crossings-b.crossings) || (b.score-a.score));
  const chosen=[]; const seen=new Set();
  for(const c of candidates){
    if(seen.has(c.sig)) continue;
    seen.add(c.sig); chosen.push(c);
    if(chosen.length>=count) break;
  }
  return chosen;
}

/* =========================================================================
   4) RENDER — diagrama de burbujas (MODIFICADO: se reemplaza el índice de
      posición por el ID numérico persistente n.num, mostrado en grande y
      centrado, acompañado del nombre del espacio y su área en m² como
      líneas secundarias que escalan según el radio del círculo)
   ========================================================================= */
let currentConfigs = [];
let selectedIndex = 0;
let labelMode = 'nombre'; // 'nombre' = nombre completo del espacio · 'numero' = solo el # de nomenclatura

function polarXY(cx,cy,r,ang){ return {x:cx+r*Math.cos(ang), y:cy+r*Math.sin(ang)}; }
function arcD(cx,cy,r,a0,a1){
  const p0=polarXY(cx,cy,r,a0), p1=polarXY(cx,cy,r,a1);
  const large = Math.abs(a1-a0)>Math.PI?1:0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
}
function sectorD(cx,cy,rIn,rOut,a0,a1){
  const p1=polarXY(cx,cy,rOut,a0), p2=polarXY(cx,cy,rOut,a1);
  const p3=polarXY(cx,cy,rIn,a1), p4=polarXY(cx,cy,rIn,a0);
  const large = Math.abs(a1-a0)>Math.PI?1:0;
  return `M ${p1.x} ${p1.y} A ${rOut} ${rOut} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rIn} ${rIn} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}
function wrapWords(text, maxChars){
  const words = text.split(' ');
  const lines=[]; let cur='';
  words.forEach(w=>{
    const t = cur? cur+' '+w : w;
    if(t.length>maxChars && cur){ lines.push(cur); cur=w; } else cur=t;
  });
  if(cur) lines.push(cur);
  return lines;
}

function svgFor(result, W=1440, H=932, interactive=false){
  const kScale = result.kScale;
  const portAngles = new Map();
  const addAngle = (id,ang)=>{ if(!portAngles.has(id)) portAngles.set(id,[]); portAngles.get(id).push(ang); };

  let s = `<g>`;
  result.edges.forEach(e=>{
    const style = IMPORTANCIA[e.importancia];
    const a = typeof e.source==='object'? e.source : result.nodes.find(n=>n.id===e.source);
    const b = typeof e.target==='object'? e.target : result.nodes.find(n=>n.id===e.target);
    if(!a||!b) return;
    s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
      stroke="${MATRIZ_COLOR[e.importancia] || '#C7CEDA'}"
      stroke-width="${style.width}" stroke-linecap="round" ${style.dash?`stroke-dasharray="${style.dash}"`:''} opacity="${e.importancia==='negativa'?0.9:0.75}"><title>${(a.id||a)} — ${(b.id||b)}${e.motivo?' · '+e.motivo:''}</title></line>`;
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    const gR = 6;
    s += `<circle cx="${mx}" cy="${my}" r="${gR+1.5}" fill="#F7F8FA" opacity="0.92"/>${glyphMarkup(e.fisica, mx, my, gR)}`;
    addAngle(a.id, Math.atan2(b.y-a.y, b.x-a.x));
    addAngle(b.id, Math.atan2(a.y-b.y, a.x-b.x));
  });

  result.nodes.forEach((n)=>{
    const R0 = radiusFor(n.area, kScale);
    const cx=n.x, cy=n.y;
    const Rext = R0 + Math.max(6, R0*0.28);
    const Rin1 = R0 - Math.max(5, R0*0.30);
    const Rin2 = R0 - Math.max(9, R0*0.55);

    s += `<circle cx="${cx}" cy="${cy}" r="${Rext}" fill="none" stroke="#999" stroke-width="0.6" stroke-dasharray="0.1 2.5" stroke-linecap="round"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${Rin1}" fill="none" stroke="#999" stroke-width="0.6" stroke-dasharray="0.1 2.5" stroke-linecap="round"/>`;
    if(Rin2>4) s += `<circle cx="${cx}" cy="${cy}" r="${Rin2}" fill="none" stroke="#bbb" stroke-width="0.5" stroke-dasharray="0.1 2.5" stroke-linecap="round"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R0}" fill="#fff" stroke="#666666" stroke-width="1"/>`;

    const beta = 0.16;
    (portAngles.get(n.id) || []).forEach(ang=>{
      const p0 = polarXY(cx,cy,R0,ang), p1 = polarXY(cx,cy,Rin1,ang);
      s += `<line x1="${p0.x}" y1="${p0.y}" x2="${p1.x}" y2="${p1.y}" stroke="#999" stroke-width="0.6" stroke-dasharray="0.1 2" stroke-linecap="round"/>`;
      s += `<path d="${arcD(cx,cy,Rin1,ang-beta,ang+beta)}" fill="none" stroke="#999" stroke-width="0.6" stroke-dasharray="0.1 2" stroke-linecap="round"/>`;
    });

    if(labelMode === 'numero'){
      // MODIFICADO — modo "Número": solo el ID numérico de nomenclatura, grande y centrado
      const numSize = Math.max(7, Math.min(28, R0*0.65));
      s += `<text x="${cx}" y="${cy+numSize*0.34}" text-anchor="middle" font-size="${numSize}" font-weight="700" font-family="Arial, Inter, sans-serif" fill="#A35C8F">${n.num}</text>`;
      const areaSize = Math.max(4.5, Math.min(10, R0*0.18));
      s += `<text x="${cx}" y="${cy+numSize*0.34+areaSize+2}" text-anchor="middle" font-size="${areaSize}" font-family="Arial, Inter, sans-serif" fill="#666666">${n.area} m²</text>`;
    } else {
      const maxChars = Math.max(4, Math.round(Rin2*0.30));
      const lines = wrapWords(n.id.toUpperCase(), maxChars);
      const nameSize = Math.max(4.5, Math.min(11, Rin2*0.24));
      const lineH = nameSize*1.15;
      const startY = cy - ((lines.length-1)*lineH)/2 - 3;
      lines.forEach((line,i)=>{
        s += `<text x="${cx}" y="${startY + i*lineH}" text-anchor="middle" font-size="${nameSize}" font-weight="700" font-family="Arial, Inter, sans-serif" fill="#A35C8F">${line}</text>`;
      });
      const areaY = startY + lines.length*lineH + nameSize*0.5;
      s += `<text x="${cx}" y="${areaY}" text-anchor="middle" font-size="${Math.max(4.5,nameSize*0.7)}" font-family="Arial, Inter, sans-serif" fill="#666666">${n.area} m²</text>`;
    }
  });
  s += `</g>`;
  return s;
}

function renderGrid(){
  const grid = document.getElementById('grid');
  grid.innerHTML='';
  currentConfigs.forEach((c,i)=>{
    const card = document.createElement('div');
    card.className = 'card' + (i===selectedIndex?' selected':'');
    card.innerHTML = `<svg viewBox="0 0 1440 932">${svgFor(c.result)}</svg>
      <div class="meta"><span>Variante ${i+1}</span><b>${c.crossings===0?'0 cruces':c.crossings+' cruce(s)'} · ${Math.round(c.score*100)}%</b></div>`;
    card.onclick = ()=>{ selectedIndex=i; renderGrid(); renderDetail(); };
    grid.appendChild(card);
  });
}

function renderDetail(){
  const c = currentConfigs[selectedIndex];
  if(!c) return;
  document.getElementById('mainSvg').innerHTML = `<g id="zoomG">${svgFor(c.result)}</g>`;
  applyZoomTransform();
  document.getElementById('scoreLabel').textContent = `Variante ${selectedIndex+1} · ${Math.round(c.score*100)}% de adyacencias satisfechas · ${c.crossings===0?'sin cruces de línea':c.crossings+' cruce(s) de línea'}`;
}

function renderLegend(){
  const el = document.getElementById('legendMini');
  el.innerHTML = Object.entries(IMPORTANCIA).map(([k,v])=>
    `<div><span class="sw" style="border-top-color:${v.color.replace('var(--ink)','#17233B').replace('var(--ink-soft)','#4A5771').replace('var(--ink-faint)','#8A93A3').replace('var(--negativa)','#B5432E')}; border-top-style:${v.dash?'dotted':'solid'};"></span>${v.label}</div>`
  ).join('') + `<div style="margin-top:6px;"><span class="sw" style="border-top-color:#B9862E;border-top-width:8px;"></span>Planta baja</div>
  <div><span class="sw" style="border-top-color:#3E6E8E;border-top-width:8px;"></span>Planta alta</div>`;
}

/* =========================================================================
   4b) RENDER — vista de Matrices (Importancia Relativa / Relación Física /
       Deseos y Motivos). Se dibuja como matriz triangular en rombos, igual
       en lógica a las láminas AutoCAD del estudio: fila i vs fila j (j>i)
       se ubica a la mitad de altura entre ambas filas, y se desplaza a la
       derecha según cuántas filas de distancia hay entre ellas.
   ========================================================================= */
function findEdge(a,b){
  return edges.find(e=>{
    const s=e.source.id||e.source, t=e.target.id||e.target;
    return (s===a && t===b) || (s===b && t===a);
  });
}

function diamondPath(cx,cy,r){
  return `M ${cx} ${cy-r} L ${cx+r} ${cy} L ${cx} ${cy+r} L ${cx-r} ${cy} Z`;
}
function trianglePoly(cx,cy,r,filled){
  const pts = `${cx},${cy-r} ${cx+r*0.95},${cy+r*0.72} ${cx-r*0.95},${cy+r*0.72}`;
  return `<polygon points="${pts}" fill="${filled?'#17233B':'#fff'}" stroke="#17233B" stroke-width="1.3"/>`;
}
function glyphMarkup(key, cx, cy, r){
  switch(key){
    case 'contencion-abierta': return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#17233B" stroke-width="1.3"/>`;
    case 'contencion-cerrada': return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#17233B"/>`;
    case 'contiguo-abierta':   return trianglePoly(cx,cy,r,false);
    case 'contiguo-cerrada':   return trianglePoly(cx,cy,r,true);
    case 'neutro':             return `<rect x="${cx-r*0.78}" y="${cy-r*0.78}" width="${r*1.56}" height="${r*1.56}" fill="#B9BEC7"/>`;
    case 'separacion-barrera': return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#17233B" stroke-width="1.3" stroke-dasharray="0.1 3" stroke-linecap="round"/>`;
    case 'separacion-locacion':return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#17233B" stroke="#fff" stroke-width="1.4"/>`;
    default: return `<path d="${diamondPath(cx,cy,r)}" fill="none" stroke="#C7CEDA" stroke-width="1"/>`; // por-decidir
  }
}

function matrixLayout(nodeList, rowH){
  const unit = rowH/2;
  const labelW = 235;
  const rows = nodeList.map((n,i)=>({...n, idx:i, y: i*rowH + rowH/2}));
  const pairs = [];
  for(let i=0;i<rows.length;i++){
    for(let j=i+1;j<rows.length;j++){
      pairs.push({ i, j, x: labelW + (j-i-1)*unit + unit, y:(rows[i].y+rows[j].y)/2 });
    }
  }
  const width  = labelW + Math.max(1,(rows.length-1))*unit + 24;
  const height = Math.max(1,rows.length)*rowH + 8;
  return {rows, pairs, width, height, labelW, rowH};
}

function drawRowLabels(L){
  let s='';
  L.rows.forEach(r=>{
    s += `<text class="row-index" x="4" y="${r.y+3}">${String(r.num!=null ? r.num : r.idx+1).padStart(2,'0')}</text>`;
    s += `<text class="row-label" x="30" y="${r.y+3}">${r.id}</text>`;
  });
  return s;
}

function svgMatrixImportancia(){
  const rowH=32;
  const L = matrixLayout(nodes, rowH);
  let s = `<svg viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}">`;
  s += drawRowLabels(L);
  const r = Math.min(rowH*0.31, 10);
  L.pairs.forEach(p=>{
    const a=L.rows[p.i], b=L.rows[p.j];
    const e = findEdge(a.id,b.id);
    if(e){
      const fill = MATRIZ_COLOR[e.importancia];
      s += `<path d="${diamondPath(p.x,p.y,r)}" fill="${fill||'#fff'}" stroke="#8A93A3" stroke-width="1"><title>${a.id} — ${b.id}: ${IMPORTANCIA[e.importancia].label}</title></path>`;
    } else {
      s += `<path d="${diamondPath(p.x,p.y,r*0.55)}" fill="none" stroke="#E3E6EC" stroke-width="1"/>`;
    }
  });
  s += `</svg>`;
  return s;
}

function svgMatrixFisica(){
  const rowH=32;
  const L = matrixLayout(nodes, rowH);
  let s = `<svg viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}">`;
  s += drawRowLabels(L);
  const r = Math.min(rowH*0.26, 8);
  L.pairs.forEach(p=>{
    const a=L.rows[p.i], b=L.rows[p.j];
    const e = findEdge(a.id,b.id);
    if(e){
      s += `<g><title>${a.id} — ${b.id}: ${FISICA[e.fisica].label}</title>${glyphMarkup(e.fisica,p.x,p.y,r)}</g>`;
    } else {
      s += `<path d="${diamondPath(p.x,p.y,r*0.6)}" fill="none" stroke="#E3E6EC" stroke-width="1"/>`;
    }
  });
  s += `</svg>`;
  return s;
}

/* -- leyenda de motivos: texto libre en la tabla de relaciones, número
      autogenerado y sincronizado con el textarea "Leyenda de motivos"
      (mismo formato de pie de lámina: "1. texto del motivo") -- */
function parseMotivosLegend(){
  const raw = document.getElementById('fMotivos').value;
  const map = new Map();
  let maxNum = 0;
  raw.split('\n').forEach(line=>{
    const m = line.match(/^\s*(\d+)\.\s*(.+?)\s*$/);
    if(m){ const num=+m[1]; map.set(m[2], num); if(num>maxNum) maxNum=num; }
  });
  return {map, maxNum};
}
function syncMotivoLegend(){
  const {map, maxNum} = parseMotivosLegend();
  let next = maxNum;
  const additions = [];
  edges.forEach(e=>{
    const text = (e.motivo||'').trim();
    if(text && !map.has(text)){
      next++; map.set(text, next); additions.push(`${next}. ${text}`);
    }
  });
  if(additions.length){
    const ta = document.getElementById('fMotivos');
    ta.value = (ta.value.trim() ? ta.value.trim()+'\n' : '') + additions.join('\n');
  }
  return map;
}

function svgMatrixMotivos(motivoMap){
  const rowH=32;
  const L = matrixLayout(nodes, rowH);
  let s = `<svg viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}">`;
  s += drawRowLabels(L);
  const r = Math.min(rowH*0.31, 10);
  L.pairs.forEach(p=>{
    const a=L.rows[p.i], b=L.rows[p.j];
    const e = findEdge(a.id,b.id);
    const text = e && e.motivo ? e.motivo.trim() : '';
    if(text){
      const num = motivoMap.get(text) || '?';
      s += `<g><title>${a.id} — ${b.id}: ${text}</title>
        <path d="${diamondPath(p.x,p.y,r)}" fill="#fff" stroke="#8A93A3" stroke-width="1"/>
        <text x="${p.x}" y="${p.y+3}" text-anchor="middle" font-size="9" font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" fill="#17233B">${num}</text>
      </g>`;
    } else {
      s += `<path d="${diamondPath(p.x,p.y,r*0.55)}" fill="none" stroke="#E3E6EC" stroke-width="1"/>`;
    }
  });
  s += `</svg>`;
  return s;
}

function buildMotivoListHtml(motivoMap){
  const entries = [...motivoMap.entries()].sort((a,b)=>a[1]-b[1]);
  if(!entries.length) return '<span style="opacity:.6;">Sin motivos capturados aún.</span>';
  return '<ol class="motivo-list">' + entries.map(([text])=>`<li>${text}</li>`).join('') + '</ol>';
}

function legendSwatchImportancia(){
  return Object.entries(IMPORTANCIA).map(([k,v])=>{
    const fill = MATRIZ_COLOR[k];
    return `<div class="lg-row"><svg width="18" height="18"><path d="${diamondPath(9,9,7)}" fill="${fill||'#fff'}" stroke="#8A93A3" stroke-width="1"/></svg>${v.label}</div>`;
  }).join('');
}
function legendSwatchAdyacenciaLine(){
  return Object.entries(IMPORTANCIA).map(([k,v])=>{
    const col = MATRIZ_COLOR[k] || '#C7CEDA';
    return `<div class="lg-row"><svg width="26" height="14"><line x1="2" y1="7" x2="24" y2="7" stroke="${col}" stroke-width="2" stroke-linecap="round" ${v.dash?`stroke-dasharray="${v.dash}"`:''}/></svg>${v.label}</div>`;
  }).join('');
}
function legendSwatchFisica(){
  return Object.entries(FISICA).map(([k,v])=>{
    return `<div class="lg-row"><svg width="18" height="18">${glyphMarkup(k,9,9,6)}</svg>${v.label}</div>`;
  }).join('');
}

function renderMatrices(){
  const proyecto = document.getElementById('fProyecto').value || 'PROYECTO';
  const grid = document.getElementById('matrixGrid');
  if(!nodes.length){
    grid.innerHTML = `<div class="empty-note">Agrega espacios en la tabla de la izquierda para ver las matrices.</div>`;
    return;
  }
  const motivoMap = syncMotivoLegend();
  const motivoListHtml = buildMotivoListHtml(motivoMap);

  grid.innerHTML = `
    <div class="matrix-panel">
      <div class="matrix-head">
        <div><span class="t1">${proyecto}</span><span class="t2">Importancia Relativa</span></div>
        <button class="mini-btn" data-export-svg="importancia">⤓ SVG</button>
      </div>
      <div class="matrix-body">
        <div class="matrix-svg-wrap">${svgMatrixImportancia()}</div>
        <div class="matrix-legend-list"><div class="lg-title">Adyacencia</div>${legendSwatchImportancia()}</div>
      </div>
    </div>
    <div class="matrix-panel">
      <div class="matrix-head">
        <div><span class="t1">${proyecto}</span><span class="t2">Relación Física</span></div>
        <button class="mini-btn" data-export-svg="fisica">⤓ SVG</button>
      </div>
      <div class="matrix-body">
        <div class="matrix-svg-wrap">${svgMatrixFisica()}</div>
        <div class="matrix-legend-list"><div class="lg-title">Relación Física</div>${legendSwatchFisica()}</div>
      </div>
    </div>
    <div class="matrix-panel full">
      <div class="matrix-head">
        <div><span class="t1">${proyecto}</span><span class="t2">Deseos y Motivos</span></div>
        <button class="mini-btn" data-export-svg="motivos">⤓ SVG</button>
      </div>
      <div class="matrix-body">
        <div class="matrix-svg-wrap">${svgMatrixMotivos(motivoMap)}</div>
        <div class="matrix-legend-list" style="min-width:280px;"><div class="lg-title">Deseos y Motivos</div>${motivoListHtml}</div>
      </div>
    </div>
  `;

  grid.querySelectorAll('[data-export-svg]').forEach(btn=>{
    btn.onclick = ()=>{
      const type = btn.dataset.exportSvg;
      const slug = slugify(proyecto);
      const map = {
        importancia: {svg: svgMatrixImportancia(), name:'importancia-relativa'},
        fisica:      {svg: svgMatrixFisica(),      name:'relacion-fisica'},
        motivos:     {svg: svgMatrixMotivos(motivoMap), name:'deseos-y-motivos'},
      }[type];
      exportSvgString(map.svg, `${slug}_matriz-${map.name}.svg`);
    };
  });
}

function refreshMatricesIfVisible(){
  if(document.getElementById('paneMatrices').classList.contains('active')) renderMatrices();
}

/* =========================================================================
   5) TABLAS EDITABLES (MODIFICADO: la tabla de Nodos ahora incluye la
      columna inicial "#" con el ID numérico persistente de cada espacio)
   ========================================================================= */
function renderTables(){
  const tb = document.querySelector('#tblNodos tbody');
  tb.innerHTML='';
  nodes.forEach((n,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="idx-num">${n.num}</td>
      <td><input value="${n.id}" data-i="${i}" data-f="id"></td>
      <td class="num"><input type="number" step="0.5" value="${n.area}" data-i="${i}" data-f="area"></td>
      <td><select data-i="${i}" data-f="planta">
        ${plantas.map(p=>`<option ${n.planta===p?'selected':''}>${p}</option>`).join('')}
      </select></td>
      <td class="row-del" data-del="${i}">✕</td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('input,select').forEach(el=>el.onchange = e=>{
    const i=+e.target.dataset.i, f=e.target.dataset.f;
    nodes[i][f] = f==='area' ? parseFloat(e.target.value)||0 : e.target.value;
    autoGenerate();
  });
  tb.querySelectorAll('[data-del]').forEach(el=>el.onclick = e=>{
    nodes.splice(+e.target.dataset.del,1); renderTables(); autoGenerate();
  });

  const teb = document.querySelector('#tblEdges tbody');
  teb.innerHTML='';
  const opts = nodes.map(n=>n.id);
  edges.forEach((e,i)=>{
    const tr = document.createElement('tr');
    const nodeOpts = id => opts.map(o=>`<option ${o===id?'selected':''}>${o}</option>`).join('');
    tr.innerHTML = `<td><select data-i="${i}" data-f="source">${nodeOpts(e.source.id||e.source)}</select></td>
      <td><select data-i="${i}" data-f="target">${nodeOpts(e.target.id||e.target)}</select></td>
      <td><input value="${e.motivo||''}" title="${e.motivo||''}" data-i="${i}" data-f="motivo" style="width:70px;"></td>
      <td><select data-i="${i}" data-f="fisica">${Object.keys(FISICA).map(k=>`<option value="${k}" ${e.fisica===k?'selected':''}>${FISICA[k].label}</option>`).join('')}</select></td>
      <td><select data-i="${i}" data-f="importancia">${Object.keys(IMPORTANCIA).map(k=>`<option value="${k}" ${e.importancia===k?'selected':''}>${IMPORTANCIA[k].label}</option>`).join('')}</select></td>
      <td class="row-del" data-del="${i}">✕</td>`;
    teb.appendChild(tr);
  });
  teb.querySelectorAll('input,select').forEach(el=>el.onchange = e=>{
    const i=+e.target.dataset.i, f=e.target.dataset.f;
    edges[i][f] = e.target.value;
    autoGenerate();
  });
  teb.querySelectorAll('[data-del]').forEach(el=>el.onclick = e=>{
    edges.splice(+e.target.dataset.del,1); renderTables(); autoGenerate();
  });
}

/* =========================================================================
   6) EXPORT — el JSON queda listo para leerse desde un componente Python
      en Grasshopper en la siguiente etapa del workflow. El campo n.num de
      cada nodo viaja automáticamente dentro de nodes[] al serializar.
   ========================================================================= */
function currentPayload(){
  const c = currentConfigs[selectedIndex];
  return {
    proyecto: document.getElementById('fProyecto').value,
    fase: document.getElementById('fFase').value,
    elaboro: document.getElementById('fElaboro').value,
    motivos: document.getElementById('fMotivos').value,
    plantas,
    plantaColors,
    nodes,
    edges: edges.map(e=>({source:e.source.id||e.source, target:e.target.id||e.target, motivo:e.motivo, fisica:e.fisica, importancia:e.importancia})),
    variante: c ? {
      index: selectedIndex+1,
      cumplimiento: c.score,
      cruces: c.crossings,
      nodes: c.result.nodes.map(n=>({id:n.id, num:n.num, area:n.area, planta:n.planta, x:Math.round(n.x), y:Math.round(n.y)}))
    } : null,
    savedAt: new Date().toISOString()
  };
}
function exportJSON(){
  const payload = currentPayload();
  if(!payload.variante) return;
  download(`${payload.proyecto.replace(/\s+/g,'_')}_burbujas_v${selectedIndex+1}.json`, JSON.stringify(payload,null,2), 'application/json');
}
function exportSVG(){
  const svg = document.getElementById('mainSvg');
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  download(`burbujas_v${selectedIndex+1}.svg`, clone.outerHTML, 'image/svg+xml');
}
function download(filename, text, type){
  const blob = new Blob([text], {type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

/* -- export de las matrices: SVG individual (por panel) y PDF (las 3 juntas,
      vía el diálogo "Guardar como PDF" de imprimir del navegador — sin
      librerías externas, y con la misma tipografía/colores que en pantalla) -- */
function exportSvgString(svgStr, filename){
  const withNs = svgStr.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  download(filename, withNs, 'image/svg+xml');
}

function exportMatricesPDF(){
  if(!nodes.length){ return; }
  const proyecto = document.getElementById('fProyecto').value || 'PROYECTO';
  const fase = document.getElementById('fFase').value || '';
  const motivoMap = syncMotivoLegend();

  const pages = [
    { sub:'Importancia Relativa', svg: svgMatrixImportancia(),
      legend: `<div class="matrix-legend-list"><div class="lg-title">Adyacencia</div>${legendSwatchImportancia()}</div>` },
    { sub:'Relación Física', svg: svgMatrixFisica(),
      legend: `<div class="matrix-legend-list"><div class="lg-title">Relación Física</div>${legendSwatchFisica()}</div>` },
    { sub:'Deseos y Motivos', svg: svgMatrixMotivos(motivoMap),
      legend: `<div class="matrix-legend-list" style="min-width:280px;"><div class="lg-title">Deseos y Motivos</div>${buildMotivoListHtml(motivoMap)}</div>` },
  ];

  document.getElementById('printArea').innerHTML = pages.map(p=>`
    <div class="print-page">
      <div class="print-head">
        <span class="t1">${proyecto}</span>
        <span class="t2">${p.sub}</span>
        ${fase ? `<span class="t3">Fase: ${fase}</span>` : ''}
      </div>
      <div class="print-body">
        <div class="matrix-svg-wrap">${p.svg}</div>
        ${p.legend}
      </div>
    </div>
  `).join('');

  window.print();
}
/* -- diagrama de burbujas a escala arquitectónica real: el radio de cada
      círculo se calcula con la fórmula real de área de un círculo
      (r = √(área/π)), sin el "piso" de legibilidad que usa la vista en
      pantalla. Como la posición on-screen ya es proporcional a √área con
      el mismo factor (radiusFor = √área·kScale), existe un único factor
      mm-por-unidad que hace que TODO el layout (posiciones y radios) se
      vuelva físicamente exacto en la escala elegida — las distancias entre
      espacios siguen siendo esquemáticas (como en cualquier diagrama de
      burbujas), solo el tamaño de cada círculo queda acotado a escala. -- */
function trueRadiusUnits(area, kScale){ return Math.sqrt(area) * kScale; }

function buildTrueScaleLayout(result){
  const kScale = result.kScale;
  const pts = result.nodes.map(n=>({...n, r: trueRadiusUnits(n.area, kScale)}));
  const minX = Math.min(...pts.map(p=>p.x-p.r)), maxX = Math.max(...pts.map(p=>p.x+p.r));
  const minY = Math.min(...pts.map(p=>p.y-p.r)), maxY = Math.max(...pts.map(p=>p.y+p.r));
  return { pts, kScale, bboxW: Math.max(1,maxX-minX), bboxH: Math.max(1,maxY-minY), minX, minY, edges: result.edges };
}

function chooseScale(bboxWUnits, bboxHUnits, kScale, targetWmm, targetHmm){
  const k = 1000/(Math.sqrt(Math.PI)*kScale); // mm por unidad, a escala 1:1
  const needed = Math.max(bboxWUnits/targetWmm, bboxHUnits/targetHmm) * k;
  for(const E of STANDARD_SCALES){ if(E >= needed) return E; }
  return STANDARD_SCALES[STANDARD_SCALES.length-1];
}

function svgTrueScaleBubbles(scaleE, layout){
  const mmPerUnit = 1000/(Math.sqrt(Math.PI)*layout.kScale*scaleE);
  const pad = 10;
  const W = layout.bboxW*mmPerUnit + pad*2, H = layout.bboxH*mmPerUnit + pad*2;
  const tx = p => (p.x-layout.minX)*mmPerUnit + pad;
  const ty = p => (p.y-layout.minY)*mmPerUnit + pad;
  const byId = id => layout.pts.find(n=>n.id===id);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" xmlns="http://www.w3.org/2000/svg">`;
  layout.edges.forEach(e=>{
    const style = IMPORTANCIA[e.importancia];
    const a = byId(e.source.id||e.source), b = byId(e.target.id||e.target);
    if(!a||!b) return;
    const col = MATRIZ_COLOR[e.importancia] || '#C7CEDA';
    s += `<line x1="${tx(a)}" y1="${ty(a)}" x2="${tx(b)}" y2="${ty(b)}" stroke="${col}" stroke-width="${style.width*0.35}" stroke-linecap="round" ${style.dash?`stroke-dasharray="${style.dash}"`:''} opacity="${e.importancia==='negativa'?0.9:0.75}"/>`;
    const mx=(tx(a)+tx(b))/2, my=(ty(a)+ty(b))/2;
    const gR = 1.4; // mismo tamaño relativo que el ícono de la leyenda, fijo
    s += `<circle cx="${mx}" cy="${my}" r="${gR+0.4}" fill="#F7F8FA" opacity="0.92"/>${glyphMarkup(e.fisica, mx, my, gR)}`;
  });
  layout.pts.forEach((p)=>{
    const r = p.r*mmPerUnit, cx=tx(p), cy=ty(p);
    const ring = plantaColor(p.planta);
    s += `<circle cx="${cx}" cy="${cy}" r="${r+0.9}" fill="none" stroke="${ring}" stroke-width="0.6"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#17233B" stroke-width="0.15"/>`;
    if(r > 9){
      s += `<text x="${cx}" y="${cy-r+2.6}" text-anchor="middle" font-size="1.9" font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" fill="#8A93A3">${p.num}</text>`;
      s += `<text x="${cx}" y="${cy-1}" text-anchor="middle" font-size="${Math.min(3.2,r/3)}" font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" font-weight="600" fill="#17233B">${p.id}</text>`;
      s += `<text x="${cx}" y="${cy+3}" text-anchor="middle" font-size="2.4" font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" fill="#4A5771">${p.area} m²</text>`;
    } else {
      s += `<text x="${cx}" y="${cy-r-1.8}" text-anchor="middle" font-size="2.6" font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" fill="#17233B">${p.num}</text>`;
    }
  });
  s += `</svg>`;
  return s;
}

function scaleBarSVG(scaleE){
  const mmPerMeter = 1000/scaleE;
  let step=5; if(mmPerMeter*5 > 90) step = Math.max(1, Math.floor(90/(mmPerMeter*5))*1) || 1;
  const count = 5;
  const totalMM = step*count*mmPerMeter;
  let s = `<svg viewBox="0 0 ${totalMM+10} 14" width="${totalMM+10}mm" height="14mm" xmlns="http://www.w3.org/2000/svg">`;
  for(let i=0;i<count;i++){
    const x0=5+i*step*mmPerMeter, x1=x0+step*mmPerMeter;
    s += `<rect x="${x0}" y="4" width="${x1-x0}" height="3" fill="${i%2===0?'#17233B':'#fff'}" stroke="#17233B" stroke-width="0.3"/>`;
  }
  s += `<text x="5" y="12" font-size="2.6" font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" fill="#4A5771">0</text>`;
  s += `<text x="${5+count*step*mmPerMeter}" y="12" font-size="2.6" font-family="'Helvetica Neue',Helvetica,Arial,sans-serif" fill="#4A5771" text-anchor="end">${count*step} m</text>`;
  s += `</svg>`;
  return s;
}

function exportBubblePDF(){
  const c = currentConfigs[selectedIndex];
  if(!c) return;
  const proyecto = document.getElementById('fProyecto').value || 'PROYECTO';
  const fase = document.getElementById('fFase').value || '';
  const elaboro = document.getElementById('fElaboro').value || '';

  const layout = buildTrueScaleLayout(c.result);
  const scaleE = chooseScale(layout.bboxW, layout.bboxH, layout.kScale, 190, 148);
  const svgMarkup = svgTrueScaleBubbles(scaleE, layout);
  const totalArea = nodes.reduce((a,n)=>a+n.area,0);

  const infoBits = [
    fase ? `Fase: ${fase}` : '', elaboro ? `Elaboró: ${elaboro}` : '',
    `${Math.round(c.score*100)}% de adyacencias satisfechas`
  ].filter(Boolean).join(' · ');

  document.getElementById('printArea').innerHTML = `
    <div class="print-page">
      <div class="print-head">
        <span class="t1">${proyecto}</span>
        <span class="t2">Diagrama de burbujas — Variante ${selectedIndex+1}</span>
        <span class="t3">${infoBits}</span>
      </div>
      <div class="print-body-split">
        <div class="print-diagram-col">
          <div class="matrix-svg-wrap">${svgMarkup}</div>
        </div>
        <div class="print-side-col">
          ${buildAreasTableHtml()}
          <div class="legend-block">
            <div class="matrix-legend-list"><div class="lg-title">Adyacencia</div>${legendSwatchAdyacenciaLine()}</div>
            <div class="matrix-legend-list"><div class="lg-title">Relación Física</div><div class="legend-2col">${legendSwatchFisica()}</div></div>
          </div>
        </div>
      </div>
      <div class="print-foot">
        ${scaleBarSVG(scaleE)}
        <div class="print-foot-text">
          <b>Escala gráfica 1:${scaleE}</b><br>
          El diámetro de cada círculo representa el área real (m²) del espacio, dibujado a esta escala. Las distancias entre espacios son esquemáticas, no acotadas.<br>
          ${nodes.length} espacios · ${totalArea.toFixed(1)} m² totales
        </div>
      </div>
    </div>
  `;
  window.print();
}

function escapeDxfText(s){ return String(s).replace(/[\n\r]/g,' '); }

function exportBubbleDXF(){
  const c = currentConfigs[selectedIndex];
  if(!c) return;
  const layout = buildTrueScaleLayout(c.result);
  const k = 1000/(Math.sqrt(Math.PI)*layout.kScale); // mm por unidad, escala real 1:1
  const bboxHmm = layout.bboxH*k;
  const tx = p => (p.x-layout.minX)*k;
  const ty = p => bboxHmm - (p.y-layout.minY)*k; // DXF: eje Y hacia arriba

  let dxf = '0\nSECTION\n2\nENTITIES\n';
  layout.edges.forEach(e=>{
    const a = layout.pts.find(n=>n.id===(e.source.id||e.source));
    const b = layout.pts.find(n=>n.id===(e.target.id||e.target));
    if(!a||!b) return;
    dxf += `0\nLINE\n8\nADYACENCIAS\n10\n${tx(a).toFixed(2)}\n20\n${ty(a).toFixed(2)}\n11\n${tx(b).toFixed(2)}\n21\n${ty(b).toFixed(2)}\n`;
  });
  layout.pts.forEach(p=>{
    const cx=tx(p), cy=ty(p), r=p.r*k;
    dxf += `0\nCIRCLE\n8\nESPACIOS\n10\n${cx.toFixed(2)}\n20\n${cy.toFixed(2)}\n40\n${r.toFixed(2)}\n`;
    const h = Math.max(30, r*0.5);
    dxf += `0\nTEXT\n8\nTEXTOS\n10\n${(cx-h*0.3).toFixed(2)}\n20\n${(cy+h*0.1).toFixed(2)}\n40\n${h.toFixed(2)}\n1\n${p.num}\n`;
    dxf += `0\nTEXT\n8\nTEXTOS\n10\n${(cx-r*0.8).toFixed(2)}\n20\n${(cy-h*0.6).toFixed(2)}\n40\n${(h*0.35).toFixed(2)}\n1\n${escapeDxfText(p.id)}\n`;
    dxf += `0\nTEXT\n8\nTEXTOS\n10\n${(cx-r*0.5).toFixed(2)}\n20\n${(cy-h*1.1).toFixed(2)}\n40\n${(h*0.3).toFixed(2)}\n1\n${p.area} m2\n`;
  });
  dxf += '0\nENDSEC\n0\nEOF\n';
  const slug = slugify(document.getElementById('fProyecto').value || 'burbujas');
  download(`${slug}_burbujas_v${selectedIndex+1}.dxf`, dxf, 'application/dxf');
}

/* -- tabla de áreas: mismo formato que la lámina de oficina (índice en
      itálica, agrupado por planta, subtotal y TOTAL general) -- */
function buildAreasTableHtml(){
  const groups = plantas.map(p=>({p, items: nodes.filter(n=>n.planta===p)})).filter(g=>g.items.length);
  const totalGeneral = nodes.reduce((a,n)=>a+n.area,0);
  let html = '';
  groups.forEach(g=>{
    const subtotal = g.items.reduce((a,n)=>a+n.area,0);
    html += `<table class="areas-table">
      <thead><tr><th colspan="2">Planta ${g.p}</th><th>m²</th></tr></thead>
      <tbody>
        ${g.items.map(n=>`<tr><td class="idx">${String(n.num).padStart(2,'0')}</td><td>${n.id}</td><td class="num">${n.area} m²</td></tr>`).join('')}
        <tr class="subtotal"><td colspan="2">Subtotal</td><td class="num">${subtotal.toFixed(1)} m²</td></tr>
      </tbody>
    </table>`;
  });
  html += `<table class="areas-table total-table"><tbody><tr class="total"><td colspan="2">TOTAL</td><td class="num">${totalGeneral.toFixed(1)} m²</td></tr></tbody></table>`;
  return html;
}
function exportAreasPDF(){
  if(!nodes.length) return;
  const proyecto = document.getElementById('fProyecto').value || 'PROYECTO';
  const fase = document.getElementById('fFase').value || '';
  document.getElementById('printArea').innerHTML = `
    <div class="print-page">
      <div class="print-head">
        <span class="t1">${proyecto}</span>
        <span class="t2">Tabla de Áreas</span>
        ${fase ? `<span class="t3">Fase: ${fase}</span>` : ''}
      </div>
      <div class="print-body" style="flex-direction:column; gap:14px;">${buildAreasTableHtml()}</div>
    </div>
  `;
  window.print();
}

window.addEventListener('afterprint', ()=>{
  const el = document.getElementById('printArea');
  if(el) el.innerHTML = '';
});

/* =========================================================================
   6b) IMPORTADOR DE EXCEL — lee las 4 hojas (TABLA-AREAS, MATRIZ-DM/RF/IR)
       tal como las exporta Google Sheets/Excel del estudio. Convención de
       la matriz triangular: en la fila del espacio local i, la columna C
       es la relación con el espacio (i+1), D con (i+2), etc. — la misma
       convención que ya usa matrixLayout() para dibujar en pantalla.
       Bloques cuya etiqueta contiene "Cuadro" (resumen de áreas) o
       "Completo" (relaciones entre pisos, no soportado en esta versión)
       se omiten.
   ========================================================================= */
function sheetToAOA(wb, nameFragment){
  const name = wb.SheetNames.find(n => n.toUpperCase().includes(nameFragment));
  if(!name) return null;
  return XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1, defval:null});
}

function isLetterHeaderRow(row){
  const a = row[0], b = row[1];
  return typeof a === 'string' && a.trim().length <= 2 && a.trim() === a.trim().toUpperCase() && b;
}

function parseAreaBlocks(aoa){
  const blocks = [];
  for(let i=0;i<aoa.length;i++){
    const row = aoa[i] || [];
    if(!isLetterHeaderRow(row)) continue;
    const label = String(row[1]).split('(')[0].trim();
    if(/cuadro/i.test(label)) continue;
    const items = [];
    for(let j=i+1;j<aoa.length;j++){
      const r = aoa[j] || [];
      if(r[0]==null && r[1]==null) break;
      if(typeof r[1]==='string' && r[1].trim().toUpperCase()==='TOTAL') break;
      if(typeof r[0]==='number' && r[1]!=null){
        items.push({localIndex:r[0], name:String(r[1]).trim(), area:Number(r[2])||0});
      }
    }
    blocks.push({label, items});
  }
  return blocks;
}

function parseMatrixBlocks(aoa){
  const blocks = [];
  for(let i=0;i<aoa.length;i++){
    const row = aoa[i] || [];
    if(!isLetterHeaderRow(row)) continue;
    const label = String(row[1]).trim();
    if(/completo/i.test(label)) continue;
    const items = [];
    for(let j=i+1;j<aoa.length;j++){
      const r = aoa[j] || [];
      if(r[0]==null && r[1]==null) break;
      if(typeof r[0]==='number' && r[1]!=null){
        items.push({localIndex:r[0], name:String(r[1]).trim(), values:r.slice(2)});
      }
    }
    blocks.push({label, items});
  }
  return blocks;
}

const RF_GLYPH_MAP = {'⬡':'contencion-abierta','⬢':'contencion-cerrada','△':'contiguo-abierta','▲':'contiguo-cerrada','◾':'neutro','⭘':'separacion-barrera','⬤':'separacion-locacion'};
function mapFisicaCell(v){
  if(v==null || String(v).trim()==='') return null;
  return RF_GLYPH_MAP[String(v).trim()] || 'por-decidir';
}
const IR_ORDER = ['mandatoria','deseable','neutral','negativa','por-decidir'];
function mapImportanciaCell(v){
  if(v==null || String(v).trim()==='') return null;
  if(typeof v === 'number') return IR_ORDER[Math.min(Math.max(Math.round(v)-1,0),4)];
  const s = String(v).toLowerCase();
  if(s.includes('mandat')) return 'mandatoria';
  if(s.includes('desea')) return 'deseable';
  if(s.includes('neutral')) return 'neutral';
  if(s.includes('negativ')) return 'negativa';
  return 'por-decidir';
}

function importFromWorkbook(wb){
  const aoaAreas = sheetToAOA(wb,'AREAS');
  if(!aoaAreas){ alert('No se encontró la hoja de Tabla de Áreas'); return; }
  const aoaDM = sheetToAOA(wb,'-DM') || sheetToAOA(wb,'MOTIVOS');
  const aoaRF = sheetToAOA(wb,'-RF') || sheetToAOA(wb,'FISICA');
  const aoaIR = sheetToAOA(wb,'-IR') || sheetToAOA(wb,'IMPORTANCIA');

  const areaBlocks = parseAreaBlocks(aoaAreas);
  plantas = areaBlocks.map(b=>b.label);
  plantaColors = {};
  areaBlocks.forEach((b,i)=>{ plantaColors[b.label] = PLANTA_PALETTE[i % PLANTA_PALETTE.length]; });

  nodes = [];
  const lookup = {};
  let num = 1;
  areaBlocks.forEach(b=>{
    b.items.forEach(it=>{
      const node = {id:it.name, area:it.area, planta:b.label, num:num++};
      nodes.push(node);
      lookup[b.label+'|'+it.localIndex] = node;
    });
  });
  nextNodeId = num;

  const dmBlocks = aoaDM ? parseMatrixBlocks(aoaDM) : [];
  const rfByLabel = Object.fromEntries((aoaRF ? parseMatrixBlocks(aoaRF) : []).map(b=>[b.label,b]));
  const irByLabel = Object.fromEntries((aoaIR ? parseMatrixBlocks(aoaIR) : []).map(b=>[b.label,b]));

  edges = [];
  let motivoMax = 0;
  dmBlocks.forEach(dmBlock=>{
    const rfBlock = rfByLabel[dmBlock.label];
    const irBlock = irByLabel[dmBlock.label];
    dmBlock.items.forEach((item, idx)=>{
      const rfItem = rfBlock && rfBlock.items[idx];
      const irItem = irBlock && irBlock.items[idx];
      item.values.forEach((dmVal, k)=>{
        const rfVal = rfItem ? rfItem.values[k] : null;
        const irVal = irItem ? irItem.values[k] : null;
        if(dmVal==null && rfVal==null && irVal==null) return;
        const a = lookup[dmBlock.label+'|'+item.localIndex];
        const b2 = lookup[dmBlock.label+'|'+(item.localIndex + k + 1)];
        if(!a || !b2) return;
        let motivo = '';
        if(dmVal!=null){ const n=Number(dmVal); motivo='Motivo '+n; if(n>motivoMax) motivoMax=n; }
        edges.push({
          source: a.id, target: b2.id, motivo,
          fisica: mapFisicaCell(rfVal) || 'por-decidir',
          importancia: mapImportanciaCell(irVal) || 'por-decidir'
        });
      });
    });
  });

  const lines = []; for(let n=1;n<=motivoMax;n++) lines.push(n+'. Motivo '+n);
  document.getElementById('fMotivos').value = lines.join('\n');

  renderPlantaChips();
  renderTables();
  autoGenerate();
}

document.getElementById('btnImportExcel').onclick = ()=> document.getElementById('fileExcel').click();
document.getElementById('fileExcel').onchange = async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, {type:'array'});
  importFromWorkbook(wb);
  e.target.value = '';
};

/* =========================================================================
   7) CONTROLES
   ========================================================================= */
function autoGenerate(){
  const count = +document.getElementById('rNumConfigs').value;
  const charge = +document.getElementById('rCharge').value;
  currentConfigs = generateConfigs(count, charge);
  selectedIndex = 0;
  renderGrid();
  renderDetail();
  refreshMatricesIfVisible();
}

document.getElementById('btnAddPlanta').onclick = ()=>{
  const input = document.getElementById('newPlantaName');
  const name = input.value.trim();
  if(!name || plantas.includes(name)) return;
  plantas.push(name);
  plantaColors[name] = PLANTA_PALETTE[(plantas.length-1) % PLANTA_PALETTE.length];
  input.value = '';
  renderPlantaChips();
  renderTables();
};
document.getElementById('btnGenerar').onclick = ()=>{ autoGenerate(); };
document.getElementById('btnExportJSON').onclick = exportJSON;
document.getElementById('btnExportSVG').onclick = exportSVG;
document.getElementById('btnExportDXF').onclick = exportBubbleDXF;
document.getElementById('btnExportBubblePDF').onclick = exportBubblePDF;
document.getElementById('btnExportAreasPDF').onclick = exportAreasPDF;
document.getElementById('btnExportMatricesPDF').onclick = exportMatricesPDF;
document.querySelectorAll('[data-add]').forEach(b=>b.onclick = ()=>{
  // MODIFICADO — el nuevo espacio recibe el siguiente ID numérico único
  if(b.dataset.add==='node') nodes.push({id:'Nuevo espacio', area:10, planta:plantas[0], num:nextNodeId++});
  else edges.push({source:nodes[0]?.id||'', target:nodes[1]?.id||nodes[0]?.id||'', motivo:'', fisica:'neutro', importancia:'neutral'});
  renderTables();
  autoGenerate();
});
['rNumConfigs','rCharge'].forEach(id=>{
  const el = document.getElementById(id);
  const val = document.getElementById('v'+id.slice(1));
  el.oninput = ()=>{ val.textContent = el.value; };
});
document.getElementById('rLabelMode').onchange = (e)=>{ labelMode = e.target.value; renderGrid(); renderDetail(); };
document.getElementById('fMotivos').addEventListener('input', refreshMatricesIfVisible);
document.getElementById('fProyecto').addEventListener('input', refreshMatricesIfVisible);

/* pestañas: Burbujas / Matrices — la consola izquierda (aside) no se toca */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view-pane').forEach(p=>p.classList.remove('active'));
    const paneId = btn.dataset.view==='burbujas' ? 'paneBurbujas' : 'paneMatrices';
    document.getElementById(paneId).classList.add('active');
    if(btn.dataset.view==='matrices') renderMatrices();
  };
});

/* =========================================================================
   8) ESTUDIOS EN GITHUB — usa la Contents API de GitHub directo desde el
      navegador (sin backend). Cada estudio vive en:
        estudios/<slug-del-proyecto>/matrices.json
      El token se guarda solo en localStorage de este navegador — nunca
      viaja a ningún otro lado más que a api.github.com. Recomendado:
      un fine-grained personal access token con permiso de Contents
      (read & write) limitado a un solo repositorio.
   ========================================================================= */
function slugify(s){ return s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function ghConfig(){
  return {
    owner: document.getElementById('ghOwner').value.trim(),
    repo: document.getElementById('ghRepo').value.trim(),
    token: document.getElementById('ghToken').value.trim(),
    branch: 'main'
  };
}
function ghHeaders(cfg){
  return { 'Authorization':'token '+cfg.token, 'Accept':'application/vnd.github+json' };
}
function ghStatus(msg, isError){
  const el = document.getElementById('ghStatus');
  el.textContent = msg;
  el.style.color = isError ? '#B5432E' : '#8A93A3';
}
function loadGhConfigFromStorage(){
  try{
    const saved = JSON.parse(localStorage.getItem('ghConfig')||'{}');
    if(saved.owner) document.getElementById('ghOwner').value = saved.owner;
    if(saved.repo) document.getElementById('ghRepo').value = saved.repo;
    if(saved.token) document.getElementById('ghToken').value = saved.token;
  }catch(e){}
}
function saveGhConfigToStorage(){
  const cfg = ghConfig();
  localStorage.setItem('ghConfig', JSON.stringify({owner:cfg.owner, repo:cfg.repo, token:cfg.token}));
}

async function ghSaveEstudio(){
  const cfg = ghConfig();
  if(!cfg.owner || !cfg.repo || !cfg.token){ ghStatus('faltan owner/repo/token', true); return; }
  saveGhConfigToStorage();
  const slug = slugify(document.getElementById('fProyecto').value || 'estudio');
  const path = `estudios/${slug}/matrices.json`;
  const payload = currentPayload();
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
  ghStatus('guardando…');
  try{
    let sha;
    const getRes = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`, {headers: ghHeaders(cfg)});
    if(getRes.ok){ sha = (await getRes.json()).sha; }
    const putRes = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`, {
      method:'PUT', headers: ghHeaders(cfg),
      body: JSON.stringify({ message:`Guardar estudio: ${slug}`, content, branch: cfg.branch, sha })
    });
    if(!putRes.ok){ const err = await putRes.json(); throw new Error(err.message||putRes.status); }
    ghStatus(`guardado: ${path}`);
    ghRefreshList();
  }catch(err){
    ghStatus('error al guardar: '+err.message, true);
  }
}

async function ghRefreshList(){
  const cfg = ghConfig();
  if(!cfg.owner || !cfg.repo || !cfg.token){ ghStatus('faltan owner/repo/token', true); return; }
  saveGhConfigToStorage();
  ghStatus('consultando…');
  try{
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/estudios`, {headers: ghHeaders(cfg)});
    const sel = document.getElementById('ghList');
    sel.innerHTML = '';
    if(res.status===404){ ghStatus('sin estudios guardados aún'); return; }
    if(!res.ok){ const err = await res.json(); throw new Error(err.message||res.status); }
    const items = (await res.json()).filter(f=>f.type==='dir');
    items.forEach(f=>{
      const opt = document.createElement('option');
      opt.value = f.name; opt.textContent = f.name;
      sel.appendChild(opt);
    });
    ghStatus(`${items.length} estudio(s)`);
  }catch(err){
    ghStatus('error al listar: '+err.message, true);
  }
}

async function ghLoadEstudio(){
  const cfg = ghConfig();
  const sel = document.getElementById('ghList');
  const slug = sel.value;
  if(!slug){ ghStatus('elige un estudio de la lista', true); return; }
  ghStatus('cargando…');
  try{
    const path = `estudios/${slug}/matrices.json`;
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`, {headers: ghHeaders(cfg)});
    if(!res.ok){ const err = await res.json(); throw new Error(err.message||res.status); }
    const file = await res.json();
    const payload = JSON.parse(decodeURIComponent(escape(atob(file.content))));
    document.getElementById('fProyecto').value = payload.proyecto || '';
    document.getElementById('fFase').value = payload.fase || '';
    document.getElementById('fElaboro').value = payload.elaboro || '';
    document.getElementById('fMotivos').value = payload.motivos || '';
    plantas = payload.plantas && payload.plantas.length ? payload.plantas : ['Baja','Alta'];
    plantaColors = payload.plantaColors || {};
    // MODIFICADO — normaliza estudios guardados antes de esta Fase 1 (sin `num`)
    // y recalcula el contador de IDs para que los próximos espacios no choquen.
    let maxNum = 0;
    nodes = (payload.nodes || []).map((n,i)=>{
      const num = (n.num != null) ? n.num : (i+1);
      if(num > maxNum) maxNum = num;
      return {...n, num};
    });
    nextNodeId = maxNum + 1;
    edges = payload.edges || [];
    renderPlantaChips();
    renderTables();
    autoGenerate();
    ghStatus(`cargado: ${slug}`);
  }catch(err){
    ghStatus('error al cargar: '+err.message, true);
  }
}

document.getElementById('btnGhSave').onclick = ghSaveEstudio;
document.getElementById('btnGhRefresh').onclick = ghRefreshList;
document.getElementById('btnGhLoad').onclick = ghLoadEstudio;
loadGhConfigFromStorage();

/* =========================================================================
   9) PANEL LATERAL REDIMENSIONABLE
   ========================================================================= */
(function(){
  const resizer = document.getElementById('resizer');
  const root = document.documentElement;
  let dragging = false;
  resizer.addEventListener('mousedown', e=>{
    dragging = true;
    resizer.classList.add('dragging');
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e=>{
    if(!dragging) return;
    const w = Math.min(Math.max(e.clientX, 260), window.innerWidth*0.75);
    root.style.setProperty('--aside-w', w+'px');
  });
  window.addEventListener('mouseup', ()=>{
    if(!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    document.body.style.userSelect = '';
  });
})();

/* =========================================================================
   10) ZOOM / PAN del diagrama de burbujas seleccionado
   ========================================================================= */
(function(){
  const svg = document.getElementById('mainSvg');
  let scale=1, panX=0, panY=0, panning=false, lastX=0, lastY=0;

  window.applyZoomTransform = function(){
    const g = document.getElementById('zoomG');
    if(g) g.setAttribute('transform', `translate(${panX},${panY}) scale(${scale})`);
  };
  function zoomBy(factor, cx, cy){
    const ns = Math.min(Math.max(scale*factor, 0.3), 8);
    panX = cx - (cx-panX)*(ns/scale);
    panY = cy - (cy-panY)*(ns/scale);
    scale = ns;
    applyZoomTransform();
  }
  function svgPoint(clientX, clientY){
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  svg.addEventListener('wheel', e=>{
    e.preventDefault();
    const p = svgPoint(e.clientX, e.clientY);
    zoomBy(e.deltaY < 0 ? 1.12 : 1/1.12, p.x, p.y);
  }, {passive:false});
  svg.addEventListener('mousedown', e=>{ panning=true; lastX=e.clientX; lastY=e.clientY; svg.style.cursor='grabbing'; });
  window.addEventListener('mousemove', e=>{
    if(!panning) return;
    const ctm = svg.getScreenCTM();
    panX += (e.clientX-lastX)/ctm.a; panY += (e.clientY-lastY)/ctm.d;
    lastX = e.clientX; lastY = e.clientY;
    applyZoomTransform();
  });
  window.addEventListener('mouseup', ()=>{ panning=false; svg.style.cursor='grab'; });

  document.getElementById('btnZoomIn').onclick = ()=> zoomBy(1.25, 720, 466);
  document.getElementById('btnZoomOut').onclick = ()=> zoomBy(1/1.25, 720, 466);
  document.getElementById('btnZoomReset').onclick = ()=>{ scale=1; panX=0; panY=0; applyZoomTransform(); };
})();

renderLegend();
renderPlantaChips();
renderTables();
autoGenerate();
