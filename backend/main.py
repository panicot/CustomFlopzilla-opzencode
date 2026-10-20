"""Aplicació FastAPI: serveix el frontend i l'endpoint d'anàlisi."""
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

app = FastAPI(title="Analitzador de Rangs de Pòquer")

CARD_RE = re.compile(r"^([AKQJT2-9])([shdc])$", re.IGNORECASE)
STREET_CARDS = {"flop": 3, "turn": 4, "river": 5}


def normalize_card(c: str) -> str:
    c = c.strip()
    m = CARD_RE.match(c)
    if not m:
        raise HTTPException(status_code=400,
                            detail=f"Carta no vàlida: '{c}' (format: Ah, Td, 9c...)")
    return m.group(1).upper() + m.group(2).lower()


@app.get("/")
def index():
    # no-cache: evita que el navegador serveixi una versió antiga del HTML
    return FileResponse(FRONTEND_DIR / "index.html",
                        headers={"Cache-Control": "no-cache"})


# Fitxers estàtics del frontend (styles.css, app.js...) sota /static
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/api/grid")
def grid():
    """Etiquetes de la graella 13x13 per al frontend."""
    return {"labels": GRID_LABELS}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    # 1) Construir tokens del rang (graella + cadena manual amb '+' etc.)
    tokens: List[str] = list(req.range_codes)
    if req.range_string and req.range_string.strip():
        tokens += [t for t in re.split(r"[,\s;]+", req.range_string.strip()) if t]

    try:
        combos = parse_range(tokens)
    except RangeParseError as e:
        raise HTTPException(status_code=400, detail=f"Error de sintaxi al rang: {e}")

    if not combos:
        raise HTTPException(
            status_code=400,
            detail="El rang està buit. Selecciona combos a la graella o escriu un rang.")

    # 2) Validar board
    board = [normalize_card(c) for c in req.board if c and c.strip()]
    if len(set(board)) != len(board):
        raise HTTPException(status_code=400, detail="Hi ha cartes duplicades al board.")
    expected = STREET_CARDS[req.street]
    if len(board) != expected:
        raise HTTPException(
            status_code=400,
            detail=(f"El carrer '{req.street}' requereix {expected} cartes de board "
                    f"(n'has introduït {len(board)})."))

    # 3) Analitzar
    result = evaluate_range_distribution(combos, board, req.street)
    result["board"] = board
    result["street"] = req.street
    return AnalyzeResponse(**result)
