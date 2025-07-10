const bannedWords = [
  'badword1',
  'badword2',
  'shit',
  'fuck',
];

export interface ModerationResult {
  flagged: boolean;
  reason?: string;
}

export const moderateText = (text: string): ModerationResult => {
  const lower = text.toLowerCase();
  const found = bannedWords.find((w) => lower.includes(w));
  if (found) {
    return { flagged: true, reason: `Contains banned word: ${found}` };
  }
  return { flagged: false };
};