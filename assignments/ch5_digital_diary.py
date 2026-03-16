# ============================================================================
#  CHAPTER 5: DIGITAL DIARY
# ============================================================================
#  Your very own diary that saves to a file!
#  Write entries, read them back, and search by date.
#  Your secrets are safe... probably.
#
#  SKILLS: File reading, writing, appending, .strip(), .readlines()
#  FILL IN: Everywhere you see TODO
# ============================================================================

from datetime import date

DIARY_FILE = "diary.txt"


def write_entry():
    """Writes a new diary entry with today's date."""
    today = date.today().strftime("%Y-%m-%d")  # e.g. "2026-03-15"

    print(f"\n--- New Entry ({today}) ---")
    entry = input("What happened today?\n> ")

    # TODO: Open DIARY_FILE in APPEND mode ("a")
    #       Write a line in this format: "2026-03-15 | Your entry text here\n"
    #       Close the file
    #       Print "Entry saved!"
    # CAREFUL: Use "a" not "w" — "w" would erase everything!
    pass


def read_all():
    """Reads and displays all diary entries."""
    print("\n--- ALL ENTRIES ---")
    # TODO: Open DIARY_FILE in READ mode ("r")
    #       Read all lines with .readlines()
    #       Loop through and print each line (use .strip() to remove \n)
    #       Close the file
    # HINT: Wrap in try/except FileNotFoundError in case file doesn't exist yet
    #       If file doesn't exist, print "No entries yet. Start writing!"
    pass


def search_by_date():
    """Searches for entries from a specific date."""
    search_date = input("Enter date to search (YYYY-MM-DD): ").strip()

    # TODO: Open and read the diary file
    #       Loop through lines and check if search_date is in the line
    #       Print matching entries
    #       If no matches, print "No entries found for that date."
    # HINT: use "if search_date in line:"
    pass


# ============================================================================
#  MAIN MENU
# ============================================================================
def main():
    print("=" * 40)
    print("  MY DIGITAL DIARY")
    print("  Your thoughts, your words")
    print("=" * 40)

    while True:
        print("\nMenu:")
        print("  1. Write new entry")
        print("  2. Read all entries")
        print("  3. Search by date")
        print("  4. Quit")

        choice = input("> ")

        if choice == "1":
            write_entry()
        elif choice == "2":
            read_all()
        elif choice == "3":
            search_by_date()
        elif choice == "4":
            print("Diary locked. Bye!")
            break
        else:
            print("Pick 1-4!")


if __name__ == "__main__":
    main()
