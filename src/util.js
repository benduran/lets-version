/**
 * Pauses execution for a few moments before resolving
 *
 * @param {number} amount - Amount of milliseconds to sleep before resuming
 *
 * @returns {Promise<void>}
 */
export function sleep(amount) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), amount);
  });
}

/**
 * Given an input array,
 * reduces it to a 2D array
 * where each index is a certain chunk size
 *
 * @param {any[]} arr
 * @param {number} [size=5]
 *
 * @returns {any[][]}
 */
export function chunkArray(arr, size = 5) {
  /** @type {any[][]} */
  const out = [];

  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }

  return out;
}
