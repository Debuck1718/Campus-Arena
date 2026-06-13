export function getRankTitle(elo: number) {
  if (elo >= 2200) return 'Arena Legend';
  if (elo >= 2000) return 'Grand Champion';
  if (elo >= 1800) return 'Elite';
  if (elo >= 1600) return 'Diamond';
  if (elo >= 1400) return 'Gold';
  if (elo >= 1200) return 'Silver';
  return 'Bronze';
}

export function getProgressTitle(points: number) {
  if (points >= 500) return 'Veteran';
  if (points >= 250) return 'Pro Competitor';
  if (points >= 100) return 'Rising Star';
  if (points >= 25) return 'Contender';
  return 'New Recruit';
}

export function getWinRate(wins: number, losses: number) {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}