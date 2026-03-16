# ============================================================================
#  CHAPTER 7: TEXT ADVENTURE GAME
# ============================================================================
#  A haunted hotel adventure! Navigate rooms, collect items, fight a dragon.
#  Each room is a function. Your health and inventory are GLOBAL variables.
#  This demonstrates SCOPE — local vs global.
#
#  SKILLS: Global/local scope, structured programming, functions
#  FILL IN: Everywhere you see TODO
# ============================================================================

import random

# GLOBAL VARIABLES — these are accessible from any function
player_health = 100
player_inventory = []
player_name = ""


def show_status():
    """Shows current health and inventory."""
    print(f"\n  Health: {player_health}/100")
    print(f"  Inventory: {player_inventory if player_inventory else 'Empty'}")


def entrance():
    """The starting room of the adventure."""
    global player_name
    print("\n" + "=" * 50)
    print("  THE HAUNTED HOTEL")
    print("=" * 50)

    player_name = input("\nBrave adventurer, what is your name? ")
    print(f"\nWelcome, {player_name}. You stand at the entrance of a crumbling hotel.")
    print("A cold wind blows through the broken door.")
    print("You see two corridors:")
    print("  1. A dark corridor to the LEFT (leads to the Dark Cave)")
    print("  2. A dimly lit corridor to the RIGHT (leads to the Treasure Room)")

    while True:
        choice = input("\nWhich way? (1 or 2): ").strip()
        if choice == "1":
            dark_cave()
            break
        elif choice == "2":
            treasure_room()
            break
        else:
            print("Pick 1 or 2!")


def dark_cave():
    """A dark and dangerous room."""
    global player_health  # Need this to MODIFY the global variable

    print("\n--- THE DARK CAVE ---")
    print("It's pitch black. You hear dripping water and... something breathing.")

    # LOCAL variable — only exists in this function
    found_torch = random.choice([True, False])

    if found_torch:
        print("You found a TORCH on the ground! You can see now.")
        # TODO: Add "torch" to player_inventory
        # Hint: player_inventory.append("torch")
        #       You DON'T need 'global' for .append() — you're modifying, not reassigning
        pass
    else:
        print("You stumble in the dark and take 20 damage!")
        # TODO: Reduce player_health by 20
        # Hint: you NEED 'global player_health' (already declared above)
        pass

    show_status()

    # TODO: Check if player_health <= 0
    #   If yes: print "You have perished..." and return
    #   If no: give a choice to go to treasure_room() or dragon_lair()
    print("\nYou see two doors ahead:")
    print("  1. A golden door (Treasure Room)")
    print("  2. A scorched door (Dragon's Lair)")

    while True:
        choice = input("Which door? (1 or 2): ").strip()
        if choice == "1":
            treasure_room()
            break
        elif choice == "2":
            dragon_lair()
            break
        else:
            print("Pick 1 or 2!")


def treasure_room():
    """A room full of treasure... but is it safe?"""
    global player_health

    print("\n--- THE TREASURE ROOM ---")
    print("Gold coins glitter everywhere! A jewelled sword sits on a pedestal.")

    # TODO: Add "sword" to player_inventory
    # Print "You picked up a SWORD!"

    # There's a trap!
    print("\nBut wait — the floor starts to crack beneath you!")
    print("  1. Jump to safety (test your luck)")
    print("  2. Grab more gold and run")

    choice = input("Quick! (1 or 2): ").strip()

    if choice == "1":
        if random.randint(1, 6) >= 3:  # 67% chance
            print("You leap to safety! Close one.")
        else:
            print("You stumble! Take 30 damage!")
            # TODO: Reduce player_health by 30
            pass
    else:
        print("Greedy! The floor collapses! Take 50 damage!")
        # TODO: Reduce player_health by 50
        pass

    show_status()

    if player_health <= 0:
        print(f"\n{player_name} has fallen. Game over.")
        return

    print("\nOnly one door remains: the DRAGON'S LAIR.")
    input("Press Enter to continue...")
    dragon_lair()


def dragon_lair():
    """The final room. Do you have what it takes?"""
    global player_health

    print("\n--- THE DRAGON'S LAIR ---")
    print("A massive dragon blocks the exit. Its eyes glow red.")

    # TODO: Check if "sword" is in player_inventory
    #   If yes: print "You draw your sword!" and the dragon takes damage
    #   If no: print "You have no weapon! This is going to hurt..."
    #           Reduce player_health by 40

    has_sword = "sword" in player_inventory

    if has_sword:
        print("You draw the jewelled SWORD and slash at the dragon!")
        print("The dragon roars and flies away! YOU WIN!")
    else:
        print("With no weapon, the dragon swats you aside!")
        player_health -= 40

    show_status()

    if player_health > 0:
        print(f"\n{'='*40}")
        print(f"  CONGRATULATIONS, {player_name}!")
        print(f"  You escaped the Haunted Hotel!")
        print(f"  Final health: {player_health}/100")
        print(f"  Items collected: {player_inventory}")
        print(f"{'='*40}")
    else:
        print(f"\n{player_name} didn't make it out. Try again!")


# ============================================================================
#  START THE GAME
# ============================================================================
if __name__ == "__main__":
    entrance()
