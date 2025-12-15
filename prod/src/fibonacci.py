def fibonacci(n):
    """
    Calculate the nth Fibonacci number.

    Args:
        n (int): The position in the Fibonacci sequence (0-indexed)

    Returns:
        int: The nth Fibonacci number

    Raises:
        ValueError: If n is negative
    """
    if n < 0:
        raise ValueError("n must be non-negative")

    if n <= 1:
        return n

    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b

    return b


def fibonacci_sequence(count):
    """
    Generate a sequence of Fibonacci numbers.

    Args:
        count (int): Number of Fibonacci numbers to generate

    Returns:
        list: List of Fibonacci numbers

    Raises:
        ValueError: If count is negative
    """
    if count < 0:
        raise ValueError("count must be non-negative")

    if count == 0:
        return []

    sequence = [0]
    if count > 1:
        sequence.append(1)

    for i in range(2, count):
        sequence.append(sequence[i-1] + sequence[i-2])

    return sequence