/**
 * Bloop
 * @param {...string} thing - Thing to print
 */
export function print(...thing) {
  console.info(...thing);
}

print('thing', 'another things');
