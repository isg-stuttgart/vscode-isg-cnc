/**
 * Check the value is numeric
 * Returns true or false.
 *
 * @param {*} n
 * @returns
 */
export function isNumeric(n: number) {
    return !isNaN(n) && isFinite(n);
}

/**
 * Counts the number of digits of a number and return the count.
 *
 * @param {number} nr
 * @returns {number}
 */
export function digitCount(nr: number): number {
    let digitCount = 0;
    do {
        nr /= 10;
        digitCount++;
    } while (nr >= 1 || nr <= -1);
    return digitCount;
}