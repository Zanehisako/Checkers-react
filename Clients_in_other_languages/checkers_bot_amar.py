import time
from typing import Dict, Any, Optional

from checkers_bot import (
    GameState, Move, MoveType,
    apply_move, generate_moves, generate_capture_moves, is_capture_possible, # Added for quiescence
    create_gamestate_from_json, format_move_for_output,
    TranspositionTable, INF,
    count_set_bits, SQUARE_COORDS, countr_zero,
    CENTER_SQUARES # For new evaluation term
)


AMAR_SEARCH_DEPTH = 11
AMAR_QUIESCENCE_DEPTH = 2 # How deep to search for captures beyond main depth
nodes_visited_amar = 0
AMAR_TRANSPOSITION_TABLE = TranspositionTable(size_power_of_2=18)

# Evaluation for Amar Bot
def evaluate_position_amar(current_state: GameState) -> int:
    if current_state.white == 0: return -INF
    if current_state.black == 0: return INF

    white_men = count_set_bits(current_state.white & ~current_state.kings)
    black_men = count_set_bits(current_state.black & ~current_state.kings)
    white_kings = count_set_bits(current_state.white & current_state.kings)
    black_kings = count_set_bits(current_state.black & current_state.kings)

    material_score = (white_men * 100 + white_kings * 250) - \
                     (black_men * 100 + black_kings * 250)

    king_advancement_score = 0
    white_king_pieces = current_state.white & current_state.kings
    while white_king_pieces:
        king_square = countr_zero(white_king_pieces)
        white_king_pieces &= white_king_pieces - 1
        row, _ = SQUARE_COORDS[king_square]
        king_advancement_score += row * 10

    black_king_pieces = current_state.black & current_state.kings
    while black_king_pieces:
        king_square = countr_zero(black_king_pieces)
        black_king_pieces &= black_king_pieces - 1
        row, _ = SQUARE_COORDS[king_square]
        king_advancement_score -= (7 - row) * 10
    
    
    center_control_bonus_white = count_set_bits(current_state.white & CENTER_SQUARES)
    center_control_bonus_black = count_set_bits(current_state.black & CENTER_SQUARES)
    center_score = (center_control_bonus_white - center_control_bonus_black) * 15 # Small bonus

    return material_score + king_advancement_score + center_score
# only search for captures 
def search_quiescence_amar(current_state: GameState, depth: int, alpha: int, beta: int) -> int:
    global nodes_visited_amar
    nodes_visited_amar += 1

    # Stand pat score (evaluation if no captures are made)
    stand_pat_score = evaluate_position_amar(current_state)

    if depth <= 0:
        return stand_pat_score

    # If it's white to move, we want to maximize. If current eval is already >= beta, it might be a cutoff.
    if current_state.white_to_move:
        if stand_pat_score >= beta:
            return beta # Fail-high
        alpha = max(alpha, stand_pat_score)
    else: # Black to move, minimize
        if stand_pat_score <= alpha:
            return alpha # Fail-low
        beta = min(beta, stand_pat_score)

    # Generate only capture moves
    capture_moves = generate_moves(current_state) # generate_moves handles "must_capture"
    # Filter for actual captures if generate_moves could return non-captures when captures are not forced
    # (though our generate_moves should only give captures if they exist)
    # capture_moves_list = [m for m in capture_moves if m.type.is_capture()]
    # If no captures, return stand_pat_score (already handled by alpha/beta update above)
    if not capture_moves or not any(m.type.is_capture() for m in capture_moves):
         return stand_pat_score
    
    # If only non-captures returned (shouldn't happen if captures were possible), also stand pat.
    # This check is redundant if generate_moves correctly prioritizes captures.
    # if not any(m.type.is_capture() for m in capture_moves):
    #    return stand_pat_score

    for move_option in capture_moves:
        if not move_option.type.is_capture(): # Defensive: ensure only captures are processed in q-search
            continue

        next_state = apply_move(current_state, move_option)
        score = search_quiescence_amar(next_state, depth - 1, alpha, beta)

        if current_state.white_to_move:
            alpha = max(alpha, score)
            if beta <= alpha:
                return beta # Beta cutoff
        else:
            beta = min(beta, score)
            if beta <= alpha:
                return alpha # Alpha cutoff
    
    return alpha if current_state.white_to_move else beta


def search_minimax_amar(current_state: GameState, depth: int, alpha: int, beta: int) -> int:
    global nodes_visited_amar
    nodes_visited_amar += 1

    if depth <= 0:
        return search_quiescence_amar(current_state, AMAR_QUIESCENCE_DEPTH, alpha, beta)

    original_alpha = alpha
    
    transposition_entry = AMAR_TRANSPOSITION_TABLE.lookup(current_state.hash, depth)
    if transposition_entry:
        if transposition_entry.flag == TranspositionTable.EXACT:
            return transposition_entry.eval
        elif transposition_entry.flag == TranspositionTable.LOWER:
            alpha = max(alpha, transposition_entry.eval)
        elif transposition_entry.flag == TranspositionTable.UPPER:
            beta = min(beta, transposition_entry.eval)
        if alpha >= beta:
            return transposition_entry.eval

    possible_moves = generate_moves(current_state)
    if not possible_moves:
        return -INF if current_state.white_to_move else INF

    best_score_for_move = -INF if current_state.white_to_move else INF
    
    
    sorted_moves = sorted(possible_moves, key=lambda m: m.type.is_capture(), reverse=True)

    for move_option in sorted_moves:
        next_state = apply_move(current_state, move_option)
        score = search_minimax_amar(next_state, depth - 1, alpha, beta)

        if current_state.white_to_move:
            best_score_for_move = max(best_score_for_move, score)
            alpha = max(alpha, best_score_for_move)
            if beta <= alpha: break 
        else:
            best_score_for_move = min(best_score_for_move, score)
            beta = min(beta, best_score_for_move)
            if beta <= alpha: break
    
    transposition_flag = TranspositionTable.EXACT
    if best_score_for_move <= original_alpha:
        transposition_flag = TranspositionTable.UPPER
    elif best_score_for_move >= beta:
        transposition_flag = TranspositionTable.LOWER
    AMAR_TRANSPOSITION_TABLE.store(current_state.hash, depth, best_score_for_move, transposition_flag)

    return best_score_for_move

def find_best_amar_move_internal(current_state: GameState, search_depth: int) -> Optional[Move]:
    global nodes_visited_amar
    nodes_visited_amar = 0 
    
    start_processing_time = time.perf_counter()

    available_moves = generate_moves(current_state)
    if not available_moves:
        return None

    best_found_move: Optional[Move] = None
    alpha_bound, beta_bound = -INF, INF
    current_best_value = -INF if current_state.white_to_move else INF

    ordered_moves = sorted(available_moves, key=lambda m: m.type.is_capture(), reverse=True)

    for current_move_candidate in ordered_moves:
        state_after_move = apply_move(current_state, current_move_candidate)
        
        evaluated_move_value = search_minimax_amar(state_after_move, search_depth - 1, alpha_bound, beta_bound)

        if current_state.white_to_move:
            if evaluated_move_value > current_best_value:
                current_best_value = evaluated_move_value
                best_found_move = current_move_candidate
            alpha_bound = max(alpha_bound, current_best_value)
        else: 
            if evaluated_move_value < current_best_value:
                current_best_value = evaluated_move_value
                best_found_move = current_move_candidate
            beta_bound = min(beta_bound, current_best_value) 
            
    end_processing_time = time.perf_counter()
    return best_found_move


def bestMove(board_data_json: list, player_id_to_move: int) -> Dict[str, Any]:
    game_state_from_json = create_gamestate_from_json(board_data_json, player_id_to_move)
    game_state_from_json.hash = game_state_from_json.compute_hash()

    optimal_move = find_best_amar_move_internal(game_state_from_json, AMAR_SEARCH_DEPTH)

    if optimal_move is None:
        
        return {"error": "Bot: No legal moves found"}

    final_state_after_move = apply_move(game_state_from_json, optimal_move)
    output_formatted_move = format_move_for_output(optimal_move, final_state_after_move)
    
    return output_formatted_move
