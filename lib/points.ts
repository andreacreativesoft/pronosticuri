export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): { points: number; type: 'exact' | 'sign' | 'miss' } {
  // Exact score match
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return { points: 3, type: 'exact' };
  }

  // Correct outcome (1, X, or 2)
  const predictedSign = Math.sign(predictedHome - predictedAway);
  const actualSign = Math.sign(actualHome - actualAway);

  if (predictedSign === actualSign) {
    return { points: 1, type: 'sign' };
  }

  return { points: 0, type: 'miss' };
}
