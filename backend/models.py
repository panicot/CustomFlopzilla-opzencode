"""Pydantic models for validating input and structuring the JSON response."""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, field_validator


class AnalyzeRequest(BaseModel):
    """Input: OPPONENT range + board + street. There is no 'my hand'."""
    # List of combo codes (e.g. ["AKs","QQ"]) or a range string (e.g. "AA+, AKs+")
    range_codes: List[str] = Field(default_factory=list)
    range_string: Optional[str] = None
    # Board cards in treys notation (e.g. ["Ah","Kh","5c"])
    board: List[str] = []
    street: str = "flop"  # flop | turn | river

    @field_validator("street")
    @classmethod
    def _check_street(cls, v: str) -> str:
        if v not in ("flop", "turn", "river"):
            raise ValueError("street must be 'flop', 'turn' or 'river'")
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
    total_combos_grid: int          # combos selected on the grid/parser
    excluded_dupes: int             # combos excluded for duplicating board cards
    valid_combos: int               # valid combos analyzed
    board: List[str]
    street: str
    categories: List[CategoryStat]  # main hierarchy (Royal/SF, Quads, ..., High Card)
    pair_breakdown: List[CategoryStat]   # One Pair breakdown: Top/Mid/Bottom/Overpair...
    high_card_breakdown: List[CategoryStat]  # Ace high vs others
    draws: List[DrawStat]           # FD, OESD, Gutshot, Backdoor FD/SD
    warnings: List[str]
    combo_details: List[Dict]       # per-combo detail (for debugging/tooltip)
