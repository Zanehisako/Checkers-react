import sys
import time
from dataclasses import dataclass
from enum import Enum
from typing import List, Tuple, Dict, Optional, NamedTuple, Final, Any

# --- Constants and Configuration ---

# Use 32-bit integers for bitboards
BOARD_MASK: Final[int] = 0xFFFFFFFF
CENTER_SQUARES: Final[int] = (
    (1 << 10) | (1 << 11) | (1 << 14) | (1 << 15) |
    (1 << 16) | (1 << 17) | (1 << 20) | (1 << 21)
)
EDGE_SQUARES: Final[int] = (
    (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) |
    (1 << 4) | (1 << 7) | (1 << 24) | (1 << 27) |
    (1 << 28) | (1 << 29) | (1 << 30) | (1 << 31)
)
PROMOTION_ZONE_WHITE: Final[int] = (1 << 28) | (1 << 29) | (1 << 30) | (1 << 31)
PROMOTION_ZONE_BLACK: Final[int] = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3)
INF: Final[int] = 1_000_000

# Mapping from 32-bit index (0-31) to (x, y)
class Point(NamedTuple):
    x: int
    y: int

# Mapping from internal index to external coordinate string
BOARD_MAPPING: Final[Dict[int, str]] = {
    0: "10", 1: "30", 2: "50", 3: "70",
    4: "01", 5: "21", 6: "41", 7: "61",
    8: "12", 9: "32", 10: "52", 11: "72",
    12: "03", 13: "23", 14: "43", 15: "63",
    16: "14", 17: "34", 18: "54", 19: "74",
    20: "05", 21: "25", 22: "45", 23: "65",
    24: "16", 25: "36", 26: "56", 27: "76",
    28: "07", 29: "27", 30: "47", 31: "67",
}

# Mapping from internal index to Point(x, y)
POSITIONS_INDEXES: Final[Dict[int, Point]] = {
    0: Point(1, 0), 1: Point(3, 0), 2: Point(5, 0), 3: Point(7, 0),
    4: Point(0, 1), 5: Point(2, 1), 6: Point(4, 1), 7: Point(6, 1),
    8: Point(1, 2), 9: Point(3, 2), 10: Point(5, 2), 11: Point(7, 2),
    12: Point(0, 3), 13: Point(2, 3), 14: Point(4, 3), 15: Point(6, 3),
    16: Point(1, 4), 17: Point(3, 4), 18: Point(5, 4), 19: Point(7, 4),
    20: Point(0, 5), 21: Point(2, 5), 22: Point(4, 5), 23: Point(6, 5),
    24: Point(1, 6), 25: Point(3, 6), 26: Point(5, 6), 27: Point(7, 6),
    28: Point(0, 7), 29: Point(2, 7), 30: Point(4, 7), 31: Point(6, 7),
}


# --- Piece-Square Tables ---
WHITE_MAN_PST: Final[Tuple[int, ...]] = (
    0,  0,  0,  0,
    5, 10, 10,  5,
    10, 15, 15, 10,
    15, 22, 22, 15,
    20, 25, 25, 20,
    25, 30, 30, 25,
    30, 35, 35, 30,
    35, 40, 40, 35,
)
KING_PST: Final[Tuple[int, ...]] = (
    0,  5,  5,  0,
    5, 10, 10,  5,
    10, 15, 15, 10,
    15, 20, 20, 15,
    15, 20, 20, 15,
    10, 15, 15, 10,
    5, 10, 10,  5,
    0,  5,  5,  0,
)


# --- Move Representation ---
class MoveType(Enum):
    URCapture = 0
    ULCapture = 1
    DRCapture = 2
    DLCapture = 3
    URMove = 4
    ULMove = 5
    DRMove = 6
    DLMove = 7

    def is_capture(self) -> bool:
        return self.value <= MoveType.DLCapture.value


@dataclass(frozen=True, eq=False)  # Use default eq based on all fields initially
class Move:
    from_sq: int
    to_sq: int
    type: MoveType

    # Custom equality and hash based on from/to squares only,
    # useful for history tracking (detecting repetitions regardless of type)
    def __eq__(self, other):
        if not isinstance(other, Move):
            return NotImplemented
        return self.from_sq == other.from_sq and self.to_sq == other.to_sq

    def __hash__(self):
        return hash((self.from_sq, self.to_sq))

    def __str__(self):
        return f"from:{self.from_sq} to:{self.to_sq} type:{self.type.name}"


# --- Helper Functions ---
def count_set_bits(n: int) -> int:
    """Counts the number of set bits (1s) in an integer."""
    return n.bit_count()


def countr_zero(n: int) -> int:
    """Counts trailing zeros (position of the least significant bit)."""
    if n == 0:
        return -1  # Or potentially 32, depending on expected behavior for 0
    # Efficient way to find LSB index: (n & -n) isolates the LSB
    return (n & -n).bit_length() - 1


def index_from_rc(row: int, col: int) -> int:
    """Converts 8x8 row/col (0-7) to internal 32-bit index (0-31)."""
    if not (0 <= row < 8 and 0 <= col < 8):
        return -1
    # Square is invalid if row and col sum is even (white squares)
    if (row + col) % 2 == 0:
        return -1
    # Each row has 4 valid squares
    return (row * 4) + (col // 2)


def rc_from_index(i: int) -> Tuple[int, int]:
    """Converts internal 32-bit index (0-31) to 8x8 row/col (0-7)."""
    if not (0 <= i < 32):
        raise ValueError("Index out of range (0-31)")
    row = i // 4
    # Calculate column based on row (even/odd rows have different col offsets)
    col = 2 * (i % 4) + (1 if row % 2 == 0 else 0)
    return row, col

# Precompute coordinates for all valid squares
SQUARE_COORDS: Final[Tuple[Tuple[int, int], ...]] = tuple(rc_from_index(i) for i in range(32))


# --- Zobrist Hashing ---
def lcg(seed: int) -> int:
    """Linear congruential generator for pseudo-random numbers."""
    return ((seed * 1664525) + 1013904223) & BOARD_MASK # Ensure 32-bit


def generate_zobrist_keys(seed: int) -> Tuple[int, ...]:
    """Generates 32 unique Zobrist keys for piece/square combinations."""
    keys = []
    current_seed = seed
    for _ in range(32):
        current_seed = lcg(current_seed)
        keys.append(current_seed)
    return tuple(keys)

# Generate keys for each piece type and square
ZOBRIST_WHITE_MAN: Final[Tuple[int, ...]] = generate_zobrist_keys(12345)
ZOBRIST_WHITE_KING: Final[Tuple[int, ...]] = generate_zobrist_keys(67890)
ZOBRIST_BLACK_MAN: Final[Tuple[int, ...]] = generate_zobrist_keys(54321)
ZOBRIST_BLACK_KING: Final[Tuple[int, ...]] = generate_zobrist_keys(98765)
ZOBRIST_SIDE_TO_MOVE: Final[int] = 0x12345678 # Key to XOR when side changes


def compute_initial_hash(white: int, black: int, kings: int, white_to_move: bool) -> int:
    """Computes the Zobrist hash for a given board state from scratch."""
    hash_val = 0
    # Iterate through all 32 squares
    for pos in range(32):
        bit = 1 << pos
        if white & bit:
            hash_val ^= ZOBRIST_WHITE_KING[pos] if kings & bit else ZOBRIST_WHITE_MAN[pos]
        elif black & bit:
            hash_val ^= ZOBRIST_BLACK_KING[pos] if kings & bit else ZOBRIST_BLACK_MAN[pos]

    # XOR with side-to-move key if it's white's turn
    if white_to_move:
        hash_val ^= ZOBRIST_SIDE_TO_MOVE

    return hash_val


# --- Move Generation Precomputation ---
@dataclass
class PrecomputedMoves:
    """Stores precomputed move and capture bitboards for each square."""
    white_man_left: Tuple[int, ...]
    white_man_right: Tuple[int, ...]
    black_man_left: Tuple[int, ...]
    black_man_right: Tuple[int, ...]
    white_man_capture_left: Tuple[int, ...]
    white_man_capture_right: Tuple[int, ...]
    black_man_capture_left: Tuple[int, ...]
    black_man_capture_right: Tuple[int, ...]
    king_capture_ul: Tuple[int, ...]
    king_capture_ur: Tuple[int, ...]
    king_capture_dl: Tuple[int, ...]
    king_capture_dr: Tuple[int, ...]
    capture_middle_squares: Tuple[Dict[int, int], ...] # Maps from_sq -> {to_sq: middle_sq}


def init_move_arrays() -> PrecomputedMoves:
    """Initializes the precomputed move data."""
    wml, wmr, bml, bmr = [0] * 32, [0] * 32, [0] * 32, [0] * 32
    wmcl, wmcr, bmcl, bmcr = [0] * 32, [0] * 32, [0] * 32, [0] * 32
    kcul, kcur, kcdl, kcdr = [0] * 32, [0] * 32, [0] * 32, [0] * 32
    capture_middles = tuple({} for _ in range(32)) # Use tuple for immutability

    for i in range(32):
        row, col = SQUARE_COORDS[i]

        # --- Regular Moves (relative to the piece) ---
        # White moves "down" (increasing row index)
        if row < 7:
            if col > 0:  # Down-Left
                target_idx = index_from_rc(row + 1, col - 1)
                if target_idx != -1: wml[i] = (1 << target_idx)
            if col < 7:  # Down-Right
                target_idx = index_from_rc(row + 1, col + 1)
                if target_idx != -1: wmr[i] = (1 << target_idx)
        # Black moves "up" (decreasing row index)
        if row > 0:
            if col > 0:  # Up-Left
                target_idx = index_from_rc(row - 1, col - 1)
                if target_idx != -1: bml[i] = (1 << target_idx)
            if col < 7:  # Up-Right
                target_idx = index_from_rc(row - 1, col + 1)
                if target_idx != -1: bmr[i] = (1 << target_idx)

        # --- Captures (relative to the piece) ---
        # White captures "down"
        if row < 6:
            if col > 1:  # Jump Down-Left
                target_idx = index_from_rc(row + 2, col - 2)
                middle_idx = index_from_rc(row + 1, col - 1)
                if target_idx != -1 and middle_idx != -1:
                    wmcl[i] = 1 << target_idx
                    capture_middles[i][target_idx] = middle_idx
            if col < 6:  # Jump Down-Right
                target_idx = index_from_rc(row + 2, col + 2)
                middle_idx = index_from_rc(row + 1, col + 1)
                if target_idx != -1 and middle_idx != -1:
                    wmcr[i] = 1 << target_idx
                    capture_middles[i][target_idx] = middle_idx
        # Black captures "up"
        if row > 1:
            if col > 1:  # Jump Up-Left
                target_idx = index_from_rc(row - 2, col - 2)
                middle_idx = index_from_rc(row - 1, col - 1)
                if target_idx != -1 and middle_idx != -1:
                    bmcl[i] = 1 << target_idx
                    capture_middles[i][target_idx] = middle_idx
            if col < 6:  # Jump Up-Right
                target_idx = index_from_rc(row - 2, col + 2)
                middle_idx = index_from_rc(row - 1, col + 1)
                if target_idx != -1 and middle_idx != -1:
                    bmcr[i] = 1 << target_idx
                    capture_middles[i][target_idx] = middle_idx

        # King captures are the same as man captures in all four directions
        kcul[i], kcur[i], kcdl[i], kcdr[i] = bmcl[i], bmcr[i], wmcl[i], wmcr[i]

    return PrecomputedMoves(
        tuple(wml), tuple(wmr), tuple(bml), tuple(bmr),
        tuple(wmcl), tuple(wmcr), tuple(bmcl), tuple(bmcr),
        tuple(kcul), tuple(kcur), tuple(kcdl), tuple(kcdr),
        capture_middles,
    )

MOVES_ARRAY: Final[PrecomputedMoves] = init_move_arrays()


# --- Game State ---
@dataclass
class GameState:
    """Represents the state of the checkers board."""
    white: int = 0  # Bitboard for white pieces
    black: int = 0  # Bitboard for black pieces
    kings: int = 0  # Bitboard for kings (subset of white | black)
    white_to_move: bool = True
    hash: int = 0   # Zobrist hash of the state

    @property
    def occupied(self) -> int:
        """Bitboard of all occupied squares."""
        return self.white | self.black

    @property
    def empty(self) -> int:
        """Bitboard of all empty squares."""
        return (~self.occupied) & BOARD_MASK

    def compute_hash(self) -> int:
        """Recalculates the Zobrist hash for the current state."""
        return compute_initial_hash(self.white, self.black, self.kings, self.white_to_move)

    def copy(self) -> 'GameState':
        """Creates a shallow copy of the game state."""
        # Shallow copy is usually sufficient as bitboards are immutable ints/bools
        return GameState(self.white, self.black, self.kings, self.white_to_move, self.hash)


# --- Move Generation Logic ---
class MoveList:
    """Simple container for generated moves."""
    def __init__(self):
        self.moves: List[Move] = []
        self.count: int = 0

    def add(self, from_sq: int, to_sq: int, move_type: MoveType):
        self.moves.append(Move(from_sq, to_sq, move_type))
        self.count += 1

    def __iter__(self):
        return iter(self.moves)

    def __len__(self):
        return self.count


def _is_valid_capture(state: GameState, from_sq: int, target_mask: int, opponent_bb: int) -> bool:
    """Checks if a potential capture target square is valid."""
    # Target must exist (non-zero mask) and be empty
    if not target_mask or not (target_mask & state.empty):
        return False
    # Get the index of the target square
    target_sq = countr_zero(target_mask)
    # Find the required middle (captured) square for this jump
    middle_sq = MOVES_ARRAY.capture_middle_squares[from_sq].get(target_sq, -1)
    # Middle square must exist and contain an opponent piece
    return middle_sq != -1 and (opponent_bb & (1 << middle_sq))


def has_capture_move(state: GameState, sq: int) -> bool:
    """Checks if the piece at the given square has any valid capture."""
    piece_mask = 1 << sq
    is_king = bool(state.kings & piece_mask)
    opponent_bb = state.black if state.white_to_move else state.white
    m = MOVES_ARRAY  # Alias for brevity

    if state.white_to_move:
        if is_king:
            return (
                _is_valid_capture(state, sq, m.king_capture_ul[sq], opponent_bb) or
                _is_valid_capture(state, sq, m.king_capture_ur[sq], opponent_bb) or
                _is_valid_capture(state, sq, m.king_capture_dl[sq], opponent_bb) or
                _is_valid_capture(state, sq, m.king_capture_dr[sq], opponent_bb)
            )
        else: # White man captures DL, DR
            return (
                _is_valid_capture(state, sq, m.white_man_capture_left[sq], opponent_bb) or
                _is_valid_capture(state, sq, m.white_man_capture_right[sq], opponent_bb)
            )
    else: # Black's turn
        if is_king:
            return (
                _is_valid_capture(state, sq, m.king_capture_ul[sq], opponent_bb) or
                _is_valid_capture(state, sq, m.king_capture_ur[sq], opponent_bb) or
                _is_valid_capture(state, sq, m.king_capture_dl[sq], opponent_bb) or
                _is_valid_capture(state, sq, m.king_capture_dr[sq], opponent_bb)
            )
        else: # Black man captures UL, UR
            return (
                _is_valid_capture(state, sq, m.black_man_capture_left[sq], opponent_bb) or
                _is_valid_capture(state, sq, m.black_man_capture_right[sq], opponent_bb)
            )


def is_capture_possible(state: GameState) -> bool:
    """Checks if the current player has any capture available anywhere on the board."""
    pieces_bb = state.white if state.white_to_move else state.black
    bb = pieces_bb
    while bb:
        sq = countr_zero(bb)
        bb &= bb - 1  # Clear the least significant bit
        # *** FIX: Indentation corrected here ***
        if has_capture_move(state, sq):
            return True
    return False


def generate_regular_moves(state: GameState, sq: int, move_list: MoveList):
    """Generates non-capture moves for the piece at sq."""
    piece_mask = 1 << sq
    is_king = bool(state.kings & piece_mask)
    empty_bb = state.empty
    m = MOVES_ARRAY

    if state.white_to_move:
        # White man moves DL, DR
        if m.white_man_left[sq] & empty_bb:
            move_list.add(sq, countr_zero(m.white_man_left[sq]), MoveType.DLMove)
        if m.white_man_right[sq] & empty_bb:
            move_list.add(sq, countr_zero(m.white_man_right[sq]), MoveType.DRMove)
        # White king also moves UL, UR
        if is_king:
            if m.black_man_left[sq] & empty_bb: # Use black's moves for reverse direction
                move_list.add(sq, countr_zero(m.black_man_left[sq]), MoveType.ULMove)
            if m.black_man_right[sq] & empty_bb:
                move_list.add(sq, countr_zero(m.black_man_right[sq]), MoveType.URMove)
    else: # Black's turn
        # Black man moves UL, UR
        if m.black_man_left[sq] & empty_bb:
            move_list.add(sq, countr_zero(m.black_man_left[sq]), MoveType.ULMove)
        if m.black_man_right[sq] & empty_bb:
            move_list.add(sq, countr_zero(m.black_man_right[sq]), MoveType.URMove)
        # Black king also moves DL, DR
        if is_king:
            if m.white_man_left[sq] & empty_bb: # Use white's moves for reverse direction
                move_list.add(sq, countr_zero(m.white_man_left[sq]), MoveType.DLMove)
            if m.white_man_right[sq] & empty_bb:
                move_list.add(sq, countr_zero(m.white_man_right[sq]), MoveType.DRMove)


def generate_capture_moves(state: GameState, sq: int, move_list: MoveList):
    """Generates capture moves for the piece at sq."""
    piece_mask = 1 << sq
    is_king = bool(state.kings & piece_mask)
    opponent_bb = state.black if state.white_to_move else state.white
    m = MOVES_ARRAY

    if state.white_to_move:
        if is_king:
            # Check all four capture directions for king
            if _is_valid_capture(state, sq, m.king_capture_ul[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.king_capture_ul[sq]), MoveType.ULCapture)
            if _is_valid_capture(state, sq, m.king_capture_ur[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.king_capture_ur[sq]), MoveType.URCapture)
            if _is_valid_capture(state, sq, m.king_capture_dl[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.king_capture_dl[sq]), MoveType.DLCapture)
            if _is_valid_capture(state, sq, m.king_capture_dr[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.king_capture_dr[sq]), MoveType.DRCapture)
        else: # White man captures DL, DR
            if _is_valid_capture(state, sq, m.white_man_capture_left[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.white_man_capture_left[sq]), MoveType.DLCapture)
            if _is_valid_capture(state, sq, m.white_man_capture_right[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.white_man_capture_right[sq]), MoveType.DRCapture)
    else: # Black's turn
        if is_king:
            # Check all four capture directions for king
            if _is_valid_capture(state, sq, m.king_capture_ul[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.king_capture_ul[sq]), MoveType.ULCapture)
            if _is_valid_capture(state, sq, m.king_capture_ur[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.king_capture_ur[sq]), MoveType.URCapture)
            if _is_valid_capture(state, sq, m.king_capture_dl[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.king_capture_dl[sq]), MoveType.DLCapture)
            if _is_valid_capture(state, sq, m.king_capture_dr[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.king_capture_dr[sq]), MoveType.DRCapture)
        else: # Black man captures UL, UR
            if _is_valid_capture(state, sq, m.black_man_capture_left[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.black_man_capture_left[sq]), MoveType.ULCapture)
            if _is_valid_capture(state, sq, m.black_man_capture_right[sq], opponent_bb):
                move_list.add(sq, countr_zero(m.black_man_capture_right[sq]), MoveType.URCapture)


def generate_moves(state: GameState) -> MoveList:
    """Generates all legal moves for the current player."""
    move_list = MoveList()
    pieces_bb = state.white if state.white_to_move else state.black
    must_capture = is_capture_possible(state)

    bb = pieces_bb
    while bb:
        sq = countr_zero(bb)
        bb &= bb - 1  # Clear the LSB

        if must_capture:
            generate_capture_moves(state, sq, move_list)
        else:
            generate_regular_moves(state, sq, move_list)

    return move_list


# --- Apply Move ---
def apply_move(state: GameState, move: Move) -> GameState:
    """Applies a move to the game state and returns the new state."""
    ns = state.copy() # New state
    from_bit = 1 << move.from_sq
    to_bit = 1 << move.to_sq
    from_is_king = bool(state.kings & from_bit)

    # --- Update Hash: Remove piece from 'from_sq' ---
    if state.white_to_move:
        piece_zobrist = ZOBRIST_WHITE_KING if from_is_king else ZOBRIST_WHITE_MAN
        ns.hash ^= piece_zobrist[move.from_sq]
    else:
        piece_zobrist = ZOBRIST_BLACK_KING if from_is_king else ZOBRIST_BLACK_MAN
        ns.hash ^= piece_zobrist[move.from_sq]

    # --- Move piece on bitboards ---
    if state.white_to_move:
        ns.white = (state.white & ~from_bit) | to_bit
        ns.black = state.black # Black pieces remain the same unless captured
    else:
        ns.black = (state.black & ~from_bit) | to_bit
        ns.white = state.white # White pieces remain the same unless captured

    # --- Update Kings bitboard (remove from old square, add to new if it was king) ---
    ns.kings = (state.kings & ~from_bit) | (to_bit if from_is_king else 0)

    # --- Handle Captures ---
    if move.type.is_capture():
        middle_sq = MOVES_ARRAY.capture_middle_squares[move.from_sq].get(move.to_sq, -1)
        if middle_sq != -1:
            middle_bit = 1 << middle_sq
            captured_is_king = bool(state.kings & middle_bit)

            # Remove captured piece from opponent's bitboard and update hash
            if state.white_to_move: # White captures black
                ns.black &= ~middle_bit
                captured_zobrist = ZOBRIST_BLACK_KING if captured_is_king else ZOBRIST_BLACK_MAN
                ns.hash ^= captured_zobrist[middle_sq]
            else: # Black captures white
                ns.white &= ~middle_bit
                captured_zobrist = ZOBRIST_WHITE_KING if captured_is_king else ZOBRIST_WHITE_MAN
                ns.hash ^= captured_zobrist[middle_sq]

            # Remove captured piece from kings bitboard
            ns.kings &= ~middle_bit
        else:
            # This should ideally not happen if move generation is correct
            print(f"Warning: Middle square not found for capture {move}", file=sys.stderr)

    # --- Handle Promotion ---
    promoted = False
    # Only promote if the piece landing isn't already a king
    if not (ns.kings & to_bit):
        if state.white_to_move and (move.to_sq >= 28): # White reaches last row (indices 28-31)
            ns.kings |= to_bit
            promoted = True
        elif not state.white_to_move and (move.to_sq <= 3): # Black reaches first row (indices 0-3)
            ns.kings |= to_bit
            promoted = True

    # --- Update Hash: Add piece to 'to_sq' (consider promotion) ---
    to_is_king = bool(ns.kings & to_bit) # Check king status *after* potential promotion
    if state.white_to_move:
        piece_zobrist = ZOBRIST_WHITE_KING if to_is_king else ZOBRIST_WHITE_MAN
        ns.hash ^= piece_zobrist[move.to_sq]
    else:
        piece_zobrist = ZOBRIST_BLACK_KING if to_is_king else ZOBRIST_BLACK_MAN
        ns.hash ^= piece_zobrist[move.to_sq]

    # --- Switch Turns and update hash ---
    ns.white_to_move = not state.white_to_move
    ns.hash ^= ZOBRIST_SIDE_TO_MOVE

    # --- Verification (Optional, slows down execution) ---
    # assert ns.hash == ns.compute_hash(), "Incremental hash mismatch after move!"
    return ns


# --- Evaluation Logic ---
def pieces_under_threat(state: GameState, for_white: bool) -> int:
    """Calculates a bitboard of pieces of 'for_white' color that are under threat of capture."""
    our_bb = state.white if for_white else state.black
    opponent_bb = state.black if for_white else state.white
    opponent_kings = opponent_bb & state.kings
    opponent_men = opponent_bb & ~state.kings
    empty_bb = state.empty
    threatened_mask = 0
    m = MOVES_ARRAY

    # Threats from opponent men
    bb = opponent_men
    while bb:
        sq = countr_zero(bb)
        bb &= bb - 1
        if for_white: # Opponent is black men (threaten by capturing UL, UR)
            # Check UL capture possibility
            target_mask = m.black_man_capture_left[sq]
            if target_mask and (target_mask & empty_bb):
                target_sq = countr_zero(target_mask)
                middle_sq = m.capture_middle_squares[sq].get(target_sq, -1)
                if middle_sq != -1 and (our_bb & (1 << middle_sq)):
                    threatened_mask |= (1 << middle_sq)
            # Check UR capture possibility
            target_mask = m.black_man_capture_right[sq]
            if target_mask and (target_mask & empty_bb):
                target_sq = countr_zero(target_mask)
                middle_sq = m.capture_middle_squares[sq].get(target_sq, -1)
                if middle_sq != -1 and (our_bb & (1 << middle_sq)):
                    threatened_mask |= (1 << middle_sq)
        else: # Opponent is white men (threaten by capturing DL, DR)
             # Check DL capture possibility
            target_mask = m.white_man_capture_left[sq]
            if target_mask and (target_mask & empty_bb):
                target_sq = countr_zero(target_mask)
                middle_sq = m.capture_middle_squares[sq].get(target_sq, -1)
                if middle_sq != -1 and (our_bb & (1 << middle_sq)):
                    threatened_mask |= (1 << middle_sq)
            # Check DR capture possibility
            target_mask = m.white_man_capture_right[sq]
            if target_mask and (target_mask & empty_bb):
                target_sq = countr_zero(target_mask)
                middle_sq = m.capture_middle_squares[sq].get(target_sq, -1)
                if middle_sq != -1 and (our_bb & (1 << middle_sq)):
                    threatened_mask |= (1 << middle_sq)

    # Threats from opponent kings
    bb = opponent_kings
    while bb:
        sq = countr_zero(bb)
        bb &= bb - 1
        # Check all four capture directions for kings
        king_captures = [
            m.king_capture_ul[sq], m.king_capture_ur[sq],
            m.king_capture_dl[sq], m.king_capture_dr[sq]
        ]
        for target_mask in king_captures:
            if target_mask and (target_mask & empty_bb):
                target_sq = countr_zero(target_mask)
                middle_sq = m.capture_middle_squares[sq].get(target_sq, -1)
                if middle_sq != -1 and (our_bb & (1 << middle_sq)):
                    threatened_mask |= (1 << middle_sq)

    return threatened_mask


def compute_mobility(state: GameState, for_white: bool) -> int:
    """Calculates the number of non-capture moves available."""
    mobility_count = 0
    pieces_bb = state.white if for_white else state.black
    men_bb = pieces_bb & ~state.kings
    kings_bb = pieces_bb & state.kings
    empty_bb = state.empty
    m = MOVES_ARRAY

    # Mobility for men
    bb = men_bb
    while bb:
        sq = countr_zero(bb)
        bb &= bb - 1
        if for_white:
            mobility_count += bool(m.white_man_left[sq] & empty_bb) + bool(m.white_man_right[sq] & empty_bb)
        else:
            mobility_count += bool(m.black_man_left[sq] & empty_bb) + bool(m.black_man_right[sq] & empty_bb)

    # Mobility for kings
    bb = kings_bb
    while bb:
        sq = countr_zero(bb)
        bb &= bb - 1
        # Kings can move in all four directions
        mobility_count += (
            bool(m.white_man_left[sq] & empty_bb) + bool(m.white_man_right[sq] & empty_bb) +
            bool(m.black_man_left[sq] & empty_bb) + bool(m.black_man_right[sq] & empty_bb)
        )

    return mobility_count


def evaluate_state(state: GameState) -> int:
    """Evaluates the board state from white's perspective."""
    # Check for terminal states (win/loss)
    if state.white == 0: return -INF # White has no pieces -> Black wins
    if state.black == 0: return INF  # Black has no pieces -> White wins
    # Could add draw detection here (e.g., 50-move rule, 3-fold repetition if history is tracked)

    # --- Material Score ---
    white_men_count = count_set_bits(state.white & ~state.kings)
    black_men_count = count_set_bits(state.black & ~state.kings)
    white_king_count = count_set_bits(state.white & state.kings)
    black_king_count = count_set_bits(state.black & state.kings)

    material_score = (white_men_count * 70 + white_king_count * 250) - \
                     (black_men_count * 70 + black_king_count * 250)

    # --- Determine Game Phase ---
    total_pieces = white_men_count + black_men_count + white_king_count + black_king_count
    is_endgame = (white_king_count + black_king_count >= 1) or (total_pieces <= 12) # Simplified endgame condition

    # --- Positional Score (Piece-Square Tables) ---
    pst_multiplier = 1 if is_endgame else 2
    pst_score = 0
    # White men
    bb = state.white & ~state.kings
    while bb:
        p = countr_zero(bb); bb &= bb - 1
        pst_score += WHITE_MAN_PST[p]
    # White kings
    bb = state.white & state.kings
    while bb:
        p = countr_zero(bb); bb &= bb - 1
        pst_score += KING_PST[p]
        # Penalty for king on home row in endgame (encourage activation)
        # if is_endgame and (PROMOTION_ZONE_WHITE & (1 << p)): pst_score -= 50 # Example penalty
    # Black men (use mirrored PST)
    bb = state.black & ~state.kings
    while bb:
        p = countr_zero(bb); bb &= bb - 1
        pst_score -= WHITE_MAN_PST[31 - p] # Mirrored index
    # Black kings
    bb = state.black & state.kings
    while bb:
        p = countr_zero(bb); bb &= bb - 1
        pst_score -= KING_PST[p] # Use same PST for kings
        # Penalty for king on home row in endgame
        # if is_endgame and (PROMOTION_ZONE_BLACK & (1 << p)): pst_score += 50 # Add to white score

    # --- Center Control ---
    center_multiplier = 2 if is_endgame else 8
    white_center = count_set_bits(state.white & CENTER_SQUARES)
    black_center = count_set_bits(state.black & CENTER_SQUARES)
    center_control = (white_center - black_center) * center_multiplier

    # --- Edge Penalty ---
    edge_multiplier = 1 if is_endgame else 4
    white_edge = count_set_bits(state.white & EDGE_SQUARES)
    black_edge = count_set_bits(state.black & EDGE_SQUARES)
    edge_penalty = -(white_edge - black_edge) * edge_multiplier # Negative score for being on edge

    # --- Promotion Threat (Men near promotion) ---
    promo_multiplier = 4 if is_endgame else 10
    # White men near black's promotion zone (rows 0-1, indices 0-7)
    white_promo_threat = count_set_bits((state.white & ~state.kings) & 0x000000FF)
    # Black men near white's promotion zone (rows 6-7, indices 24-31)
    black_promo_threat = count_set_bits((state.black & ~state.kings) & 0xFF000000)
    promotion_threat = (white_promo_threat - black_promo_threat) * promo_multiplier

    # --- Mobility ---
    mobility_multiplier = 8 if is_endgame else 4
    white_mobility = compute_mobility(state, True)
    black_mobility = compute_mobility(state, False)
    mobility_score = (white_mobility - black_mobility) * mobility_multiplier

    # --- Connectedness ---
    # Bonus for pieces adjacent to friendly pieces
    connectivity_multiplier = 6 if is_endgame else 8
    white_connections = 0
    bb = state.white
    while bb:
        s = countr_zero(bb); bb &= bb - 1
        # Get adjacent squares (potential move targets for king)
        adj = (MOVES_ARRAY.white_man_left[s] | MOVES_ARRAY.white_man_right[s] |
               MOVES_ARRAY.black_man_left[s] | MOVES_ARRAY.black_man_right[s])
        white_connections += count_set_bits(adj & state.white)

    black_connections = 0
    bb = state.black
    while bb:
        s = countr_zero(bb); bb &= bb - 1
        adj = (MOVES_ARRAY.white_man_left[s] | MOVES_ARRAY.white_man_right[s] |
               MOVES_ARRAY.black_man_left[s] | MOVES_ARRAY.black_man_right[s])
        black_connections += count_set_bits(adj & state.black)
    # Each connection is counted twice, so divide by 2
    connectivity_score = ((white_connections // 2) - (black_connections // 2)) * connectivity_multiplier

    # --- Back Rank Defense/Offense (Kings on promotion rank) ---
    back_rank_multiplier = 0 if is_endgame else 15 # More important midgame
    white_back_kings = count_set_bits(state.white & state.kings & PROMOTION_ZONE_WHITE)
    black_back_kings = count_set_bits(state.black & state.kings & PROMOTION_ZONE_BLACK)
    back_rank_score = (white_back_kings - black_back_kings) * back_rank_multiplier

    # --- Threats ---
    threat_multiplier = 120 if is_endgame else 60
    white_threatened_count = count_set_bits(pieces_under_threat(state, True))
    black_threatened_count = count_set_bits(pieces_under_threat(state, False))
    # Score is positive if black pieces are threatened, negative if white pieces are
    threat_score = (black_threatened_count - white_threatened_count) * threat_multiplier

    # --- King Distance / Aggression (Endgame) ---
    distance_bonus = 0
    king_aggression_score = 0
    if is_endgame:
        distance_multiplier = 15
        # White king distance to black pieces
        bb_w_kings = state.white & state.kings
        while bb_w_kings:
            k_sq = countr_zero(bb_w_kings); bb_w_kings &= bb_w_kings - 1
            min_dist = 100
            bb_op_inner = state.black
            if not bb_op_inner: continue # No opponents left
            kr, kc = SQUARE_COORDS[k_sq]
            while bb_op_inner:
                p_sq = countr_zero(bb_op_inner); bb_op_inner &= bb_op_inner - 1
                pr, pc = SQUARE_COORDS[p_sq]
                # Chebyshev distance (max of row/col difference)
                dist = max(abs(kr - pr), abs(kc - pc))
                min_dist = min(min_dist, dist)
            # Bonus for being closer (8 - min_dist)
            distance_bonus += (8 - min_dist) * distance_multiplier

        # Black king distance to white pieces
        bb_b_kings = state.black & state.kings
        while bb_b_kings:
            k_sq = countr_zero(bb_b_kings); bb_b_kings &= bb_b_kings - 1
            min_dist = 100
            bb_op_inner = state.white
            if not bb_op_inner: continue # No opponents left
            kr, kc = SQUARE_COORDS[k_sq]
            while bb_op_inner:
                p_sq = countr_zero(bb_op_inner); bb_op_inner &= bb_op_inner - 1
                pr, pc = SQUARE_COORDS[p_sq]
                dist = max(abs(kr - pr), abs(kc - pc))
                min_dist = min(min_dist, dist)
            # Penalty for black king being close (subtract from white's score)
            distance_bonus -= (8 - min_dist) * distance_multiplier

        # Endgame King Advancement / Centralization Bonus
        white_king_aggression = 0
        bb = state.white & state.kings
        while bb:
            p = countr_zero(bb); bb &= bb - 1
            r, _ = SQUARE_COORDS[p]
            white_king_aggression += r * r * 10 # Bonus for advancing (quadratic)

        black_king_aggression = 0
        bb = state.black & state.kings
        while bb:
            p = countr_zero(bb); bb &= bb - 1
            r, _ = SQUARE_COORDS[p]
            black_king_aggression += (7 - r) * (7 - r) * 10 # Bonus for advancing (quadratic)

        king_aggression_score = white_king_aggression - black_king_aggression

        # Bonus/Penalty for kings trapped on opponent's side?
        # white_kings_on_black_side = count_set_bits(state.white & state.kings & 0x0000FFFF) # First 4 rows
        # black_kings_on_white_side = count_set_bits(state.black & state.kings & 0xFFFF0000) # Last 4 rows
        # king_aggression_score += 150 * white_kings_on_black_side - 150 * black_kings_on_white_side


    # --- Combine Scores ---
    total_score = (
        material_score +
        pst_score * pst_multiplier +
        center_control +
        edge_penalty +
        promotion_threat +
        mobility_score +
        connectivity_score +
        back_rank_score +
        threat_score +
        distance_bonus +  # Only non-zero in endgame
        king_aggression_score # Only non-zero in endgame
    )

    return total_score


# --- Search (Minimax with Alpha-Beta and Transposition Table) ---
class TTEntry(NamedTuple):
    """Entry in the Transposition Table."""
    eval: int  # Stored evaluation score
    depth: int # Depth at which the score was calculated
    flag: int  # 0: EXACT, 1: LOWER (fail-high), 2: UPPER (fail-low)


class TranspositionTable:
    """Stores previously computed states to avoid re-computation."""
    EXACT, LOWER, UPPER = 0, 1, 2

    def __init__(self, size_power_of_2: int = 20):
        # Size should be a power of 2 for efficient indexing with bitwise AND
        self.size = 1 << size_power_of_2
        # Use dictionary as the underlying storage
        self.table: Dict[int, TTEntry] = {}
        self.mask = self.size - 1 # Mask for index calculation

    def _get_index(self, hash_val: int) -> int:
        """Calculates the index into the table."""
        return hash_val & self.mask

    def lookup(self, h: int, depth: int) -> Optional[TTEntry]:
        """Looks up a state in the TT."""
        # idx = self._get_index(h) # If using fixed-size list/array
        entry = self.table.get(h) # Direct lookup using hash as key for dict
        # Return entry only if it's valid and calculated at sufficient depth
        if entry and entry.depth >= depth:
            return entry
        return None

    def store(self, h: int, depth: int, evaluation: int, flag: int):
        """Stores a state evaluation in the TT."""
        # idx = self._get_index(h)
        existing_entry = self.table.get(h)
        # Store if new or if this result is from a deeper/equal search (replace older/shallower entries)
        # Could implement more complex replacement strategies (e.g., depth-preferred)
        if not existing_entry or depth >= existing_entry.depth:
            self.table[h] = TTEntry(evaluation, depth, flag)

    def clear(self):
        """Clears the transposition table."""
        self.table.clear()

# Global TT instance
# Size 2^22 => ~4 million entries. Adjust based on available memory.
TRANSPOSITION_TABLE = TranspositionTable(size_power_of_2=22)
nodes_visited = 0 # Global counter for visited nodes in search


def minimax(state: GameState, depth: int, alpha: int, beta: int) -> int:
    """
    Minimax search with alpha-beta pruning and transposition table lookup.
    Returns the evaluation score for the given state.
    """
    global nodes_visited
    nodes_visited += 1

    # --- Base Case: Maximum Depth Reached ---
    if depth <= 0:
        # Could potentially call quiescent search here instead of direct evaluation
        return evaluate_state(state)

    original_alpha = alpha # Store original alpha for TT flag determination

    # --- Transposition Table Lookup ---
    tt_entry = TRANSPOSITION_TABLE.lookup(state.hash, depth)
    if tt_entry:
        if tt_entry.flag == TranspositionTable.EXACT:
            return tt_entry.eval
        elif tt_entry.flag == TranspositionTable.LOWER: # Stored value is a lower bound
            alpha = max(alpha, tt_entry.eval)
        elif tt_entry.flag == TranspositionTable.UPPER: # Stored value is an upper bound
            beta = min(beta, tt_entry.eval)

        # Check for cutoff after TT lookup
        if alpha >= beta:
            return tt_entry.eval # Return the bound from TT

    # --- Generate Moves ---
    moves = generate_moves(state)

    # --- Base Case: No Legal Moves ---
    if not moves:
        # Player whose turn it is cannot move -> they lose
        return -INF if state.white_to_move else INF

    # --- Recursive Search ---
    # Move Ordering - could be implemented here (e.g., captures first, TT moves)
    # sorted_moves = sorted(moves, key=lambda m: m.type.is_capture(), reverse=True)

    best_eval = -INF if state.white_to_move else INF

    for move in moves: # Iterate through moves (or sorted_moves)
        child_state = apply_move(state, move)

        # Recursive call for the child state
        eval_score = minimax(child_state, depth - 1, alpha, beta)

        if state.white_to_move: # Maximizing player
            best_eval = max(best_eval, eval_score)
            alpha = max(alpha, best_eval)
            if beta <= alpha: # Beta cutoff
                break # Stop searching further moves
        else: # Minimizing player
            best_eval = min(best_eval, eval_score)
            beta = min(beta, best_eval)
            if beta <= alpha: # Alpha cutoff
                break # Stop searching further moves

    # --- Transposition Table Store ---
    tt_flag = TranspositionTable.EXACT
    if best_eval <= original_alpha: # Failed low (didn't raise alpha)
        tt_flag = TranspositionTable.UPPER # Score is an upper bound
    elif best_eval >= beta: # Failed high (exceeded beta)
        tt_flag = TranspositionTable.LOWER # Score is a lower bound

    TRANSPOSITION_TABLE.store(state.hash, depth, best_eval, tt_flag)

    return best_eval


def find_best_move_internal(state: GameState, depth: int) -> Optional[Move]:
    """
    Internal function to find the best move using minimax search at the root.
    Returns the best Move object found, or None if no moves exist.
    """
    global nodes_visited
    nodes_visited = 0
    start_time = time.perf_counter()

    moves = generate_moves(state)
    if not moves:
        print("[Engine] No legal moves available.")
        return None

    # TRANSPOSITION_TABLE.clear() # Optional: Clear TT at the start of each root search

    best_move: Optional[Move] = None
    alpha, beta = -INF, INF

    # Initialize best_value depending on whose turn it is
    best_value = -INF if state.white_to_move else INF

    # Simple move ordering: captures first
    # More advanced: Use TT scores, killer moves, history heuristic
    sorted_moves = sorted(moves, key=lambda m: m.type.is_capture(), reverse=True)

    #print(f"[Engine] Searching Depth: {depth}, Player: {'White' if state.white_to_move else 'Black'}, Moves Available: {len(moves)}")

    for i, move in enumerate(sorted_moves):
        child_state = apply_move(state, move)

        # Call minimax for the child state
        # Use -beta, -alpha for the recursive call if using NegaMax, but here standard minimax
        move_value = minimax(child_state, depth - 1, alpha, beta)

        # Debug print for each root move's score
        # print(f"  [{i+1}/{len(sorted_moves)}] Move {move}: Score={move_value}")

        # Update best move based on player
        if state.white_to_move: # Maximizing player
            if move_value > best_value:
                best_value = move_value
                best_move = move
            alpha = max(alpha, best_value) # Update alpha for subsequent searches at root
            # No beta cutoff at root, we want the best score among all moves
        else: # Minimizing player
            if move_value < best_value:
                best_value = move_value
                best_move = move
            beta = min(beta, best_value) # Update beta for subsequent searches at root
            # No alpha cutoff at root

    end_time = time.perf_counter()
    duration = end_time - start_time
    nps = int(nodes_visited / duration) if duration > 0 else 0

    # if best_move:
    #      print(f"[Engine] Best move: {best_move} | Score: {best_value:.0f} | Nodes: {nodes_visited} | NPS: {nps} | Time: {duration:.3f}s")
    # else:
    #      # This case should ideally not be reached if moves exist initially
    #      print("[Engine] Error: No best move found despite available moves.")
    #
    return best_move


# --- Utility Functions ---
def is_king(sq: int, state: GameState) -> bool:
    """Checks if the piece at sq is a king IN THE GIVEN STATE."""
    # Included for completeness, but direct state.kings & (1 << sq) is often used
    return bool(state.kings & (1 << sq))


def print_game_state(state: GameState):
    """Prints the board state to the console."""
    print("\n  Board State:")
    # Column labels (for dark squares)
    print("     1   3   5   7")
    print("   +---+---+---+---+")
    for r in range(8):
        print(f" {r} |", end="") # Row label
        for c in range(8):
            # Only print characters for dark squares
            if (r + c) % 2 == 1:
                idx = index_from_rc(r, c)
                if idx != -1:
                    bit = 1 << idx
                    char = "." # Default empty
                    if state.white & bit:
                        char = "W" if state.kings & bit else "w"
                    elif state.black & bit:
                        char = "B" if state.kings & bit else "b"
                    print(f" {char} |", end="")
                else:
                    print(" ? |", end="") # Should not happen
            else:
                 print("   ", end="") # White squares are blank
        print(f" {r}") # End row label
        print("   +---+---+---+---+")
    # Bottom column labels (for dark squares)
    print("     0   2   4   6 ")
    print(f"   Turn: {'White' if state.white_to_move else 'Black'} | Hash: {state.hash:08x}")
    print(f"   White pieces: {count_set_bits(state.white)}, Black pieces: {count_set_bits(state.black)}")
    print(f"   White kings: {count_set_bits(state.white & state.kings)}, Black kings: {count_set_bits(state.black & state.kings)}")
    print("-" * 20)


# --- Interface Functions (for interaction with external code like main.py) ---

def create_gamestate_from_json(board_data: List[List[Dict[str, Any]]], player_to_move: int) -> GameState:
    """Creates a GameState object from the server's JSON board format."""
    gs = GameState()
    gs.white_to_move = (player_to_move == 1) # 1 for White, 0 for Black
    w, b, k = 0, 0, 0

    # Basic validation of input structure
    if not isinstance(board_data, list) or len(board_data) != 2:
        print("[Engine Error] Invalid board data format: Expected list of 2 lists.", file=sys.stderr)
        # Return default empty state or raise error? Returning empty for now.
        gs.hash = gs.compute_hash()
        return gs

    black_pieces_json = board_data[0] # Index 0 is Black
    white_pieces_json = board_data[1] # Index 1 is White

    if not isinstance(black_pieces_json, list) or not isinstance(white_pieces_json, list):
         print("[Engine Error] Board data sub-elements are not lists.", file=sys.stderr)
         gs.hash = gs.compute_hash()
         return gs

    try:
        # Process Black pieces
        for piece in black_pieces_json:
            if isinstance(piece, dict):
                x, y = int(piece['x']), int(piece['y'])
                is_k = bool(piece.get('king', False)) # Use .get for safety
                idx = index_from_rc(y, x)
                if idx != -1:
                    b |= (1 << idx)
                    if is_k: k |= (1 << idx)
            else:
                 print(f"[Engine Warning] Skipping invalid piece data in black list: {piece}", file=sys.stderr)

        # Process White pieces
        for piece in white_pieces_json:
             if isinstance(piece, dict):
                x, y = int(piece['x']), int(piece['y'])
                is_k = bool(piece.get('king', False))
                idx = index_from_rc(y, x)
                if idx != -1:
                    w |= (1 << idx)
                    if is_k: k |= (1 << idx)
             else:
                 print(f"[Engine Warning] Skipping invalid piece data in white list: {piece}", file=sys.stderr)

    except (KeyError, ValueError, TypeError) as e:
        print(f"[Engine Warning] Failed to parse piece data: {e}. Board state may be incomplete.", file=sys.stderr)
        # Continue with potentially partial board

    gs.white, gs.black, gs.kings = w, b, k
    gs.hash = gs.compute_hash() # Compute hash based on parsed state
    return gs


def format_move_for_output(move: Move, state_after_move: GameState) -> Dict[str, Any]:
    """Formats the internal Move object into the dictionary required by main.py."""
    to_sq = move.to_sq
    # Determine king status *after* the move (accounts for promotion)
    is_king_after = bool(state_after_move.kings & (1 << to_sq))

    try:
        start_pos_str = BOARD_MAPPING[move.from_sq]
        end_pos = POSITIONS_INDEXES[to_sq]
    except KeyError as e:
        print(f"[Engine Error] Invalid square index in move formatting: {e}", file=sys.stderr)
        # Return a default/error dict or raise? Returning indicates error.
        return {"error": "Invalid move data"}

    return {
        "index": start_pos_str, # 'index' seems to refer to the *starting* square's notation
        "x": end_pos.x,         # Target x coordinate
        "y": end_pos.y,         # Target y coordinate
        "king": is_king_after   # King status *after* the move
    }


# --- Main Public Interface ---

SEARCH_DEPTH = 10 # Default search depth, can be adjusted externally if needed

def bestMove(board_json, player_to_move: int) -> Dict[str, Any]:
    try:
        # 1. Create GameState from input JSON
        current_state = create_gamestate_from_json(board_json, player_to_move)

        # 2. Find the best internal Move object
        chosen_move = find_best_move_internal(current_state, SEARCH_DEPTH)

        # Handle case where no move was found (e.g., game already over)
        if chosen_move is None:
            print("[Engine] No best move could be determined (likely no legal moves).", file=sys.stderr)
            # Return an empty dictionary or a specific error format
            return {"error": "No legal moves found"}

        # 3. Apply the move locally to determine the 'king' status after move
        # This is needed for the output format which requires final king status
        state_after = apply_move(current_state, chosen_move)

        # 4. Format the move for the required output dictionary
        output_move = format_move_for_output(chosen_move, state_after)

        return output_move

    except Exception as e:
        print(f"[Engine Critical Error] An unexpected error occurred in bestMove: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        # Return an error indicator if possible
        return {"error": f"Engine critical error: {e}"}

