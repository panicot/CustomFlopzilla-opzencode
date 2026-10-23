"""FastAPI application: serves the frontend and the analysis endpoint."""
import re
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.models import AnalyzeRequest, AnalyzeResponse
from backend.range_parser import parse_range, RangeParseError, GRID_LABELS
from backend.range_analyzer import evaluate_range_distribution

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = FastAPI(title="Poker Range Analyzer")

CARD_RE = re.compile(r"^([AKQJT2-9])([shdc])$", re.IGNORECASE)
STREET_CARDS = {"flop": 3, "turn": 4, "river": 5}


def normalize_card(c: str) -> str:
    c = c.strip()
    m = CARD_RE.match(c)
    if not m:
        raise HTTPException(status_code=400,
                            detail=f"Invalid card: '{c}' (format: Ah, Td, 9c...)")
    return m.group(1).upper() + m.group(2).lower()


@app.get("/")
def index():
    # no-cache: prevents the browser from serving an outdated HTML version
    return FileResponse(FRONTEND_DIR / "index.html",
                        headers={"Cache-Control": "no-cache"})


# Frontend static files (styles.css, app.js...) under /static
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/api/grid")
def grid():
    """13x13 grid labels for the frontend."""
    return {"labels": GRID_LABELS}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    # 1) Build the range tokens (grid + manual string with '+' etc.)
    tokens: List[str] = list(req.range_codes)
    if req.range_string and req.range_string.strip():
        tokens += [t for t in re.split(r"[,\s;]+", req.range_string.strip()) if t]

    try:
        combos = parse_range(tokens)
    except RangeParseError as e:
        raise HTTPException(status_code=400, detail=f"Range syntax error: {e}")

    if not combos:
        raise HTTPException(
            status_code=400,
            detail="The range is empty. Select combos on the grid or enter a range.")

    # 2) Validate the board
    board = [normalize_card(c) for c in req.board if c and c.strip()]
    if len(set(board)) != len(board):
        raise HTTPException(status_code=400, detail="Duplicate cards on the board.")
    expected = STREET_CARDS[req.street]
    if len(board) != expected:
        raise HTTPException(
            status_code=400,
            detail=(f"The '{req.street}' street requires {expected} board cards "
                    f"(you entered {len(board)})."))

    # 3) Analyze
    result = evaluate_range_distribution(combos, board, req.street)
    result["board"] = board
    result["street"] = req.street
    return AnalyzeResponse(**result)
