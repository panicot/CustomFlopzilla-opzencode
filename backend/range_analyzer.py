"""Range analysis engine: classifies every opponent combo against the board.

Classification (treys hierarchy + Flopzilla-style subcategories):
  - The best 5-card hand over the 5-7 cards (hole + board) is evaluated with
    the official `treys` evaluator.
  - One Pair is broken down by comparing the pair rank with the board's unique
    ranks (sorted from highest to lowest):
      * Overpair: pocket pair above the entire board.
      * Top/Second/Third/Bottom (Fourth/Fifth) Pair: position of the paired
        board rank within that ordering.
  - High Card is broken down into "Ace High" (the ace plays as the high card)
    and others.
  - Draws (flop/turn only): Flush Draw, OESD, Gutshot, Backdoor FD/SD.
"""
from typing import List, Tuple, Dict, Set
from collections import Counter
from itertools import combinations
from treys import Card, Evaluator

_evaluator = Evaluator()

RANKS_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
RANK_VALUE = {r: i for i, r in enumerate(RANKS_ORDER)}  # 2->0 ... A->12

# treys classes (get_rank_class):
# 0=Royal, 1=Straight Flush, 2=Quads, 3=Full House, 4=Flush, 5=Straight,
# 6=Trips, 7=Two Pair, 8=One Pair, 9=High Card.
CAT_NAMES = {
    0: ("SF", "Royal Flush / Straight Flush"),
    1: ("SF", "Royal Flush / Straight Flush"),
    2: ("QUADS", "Quads (Four of a Kind)"),
    3: ("FH", "Full House"),
    4: ("FLUSH", "Flush"),
    5: ("STRAIGHT", "Straight"),
    6: ("TRIPS", "Trips (Three of a Kind)"),
    7: ("TWOPAIR", "Two Pair"),
    8: ("PAIR", "One Pair"),
    9: ("HIGH", "High Card"),
}
CATEGORY_ORDER = ["SF", "QUADS", "FH", "FLUSH", "STRAIGHT", "TRIPS", "TWOPAIR",
                  "PAIR", "HIGH"]

PAIR_SUB_ORDER = ["OVERPAIR", "TOPPAIR", "SECONDPAIR", "THIRDPAIR",
                  "FOURTHPAIR", "BOTTOMPAIR"]
PAIR_SUB_NAMES = {
    "OVERPAIR": "Overpair",
    "TOPPAIR": "Top Pair",
    "SECONDPAIR": "Second Pair",
    "THIRDPAIR": "Third Pair",
    "FOURTHPAIR": "Fourth Pair",
    "BOTTOMPAIR": "Bottom / Low Pair",
}
DRAW_ORDER = ["FD", "OESD", "GUTSHOT", "BDFD", "BSD"]
DRAW_NAMES = {
    "FD": "Flush Draw",
    "OESD": "Open-Ended Straight Draw",
    "GUTSHOT": "Gutshot (Inside Draw)",
    "BDFD": "Backdoor Flush Draw",
    "BSD": "Backdoor Straight Draw",
}


def _rank(card: str) -> str:
    return card[0]


def _suit(card: str) -> str:
    return card[1]


def get_available_deck(board_cards: List[str]) -> List[str]:
    """Remaining deck, excluding the board cards."""
    all_cards = [Card.new(r + s) for r in "AKQJT98765432" for s in "shdc"]
    bs = {Card.new(c) for c in board_cards}
    return [c for c in all_cards if c not in bs]


def evaluate_best(cards: List[str]) -> int:
    """Best 5-card hand over any combination (flop/turn/river)."""
    n = len(cards)
    if n == 5:
        return _evaluator.evaluate(cards[:2], cards[2:])
    if n < 5:
        return 9_999_999  # synthetic value (worse than any real hand)
    return min(_evaluator.evaluate(list(c[:2]), list(c[2:]))
               for c in combinations(cards, 5))


def classify_pair_subtype(hole: Tuple[str, str], board: List[str]) -> str:
    """One Pair subcategory: where the pair sits relative to the board."""
    hole_ranks = {RANK_VALUE[_rank(c)] for c in hole}
    board_ranks_sorted = sorted({RANK_VALUE[_rank(c)] for c in board}, reverse=True)
    paired = [rv for rv in board_ranks_sorted if rv in hole_ranks]
    if not paired:
        # Pocket pair (or no board card paired)
        if len(hole_ranks) == 1:
            hv = next(iter(hole_ranks))
            return "OVERPAIR" if hv > board_ranks_sorted[0] else "BOTTOMPAIR"
        return "HIGH"
    pos = board_ranks_sorted.index(paired[0])
    n = len(board_ranks_sorted)
    if n == 3:
        names = ["TOPPAIR", "SECONDPAIR", "THIRDPAIR"]
    elif n == 4:
        names = ["TOPPAIR", "SECONDPAIR", "THIRDPAIR", "BOTTOMPAIR"]
    else:
        names = ["TOPPAIR", "SECONDPAIR", "THIRDPAIR", "FOURTHPAIR", "BOTTOMPAIR"]
    return names[min(pos, len(names) - 1)]


def straight_draw_info(cards: List[str]) -> Tuple[bool, bool]:
    """Ranks present -> (OESD, gutshot). There must be NO made straight."""
    vals = sorted({RANK_VALUE[_rank(c)] for c in cards})
    has_5_consec = any(vals[i + 4] - vals[i] == 4 for i in range(len(vals) - 4)) if len(vals) >= 5 else False
    if has_5_consec:
        return False, False
    oesd = False
    gut = False
    for low in range(0, 13 - 5 + 1):
        window = set(range(low, low + 5))
        distinct_present = {v for v in vals if v in window}
        if len(distinct_present) == 4:
            missing = (window - distinct_present).pop()
            others = sorted(distinct_present)
            if missing == low or missing == low + 4:
                contiguous_extreme = (missing == low and others[0] == low + 1) or \
                                     (missing == low + 4 and others[-1] == low + 3)
                if contiguous_extreme:
                    oesd = True
                else:
                    gut = True
            else:
                gut = True
    return oesd, gut


def is_real_trips(hole: Tuple[str, str], board: List[str]) -> bool:
    """True if a rank actually appears with frequency >= 3 among the 5-7 cards."""
    freq = Counter(_rank(c) for c in list(hole) + list(board))
    return any(v >= 3 for v in freq.values())


def analyze_combo(hole: Tuple[str, str], board: List[str]) -> Dict:
    """Return {cat, pair_sub, high_sub, draws:set} for a valid combo."""
    hc = [Card.new(c) for c in hole]
    bc = [Card.new(c) for c in board]
    full = hc + bc
    full_str = list(hole) + list(board)
    ev = evaluate_best(full)
    cat_code = _evaluator.get_rank_class(ev)
    cat = CAT_NAMES[cat_code][0]

    # Classification correction with card frequencies (only with >= 5 cards):
    #   * PAIR that actually has 3 cards of the same rank -> TRIPS
    #   * TWOPAIR where one of the pairs is actually trips -> TRIPS or FH
    if len(full_str) >= 5 and cat == "PAIR" and is_real_trips(hole, board):
        cat = "TRIPS"
    elif len(full_str) >= 5 and cat == "TWOPAIR" and is_real_trips(hole, board):
        freq = Counter(_rank(c) for c in list(hole) + list(board))
        trips_ranks = sum(1 for v in freq.values() if v >= 3)
        cat = "FH" if trips_ranks >= 2 else "TRIPS"

    draws: Set[str] = set()
    pair_sub = ""
    high_sub = ""

    if cat == "PAIR":
        pair_sub = classify_pair_subtype(hole, board)
    if cat == "HIGH":
        board_vals = {RANK_VALUE[_rank(c)] for c in board}
        hole_vals = {RANK_VALUE[_rank(c)]: _rank(c) for c in hole}
        max_hole_val = max(hole_vals)
        if max_hole_val > max(board_vals) and hole_vals[max_hole_val] == "A":
            high_sub = "ACE"
        else:
            high_sub = "OTHER"

    # Draws: only meaningful on the flop/turn and if there is no made 5-card hand.
    if len(board) < 5 and cat not in ("SF", "QUADS", "FH", "FLUSH", "STRAIGHT"):
        all_cards = full_str

        made_straight = made_flush = False
        if len(all_cards) >= 5:
            card_objs = [Card.new(c) for c in all_cards]
            for comb in combinations(card_objs, 5):
                k = _evaluator.get_rank_class(
                    _evaluator.evaluate(list(comb[:2]), list(comb[2:])))
                if k == 5:
                    made_straight = True
                elif k == 4:
                    made_flush = True
                if made_straight and made_flush:
                    break

        suits = Counter(_suit(c) for c in all_cards)
        max_suit_n = max(suits.values())
        flush_done = cat in ("FLUSH", "SF") or made_flush
        if max_suit_n == 4 and not flush_done:
            draws.add("FD")
        elif max_suit_n == 3 and not flush_done and len(board) == 3:
            draws.add("BDFD")
        oesd, gut = straight_draw_info(all_cards)
        if not made_straight:
            if oesd:
                draws.add("OESD")
            elif gut:
                draws.add("GUTSHOT")
            else:
                vals = sorted({RANK_VALUE[_rank(c)] for c in all_cards})
                vset = set(vals)
                for low in range(0, 9):
                    if {low, low + 1, low + 2, low + 3} <= vset or \
                       {low + 1, low + 2, low + 3, low + 4} <= vset:
                        draws.add("BSD")
                        break

    return {"cat": cat, "pair_sub": pair_sub, "high_sub": high_sub, "draws": draws}


def evaluate_range_distribution(range_combos: List[Tuple[str, str]],
                                board: List[str], street: str = "flop") -> Dict:
    """Iterate over every range combo, exclude duplicates with the board and
    compute the distribution of categories, pair subtypes, high cards and draws."""
    board_set = set(board)
    warnings: List[str] = []
    valid: List[Tuple[str, str]] = []
    excluded = 0
    for combo in range_combos:
        if combo[0] in board_set or combo[1] in board_set:
            excluded += 1
        else:
            valid.append(combo)

    total = len(valid)
    cat_counts: Counter = Counter()
    pair_counts: Counter = Counter()
    high_counts: Counter = Counter()
    draw_counts: Counter = Counter()
    details = []

    for combo in valid:
        res = analyze_combo(combo, board)
        cat_counts[res["cat"]] += 1
        if res["cat"] == "PAIR" and res["pair_sub"]:
            pair_counts[res["pair_sub"]] += 1
        if res["cat"] == "HIGH" and res["high_sub"]:
            high_counts[res["high_sub"]] += 1
        for d in res["draws"]:
            draw_counts[d] += 1
        details.append({
            "combo": list(combo),
            "cat": res["cat"],
            "pair_sub": res["pair_sub"],
            "high_sub": res["high_sub"],
            "draws": sorted(res["draws"]),
        })

    def pct(n):
        return round(100.0 * n / total, 2) if total else 0.0

    categories = [{"key": k, "label": _cat_label(k), "combos": cat_counts.get(k, 0),
                   "pct": pct(cat_counts.get(k, 0))}
                  for k in CATEGORY_ORDER if cat_counts.get(k, 0) > 0]
    pair_breakdown = [{"key": k, "label": PAIR_SUB_NAMES[k],
                       "combos": pair_counts.get(k, 0), "pct": pct(pair_counts.get(k, 0))}
                      for k in PAIR_SUB_ORDER if pair_counts.get(k, 0) > 0]
    high_breakdown = [
        {"key": "ACE", "label": "Ace High", "combos": high_counts.get("ACE", 0),
         "pct": pct(high_counts.get("ACE", 0))},
        {"key": "OTHER", "label": "High Card (others)", "combos": high_counts.get("OTHER", 0),
         "pct": pct(high_counts.get("OTHER", 0))},
    ] if cat_counts.get("HIGH", 0) > 0 else []
    draws = [{"key": k, "label": DRAW_NAMES[k], "combos": draw_counts.get(k, 0),
              "pct": pct(draw_counts.get(k, 0))}
             for k in DRAW_ORDER if draw_counts.get(k, 0) > 0]

    if excluded:
        warnings.append(f"{excluded} combos excluded due to duplicate cards on the board")

    return {
        "total_combos_grid": len(range_combos),
        "excluded_dupes": excluded,
        "valid_combos": total,
        "categories": categories,
        "pair_breakdown": pair_breakdown,
        "high_card_breakdown": high_breakdown,
        "draws": draws,
        "warnings": warnings,
        "combo_details": details,
    }


_LABEL_LOOKUP = {v[0]: v[1] for v in CAT_NAMES.values()}


def _cat_label(k: str) -> str:
    return _LABEL_LOOKUP.get(k, k)
