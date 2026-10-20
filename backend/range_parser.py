"""Parser de rangs: converteix codis 13x13 i notacions amb '+' en llistes de combos.

Un combo és una tupla (card1, card2) en notació (rang+pal), ex: ("As", "Kh").
Suportat:
  - Parelles: "AA", "KK" ...
  - Suited:   "AKs"
  - Offsuit:  "AQo"
  - Expansió '+':
      * Parells: "AA+" -> AA..TT (30 combos); "99+" -> 99..22.
      * No-parell: es manté la carta ALTA i es puja la segona fins just per
        sota de l'alta. Ex: "Q9o+" -> Q9o, QTo, QJo
                        "A9s+" -> A9s, ATs, AJs, AQs, AKs
                        "AKs+" -> AKs
"""
from typing import List, Tuple, Set

RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"]
SUITS = ["s", "h", "d", "c"]  # espases, cors, diamants, trèvols

RankIdx = {r: i for i, r in enumerate(RANKS)}


class RangeParseError(ValueError):
    pass


def _card(rank: str, suit: str) -> str:
    return rank + suit


def _all_combos_for_pair(r: str) -> List[Tuple[str, str]]:
    """6 combos per a un parell, ex AA -> AsAh, AsAd, ..."""
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
    """Expandeix un sol codi de rang (amb o sense '+') a la llista de combos."""
    c = code.strip().upper().replace(" ", "")
    if not c:
        raise RangeParseError("Codi de rang buit")
    plus = c.endswith("+")
    if plus:
        c = c[:-1]

    if len(c) == 2:  # parell, ex AA
        r1, r2, kind = c[0], c[1], "pair"
    elif len(c) == 3:
        r1, r2, kind = c[0], c[1], c[2].lower()
        if kind not in ("s", "o"):
            raise RangeParseError(f"Tipus desconegut en '{code}' (ús 's' o 'o')")
    else:
        raise RangeParseError(f"Codi de rang no vàlid: '{code}'")

    if r1 not in RankIdx or r2 not in RankIdx:
        raise RangeParseError(f"Rangada no vàlida en '{code}'")
    i1, i2 = RankIdx[r1], RankIdx[r2]

    if kind == "pair":
        if r1 != r2:
            raise RangeParseError(f"Parell invàlid: '{code}'")
        if not plus:
            return _all_combos_for_pair(r1)
        # AA+ -> AA..TT (l'aturada a T només s'aplica si el parell és TT o
        # superior); 99+ i inferiors baixen fins a 22.
        stop = max(i1, RankIdx["T"]) if i1 <= RankIdx["T"] else len(RANKS) - 1
        combos: List[Tuple[str, str]] = []
        for idx in range(i1, stop + 1):
            combos += _all_combos_for_pair(RANKS[idx])
        return combos

    if i1 == i2:
        raise RangeParseError(f"No té sentit {code} (mateix rang amb s/o)")

    # Normalitzem: hi = carta ALTA (índex menor)
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

    # Convenció del '+': es manté la carta ALTA i es puja la segona carta fins
    # just per sota de l'alta. Ex: Q9o+ -> Q9o, QTo, QJo
    #                       A9s+ -> A9s, ATs, AJs, AQs, AKs
    #                       KJo+ -> KJo, KQo ; AKs+ -> AKs
    for l_idx in range(lo_i, hi_i, -1):
        add(mk(RANKS[hi_i], RANKS[l_idx]))
    return combos


def parse_range(tokens: List[str]) -> List[Tuple[str, str]]:
    """Converteix una llista de codis en combos únics (sense duplicats entre tokens)."""
    all_combos: List[Tuple[str, str]] = []
    seen = set()
    for tok in tokens:
        for t in expand_code(tok):
            key = tuple(sorted(t))
            if key not in seen:
                seen.add(key)
                all_combos.append(t)
    return all_combos


# Graella 13x13 completa (per al frontend): files/columnes d'A a 2.
GRID_LABELS: List[List[str]] = []
for i, hi in enumerate(RANKS):
    row = []
    for j, lo in enumerate(RANKS):
        if i == j:
            row.append(hi + lo)          # diagonal -> parell
        elif i < j:
            row.append(hi + lo + "s")    # triangular superior -> suited
        else:
            row.append(hi + lo + "o")    # triangular inferior -> offsuit
    GRID_LABELS.append(row)
