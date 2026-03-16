# ============================================================================
#  CHAPTER 3: TIC-TAC-TOE (NOUGHTS AND CROSSES)
# ============================================================================
#  The classic game! Two players, one board, 2D arrays in action.
#  Build it, play it with a friend, then add a winner check.
#
#  SKILLS: 2D Arrays, Nested loops, Functions, Input validation
#  FILL IN: Everywhere you see TODO
# ============================================================================

# The board is a 2D array (list of lists) — 3 rows, 3 columns
board = [
    [" ", " ", " "],
    [" ", " ", " "],
    [" ", " ", " "]
]


def print_board():
    """Displays the board nicely."""
    print("\n    0   1   2")
    print("  +---+---+---+")
    for i in range(3):
        print(f"{i} | {board[i][0]} | {board[i][1]} | {board[i][2]} |")
        print("  +---+---+---+")


def make_move(player):
    """
    Asks the current player for their move (row and column).
    Places their symbol if the cell is empty.
    Returns True if move was successful, False if not.
    """
    print(f"\nPlayer {player}'s turn!")
    # TODO: Ask for row number (0-2)
    # TODO: Ask for column number (0-2)
    # TODO: Check if the cell is empty (" ")
    #   If empty: place the player's symbol and return True
    #   If taken: print "That cell is already taken!" and return False
    # Hint: board[row][col] accesses a cell
    pass
    return False


def check_winner():
    """
    STRETCH: Checks if there's a winner.
    Returns "X", "O", or None.
    """
    # TODO (STRETCH): Check all rows for 3 in a row
    # TODO (STRETCH): Check all columns for 3 in a row
    # TODO (STRETCH): Check both diagonals for 3 in a row
    # Hint: if board[0][0] == board[0][1] == board[0][2] != " "
    return None


def check_draw():
    """
    STRETCH: Checks if the board is full (draw).
    Returns True if no empty spaces left, False otherwise.
    """
    # TODO (STRETCH): Loop through every cell
    # If any cell is " ", return False
    # If none are empty, return True
    return False


# ============================================================================
#  MAIN GAME LOOP
# ============================================================================
def main():
    print("=" * 30)
    print("  TIC-TAC-TOE")
    print("  X goes first!")
    print("=" * 30)

    current_player = "X"
    game_over = False

    while not game_over:
        print_board()

        # Keep asking until a valid move is made
        move_made = False
        while not move_made:
            move_made = make_move(current_player)

        # TODO (STRETCH): Check for a winner
        # winner = check_winner()
        # if winner:
        #     print_board()
        #     print(f"\n🎉 Player {winner} WINS! 🎉")
        #     game_over = True

        # TODO (STRETCH): Check for a draw
        # if check_draw():
        #     print_board()
        #     print("\nIt's a DRAW!")
        #     game_over = True

        # Switch player
        if current_player == "X":
            current_player = "O"
        else:
            current_player = "X"

    print("\nThanks for playing!")


if __name__ == "__main__":
    main()
