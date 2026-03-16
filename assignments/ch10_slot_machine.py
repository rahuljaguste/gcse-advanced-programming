# ============================================================================
#  CHAPTER 10: SLOT MACHINE — FINAL PROJECT
# ============================================================================
#  The big one! A full slot machine game combining:
#  arrays, random, file handling, functions, validation, loops.
#
#  RULES:
#  - Start with 100 coins, each spin costs 5
#  - 3 spinners, each picks from: Bell, Cherry, Banana, Dollar, Skull
#  - 3 matching fruits = 50 | 2 matching = 10
#  - 3 Bells = 1000 | 2 Bells = 100
#  - 3 Dollars = 500 | 2 Dollars = 50 | 1 Dollar = 1
#  - ANY Skull = cancel ALL winnings for that spin
#  - Save high scores to a file
#
#  SKILLS: Everything from the whole course!
#  FILL IN: Everywhere you see TODO
# ============================================================================

import random

SYMBOLS = ["Bell", "Cherry", "Banana", "Dollar", "Skull"]
SPIN_COST = 5
STARTING_COINS = 100
HIGH_SCORE_FILE = "highscores.txt"


def spin_reels():
    """Spins 3 reels and returns the results as a list."""
    # TODO: Generate 3 random choices from SYMBOLS
    # Return them as a list e.g. ["Bell", "Cherry", "Dollar"]
    # Hint: use random.choice(SYMBOLS) three times, or use a loop
    return ["?", "?", "?"]


def display_spin(results):
    """Displays the spin results nicely."""
    print("\n  +---------+---------+---------+")
    print(f"  | {results[0]:^7} | {results[1]:^7} | {results[2]:^7} |")
    print("  +---------+---------+---------+")


def calculate_winnings(results):
    """
    Calculates winnings based on the spin results.
    Returns the number of coins won (0 if skull appears).
    """
    winnings = 0

    # TODO: First check — does ANY result contain "Skull"?
    #   If yes: print "SKULL! No winnings this round." and return 0

    # TODO: Count how many of each symbol appeared
    # Hint: results.count("Bell"), results.count("Dollar"), etc.

    # TODO: Apply the scoring rules:
    #   3 Bells = 1000
    #   2 Bells = 100
    #   3 Dollars = 500
    #   2 Dollars = 50
    #   1 Dollar = 1
    #   3 of any fruit (Cherry/Banana) = 50
    #   2 of any fruit = 10

    # TODO: Return total winnings
    return winnings


def show_high_scores():
    """Reads and displays high scores from file."""
    print("\n--- HIGH SCORES ---")
    # TODO: Try to open and read HIGH_SCORE_FILE
    #   Print each line
    #   If file doesn't exist, print "No high scores yet!"
    # Hint: use try/except FileNotFoundError
    pass


def save_high_score(name, score):
    """Saves a player's score to the high scores file."""
    # TODO: Open HIGH_SCORE_FILE in append mode
    #   Write the name and score (e.g. "Vihaan 250\n")
    #   Close the file
    #   Print "Score saved!"
    pass


# ============================================================================
#  MAIN GAME LOOP
# ============================================================================
def main():
    print("=" * 45)
    print("  SLOT MACHINE")
    print("  Can you beat the machine?")
    print("=" * 45)

    show_high_scores()

    coins = STARTING_COINS
    print(f"\nYou start with {coins} coins. Each spin costs {SPIN_COST}.")

    while coins >= SPIN_COST:
        print(f"\n  Coins: {coins}")
        action = input("  [S]pin or [C]ash out? ").strip().lower()

        if action == "c":
            print(f"  Smart move! You walk away with {coins} coins.")
            break

        elif action == "s":
            coins -= SPIN_COST
            results = spin_reels()
            display_spin(results)
            winnings = calculate_winnings(results)

            if winnings > 0:
                print(f"  YOU WON {winnings} COINS!")
            else:
                print(f"  No luck this time.")

            coins += winnings

        else:
            print("  Type 'S' to spin or 'C' to cash out!")

    if coins < SPIN_COST:
        print(f"\n  You're out of coins! Final total: {coins}")

    # Save score
    name = input("\nEnter your name for the leaderboard: ").strip()
    if name:
        save_high_score(name, coins)

    print("\nThanks for playing!")


if __name__ == "__main__":
    main()
