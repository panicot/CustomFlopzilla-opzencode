"""Models Pydantic per validar entrades i estructurar la resposta JSON."""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, field_validator


class AnalyzeRequest(BaseModel):
    """Entrada: rang del RIVAL + board + carrer. No hi ha 'la meva mà'."""
    # Llistat de codis de combo (ex: ["AKs","QQ"]) o bé una cadena de rang (ex: "AA+, AKs+")
    range_codes: List[str] = Field(default_factory=list)
    range_string: Optional[str] = None
    # Cartes del board en notació treys (ex: ["Ah","Kh","5c"])
    board: List[str] = []
    street: str = "flop"  # flop | turn | river

    @field_validator("street")
    @classmethod
    def _check_street(cls, v: str) -> str:
        if v not in ("flop", "turn", "river"):
            raise ValueError("street ha de ser 'flop', 'turn' o 'river'")
        return v


class CategoryStat(BaseModel):
    key: str
    label: str
    combos: int
    pct: float


class DrawStat(BaseModel):
    key: str
    label: str
    combos: int
    pct: float


class AnalyzeResponse(BaseModel):
    total_combos_grid: int          # combos seleccionats a la graella/parser
    excluded_dupes: int             # combos exclosos per duplicar cartes del board
    valid_combos: int               # combos vàlids analitzats
    board: List[str]
    street: str
    categories: List[CategoryStat]  # jerarquia principal (Royal/SF, Quads, ..., High Card)
    pair_breakdown: List[CategoryStat]   # desglossament One Pair: Top/Mid/Bottom/Overpair...
    high_card_breakdown: List[CategoryStat]  # As alt vs altres
    draws: List[DrawStat]           # FD, OESD, Gutshot, Backdoor FD/SD
    warnings: List[str]
    combo_details: List[Dict]       # detall per combo (per depuració/tooltip)
