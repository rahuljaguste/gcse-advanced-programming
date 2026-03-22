# ============================================================================
#  CHAPTER 14: SORTING ALGORITHMS
# ============================================================================
#  Implement bubble sort and see it work step by step!
#
#  SKILLS: Bubble sort, swap counting, early exit optimisation
#  FILL IN: Everywhere you see TODO
# ============================================================================

import random


def bubble_sort(data):
    """
    Sort a list using bubble sort.
    Prints the list after each pass.
    Returns: total number of swaps.
    """
    n = len(data)
    total_swaps = 0

    for pass_num in range(n - 1):
        swapped = False

        # TODO: Loop through the list (index i from 0 to n-1-pass_num)
        #   Compare data[i] with data[i+1]
        #   If data[i] > data[i+1], swap them and set swapped = True
        #   Count each swap in total_swaps
        # Hint for swap: data[i], data[i+1] = data[i+1], data[i]

        print(f"  Pass {pass_num + 1}: {data}")

        # TODO: If no swaps happened this pass, the list is sorted — break early!
        # Hint: if not swapped: break

    return total_swaps


def main():
    print("=" * 50)
    print("  BUBBLE SORT VISUALISER")
    print("=" * 50)

    # Generate a random list
    numbers = random.sample(range(1, 50), 8)
    print(f"\nUnsorted: {numbers}")
    print("\nSorting...\n")

    swaps = bubble_sort(numbers)

    print(f"\nSorted:   {numbers}")
    print(f"Total swaps: {swaps}")

    # STRETCH: Try with different sized lists and compare swap counts
    # STRETCH: Implement merge sort and compare the number of operations


if __name__ == "__main__":
    main()
