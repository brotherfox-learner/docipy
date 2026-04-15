/** Matches dashboard: level 1 = 0–99 XP, level 2 = 100–199, … */
export const XP_PER_LEVEL = 100;

export function getLevelFromTotalXp(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / XP_PER_LEVEL) + 1;
}

export function getXpProgressInCurrentLevel(totalXp: number): {
  xpIntoLevel: number;
  xpToNextLevel: number;
  percentInLevel: number;
} {
  const xp = Math.max(0, totalXp);
  const xpIntoLevel = xp % XP_PER_LEVEL;
  const xpToNextLevel = XP_PER_LEVEL - xpIntoLevel;
  return {
    xpIntoLevel,
    xpToNextLevel,
    percentInLevel: (xpIntoLevel / XP_PER_LEVEL) * 100,
  };
}
