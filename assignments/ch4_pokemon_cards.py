# ============================================================================
#  CHAPTER 4: POKEMON CARD COLLECTION
# ============================================================================
#  Build a digital card collection! View, search, compare, and battle cards.
#  Swap "Pokemon" for football players or F1 drivers if you prefer.
#
#  SKILLS: Records (dictionaries), Arrays of records, Searching
#  FILL IN: Everywhere you see TODO
# ============================================================================

# Each card is a RECORD (dictionary) with multiple fields
# An ARRAY of RECORDS = a collection!
collection = [
    {"name": "Charizard",  "type": "Fire",     "hp": 120, "attack": 85, "rarity": "Rare"},
    {"name": "Pikachu",    "type": "Electric", "hp": 60,  "attack": 55, "rarity": "Common"},
    {"name": "Gyarados",   "type": "Water",    "hp": 130, "attack": 90, "rarity": "Rare"},
    {"name": "Bulbasaur",  "type": "Grass",    "hp": 70,  "attack": 50, "rarity": "Common"},
    {"name": "Mewtwo",     "type": "Psychic",  "hp": 150, "attack": 110,"rarity": "Legendary"},
]


def view_all():
    """Shows every card in the collection."""
    print("\n===== YOUR COLLECTION =====")
    print(f"{'Name':<12} {'Type':<10} {'HP':<6} {'ATK':<6} {'Rarity'}")
    print("-" * 48)
    # TODO: Loop through collection and print each card's details
    # Hint: for card in collection:
    #           print(f"{card['name']:<12} ...")
    pass


def search_card():
    """Searches for a card by name."""
    name = input("Enter card name to search: ").strip()
    # TODO: Loop through collection
    #   If a card's name matches (case-insensitive), print its details
    #   If not found, print "Card not found!"
    # Hint: use .lower() for case-insensitive comparison
    pass


def strongest_card():
    """Finds the card with the highest HP."""
    # TODO: Loop through collection to find the card with the max HP
    # Print: "[name] is the strongest with [hp] HP!"
    # Hint: similar to finding max in an array, but compare card["hp"]
    pass


def battle():
    """Battle two cards! Highest attack wins."""
    print("\nChoose two cards to battle!")
    name1 = input("Card 1 name: ").strip()
    name2 = input("Card 2 name: ").strip()

    # TODO: Find both cards in the collection
    #   Compare their attack values
    #   Print the winner!
    #   If a card isn't found, print an error
    # Example: "Mewtwo (ATK: 110) vs Charizard (ATK: 85) — Mewtwo wins!"
    pass


def add_card():
    """STRETCH: Let the user add a new card."""
    print("\n--- ADD NEW CARD ---")
    # TODO: Ask for name, type, hp, attack, rarity
    # Create a new dictionary with those values
    # Append it to the collection
    # Print confirmation
    pass


# ============================================================================
#  MAIN MENU
# ============================================================================
def main():
    print("=" * 40)
    print("  POKEMON CARD COLLECTION")
    print("  Gotta catch 'em all!")
    print("=" * 40)

    while True:
        print("\nMenu:")
        print("  1. View all cards")
        print("  2. Search by name")
        print("  3. Find strongest (highest HP)")
        print("  4. Battle!")
        print("  5. Add new card")
        print("  6. Quit")

        choice = input("> ")

        if choice == "1":
            view_all()
        elif choice == "2":
            search_card()
        elif choice == "3":
            strongest_card()
        elif choice == "4":
            battle()
        elif choice == "5":
            add_card()
        elif choice == "6":
            print("See ya, trainer!")
            break
        else:
            print("Pick 1-6!")


if __name__ == "__main__":
    main()
