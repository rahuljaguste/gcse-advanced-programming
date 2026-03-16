# ============================================================================
#  PROJECT 1: GAMING OPPONENTS (Easy — Levels 4-5)
# ============================================================================
#  Pick a random opponent from a list of gamer names!
#  Skills: File reading, random numbers, arrays
# ============================================================================

import random

# The gamer names are stored in this list (from gamerNames.txt)
GAMER_NAMES = [
    "ShadowNinja", "PixelQueen", "TurboFox", "DragonSlayer99",
    "CosmicWolf", "NeonBlitz", "IcePhoenix", "ThunderBolt",
    "CyberPunk42", "StarDust", "MysticRaven", "GhostRider",
    "LavaKing", "QuantumLeap", "NightHawk", "BlazeMaster",
    "FrostByte", "TechWizard", "StormChaser", "ZeroGravity",
]


def get_player_name():
    """Ask the user for their name. Validate: at least 1 character."""
    # TODO: Use a while loop to keep asking until they enter at least 1 character
    # Hint: while len(name) < 1:
    name = input("Enter your gamer name: ")
    return name


def pick_opponent(names):
    """Randomly pick one opponent from the list."""
    # TODO: Use random.choice() or random.randint() to pick a name
    # Return the chosen name
    return "???"


def main():
    print("=" * 40)
    print("  GAMING OPPONENTS")
    print("  Who will you face?")
    print("=" * 40)

    # Step 1: Get the player's name
    player = get_player_name()

    # Step 2: Pick a random opponent
    opponent = pick_opponent(GAMER_NAMES)

    # Step 3: Announce the match
    print(f"\n  {player} vs {opponent}!")
    print("  FIGHT!")

    # EXTENSION: Generate random scores and declare a winner
    # TODO: Generate a random score for the player (1-100)
    # TODO: Generate a random score for the opponent (1-100)
    # TODO: Compare and print the winner
    # Example: "ShadowNinja wins 87 to 42!"


if __name__ == "__main__":
    main()
