# Analitzador de Rangs i Probabilitats de Pòquer

Aplicació web **local** per analitzar la força del **rang del rival** contra un board
determinat (flop, turn o river). No cal introduir cap mà pròpia: l'eina desglossa el
percentatge de combos del rang rival que pertanyen a cada categoria de mà (Quads, Full
House, Color, Escala, Trips, Two Pair, Top Pair, Mid Pair, Overpair, As Alt, etc.) així
com els projectes pendents (Flush Draw, OESD, Gutshot, Backdoor FD/SD).

> Inspirat en Flopzilla. Tot el càlcul es fa **localment** (Python + `treys`), sense
> serveis externs ni telemetria.

---

## Característiques

- **Selector visual de rang 13x13**: diagonal = parells, triangle superior = suited,
  triangle inferior = offsuit. Cel·les clicables (o arrossegables per pintar un bloc)
  amb comptador de combos en temps real.
- **Presets editables**: rangs predefinits (Top 10 %, Parelles, Totes suited...) que es
  desen al navegador (`localStorage`), més un preset **Neteja** que buida la selecció.
- **Board interactiu**: pestanyes Flop / Turn / River, slots gràfics i un selector emergent
  amb les 52 cartes (les ja usades apareixen deshabilitades).
- **Resultats detallats**: total de combos vàlids, combos exclosos per duplicats amb el
  board, taula de freqüències amb barres i desglossaments de One Pair, High Card i draws.
- **Integritat del rang**: s'exclouen automàticament els combos que contenen cartes del
  board i es mostra un avís amb el nombre exacte descartat.
- **Tema clar / fosc**: botó a la capçalera per canviar de tema; la preferència es desa
  al navegador (`localStorage`). Paleta clara: fons `#f5f7f8`, text `#0F172A` i color
  principal `#3858D8`.

---

## Stack tecnològic

| Capa | Tecnologia | Notes |
|---|---|---|
| Backend | FastAPI + Uvicorn | API REST asíncrona |
| Frontend | HTML5 + Vanilla JS + CSS | Sense frameworks |
| Avaluació de mans | `treys` | Avaluador oficial de 5 cartes |
| Validació | Pydantic | Models de petició/resposta |
| Llenguatge | Python 3.10+ | Tipat estàtic |

Dependències (`requirements.txt`): `fastapi`, `uvicorn`, `treys`, `pydantic`.

---

## Estructura del projecte

```
poker-range-analyzer/
├── README.md
├── requirements.txt
├── run.py                  # punt d'entrada (llança Uvicorn)
├── backend/
│   ├── __init__.py
│   ├── main.py             # aplicació FastAPI (rutes /, /api/grid, /api/analyze)
│   ├── models.py           # models Pydantic (petició/resposta)
│   ├── range_parser.py     # parser de rangs (graella 13x13 + notació "AA+", "AKs+"...)
│   └── range_analyzer.py   # motor d'anàlisi amb treys (classificació i % de combos)
└── frontend/
    ├── index.html          # estructura de la interfície (HTML5, tema fosc)
    ├── CSS/
    │   └── styles.css      # tots els estils CSS
    └── JS/
        └── app.js          # tota la lògica de la interfície (Vanilla JS)
```

---

## Instal·lació

Comprova que tens Python 3.10 o superior:

```bash
python --version      # Windows
python3 --version     # Linux / macOS
```

### Opció A - Entorn virtual (recomanada)

Aïlla les dependències de la resta de projectes del sistema.

**Linux / macOS**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**Windows (PowerShell)**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

Si PowerShell bloqueja l'activació per la *execution policy*, executa-ho un cop:

```powershell
Set-ExecutionPolicy -Scope CurrentUser ExecutionPolicy RemoteSigned
```

### Opció B - Instal·lació global (sense venv)

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

---

## Execució

Des de l'arrel del projecte:

```bash
python run.py
```

Uvicorn s'engega amb recàrrega automàtica a:

```
http://127.0.0.1:8000
```

Obre aquesta URL al navegador. Documentació interactiva de l'API: `http://127.0.0.1:8000/docs`.

### Canviar el port

Pots executar l'aplicació en un altre port de tres maneres:

```bash
python run.py --port 8080            # argument de línia d'ordres
```

```powershell
$env:PORT = 8080; python run.py      # variable d'entorn (PowerShell)
```

```bash
PORT=8080 python run.py              # variable d'entorn (Linux / macOS)
```

També pots canviar l'adreça d'escolta i desactivar la recàrrega automàtica:

```bash
python run.py --host 0.0.0.0 --port 8080 --no-reload
```

Alternativa manual (sense `run.py`):

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8080 --reload
```

Per aturar el servidor: `Ctrl+C`.

---

## Ús de la interfície

1. **Rang del rival**: fes clic a les cel·les de la graella **13x13** per activar o
   desactivar combos, o **clic i arrossega** per pintar diverses caselles alhora (si la
   primera casella ja estava seleccionada, l'arrossegament les deselecciona). També pots
   aplicar un **preset** de la barra superior. El preset **Neteja** (en vermell) buida el
   tauler i deixa el rang sense seleccions.
2. **Board**: fes clic a una slot per obrir el selector de les 52 cartes, o escriu el board
   manualment amb notació `Ah Qd 5c` (`s`=espases, `h`=cors, `d`=diamants, `c`=trèvols,
   `T`=10). Canvia el carrer amb les pestanyes Flop / Turn / River.
3. Prem **Analitzar rang** i consulta el panell de resultats.
4. Usa el botó **☀️ Tema clar / 🌙 Tema fosc** de la capçalera per canviar de tema; la
   preferència es desa automàticament al navegador.

---

## API

### `GET /`
Serveix el frontend (`frontend/index.html`).

### `GET /static/*`
Serveix els fitxers estàtics del frontend (`CSS/styles.css`, `JS/app.js`).

### `GET /api/grid`
Retorna les etiquetes de la graella 13x13.

### `POST /api/analyze`

Cos de la petició:

```json
{
  "range_codes": ["AKs", "QQ"],
  "range_string": "AA+, JTs",
  "board": ["Ah", "Kh", "5c"],
  "street": "flop"
}
```

- `range_codes`: llista de codis seleccionats a la graella (opcional).
- `range_string`: rang en text amb expansions `+` (opcional); es combinen les dues fonts.
- `board`: cartes del board en notació `Ah`, `Td`, `9c`...
- `street`: `"flop"` (3 cartes) | `"turn"` (4) | `"river"` (5).

Exemple amb `curl`:

```bash
curl -X POST http://127.0.0.1:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"range_string":"AKs","board":["2h","7h","Jh"],"street":"flop"}'
```

Resposta (extret):

```json
{
  "total_combos_grid": 4,
  "excluded_dupes": 0,
  "valid_combos": 4,
  "categories": [
    {"key": "FLUSH", "label": "Flush (Color)", "combos": 1, "pct": 25.0},
    {"key": "HIGH",  "label": "High Card (Carta Alta)", "combos": 3, "pct": 75.0}
  ],
  "high_card_breakdown": [
    {"key": "ACE", "label": "As Alt (Ace High)", "combos": 3, "pct": 75.0}
  ]
}
```

---

## Lògica del motor

- **Baralla i duplicats**: qualsevol combo que contingui una carta present al board es
  descarta i es compta a `excluded_dupes` (es mostra un avís al frontend).
- **Avaluació**: cada combo es combina amb el board i se n'avalua la millor mà de 5 cartes
  amb `treys` (5 cartes al flop, 6 al turn, 7 al river).
- **Parelles (Top/Mid/Bottom/Overpair)**: es comparen els rangs del forat amb els rangs
  únics del board ordenats de més alt a més baix. *Overpair* = butxaca per sobre de tot el
  board; *Top/Second/Third/Bottom Pair* segons la posició del rang del board emparellat.
- **Trips reals**: es corregeix la classificació verificant la freqüència real del rang
  (>= 3 cartes), evitant falsos positius de la heurística.
- **Color**: només es classifica com a *Flush* si es completa; en cas contrari, *Flush Draw*
  (4 del mateix pal) o *Backdoor Flush Draw* (3 al flop).
- **Expansions `+`**: en un preset, un token **sense `+`** activa només aquella casella
  (`AKs` -> `AKs`; `AK` -> `AKs` i `AKo`). Amb `+`, es manté la carta alta i es puja la
  segona fins just per sota: `Q9o+` -> `Q9o, QTo, QJo`; `A9s+` -> `A9s, ATs, AJs, AQs,
  AKs`; `AKs+` -> `AKs`. Per a parells, `AA+` -> `AA..TT` (30 combos) i `99+` -> `99..22`.

---

## Validació

Escenaris de referència (comportament verificat del motor):

1. **Duplicats rang-board**: board `Ah Kh 5c` + rang `AA, AKs` -> 10 combos, 4 exclosos,
   6 vàlids, amb l'avís corresponent.
2. **Board monocromàtic**: rang `AKs` + board `2h 7h Jh` -> 25 % Flush (`AhKh`) i 75 %
   High Card (As Alt).
3. **Jerarquia de parelles**: rang `AA, KQo, 22` + board `Ks 8d 3c` -> Overpair, Top Pair
   i Bottom/Low Pair correctament separats.
4. **Expansions `+`**: `AA+` -> 30 combos; `Q9o+` -> `Q9o, QTo, QJo`; `A9s+` ->
   `A9s, ATs, AJs, AQs, AKs`; `AKs` (sense `+`) -> només `AKs`.
5. **Progressió de carrers**: rang `JTs` + board `9c 8d 7h` -> 100 % Escala a flop, turn
   (afegint `6s`) i river (afegint `5d`).

---

## Problemes freqüents

| Problema | Solució |
|---|---|
| `ModuleNotFoundError: No module named 'fastapi'` | No has instal·lat les dependències o no has activat el venv: `pip install -r requirements.txt` |
| `Address already in use` al port 8000 | Canvia el port amb `python run.py --port 8080` (o la variable `PORT`) |
| Error 400 "cartes duplicades al board" | Revisa la sintaxi del board (format `Ah Td 9c`, sense repetir cartes) |
| Error 400 "El carrer X requereix N cartes" | El nombre de cartes del board ha de coincidir amb el carrer seleccionat |
| El navegador no carrega la pàgina | Assegura't que el servidor és actiu i obre `http://127.0.0.1:8000` |

---

## Llicència

Ús personal i educatiu. Projecte autònom, sense serveis externs ni telemetria.
