# ============================================================================
#  CHAPTER 6: RACE TO 50 — DICE GAME
# ============================================================================
#  A two-player dice game with REAL strategy.
#  Roll to add points, but roll a 1 and you lose them all!
#  Do you risk another roll, or hold and play safe?
#
#  SKILLS: random module, while loops, decision making
#  FILL IN: Everywhere you see TODO
# ============================================================================

import random

TARGET_SCORE = 50


def roll_dice():
    """Returns a random number between 1 and 6."""
    return random.randint(1, 6)


def play_turn(player_name):
    """
    Plays one turn for a player.
    They can keep rolling (points add up) or hold (keep points).
    But roll a 1 = lose ALL points from this turn!

    Returns: points earned this turn (int)
    """
    turn_total = 0
    print(f"\n{'='*30}")
    print(f"  {player_name}'s TURN")
    print(f"{'='*30}")

    while True:
        choice = input("  [R]oll or [H]old? ").strip().lower()

        if choice == "r":
            roll = roll_dice()
            print(f"  You rolled: {roll}")

            if roll == 1:
                # TODO: Print "Oh no! You rolled a 1! You lose this turn's points!"
                # Then return 0 (they lose everything from this turn)
                return 0  # <-- keep this return, add your print above it

            else:
                # TODO: Add the roll to turn_total
                # Print the running turn total
                # e.g. "Turn total so far: 15"
                turn_total += roll  # <-- this is given; add your print below

        elif choice == "h":
            # TODO: Print how many points they're keeping
            # e.g. "Holding with 15 points!"
            return turn_total  # <-- keep this return, add your print above it

        else:
            print("  Type 'R' to roll or 'H' to hold!")


def show_scores(p1_name, p1_score, p2_name, p2_score):
    """Displays both players' scores."""
    print(f"\n  SCOREBOARD: {p1_name}: {p1_score} | {p2_name}: {p2_score}")
    print(f"  Target: {TARGET_SCORE}")


# ============================================================================
#  MAIN GAME
# ============================================================================
def main():
    print("=" * 40)
    print("  RACE TO 50!")
    print("  Roll big, but don't get greedy...")
    print("=" * 40)

    p1_name = input("\nPlayer 1 name: ").strip() or "Player 1"
    p2_name = input("Player 2 name: ").strip() or "Player 2"

    p1_score = 0
    p2_score = 0

    game_over = False

    while not game_over:
        # Player 1's turn
        show_scores(p1_name, p1_score, p2_name, p2_score)
        points = play_turn(p1_name)
        p1_score += points

        # TODO: Check if player 1 has reached TARGET_SCORE
        #   If yes: print a victory message and set game_over = True
        #   Use: if p1_score >= TARGET_SCORE:
        if p1_score >= TARGET_SCORE:
            print(f"\n  {p1_name} WINS with {p1_score} points!")
            game_over = True
            continue

        # Player 2's turn
        show_scores(p1_name, p1_score, p2_name, p2_score)
        points = play_turn(p2_name)
        p2_score += points

        # TODO: Check if player 2 has reached TARGET_SCORE
        if p2_score >= TARGET_SCORE:
            print(f"\n  {p2_name} WINS with {p2_score} points!")
            game_over = True

    print("\nGreat game! Play again sometime.")


if __name__ == "__main__":
    main()
