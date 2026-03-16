# ============================================================================
#  CHAPTER 2: SPOTIFY PLAYLIST MANAGER
# ============================================================================
#  Build your own playlist manager! Add songs, remove songs, swap them around.
#  It's like Spotify but you built it yourself. Way cooler.
#
#  SKILLS: 1D Arrays, Loops, Index access, len()
#  FILL IN: Everywhere you see TODO
# ============================================================================

# Start with 5 of your favourite songs (change these!)
playlist = [
    "Blinding Lights - The Weeknd",
    "Levitating - Dua Lipa",
    "Shape of You - Ed Sheeran",
    "Bad Guy - Billie Eilish",
    "Bohemian Rhapsody - Queen"
]


def show_playlist():
    """Shows all songs with their position numbers."""
    print("\n🎵 YOUR PLAYLIST 🎵")
    print("-" * 35)
    # TODO: Loop through the playlist and print each song with its position
    # Example output: "  [0] Blinding Lights - The Weeknd"
    # Hint: use range(len(playlist)) or enumerate()
    pass


def add_song():
    """Asks the user for a song and adds it to the end."""
    song = input("Enter song name: ")
    # TODO: Add the song to the end of the playlist
    # Hint: use .append()
    # Print a confirmation message
    pass


def remove_song():
    """Asks the user for a song name and removes it."""
    song = input("Enter the song to remove: ")
    # TODO: Check if the song is in the playlist
    #   If yes: remove it and print confirmation
    #   If no: print "That song isn't in your playlist!"
    # Hint: use "in" to check, and .remove() to delete
    pass


def swap_songs():
    """Swaps two songs by their position numbers."""
    show_playlist()
    print("\nEnter the positions of the two songs to swap:")
    # TODO: Ask for two position numbers (as integers)
    # Check that both positions are valid (0 to len(playlist)-1)
    # Swap the songs at those positions
    # Hint: Python swap trick: playlist[a], playlist[b] = playlist[b], playlist[a]
    pass


def song_count():
    """Shows how many songs are in the playlist."""
    # TODO: Print the number of songs using len()
    pass


# ============================================================================
#  MAIN LOOP
# ============================================================================
def main():
    print("=" * 40)
    print("  🎶 PLAYLIST MANAGER 🎶")
    print("=" * 40)

    while True:
        print("\nWhat would you like to do?")
        print("  1. View playlist")
        print("  2. Add a song")
        print("  3. Remove a song")
        print("  4. Swap two songs")
        print("  5. Song count")
        print("  6. Quit")

        choice = input("\n> ")

        if choice == "1":
            show_playlist()
        elif choice == "2":
            add_song()
        elif choice == "3":
            remove_song()
        elif choice == "4":
            swap_songs()
        elif choice == "5":
            song_count()
        elif choice == "6":
            print("See ya! 🎵")
            break
        else:
            print("Invalid choice. Try 1-6.")


if __name__ == "__main__":
    main()
