# ============================================================================
#  CHAPTER 8: SECURE LOGIN SYSTEM
# ============================================================================
#  Build a login system for a secret club!
#  Validation checks + authentication + limited attempts = security.
#
#  SKILLS: Validation (presence, range, length), authentication, while loops
#  FILL IN: Everywhere you see TODO
# ============================================================================

# Stored users and passwords (in a real system these would be encrypted!)
users = {
    "vihaan":   "Python123!",
    "admin":    "Sup3rS3cure",
    "guest":    "Welcome99x"
}

MAX_ATTEMPTS = 3


def presence_check(value, field_name):
    """
    Checks if a value is empty.
    Returns True if valid (not empty), False if empty.
    """
    # TODO: Check if value is empty (== "")
    #   If empty: print f"{field_name} cannot be empty!"
    #   Return True if not empty, False if empty
    return True


def length_check(value, min_length, field_name):
    """
    Checks if a value has enough characters.
    Returns True if valid, False if too short.
    """
    # TODO: Check if len(value) < min_length
    #   If too short: print f"{field_name} must be at least {min_length} characters!"
    #   Return True if valid, False if invalid
    return True


def get_valid_username():
    """
    Keeps asking for a username until a valid one is entered.
    Valid = not empty.
    """
    while True:
        username = input("Username: ").strip().lower()
        # TODO: Use presence_check() to validate
        #   If valid: return the username
        #   If invalid: the loop continues (asks again)
        return username


def get_valid_password():
    """
    Keeps asking for a password until a valid one is entered.
    Valid = not empty AND at least 8 characters.
    """
    while True:
        password = input("Password: ").strip()
        # TODO: Use presence_check() AND length_check() to validate
        #   Both must pass for the password to be valid
        #   If valid: return the password
        return password


def authenticate(username, password):
    """
    Checks if the username exists AND the password matches.
    Returns True if authenticated, False otherwise.
    """
    # TODO: Check if username is in the users dictionary
    #   AND if users[username] equals the password
    #   Return True or False
    # Hint: if username in users and users[username] == password:
    return False


def login():
    """Main login flow with limited attempts."""
    print("\n" + "=" * 40)
    print("  SECRET CLUB LOGIN")
    print("  Authorised members only!")
    print("=" * 40)

    attempts = 0

    while attempts < MAX_ATTEMPTS:
        remaining = MAX_ATTEMPTS - attempts
        print(f"\n  Attempts remaining: {remaining}")
        print("-" * 30)

        username = get_valid_username()
        password = get_valid_password()

        if authenticate(username, password):
            print(f"\n  ACCESS GRANTED!")
            print(f"  Welcome to the club, {username}!")
            return True
        else:
            attempts += 1
            print("  ACCESS DENIED. Wrong username or password.")

    # If we get here, they've used all attempts
    print("\n  LOCKED OUT! Too many failed attempts.")
    print("  Come back later.")
    return False


# ============================================================================
#  TEST PLAN — Fill this in after building your solution!
# ============================================================================
# Test | Description          | Test Data                | Expected        | Type
# -----|----------------------|--------------------------|-----------------|----------
#  1   |                      |                          |                 | Normal
#  2   |                      |                          |                 | Normal
#  3   |                      |                          |                 | Boundary
#  4   |                      |                          |                 | Boundary
#  5   |                      |                          |                 | Erroneous
#  6   |                      |                          |                 | Erroneous


# ============================================================================
#  MAIN
# ============================================================================
if __name__ == "__main__":
    success = login()
    if success:
        print("\n  You now have access to the secret club menu!")
        print("  (Build something cool here as a stretch goal!)")
