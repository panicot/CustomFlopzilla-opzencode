# Poker Range Analyzer

A **local** web app to analyze the strength of the **opponent's range** against a given
board (flop, turn or river). There is no need to enter your own hand: the tool breaks down
the percentage of combos in the opponent's range that belong to each hand category (Quads,
Full House, Flush, Straight, Trips, Two Pair, Top Pair, Mid Pair, Overpair, Ace High, etc.)
as well as the pending draws (Flush Draw, OESD, Gutshot, Backdoor FD/SD).

> Inspired by Flopzilla. All computation is done **locally** (Python + `treys`), with no
> external services or telemetry.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Running](#running)
- [Using the Interface](#using-the-interface)
- [API](#api)
- [Engine Logic](#engine-logic)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **Visual 13x13 range selector**: diagonal = pairs, upper triangle = suited, lower
  triangle = offsuit. Clickable (or draggable to paint a block) cells with a real-time
  combo counter.
- **Editable presets**: predefined ranges (Top 10 %, Pairs, All suited...) saved in the
  browser (`localStorage`), plus a **Clear** preset that empties the selection.
- **Interactive board**: Flop / Turn / River tabs, graphic slots and a modal picker with
  all 52 cards (already used ones appear disabled).
- **Detailed results**: total valid combos, combos excluded for duplicates with the board,
  frequency table with bars, and One Pair, High Card and draw breakdowns.
- **Range integrity**: combos containing board cards are automatically excluded and a
  warning shows the exact discarded count.
- **Light / dark theme**: header button to switch themes; the preference is saved in the
  browser (`localStorage`). Light palette: background `#f5f7f8`, text `#0F172A` and
  primary color `#3858D8`.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend | FastAPI + Uvicorn | Asynchronous REST API |
| Frontend | HTML5 + Vanilla JS + CSS | No frameworks |
| Hand evaluation | `treys` | Official 5-card evaluator |
| Validation | Pydantic | Request/response models |
| Language | Python 3.10+ | Static typing |

Dependencies (`requirements.txt`): `fastapi`, `uvicorn`, `treys`, `pydantic`.

---

## Project Structure

```
poker-range-analyzer/
├── README.md
├── requirements.txt
├── run.py                  # entry point (starts Uvicorn)
├── backend/
│   ├── __init__.py
│   ├── main.py             # FastAPI app (routes /, /api/grid, /api/analyze)
│   ├── models.py           # Pydantic models (request/response)
│   ├── range_parser.py     # range parser (13x13 grid + "AA+", "AKs+" notation...)
│   └── range_analyzer.py   # analysis engine with treys (classification and combo %)
└── frontend/
    ├── index.html          # interface structure (HTML5, dark theme)
    ├── CSS/
    │   └── styles.css      # all CSS styles
    └── JS/
        └── app.js          # all interface logic (Vanilla JS)
```

---

## Installation

Make sure you have Python 3.10 or higher:

```bash
python --version      # Windows
python3 --version     # Linux / macOS
```

### Option A - Virtual environment (recommended)

Isolates the dependencies from the rest of the system projects.

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

If PowerShell blocks activation due to the *execution policy*, run this once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser ExecutionPolicy RemoteSigned
```

### Option B - Global installation (no venv)

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

---

## Running

From the project root:

```bash
python run.py
```

Uvicorn starts with auto-reload at:

```
http://127.0.0.1:8000
```

Open that URL in your browser. Interactive API documentation: `http://127.0.0.1:8000/docs`.

### Changing the Port

You can run the app on another port in three ways:

```bash
python run.py --port 8080            # command-line argument
```

```powershell
$env:PORT = 8080; python run.py      # environment variable (PowerShell)
```

```bash
PORT=8080 python run.py              # environment variable (Linux / macOS)
```

You can also change the bind address and disable auto-reload:

```bash
python run.py --host 0.0.0.0 --port 8080 --no-reload
```

Manual alternative (without `run.py`):

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8080 --reload
```

To stop the server: `Ctrl+C`.

---

## Using the Interface

1. **Opponent range**: click the cells of the **13x13** grid to enable or disable combos,
   or **click and drag** to paint several cells at once (if the first cell was already
   selected, the drag deselects them). You can also apply a **preset** from the top bar.
   The **Clear** preset (in red) empties the grid and leaves the range with no selections.
2. **Board**: click a slot to open the 52-card picker, or type the board manually with
   `Ah Qd 5c` notation (`s`=spades, `h`=hearts, `d`=diamonds, `c`=clubs, `T`=10). Switch
   streets with the Flop / Turn / River tabs.
3. Press **Analyze range** and check the results panel.
4. Use the **☀️ Light theme / 🌙 Dark theme** button in the header to switch themes; the
   preference is saved automatically in the browser.

---

## API

### `GET /`
Serves the frontend (`frontend/index.html`).

### `GET /static/*`
Serves the frontend static files (`CSS/styles.css`, `JS/app.js`).

### `GET /api/grid`
Returns the 13x13 grid labels.

### `POST /api/analyze`

Request body:

```json
{
  "range_codes": ["AKs", "QQ"],
  "range_string": "AA+, JTs",
  "board": ["Ah", "Kh", "5c"],
  "street": "flop"
}
```

- `range_codes`: list of codes selected on the grid (optional).
- `range_string`: text range with `+` expansions (optional); both sources are combined.
- `board`: board cards in `Ah`, `Td`, `9c`... notation.
- `street`: `"flop"` (3 cards) | `"turn"` (4) | `"river"` (5).

Example with `curl`:

```bash
curl -X POST http://127.0.0.1:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"range_string":"AKs","board":["2h","7h","Jh"],"street":"flop"}'
```

Response (excerpt):

```json
{
  "total_combos_grid": 4,
  "excluded_dupes": 0,
  "valid_combos": 4,
  "categories": [
    {"key": "FLUSH", "label": "Flush", "combos": 1, "pct": 25.0},
    {"key": "HIGH",  "label": "High Card", "combos": 3, "pct": 75.0}
  ],
  "high_card_breakdown": [
    {"key": "ACE", "label": "Ace High", "combos": 3, "pct": 75.0}
  ]
}
```

---

## Engine Logic

- **Deck and duplicates**: any combo containing a card present on the board is discarded
  and counted in `excluded_dupes` (a warning is shown in the frontend).
- **Evaluation**: each combo is combined with the board and its best 5-card hand is
  evaluated with `treys` (5 cards on the flop, 6 on the turn, 7 on the river).
- **Pairs (Top/Mid/Bottom/Overpair)**: hole-card ranks are compared with the board's unique
  ranks sorted from highest to lowest. *Overpair* = pocket pair above the entire board;
  *Top/Second/Third/Bottom Pair* according to the position of the paired board rank.
- **Real trips**: the classification is corrected by checking the actual rank frequency
  (>= 3 cards), avoiding heuristic false positives.
- **Flush**: it is only classified as a *Flush* when completed; otherwise *Flush Draw*
  (4 of the same suit) or *Backdoor Flush Draw* (3 on the flop).
- **`+` expansions**: in a preset, a token **without `+`** enables only that cell
  (`AKs` -> `AKs`; `AK` -> `AKs` and `AKo`). With `+`, the high card is kept and the second
  card is raised up to just below it: `Q9o+` -> `Q9o, QTo, QJo`; `A9s+` -> `A9s, ATs, AJs,
  AQs, AKs`; `AKs+` -> `AKs`. For pairs, `AA+` -> `AA..TT` (30 combos) and `99+` -> `99..22`.

---

## Validation

Reference scenarios (verified engine behavior):

1. **Range-board duplicates**: board `Ah Kh 5c` + range `AA, AKs` -> 10 combos, 4 excluded,
   6 valid, with the corresponding warning.
2. **Monochromatic board**: range `AKs` + board `2h 7h Jh` -> 25 % Flush (`AhKh`) and 75 %
   High Card (Ace High).
3. **Pair hierarchy**: range `AA, KQo, 22` + board `Ks 8d 3c` -> Overpair, Top Pair and
   Bottom/Low Pair correctly separated.
4. **`+` expansions**: `AA+` -> 30 combos; `Q9o+` -> `Q9o, QTo, QJo`; `A9s+` ->
   `A9s, ATs, AJs, AQs, AKs`; `AKs` (without `+`) -> only `AKs`.
5. **Street progression**: range `JTs` + board `9c 8d 7h` -> 100 % Straight on the flop,
   turn (adding `6s`) and river (adding `5d`).

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `ModuleNotFoundError: No module named 'fastapi'` | You have not installed the dependencies or activated the venv: `pip install -r requirements.txt` |
| `Address already in use` on port 8000 | Change the port with `python run.py --port 8080` (or the `PORT` variable) |
| 400 error "Duplicate cards on the board" | Check the board syntax (format `Ah Td 9c`, without repeating cards) |
| 400 error "The 'X' street requires N board cards" | The number of board cards must match the selected street |
| The browser does not load the page | Make sure the server is running and open `http://127.0.0.1:8000` |

---

## License

Personal and educational use. Standalone project, with no external services or telemetry.
