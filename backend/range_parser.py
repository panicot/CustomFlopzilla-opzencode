"""Range parser: converts 13x13 codes and '+' notations into combo lists.

A combo is a tuple (card1, card2) in (rank+suit) notation, e.g. ("As", "Kh").
Supported:
  - Pairs:    "AA", "KK" ...
  - Suited:   "AKs"
  - Offsuit:  "AQo"
  - '+' expansion:
      * Pairs: "AA+" -> AA..TT (30 combos); "99+" -> 99..22.
      * Non-pair: keep the HIGH card and raise the second card up to just
        below the high card. E.g. "Q9o+" -> Q9o, QTo, QJo
                        "A9s+" -> A9s, ATs, AJs, AQs, AKs
                        "AKs+" -> AKs
"""
from typing import List, Tuple, Set

RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"]
SUITS = ["s", "h", "d", "c"]  # spades, hearts, diamonds, clubs

RankIdx = {r: i for i, r in enumerate(RANKS)}


class RangeParseError(ValueError):
    pass


def _card(rank: str, suit: str) -> str:
    return rank + suit


def _all_combos_for_pair(r: str) -> List[Tuple[str, str]]:
    """6 combos for a pair, e.g. AA -> AsAh, AsAd, ..."""
    out = []
    for i in range(4):
        for j in range(i + 1, 4):
            out.append((_card(r, SUITS[i]), _card(r, SUITS[j])))
    return out


def _all_combos_for_offsuit(r1: str, r2: str) -> List[Tuple[str, str]]:
    out = []
    for i in range(4):
        for j in range(4):
            if SUITS[i] != SUITS[j]:
                out.append((_card(r1, SUITS[i]), _card(r2, SUITS[j])))
    return out


def _all_combos_for_suited(r1: str, r2: str) -> List[Tuple[str, str]]:
    return [(_card(r1, s), _card(r2, s)) for s in SUITS]


def expand_code(code: str) -> List[Tuple[str, str]]:
    """Expand a single range code (with or without '+') into its combo list."""
    c = code.strip().upper().replace(" ", "")
    if not c:
        raise RangeParseError("Empty range code")
    plus = c.endswith("+")
    if plus:
        c = c[:-1]

    if len(c) == 2:  # pair, e.g. AA
        r1, r2, kind = c[0], c[1], "pair"
    elif len(c) == 3:
        r1, r2, kind = c[0], c[1], c[2].lower()
        if kind not in ("s", "o"):
            raise RangeParseError(f"Unknown type in '{code}' (use 's' or 'o')")
    else:
        raise RangeParseError(f"Invalid range code: '{code}'")

    if r1 not in RankIdx or r2 not in RankIdx:
        raise RangeParseError(f"Invalid rank in '{code}'")
    i1, i2 = RankIdx[r1], RankIdx[r2]

    if kind == "pair":
        if r1 != r2:
            raise RangeParseError(f"Invalid pair: '{code}'")
        if not plus:
            return _all_combos_for_pair(r1)
        # AA+ -> AA..TT (the stop at T only applies if the pair is TT or
        # higher); 99+ and below go down to 22.
        stop = max(i1, RankIdx["T"]) if i1 <= RankIdx["T"] else len(RANKS) - 1
        combos: List[Tuple[str, str]] = []
        for idx in range(i1, stop + 1):
            combos += _all_combos_for_pair(RANKS[idx])
        return combos

    if i1 == i2:
        raise RangeParseError(f"{code} makes no sense (same rank with s/o)")

    # Normalize: hi = HIGH card (lower index)
    hi, lo = (r1, r2) if i1 < i2 else (r2, r1)
    hi_i, lo_i = RankIdx[hi], RankIdx[lo]

    if not plus:
        if kind == "s":
            return _all_combos_for_suited(hi, lo)
        return _all_combos_for_offsuit(hi, lo)

    combos = []
    seen: Set[Tuple[str, str]] = set()

    def add(cs):
        for t in cs:
            key = tuple(sorted(t))
            if key not in seen:
                seen.add(key)
                combos.append(t)

    def mk(h: str, l: str):
        return _all_combos_for_suited(h, l) if kind == "s" else _all_combos_for_offsuit(h, l)

    # '+' convention: keep the HIGH card and raise the second card up to just
    # below the high card. E.g. Q9o+ -> Q9o, QTo, QJo
    #                       A9s+ -> A9s, ATs, AJs, AQs, AKs
    #                       KJo+ -> KJo, KQo ; AKs+ -> AKs
    for l_idx in range(lo_i, hi_i, -1):
        add(mk(RANKS[hi_i], RANKS[l_idx]))
    return combos


def parse_range(tokens: List[str]) -> List[Tuple[str, str]]:
    """Convert a list of codes into unique combos (no duplicates between tokens)."""
    all_combos: List[Tuple[str, str]] = []
    seen = set()
    for tok in tokens:
        for t in expand_code(tok):
            key = tuple(sorted(t))
            if key not in seen:
                seen.add(key)
                all_combos.append(t)
    return all_combos


# Full 13x13 grid (for the frontend): rows/columns from A to 2.
GRID_LABELS: List[List[str]] = []
for i, hi in enumerate(RANKS):
    row = []
    for j, lo in enumerate(RANKS):
        if i == j:
            row.append(hi + lo)          # diagonal -> pair
        elif i < j:
            row.append(hi + lo + "s")    # upper triangle -> suited
        else:
            row.append(hi + lo + "o")    # lower triangle -> offsuit
    GRID_LABELS.append(row)
