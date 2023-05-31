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
