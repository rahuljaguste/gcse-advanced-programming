# ============================================================================
#  CHAPTER 1: POCKET MONEY CALCULATOR
# ============================================================================
#  Your parents have agreed to pay you for chores. Smart move.
#  Build a program that calculates how much you've earned.
#  Earn over £5? You get a 20% BONUS. Let's go.
#
#  SKILLS: Procedures, Functions, Parameters, Return values
#  FILL IN: Everywhere you see TODO
# ============================================================================

CHORE_PRICES = {
    "dishes":    1.00,
    "hoover":    1.50,
    "laundry":   2.00,
    "cooking":   2.50,
    "gardening": 3.00,
}


def show_menu():
    """PROCEDURE - prints available chores. Returns nothing."""
    print("\n===== CHORE MENU =====")
    # TODO: Loop through CHORE_PRICES and print each chore with its price
    # Example: "  dishes .......... £1.00"
    # Hint: for chore, price in CHORE_PRICES.items():
    pass


def calculate_pay(chores_done):
    """
    FUNCTION - takes a list of chore names, returns the total pay.
    Parameters: chores_done (list) e.g. ["dishes", "hoover"]
    Returns: float (total earned)
    """
    total = 0.0
    # TODO: Loop through chores_done
    #   If the chore exists in CHORE_PRICES, add its value to total
    #   If it doesn't, print a warning like "Hmm, 'xyz' isn't on the list!"

    return total


def add_bonus(total):
    """
    FUNCTION - adds 20% bonus if total > £5.
    Parameters: total (float)
    Returns: float (total after any bonus)
    """
    # TODO: If total > 5.00, add 20% and print "BONUS! Extra £X.XX!"
    #       Otherwise print "Almost there! Earn over £5 for a bonus next time."
    return total


# ============================================================================
#  MAIN PROGRAM
# ============================================================================
def main():
    print("=" * 45)
    print("   POCKET MONEY CALCULATOR")
    print("   Time to get paid!")
    print("=" * 45)

    show_menu()

    print("\nWhich chores did you do? (comma separated)")
    user_input = input("> ")
    chores_done = [c.strip().lower() for c in user_input.split(",")]

    # TODO: Call calculate_pay() with chores_done
    base_pay = 0  # <-- FIX THIS

    print(f"\nBase pay: £{base_pay:.2f}")

    # TODO: Call add_bonus() with base_pay
    final_pay = 0  # <-- FIX THIS

    print(f"\n{'=' * 30}")
    print(f"  TOTAL EARNED: £{final_pay:.2f}")
    print(f"{'=' * 30}")


if __name__ == "__main__":
    main()
