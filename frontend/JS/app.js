"use strict";
const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const SUIT_SYMBOL = {h:"♥", d:"♦", c:"♣", s:"♠"};
const selected = new Set();          // codis de la graella ("AKs","AA"...)
let street = "flop";
let board = [null,null,null];        // array de longitud segons carrer

/* ---------- Tema clar / fosc ---------- */
const THEME_KEY = "pokerRangeTheme";
function applyTheme(theme){
  const light = theme === "light";
  document.body.classList.toggle("light", light);
  const btn = document.getElementById("btnTheme");
  if(btn){
    btn.textContent = light ? "🌙 Tema fosc" : "☀️ Tema clar";
    const label = light ? "Canvia al tema fosc" : "Canvia al tema clar";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }
}
function initTheme(){
  let theme = null;
  try{ theme = localStorage.getItem(THEME_KEY); }catch(e){}
  applyTheme(theme === "light" ? "light" : "dark");
}
initTheme();
document.getElementById("btnTheme").addEventListener("click", ()=>{
  const next = document.body.classList.contains("light") ? "dark" : "light";
  applyTheme(next);
  try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
});

/* ---------- Graella 13x13 ---------- */
// Ordre original: files I columnes d'A a 2. La diagonal de parelles va de
// l'as al dos d'esquerra a dreta (AA, KK, QQ, ... 22). Triangle superior =
// suited, triangle inferior = offsuit.
const COL_RANKS = RANKS;
const ROW_RANKS = RANKS;
function cellCode(rk, ck){
  if(rk===ck) return rk+ck;                       // diagonal -> parells
  const iR = ROW_RANKS.indexOf(rk), iC = COL_RANKS.indexOf(ck);
  const pair=[rk,ck];
  if(RANKS.indexOf(rk) > RANKS.indexOf(ck)) pair.reverse(); // carta alta primer
  return pair[0]+pair[1]+(iC>iR?"s":"o");         // columna més avall que la fila -> suited
}
let isDragging = false;      // s'està arrossegant per la graella?
let dragSelect = true;       // mode de pintat: true = seleccionar, false = deseleccionar
function applyCell(code, cell, on){
  if(on){
    if(!selected.has(code)){selected.add(code);cell.classList.add("selected");}
  }else{
    if(selected.has(code)){selected.delete(code);cell.classList.remove("selected");}
  }
}
function buildGrid(){
  const g = document.getElementById("rangeGrid");
  g.innerHTML = "";
  for(const rk of ROW_RANKS){          // files: A..2
    for(const ck of COL_RANKS){        // columnes: A..2
      const code = cellCode(rk, ck);
      const kind = rk===ck ? "pair" : (code.endsWith("s") ? "suited":"offsuit");
      const cell = document.createElement("div");
      cell.className = `cell ${kind}`;
      cell.textContent = code;
      cell.dataset.code = code;
      cell.title = code + (kind==="pair"?" (6 combos)":kind==="suited"?" (4 combos suited)":" (12 combos offsuit)");
      // Clic + arrossegar: el primer clic decideix el mode (seleccionar si la
      // casella no estava triada, deseleccionar si ja ho estava) i totes les
      // caselles per on es passa (mantenint el botó premut) reben el mateix estat.
      cell.addEventListener("mousedown", e=>{
        e.preventDefault();
        isDragging = true;
        dragSelect = !selected.has(code);
        applyCell(code, cell, dragSelect);
        markPresetInactive();
        updateCounter();
      });
      g.appendChild(cell);
    }
  }
  // Durant l'arrossegament pintem la casella sota el punter. Usem mousemove a
  // nivell de graella perquè no es perdi cap casella si el ratolí va ràpid.
  g.addEventListener("mousemove", e=>{
    if(!isDragging) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el && el.closest ? el.closest(".cell") : null;
    if(!target || !g.contains(target)) return;
    applyCell(target.dataset.code, target, dragSelect);
    updateCounter();
  });
}
// En aixecar el botó (a qualsevol lloc) s'acaba l'arrossegament.
document.addEventListener("mouseup", ()=>{
  if(!isDragging) return;
  isDragging = false;
  markPresetInactive();
  updateCounter();
});
/* ---------- Presets de rang (seleccions predeterminades) ---------- */
// Convenció d'expansions amb «+» (idèntica al backend, backend/range_parser.py):
//   Sense «+» -> només la casella indicada (AKs -> AKs; AK -> AKs i AKo).
//   AA+   -> tots els parells des d'AA fins TT; 99+ -> 99..22.
//   Q9o+  -> es manté la carta ALTA i es puja la segona fins just per sota:
//            Q9o, QTo, QJo ; A9s+ -> A9s, ATs, AJs, AQs, AKs ; AKs+ -> AKs.
// Els presets "Top X %" inclouen parelles + suited + offsuit.
const PRESET_DEFAULTS = [
  {id:"top10", name:"Top 10 %", range:"AA+, AKs+, AQs+, AJo+, ATs, KQs+, KJo+"},
  {id:"top15", name:"Top 15 %", range:"AA+, AKs+, AQs+, AJs+, AQo+, ATo+, KQs+, KJo+, KTs+, QJs+, JTs"},
  {id:"top25", name:"Top 25 %", range:"AA+, AKs+, AQs+, AJs+, ATs+, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, AQo+, AJo+, ATo+, KQs+, KJs+, QTs+, JTs+, T9s+, 98s+, 87s+, 76s+, 65s+, 54s, KQo+, KJo+, KTo+, QJo+, JTo+, T9o+"},
  {id:"pairs", name:"Parelles", range:"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22"},
  {id:"suited", name:"Totes suited", range:"AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, JTs, J9s, J8s, J7s, J6s, J5s, J4s, J3s, J2s, T9s, T8s, T7s, T6s, T5s, T4s, T3s, T2s, 98s, 97s, 96s, 95s, 94s, 93s, 92s, 87s, 86s, 85s, 84s, 83s, 82s, 76s, 75s, 74s, 73s, 72s, 65s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s"},
  {id:"offsuit", name:"Totes offsuit", range:"AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, K7o, K6o, K5o, K4o, K3o, K2o, QJo, QTo, Q9o, Q8o, Q7o, Q6o, Q5o, Q4o, Q3o, Q2o, JTo, J9o, J8o, J7o, J6o, J5o, J4o, J3o, J2o, T9o, T8o, T7o, T6o, T5o, T4o, T3o, T2o, 98o, 97o, 96o, 95o, 94o, 93o, 92o, 87o, 86o, 85o, 84o, 83o, 82o, 76o, 75o, 74o, 73o, 72o, 65o, 64o, 63o, 62o, 54o, 53o, 52o, 43o, 42o, 32o"},
  {id:"anytwo", name:"Qualsevol dues", range:"+"},
];
const LS_KEY = "pokerRangePresets_v2";
let presets = loadPresets();
let activePresetId = null;

function loadPresets(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const arr = JSON.parse(raw);
      if(Array.isArray(arr)&&arr.length) return arr;
    }
  }catch(e){}
  return JSON.parse(JSON.stringify(PRESET_DEFAULTS));
}
function savePresets(){
  try{localStorage.setItem(LS_KEY, JSON.stringify(presets));}catch(e){}
}
// Converteix un token de preset en codis de cel·la ("+" sol = totes les mans)
function presetTokensToCells(tok){
  const raw = String(tok||"").trim();
  // Si el sufixo «+» va precedit d'un pal (AKs+, QQ+), s'expandeix directament
  // amb la convenció del backend. Aquesta comprovació s'ha de fer ABANS de
  // normalitzar/treure espais i abans de qualsevol altre tractament, perquè
  // els tokens amb «+» intern (ex: "ATs+A2s") segueixen la via dels rangs amb guió.
  // Nota: els parells amb «+» (QQ+, TT+) també passen per aquí. El regex accepta
  // el sufixo de pal en minúscula O MAJÚSCULA perquè el token es normalitza a
  // majúscules abans de comparar-lo (AKs+ -> AKS+: el pal 's' esdevé 'S').
  const upper = raw.toUpperCase();
  if(/^[AKQJT2-9][AKQJT2-9][so]?\+$/.test(raw) || /^[AKQJT2-9][AKQJT2-9][SO]?\+$/.test(upper)) {
    return expandPlusCells(upper.replace(/\s+/g,"").replace(/([SO])\+$/,(mm,g)=>g.toLowerCase()+"+")) || [];
  }
  // Normalitza a majúscules però conserva el sufix «s»/«o» en minúscula
  // (les cel·les de la graella fan servir "AKs", no "AKS").
  const t = tok.toUpperCase().replace(/\s+/g,"").replace(/([SO])(?=[-+]|$)/g,m=>m.toLowerCase());
  if(t==="+"||t==="ANY"||t==="ANY2"){
    const all=[];
    for(const rk of ROW_RANKS)for(const ck of COL_RANKS)all.push(cellCode(rk,ck));
    return all;
  }
  // Rangs amb guió: AA-99 (parells), AKs-AJs (suited consecutives), A5s-A2s ...
  const dash=/^([AKQJT2-9]{2})-([AKQJT2-9]{2})(s|o)?$/.exec(t);
  if(dash){
    const hi=dash[1], lo=dash[2];
    let sfx=dash[3]||"";
    // Si el codi porta sufixos diferents als extrems (ex: A5s-A2s), el tipus
    // es pren del primer extrem.
    if(!sfx){
      const mEnd=/^[AKQJT2-9][so]$/.exec(hi);
      if(mEnd) sfx=mEnd[1];
    }
    const base=t.slice(0,4);
    const i1=RANKS.indexOf(base[0]), i2=RANKS.indexOf(base[1]);
    const j1=RANKS.indexOf(base[2]), j2=RANKS.indexOf(base[3]);
    if(i1<0||i2<0||j1<0||j2<0)return [];
    const out=[], seen=new Set();
    const add=(a,b,k)=>{const c=a+b+k;if(!seen.has(c)){seen.add(c);out.push(c);}};
    if(sfx===""){
      // Sense sufixo: parells si els dos extrems ho són (AA-99), o bé totes
      // les mans no parella dels dos triangles entre els dos extrems (AK-QJ).
      const isPairEnds = (base[0]===base[1]) && (base[2]===base[3]);
      if(isPairEnds){
        for(let a=i1;a<=i2;a++)add(RANKS[a],RANKS[a],"");
      }else{
        for(let a=i1;a<=i2;a++){
          for(let b=a+1;b<RANKS.length;b++){
            if(b<j2)continue;                    // màxima segona carta = extreme baix
            if(a>i1 || b>j2){                    // exclou l'extrem per sota del límit
              add(RANKS[a],RANKS[b],"s"); add(RANKS[a],RANKS[b],"o");
            }
          }
        }
        // Filtre final: només mans dins del rectangle dels dos extrems indicats
        const loMin=Math.min(j1,j2), loMax=Math.max(j1,j2);
        return out.filter(c=>{
          const h=RANKS.indexOf(c[0]), l=RANKS.indexOf(c[1]);
          return h>=i1 && h<=i2 && l>=loMin && l<=loMax && l>h;
        });
      }
    }else{
      // Amb sufixo (AKs-AJs, A9s-A2s...): la carta alta recorre els extrems i
      // la baixa va des de T fins al rang del costat baix (convenció estàndard
      // dels gràfics de rangs). Ex: A5s-A2s -> A5s..A2s; AKs-AJs -> AKs,AQs,AJs.
      const tIdx=RANKS.indexOf("T");
      const aStart=Math.min(i1,j1), aEnd=Math.max(i1,j1);
      const bLo=Math.max(j2,tIdx);   // aturada a T si el límit és més alt
      for(let a=aStart;a<=aEnd;a++){
        for(let b=a+1;b<=bLo;b++)add(RANKS[a],RANKS[b],sfx);
      }
    }
    return out;
  }
  if(t.endsWith("+")){
    const e=expandPlusCells(t);
    return e||[];
  }
  if(/^[AKQJT2-9]{2}[so]?$/.test(t)){
    const r1=t[0],r2=t[1];
    if(r1===r2)return [r1+r2];
    if(t.length===2)return [r1+r2+"s",r1+r2+"o"];
    return [t];
  }
  return [];
}
function parsePresetRange(str){
  const out=[];
  for(const tok of String(str||"").split(/[\s,;]+/).filter(Boolean)){
    out.push(...presetTokensToCells(tok));
  }
  return [...new Set(out)];
}
function clearGridSelection(){
  selected.clear();
  document.querySelectorAll(".cell.selected").forEach(c=>c.classList.remove("selected"));
}
function applyPreset(id){
  const p = presets.find(x=>x.id===id);
  if(!p)return;
  const codes = parsePresetRange(p.range);
  clearGridSelection();
  for(const c of codes){
    const cell=document.querySelector(`.cell[data-code="${c}"]`);
    if(cell){selected.add(c);cell.classList.add("selected");}
  }
  activePresetId=id;
  renderPresetBar();
  updateCounter();
}
function markPresetInactive(){
  if(activePresetId===null)return;
  activePresetId=null;
  renderPresetBar();
}
// Preset especial «Neteja»: buida el tauler i deixa el rang sense seleccions.
function clearRangeSelection(){
  clearGridSelection();
  activePresetId=null;
  renderPresetBar();
  updateCounter();
}
function renderPresetBar(){
  const bar=document.getElementById("presetBar");
  bar.innerHTML="";
  const clearChip=document.createElement("button");
  clearChip.type="button";
  clearChip.className="chip neteja"+(selected.size===0?" active":"");
  clearChip.textContent="Neteja";
  clearChip.title="Neteja el tauler: deixa el rang sense seleccions";
  clearChip.addEventListener("click",clearRangeSelection);
  bar.appendChild(clearChip);
  for(const p of presets){
    const chip=document.createElement("button");
    chip.type="button";
    chip.className="chip"+(p.id===activePresetId?" active":"");
    chip.textContent=p.name;
    chip.title="Substitueix la selecció amb: "+p.range;
    chip.addEventListener("click",()=>applyPreset(p.id));
    bar.appendChild(chip);
  }
}
/* Editor de presets (finestra emergent) */
function openPresetEditor(){
  const list=document.getElementById("presetList");
  list.innerHTML="";
  presets.forEach((p,idx)=>{
    const item=document.createElement("div");
    item.className="preset-item";
    const head=document.createElement("div");
    head.className="preset-item-head";
    head.innerHTML=`<b>${escapeHtml(p.name)}</b><span class="badge">${parsePresetRange(p.range).length} cel·les · ${parsePresetRange(p.range).reduce((s,c)=>s+combosForCode(c),0)} combos</span>`;
    const nameInp=document.createElement("input");
    nameInp.type="text"; nameInp.value=p.name; nameInp.placeholder="Nom del preset";
    const ta=document.createElement("textarea");
    ta.value=p.range; ta.placeholder="Ex: AA+, Q9o+, A9s+, AKs, QQ ... ('+' sol = qualsevol dues cartes)";
    const actions=document.createElement("div");
    actions.className="preset-item-actions";
    const btnUp=document.createElement("button");
    btnUp.className="secondary"; btnUp.textContent="↑"; btnUp.title="Pujar";
    btnUp.addEventListener("click",()=>{commitEditorValues();if(idx>0){[presets[idx-1],presets[idx]]=[presets[idx],presets[idx-1]];savePresets();openPresetEditor();}});
    const btnDn=document.createElement("button");
    btnDn.className="secondary"; btnDn.textContent="↓"; btnDn.title="Baixar";
    btnDn.addEventListener("click",()=>{commitEditorValues();if(idx<presets.length-1){[presets[idx+1],presets[idx]]=[presets[idx],presets[idx+1]];savePresets();openPresetEditor();}});
    const btnDel=document.createElement("button");
    btnDel.className="danger-ghost"; btnDel.textContent="🗑 Eliminar";
    btnDel.addEventListener("click",()=>{
      commitEditorValues();
      if(presets.length<=1){alert("Ha d'haver-hi almenys un preset.");return;}
      presets.splice(idx,1); savePresets();
      if(activePresetId===p.id)activePresetId=null;
      renderPresetBar(); openPresetEditor();
    });
    actions.append(btnUp,btnDn,btnDel);
    item.append(head,nameInp,ta,actions);
    list.appendChild(item);
  });
  document.getElementById("presetModal").classList.add("open");
}
function commitEditorValues(){
  const items=document.querySelectorAll("#presetList .preset-item");
  items.forEach((el,idx)=>{
    if(!presets[idx])return;
    const n=el.querySelector("input").value.trim();
    const r=el.querySelector("textarea").value.trim();
    if(n)presets[idx].name=n;
    presets[idx].range=r;
  });
}
function closePresetEditor(){
  document.getElementById("presetModal").classList.remove("open");
}
document.getElementById("btnEditPresets").addEventListener("click",openPresetEditor);
document.getElementById("btnPresetCancel").addEventListener("click",closePresetEditor);
document.getElementById("presetModal").addEventListener("click",e=>{
  if(e.target.id==="presetModal")closePresetEditor();
});
document.getElementById("btnSavePresets").addEventListener("click",()=>{
  commitEditorValues();
  presets=presets.filter(p=>p.name&&p.range!==undefined);
  savePresets(); renderPresetBar();
  if(activePresetId)applyPreset(activePresetId);
  closePresetEditor();
});
document.getElementById("btnAddPreset").addEventListener("click",()=>{
  commitEditorValues();
  let n=1; while(presets.some(p=>p.id==="custom"+n))n++;
  presets.push({id:"custom"+n,name:`Preset ${presets.length+1}`,range:"AA+, KK, AKs"});
  savePresets(); openPresetEditor();
});
document.getElementById("btnRestorePresets").addEventListener("click",()=>{
  if(!confirm("Vols restaurar tots els presets als valors per defecte? Es perdran les teves personalitzacions."))return;
  presets=JSON.parse(JSON.stringify(PRESET_DEFAULTS));
  savePresets(); renderPresetBar(); openPresetEditor();
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&document.getElementById("presetModal").classList.contains("open"))closePresetEditor();
});
function combosForCode(code){return code.endsWith("s")?4:code.length===2?6:12;}
function updateCounter(){
  let cells=0,combos=0;
  selected.forEach(c=>{cells++;combos+=combosForCode(c);});
  document.getElementById("selCells").textContent=cells;
  document.getElementById("selCount").textContent=combos;
}
document.getElementById("btnClearRange").addEventListener("click",()=>{
  selected.clear();
  document.querySelectorAll(".cell.selected").forEach(c=>c.classList.remove("selected"));
  markPresetInactive();
  updateCounter();
});

/* ---------- Expansions de cel·les per a notació amb «+» ---------- */
// Convenció:
//   Sense «+» -> només la casella indicada (AKs -> AKs).
//   Amb «+»:
//     Parells:   AA+ -> AA..TT ; 99+ -> 99..22
//     No-parell: es manté la carta ALTA i es puja la segona carta fins just
//                per sota de l'alta. Ex:  Q9o+ -> Q9o, QTo, QJo
//                                              A9s+ -> A9s, ATs, AJs, AQs, AKs
//                                              KJo+ -> KJo, KQo
function expandPlusCells(tok){
  const m=/^([AKQJT2-9])([AKQJT2-9])(s|o)?\+$/.exec(tok);
  if(!m)return null;
  const hi=m[1], lo=m[2], suffix=m[3];
  const i1=RANKS.indexOf(hi), i2=RANKS.indexOf(lo);
  if(i1<0||i2<0)return null;
  // Parells: XX+
  if(suffix===undefined){
    if(hi!==lo)return [];
    // Parelles: AA+..TT+ s'aturen a TT; 99+ i inferiors baixen fins a 22
    const tIdx=RANKS.indexOf("T");
    const stop=(i1<=tIdx)?tIdx:RANKS.length-1;
    const out=[];
    for(let idx=i1;idx<=stop;idx++)out.push(RANKS[idx]+RANKS[idx]);
    return out;
  }
  if(hi===lo)return [];
  // Normalitzem: H = carta alta (índex menor), L = carta baixa (índex major)
  const [H,L]=(i1<i2)?[i1,i2]:[i2,i1];
  const kind=suffix;
  const out=[];
  // La segona carta puja desde L fins a H+1 (mai igual a la carta alta).
  for(let l=L;l>H;l--){
    out.push(RANKS[H]+RANKS[l]+kind);
  }
  return out;
}

/* ---------- Tabs & Board ---------- */
document.querySelectorAll(".tab").forEach(t=>{
  t.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    street = t.dataset.street;
    const n = street==="flop"?3:street==="turn"?4:5;
    const nb = new Array(n).fill(null);
    for(let k=0;k<Math.min(n,board.length);k++) nb[k]=board[k];
    board = nb;
    renderSlots();
  });
});
function renderSlots(){
  const wrap=document.getElementById("boardSlots");
  wrap.innerHTML="";
  board.forEach((c,idx)=>{
    const slot=document.createElement("div");
    slot.className="slot"+(c?" filled":"");
    if(c){
      const r=c[0], s=c[1];
      slot.innerHTML=`<span>${r}<span class="suit-${s}">${SUIT_SYMBOL[s]}</span></span><span class="clr">×</span>`;
      slot.title="Clic per netejar";
    }else{
      slot.textContent="+";
      slot.style.color="var(--muted)";
      slot.title="Clic per triar la carta en una finestra amb les 52 cartes";
    }
    slot.addEventListener("click",()=>{
      if(c){board[idx]=null;renderSlots();}
      else{openCardPicker(idx);}
    });
    wrap.appendChild(slot);
  });
}

/* ---------- Modal selector de cartes (52 cartes) ---------- */
const SUITS = ["h","d","c","s"];           // cors, diamants, trèvols, piques
let pickerSlotIdx = -1;                     // slot que s'està omplint

function buildCardGrid(){
  const grid=document.getElementById("cardGrid");
  grid.innerHTML="";
  for(const s of SUITS){
    for(const r of RANKS){
      const card=r+s;
      const el=document.createElement("div");
      el.className=`pcard ${s}${s}`;        // hc / hd / cs / ss -> colors del pal
      el.dataset.card=card;
      el.innerHTML=`<span>${r}</span><span class="psuit">${SUIT_SYMBOL[s]}</span>`;
      el.title=card;
      el.addEventListener("click",()=>pickCard(card));
      grid.appendChild(el);
    }
  }
}
function refreshCardStates(){
  // Deshabilita les cartes ja presents al board (altres slots)
  document.querySelectorAll("#cardGrid .pcard").forEach(el=>{
    const used=board.some((b,i)=>i!==pickerSlotIdx&&b===el.dataset.card);
    el.classList.toggle("disabled",used);
  });
}
function openCardPicker(idx){
  pickerSlotIdx=idx;
  buildCardGrid();
  refreshCardStates();
  document.getElementById("cardModalTitle").textContent=`Tria una carta per al slot ${idx+1}`;
  document.getElementById("cardModalSub").textContent=
    "Totes les 52 cartes disponibles. Les ja presents al board apareixen ratllades.";
  document.getElementById("btnCardClearSlot").style.display=
    board[idx]?"inline-block":"none";
  document.getElementById("cardModal").classList.add("open");
}
function closeCardPicker(){
  document.getElementById("cardModal").classList.remove("open");
  pickerSlotIdx=-1;
}
function pickCard(card){
  if(pickerSlotIdx<0)return;
  if(board.some((b,i)=>i!==pickerSlotIdx&&b===card)){
    alert("Aquesta carta ja és al board.");return;
  }
  board[pickerSlotIdx]=card;
  renderSlots();
  // Avança automàticament a la següent slot buida si existeix
  const next=board.findIndex(b=>b===null);
  if(next>=0){
    pickerSlotIdx=next;
    buildCardGrid();refreshCardStates();
    document.getElementById("cardModalTitle").textContent=`Tria una carta per al slot ${next+1}`;
    document.getElementById("btnCardClearSlot").style.display="none";
  }else{
    closeCardPicker();
  }
}
document.getElementById("btnCardCancel").addEventListener("click",closeCardPicker);
document.getElementById("btnCardClose").addEventListener("click",closeCardPicker);
document.getElementById("btnCardClearSlot").addEventListener("click",()=>{
  if(pickerSlotIdx>=0){board[pickerSlotIdx]=null;renderSlots();}
  closeCardPicker();
});
document.getElementById("cardModal").addEventListener("click",e=>{
  if(e.target.id==="cardModal")closeCardPicker();   // clic al fons tanca
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&document.getElementById("cardModal").classList.contains("open"))closeCardPicker();
});
function parseCard(str){
  const m=/^([AKQJT2-9])([shdc])$/i.exec(str);
  if(!m)return null;
  return m[1].toUpperCase()+m[2].toLowerCase();
}
document.getElementById("boardText").addEventListener("keydown",e=>{
  if(e.key==="Enter"){applyBoardText();e.preventDefault();}
});
document.getElementById("boardText").addEventListener("blur",applyBoardText);
function applyBoardText(){
  const raw=document.getElementById("boardText").value.trim();
  if(!raw)return;
  const toks=raw.split(/[\s,;-]+/).filter(Boolean);
  const parsed=[];
  for(const t of toks){
    const c=parseCard(t);
    if(!c){alert(`Carta no vàlida: "${t}"`);return;}
    if(parsed.includes(c)){alert("Cartes duplicades al board.");return;}
    parsed.push(c);
  }
  const n=street==="flop"?3:street==="turn"?4:5;
  if(parsed.length>n){alert(`El carrer ${street} accepta màxim ${n} cartes.`);return;}
  board=parsed.concat(new Array(n-parsed.length).fill(null));
  renderSlots();
}
document.getElementById("btnClearBoard").addEventListener("click",()=>{
  const n=street==="flop"?3:street==="turn"?4:5;
  board=new Array(n).fill(null);
  document.getElementById("boardText").value="";
  renderSlots();
});

/* ---------- Anàlisi ---------- */
async function analyze(){
  const body={
    range_codes:[...selected],
    board:board.filter(Boolean),
    street:street
  };
  const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const out=document.getElementById("resultsBody");
  if(!res.ok){
    const err=await res.json().catch(()=>({detail:"Error desconegut"}));
    out.innerHTML=`<div class="error">⛔ ${escapeHtml(err.detail||("HTTP "+res.status))}</div>`;
    return;
  }
  renderResults(await res.json());
}
document.getElementById("btnAnalyze").addEventListener("click",analyze);

function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

function rowsHTML(list,barClass){
  if(!list.length)return `<tr><td colspan="3" style="color:var(--muted)">Cap combo en aquesta secció.</td></tr>`;
  return list.map(r=>`
    <tr>
      <td>${escapeHtml(r.label)}</td>
      <td style="width:70px;text-align:right">${r.combos}</td>
      <td style="width:46px;text-align:right">${r.pct.toFixed(1)}%</td>
      <td style="min-width:140px"><div class="bar-wrap"><div class="bar ${barClass}" style="width:${Math.max(r.pct,1)}%"></div></div></td>
    </tr>`).join("");
}

function renderResults(d){
  const cards=d.board.map(c=>`${c[0]}<span class="suit-${c[1]}">${SUIT_SYMBOL[c[1]]}</span>`).join(" ");
  let html="";
  if(d.warnings.length) html+=d.warnings.map(w=>`<div class="warn">⚠️ ${escapeHtml(w)}</div>`).join("");
  html+=`<div class="stats-row">
    <div class="stat"><b>${d.total_combos_grid}</b><span>Combos al rang</span></div>
    <div class="stat"><b style="color:var(--danger)">${d.excluded_dupes}</b><span>Exclosos (dup board)</span></div>
    <div class="stat"><b style="color:var(--success)">${d.valid_combos}</b><span>Combos vàlids</span></div>
    <div class="stat"><b>${cards||"—"}</b><span>Board (${escapeHtml(d.street)})</span></div>
  </div>`;
  html+=`<div class="section-title">Distribució per tipus de mà</div>
  <table><thead><tr><th>Categoria</th><th style="text-align:right">Combos</th><th style="text-align:right">% Rang</th><th>Freqüència</th></tr></thead><tbody>${rowsHTML(d.categories,"")}</tbody></table>`;
  if(d.pair_breakdown.length){
    html+=`<div class="section-title">Desglossament One Pair</div>
    <table><tbody>${rowsHTML(d.pair_breakdown,"pairsub")}</tbody></table>`;
  }
  if(d.high_card_breakdown.length){
    html+=`<div class="section-title">Desglossament High Card</div>
    <table><tbody>${rowsHTML(d.high_card_breakdown,"pairsub")}</tbody></table>`;
  }
  if(d.draws.length){
    html+=`<div class="section-title">Projectes (Draws)</div>
    <table><tbody>${rowsHTML(d.draws,"draw")}</tbody></table>`;
  }
  document.getElementById("resultsBody").innerHTML=html;
}

/* ---------- Init ---------- */
buildGrid();
renderPresetBar();
renderSlots();
updateCounter();
