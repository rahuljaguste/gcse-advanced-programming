# ============================================================================
#  PROJECT 2: SCORED GAMING OPPONENTS (Medium — Levels 5-7)
# ============================================================================
#  Pick a random opponent AND read their score!
#  Skills: File reading, random, arrays, string splitting
# ============================================================================

import random

# Each line is "Name Score" — from gamerNamesScores.txt
GAMER_DATA = [
    "ShadowNinja 85", "PixelQueen 92", "TurboFox 67",
    "DragonSlayer99 78", "CosmicWolf 55", "NeonBlitz 99",
    "IcePhoenix 73", "ThunderBolt 88", "CyberPunk42 61",
    "StarDust 95", "MysticRaven 82", "GhostRider 70",
    "LavaKing 90", "QuantumLeap 64", "NightHawk 87",
    "BlazeMaster 76", "FrostByte 93", "TechWizard 58",
    "StormChaser 81", "ZeroGravity 72",
]


def get_player_name():
    """Ask for player name, validate at least 1 character."""
    while True:
        name = input("Enter your gamer name: ").strip()
        if len(name) >= 1:
            return name
        print("Name must be at least 1 character!")


def pick_opponent(data):
    """
    Randomly pick one entry from the data list.
    Split the string into name and score.
    Returns: (name, score) tuple
    """
    # TODO: Pick a random entry from data using random.choice()
    entry = "???"

    # TODO: Split the entry by space to separate name and score
    # Hint: parts = entry.split(" ")
    #        name = parts[0]
    #        score = int(parts[1])

    return ("???", 0)


def main():
    print("=" * 40)
    print("  SCORED GAMING OPPONENTS")
    print("=" * 40)

    player = get_player_name()

    # Pick opponent with their score
    opp_name, opp_score = pick_opponent(GAMER_DATA)

    # Generate your random score
    # TODO: Generate a random score between 1 and 100
    player_score = 0  # <-- FIX THIS

    print(f"\n  {player} (Score: {player_score})")
    print(f"    vs")
    print(f"  {opp_name} (Score: {opp_score})")

    # TODO: Compare scores and print the winner
    # If player_score > opp_score: player wins
    # If opp_score > player_score: opponent wins
    # If equal: draw


if __name__ == "__main__":
    main()
