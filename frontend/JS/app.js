"use strict";
const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const SUIT_SYMBOL = {h:"♥", d:"♦", c:"♣", s:"♠"};
const selected = new Set();          // grid codes ("AKs","AA"...)
let street = "flop";
let board = [null,null,null];        // array whose length depends on the street

/* ---------- Light / dark theme ---------- */
const THEME_KEY = "pokerRangeTheme";
function applyTheme(theme){
  const light = theme === "light";
  document.body.classList.toggle("light", light);
  const btn = document.getElementById("btnTheme");
  if(btn){
    btn.textContent = light ? "🌙 Dark theme" : "☀️ Light theme";
    const label = light ? "Switch to dark theme" : "Switch to light theme";
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

/* ---------- 13x13 grid ---------- */
// Original order: rows and columns from A to 2. The pair diagonal runs from
// ace to deuce left to right (AA, KK, QQ, ... 22). Upper triangle = suited,
// lower triangle = offsuit.
const COL_RANKS = RANKS;
const ROW_RANKS = RANKS;
function cellCode(rk, ck){
  if(rk===ck) return rk+ck;                       // diagonal -> pairs
  const iR = ROW_RANKS.indexOf(rk), iC = COL_RANKS.indexOf(ck);
  const pair=[rk,ck];
  if(RANKS.indexOf(rk) > RANKS.indexOf(ck)) pair.reverse(); // high card first
  return pair[0]+pair[1]+(iC>iR?"s":"o");         // column below the row -> suited
}
let isDragging = false;      // is the user dragging across the grid?
let dragSelect = true;       // paint mode: true = select, false = deselect
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
  for(const rk of ROW_RANKS){          // rows: A..2
    for(const ck of COL_RANKS){        // columns: A..2
      const code = cellCode(rk, ck);
      const kind = rk===ck ? "pair" : (code.endsWith("s") ? "suited":"offsuit");
      const cell = document.createElement("div");
      cell.className = `cell ${kind}`;
      cell.textContent = code;
      cell.dataset.code = code;
      cell.title = code + (kind==="pair"?" (6 combos)":kind==="suited"?" (4 suited combos)":" (12 offsuit combos)");
      // Click + drag: the first click decides the mode (select if the cell was
      // not selected, deselect if it was) and every cell the pointer passes
      // over (while the button is held) receives the same state.
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
  // While dragging, paint the cell under the pointer. We use mousemove at the
  // grid level so that no cell is missed when the mouse moves fast.
  g.addEventListener("mousemove", e=>{
    if(!isDragging) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el && el.closest ? el.closest(".cell") : null;
    if(!target || !g.contains(target)) return;
    applyCell(target.dataset.code, target, dragSelect);
    updateCounter();
  });
}
// Releasing the button (anywhere) ends the drag.
document.addEventListener("mouseup", ()=>{
  if(!isDragging) return;
  isDragging = false;
  markPresetInactive();
  updateCounter();
});
/* ---------- Range presets (default selections) ---------- */
// "+" expansion convention (identical to the backend, backend/range_parser.py):
//   No "+" -> only the indicated cell (AKs -> AKs; AK -> AKs and AKo).
//   AA+   -> all pairs from AA down to TT; 99+ -> 99..22.
//   Q9o+  -> keep the HIGH card and raise the second card up to just below it:
//            Q9o, QTo, QJo ; A9s+ -> A9s, ATs, AJs, AQs, AKs ; AKs+ -> AKs.
// The "Top X %" presets include pairs + suited + offsuit.
const PRESET_DEFAULTS = [
  {id:"top10", name:"Top 10 %", range:"AA+, AKs+, AQs+, AJo+, ATs, KQs+, KJo+"},
  {id:"top15", name:"Top 15 %", range:"AA+, AKs+, AQs+, AJs+, AQo+, ATo+, KQs+, KJo+, KTs+, QJs+, JTs"},
  {id:"top25", name:"Top 25 %", range:"AA+, AKs+, AQs+, AJs+, ATs+, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, AQo+, AJo+, ATo+, KQs+, KJs+, QTs+, JTs+, T9s+, 98s+, 87s+, 76s+, 65s+, 54s, KQo+, KJo+, KTo+, QJo+, JTo+, T9o+"},
  {id:"pairs", name:"Pairs", range:"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22"},
  {id:"suited", name:"All suited", range:"AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, JTs, J9s, J8s, J7s, J6s, J5s, J4s, J3s, J2s, T9s, T8s, T7s, T6s, T5s, T4s, T3s, T2s, 98s, 97s, 96s, 95s, 94s, 93s, 92s, 87s, 86s, 85s, 84s, 83s, 82s, 76s, 75s, 74s, 73s, 72s, 65s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s"},
  {id:"offsuit", name:"All offsuit", range:"AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, K7o, K6o, K5o, K4o, K3o, K2o, QJo, QTo, Q9o, Q8o, Q7o, Q6o, Q5o, Q4o, Q3o, Q2o, JTo, J9o, J8o, J7o, J6o, J5o, J4o, J3o, J2o, T9o, T8o, T7o, T6o, T5o, T4o, T3o, T2o, 98o, 97o, 96o, 95o, 94o, 93o, 92o, 87o, 86o, 85o, 84o, 83o, 82o, 76o, 75o, 74o, 73o, 72o, 65o, 64o, 63o, 62o, 54o, 53o, 52o, 43o, 42o, 32o"},
  {id:"anytwo", name:"Any two", range:"+"},
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
// Convert a preset token into cell codes ("+" alone = every hand)
function presetTokensToCells(tok){
  const raw = String(tok||"").trim();
  // If the "+" suffix follows a suit (AKs+, QQ+), expand it directly with the
  // backend convention. This check must run BEFORE normalizing/removing spaces
  // and before any other processing, because tokens with an internal "+"
  // (e.g. "ATs+A2s") follow the dash-range path.
  // Note: pairs with "+" (QQ+, TT+) also go through here. The regex accepts the
  // suit suffix in lowercase OR UPPERCASE because the token is normalized to
  // uppercase before comparing (AKs+ -> AKS+: the 's' suit becomes 'S').
  const upper = raw.toUpperCase();
  if(/^[AKQJT2-9][AKQJT2-9][so]?\+$/.test(raw) || /^[AKQJT2-9][AKQJT2-9][SO]?\+$/.test(upper)) {
    return expandPlusCells(upper.replace(/\s+/g,"").replace(/([SO])\+$/,(mm,g)=>g.toLowerCase()+"+")) || [];
  }
  // Normalize to uppercase but keep the "s"/"o" suffix lowercase
  // (grid cells use "AKs", not "AKS").
  const t = tok.toUpperCase().replace(/\s+/g,"").replace(/([SO])(?=[-+]|$)/g,m=>m.toLowerCase());
  if(t==="+"||t==="ANY"||t==="ANY2"){
    const all=[];
    for(const rk of ROW_RANKS)for(const ck of COL_RANKS)all.push(cellCode(rk,ck));
    return all;
  }
  // Dash ranges: AA-99 (pairs), AKs-AJs (consecutive suited), A5s-A2s ...
  const dash=/^([AKQJT2-9]{2})-([AKQJT2-9]{2})(s|o)?$/.exec(t);
  if(dash){
    const hi=dash[1], lo=dash[2];
    let sfx=dash[3]||"";
    // If the code has different suffixes at the ends (e.g. A5s-A2s), the type
    // is taken from the first end.
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
      // No suffix: pairs if both ends are pairs (AA-99), otherwise all
      // unpaired hands in the rectangles between the two ends (AK-QJ).
      const isPairEnds = (base[0]===base[1]) && (base[2]===base[3]);
      if(isPairEnds){
        for(let a=i1;a<=i2;a++)add(RANKS[a],RANKS[a],"");
      }else{
        for(let a=i1;a<=i2;a++){
          for(let b=a+1;b<RANKS.length;b++){
            if(b<j2)continue;                    // maximum second card = low end
            if(a>i1 || b>j2){                    // exclude the end below the limit
              add(RANKS[a],RANKS[b],"s"); add(RANKS[a],RANKS[b],"o");
            }
          }
        }
        // Final filter: only hands inside the rectangle of the two given ends
        const loMin=Math.min(j1,j2), loMax=Math.max(j1,j2);
        return out.filter(c=>{
          const h=RANKS.indexOf(c[0]), l=RANKS.indexOf(c[1]);
          return h>=i1 && h<=i2 && l>=loMin && l<=loMax && l>h;
        });
      }
    }else{
      // With a suffix (AKs-AJs, A9s-A2s...): the high card walks through the
      // ends and the low card goes from T down to the low-side rank (standard
      // range-chart convention). E.g. A5s-A2s -> A5s..A2s; AKs-AJs -> AKs,AQs,AJs.
      const tIdx=RANKS.indexOf("T");
      const aStart=Math.min(i1,j1), aEnd=Math.max(i1,j1);
      const bLo=Math.max(j2,tIdx);   // stop at T if the limit is higher
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
// Special "Clear" preset: empties the grid and leaves the range with no selections.
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
  clearChip.className="chip clear"+(selected.size===0?" active":"");
  clearChip.textContent="Clear";
  clearChip.title="Clear the grid: leaves the range with no selections";
  clearChip.addEventListener("click",clearRangeSelection);
  bar.appendChild(clearChip);
  for(const p of presets){
    const chip=document.createElement("button");
    chip.type="button";
    chip.className="chip"+(p.id===activePresetId?" active":"");
    chip.textContent=p.name;
    chip.title="Replace the selection with: "+p.range;
    chip.addEventListener("click",()=>applyPreset(p.id));
    bar.appendChild(chip);
  }
}
/* Preset editor (modal window) */
function openPresetEditor(){
  const list=document.getElementById("presetList");
  list.innerHTML="";
  presets.forEach((p,idx)=>{
    const item=document.createElement("div");
    item.className="preset-item";
    const head=document.createElement("div");
    head.className="preset-item-head";
    head.innerHTML=`<b>${escapeHtml(p.name)}</b><span class="badge">${parsePresetRange(p.range).length} cells · ${parsePresetRange(p.range).reduce((s,c)=>s+combosForCode(c),0)} combos</span>`;
    const nameInp=document.createElement("input");
    nameInp.type="text"; nameInp.value=p.name; nameInp.placeholder="Preset name";
    const ta=document.createElement("textarea");
    ta.value=p.range; ta.placeholder="E.g.: AA+, Q9o+, A9s+, AKs, QQ ... ('+' alone = any two cards)";
    const actions=document.createElement("div");
    actions.className="preset-item-actions";
    const btnUp=document.createElement("button");
    btnUp.className="secondary"; btnUp.textContent="↑"; btnUp.title="Move up";
    btnUp.addEventListener("click",()=>{commitEditorValues();if(idx>0){[presets[idx-1],presets[idx]]=[presets[idx],presets[idx-1]];savePresets();openPresetEditor();}});
    const btnDn=document.createElement("button");
    btnDn.className="secondary"; btnDn.textContent="↓"; btnDn.title="Move down";
    btnDn.addEventListener("click",()=>{commitEditorValues();if(idx<presets.length-1){[presets[idx+1],presets[idx]]=[presets[idx],presets[idx+1]];savePresets();openPresetEditor();}});
    const btnDel=document.createElement("button");
    btnDel.className="danger-ghost"; btnDel.textContent="🗑 Delete";
    btnDel.addEventListener("click",()=>{
      commitEditorValues();
      if(presets.length<=1){alert("There must be at least one preset.");return;}
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
  if(!confirm("Restore all presets to their default values? Your customizations will be lost."))return;
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

/* ---------- Cell expansions for "+" notation ---------- */
// Convention:
//   No "+" -> only the indicated cell (AKs -> AKs).
//   With "+":
//     Pairs:     AA+ -> AA..TT ; 99+ -> 99..22
//     Non-pair:  keep the HIGH card and raise the second card up to just
//                below the high card. E.g. Q9o+ -> Q9o, QTo, QJo
//                                              A9s+ -> A9s, ATs, AJs, AQs, AKs
//                                              KJo+ -> KJo, KQo
function expandPlusCells(tok){
  const m=/^([AKQJT2-9])([AKQJT2-9])(s|o)?\+$/.exec(tok);
  if(!m)return null;
  const hi=m[1], lo=m[2], suffix=m[3];
  const i1=RANKS.indexOf(hi), i2=RANKS.indexOf(lo);
  if(i1<0||i2<0)return null;
  // Pairs: XX+
  if(suffix===undefined){
    if(hi!==lo)return [];
    // Pairs: AA+..TT+ stop at TT; 99+ and below go down to 22
    const tIdx=RANKS.indexOf("T");
    const stop=(i1<=tIdx)?tIdx:RANKS.length-1;
    const out=[];
    for(let idx=i1;idx<=stop;idx++)out.push(RANKS[idx]+RANKS[idx]);
    return out;
  }
  if(hi===lo)return [];
  // Normalize: H = high card (lower index), L = low card (higher index)
  const [H,L]=(i1<i2)?[i1,i2]:[i2,i1];
  const kind=suffix;
  const out=[];
  // The second card goes up from L to H+1 (never equal to the high card).
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
      slot.title="Click to clear";
    }else{
      slot.textContent="+";
      slot.style.color="var(--muted)";
      slot.title="Click to pick the card from a window with all 52 cards";
    }
    slot.addEventListener("click",()=>{
      if(c){board[idx]=null;renderSlots();}
      else{openCardPicker(idx);}
    });
    wrap.appendChild(slot);
  });
}

/* ---------- Card picker modal (52 cards) ---------- */
const SUITS = ["h","d","c","s"];           // hearts, diamonds, clubs, spades
let pickerSlotIdx = -1;                     // slot currently being filled

function buildCardGrid(){
  const grid=document.getElementById("cardGrid");
  grid.innerHTML="";
  for(const s of SUITS){
    for(const r of RANKS){
      const card=r+s;
      const el=document.createElement("div");
      el.className=`pcard ${s}${s}`;        // hc / hd / cs / ss -> suit colors
      el.dataset.card=card;
      el.innerHTML=`<span>${r}</span><span class="psuit">${SUIT_SYMBOL[s]}</span>`;
      el.title=card;
      el.addEventListener("click",()=>pickCard(card));
      grid.appendChild(el);
    }
  }
}
function refreshCardStates(){
  // Disable cards already present on the board (other slots)
  document.querySelectorAll("#cardGrid .pcard").forEach(el=>{
    const used=board.some((b,i)=>i!==pickerSlotIdx&&b===el.dataset.card);
    el.classList.toggle("disabled",used);
  });
}
function openCardPicker(idx){
  pickerSlotIdx=idx;
  buildCardGrid();
  refreshCardStates();
  document.getElementById("cardModalTitle").textContent=`Pick a card for slot ${idx+1}`;
  document.getElementById("cardModalSub").textContent=
    "All 52 cards are available. Cards already on the board appear crossed out.";
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
    alert("That card is already on the board.");return;
  }
  board[pickerSlotIdx]=card;
  renderSlots();
  // Automatically advance to the next empty slot if one exists
  const next=board.findIndex(b=>b===null);
  if(next>=0){
    pickerSlotIdx=next;
    buildCardGrid();refreshCardStates();
    document.getElementById("cardModalTitle").textContent=`Pick a card for slot ${next+1}`;
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
  if(e.target.id==="cardModal")closeCardPicker();   // click on the backdrop closes
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
    if(!c){alert(`Invalid card: "${t}"`);return;}
    if(parsed.includes(c)){alert("Duplicate cards on the board.");return;}
    parsed.push(c);
  }
  const n=street==="flop"?3:street==="turn"?4:5;
  if(parsed.length>n){alert(`The ${street} street accepts at most ${n} cards.`);return;}
  board=parsed.concat(new Array(n-parsed.length).fill(null));
  renderSlots();
}
document.getElementById("btnClearBoard").addEventListener("click",()=>{
  const n=street==="flop"?3:street==="turn"?4:5;
  board=new Array(n).fill(null);
  document.getElementById("boardText").value="";
  renderSlots();
});

/* ---------- Analysis ---------- */
async function analyze(){
  const body={
    range_codes:[...selected],
    board:board.filter(Boolean),
    street:street
  };
  const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const out=document.getElementById("resultsBody");
  if(!res.ok){
    const err=await res.json().catch(()=>({detail:"Unknown error"}));
    out.innerHTML=`<div class="error">⛔ ${escapeHtml(err.detail||("HTTP "+res.status))}</div>`;
    return;
  }
  renderResults(await res.json());
}
document.getElementById("btnAnalyze").addEventListener("click",analyze);

function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

function rowsHTML(list,barClass){
  if(!list.length)return `<tr><td colspan="3" style="color:var(--muted)">No combos in this section.</td></tr>`;
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
    <div class="stat"><b>${d.total_combos_grid}</b><span>Combos in range</span></div>
    <div class="stat"><b style="color:var(--danger)">${d.excluded_dupes}</b><span>Excluded (board dupes)</span></div>
    <div class="stat"><b style="color:var(--success)">${d.valid_combos}</b><span>Valid combos</span></div>
    <div class="stat"><b>${cards||"—"}</b><span>Board (${escapeHtml(d.street)})</span></div>
  </div>`;
  html+=`<div class="section-title">Distribution by hand type</div>
  <table><thead><tr><th>Category</th><th style="text-align:right">Combos</th><th style="text-align:right">% Range</th><th>Frequency</th></tr></thead><tbody>${rowsHTML(d.categories,"")}</tbody></table>`;
  if(d.pair_breakdown.length){
    html+=`<div class="section-title">One Pair breakdown</div>
    <table><tbody>${rowsHTML(d.pair_breakdown,"pairsub")}</tbody></table>`;
  }
  if(d.high_card_breakdown.length){
    html+=`<div class="section-title">High Card breakdown</div>
    <table><tbody>${rowsHTML(d.high_card_breakdown,"pairsub")}</tbody></table>`;
  }
  if(d.draws.length){
    html+=`<div class="section-title">Draws</div>
    <table><tbody>${rowsHTML(d.draws,"draw")}</tbody></table>`;
  }
  document.getElementById("resultsBody").innerHTML=html;
}

/* ---------- Init ---------- */
buildGrid();
renderPresetBar();
renderSlots();
updateCounter();
