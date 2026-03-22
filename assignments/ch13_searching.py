# ============================================================================
#  CHAPTER 13: SEARCHING ALGORITHMS
# ============================================================================
#  Implement linear search and binary search, then compare them!
#
#  SKILLS: Linear search, binary search, counting comparisons
#  FILL IN: Everywhere you see TODO
# ============================================================================

# Test data — a sorted list of 20 numbers
DATA = [3, 7, 12, 15, 19, 22, 25, 31, 38, 42,
        47, 53, 56, 61, 67, 72, 78, 85, 91, 99]


def linear_search(data, target):
    """
    Search for target by checking each item one by one.
    Returns: (index, comparisons) — index is -1 if not found.
    """
    comparisons = 0
    # TODO: Loop through the list
    #   For each item, increment comparisons
    #   If the item matches target, return (index, comparisons)
    # After the loop, return (-1, comparisons) — not found

    return (-1, comparisons)


def binary_search(data, target):
    """
    Search for target by halving the search area each time.
    Data MUST be sorted!
    Returns: (index, comparisons) — index is -1 if not found.
    """
    low = 0
    high = len(data) - 1
    comparisons = 0

    # TODO: While low <= high:
    #   Find the middle index: mid = (low + high) // 2
    #   Increment comparisons
    #   If data[mid] == target: return (mid, comparisons)
    #   If data[mid] < target: search right half (low = mid + 1)
    #   If data[mid] > target: search left half (high = mid - 1)
    # Return (-1, comparisons) if not found

    return (-1, comparisons)


def main():
    print("=" * 50)
    print("  SEARCHING ALGORITHM COMPARISON")
    print("=" * 50)
    print(f"\nData ({len(DATA)} items): {DATA}")

    target = int(input("\nEnter a number to search for: "))

    # Linear search
    idx, lin_comp = linear_search(DATA, target)
    if idx != -1:
        print(f"\nLinear search: Found {target} at index {idx}")
    else:
        print(f"\nLinear search: {target} not found")
    print(f"  Comparisons: {lin_comp}")

    # Binary search
    idx, bin_comp = binary_search(DATA, target)
    if idx != -1:
        print(f"\nBinary search: Found {target} at index {idx}")
    else:
        print(f"\nBinary search: {target} not found")
    print(f"  Comparisons: {bin_comp}")

    # Compare
    if lin_comp > 0 and bin_comp > 0:
        print(f"\n  Binary search was {lin_comp - bin_comp} comparisons faster!")


if __name__ == "__main__":
    main()
