# ============================================================================
#  PROJECT 3: GAMING TEAMS (Medium-Hard — Levels 7-9)
# ============================================================================
#  Split players into two random teams and see who wins!
#  Skills: File reading, random, arrays, string splitting, sorting
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


def parse_player(entry):
    """Split 'Name Score' into (name, score) tuple."""
    parts = entry.split(" ")
    return (parts[0], int(parts[1]))


def get_team_size():
    """Ask how many players per team (1-10). Validate input."""
    while True:
        size_str = input("How many players per team? (1-10): ").strip()
        # TODO: Validate that input is a digit and between 1-10
        # Hint: use .isdigit() and range check
        if size_str.isdigit():
            size = int(size_str)
            if 1 <= size <= 10:
                return size
        print("Must be a number between 1 and 10!")


def pick_teams(data, size):
    """
    Randomly split players into two teams of the given size.
    No player should appear on both teams!
    Returns: (team1, team2) — each is a list of (name, score) tuples
    """
    # TODO: Use random.sample() to pick (size * 2) unique players from data
    # Hint: selected = random.sample(data, size * 2)

    # TODO: Split selected into two halves — first half = team1, second = team2

    # TODO: Parse each entry into (name, score) using parse_player()

    team1 = []
    team2 = []
    return (team1, team2)


def display_team(name, team):
    """Print a team's players and scores."""
    print(f"\n  {name}:")
    total = 0
    for player_name, score in team:
        print(f"    {player_name:<20} {score}")
        total += score
    print(f"    {'TOTAL':<20} {total}")
    return total


def main():
    print("=" * 40)
    print("  GAMING TEAMS")
    print("  Random teams, random glory!")
    print("=" * 40)

    size = get_team_size()
    team1, team2 = pick_teams(GAMER_DATA, size)

    score1 = display_team("TEAM ALPHA", team1)
    score2 = display_team("TEAM BRAVO", team2)

    # TODO: Compare total scores and declare the winning team
    print(f"\n  {'=' * 30}")
    if score1 > score2:
        print(f"  TEAM ALPHA WINS! ({score1} vs {score2})")
    elif score2 > score1:
        print(f"  TEAM BRAVO WINS! ({score2} vs {score1})")
    else:
        print(f"  IT'S A DRAW! ({score1} each)")

    # EXTENSION: Add yourself to a team with a random score
    # EXTENSION: Allow user to add new names to the data


if __name__ == "__main__":
    main()
