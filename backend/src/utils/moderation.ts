import OpenAI from 'openai';

const bannedWords = [
  'badword1',
  'badword2',
  'shit',
  'fuck',
];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ModerationResult {
  flagged: boolean;
  reason?: string;
  categories?: Record<string, boolean>;
}

export const moderateText = async (text: string): Promise<ModerationResult> => {
  const lower = text.toLowerCase();
  const found = bannedWords.find((w) => lower.includes(w));
  if (found) {
    return { flagged: true, reason: `Contains banned word: ${found}` };
  }

  if (!process.env.OPENAI_API_KEY) {
    // No API key configured -> skip advanced moderation
    return { flagged: false };
  }

  try {
    const { results } = await openai.moderations.create({
      model: 'text-moderation-latest',
      input: text,
    });
    const result = results[0];
    if (result.flagged) {
      return {
        flagged: true,
        reason: 'OpenAI flagged content',
        categories: result.categories as unknown as Record<string, boolean>,
      };
    }
  } catch (err) {
    console.error('OpenAI moderation error', err);
  }

  return { flagged: false };
};