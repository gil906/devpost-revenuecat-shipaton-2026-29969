import type { Feedback, Round, Skill } from './types';

export const skillLabels: Record<Skill, string> = {
  specific: 'Be specific',
  care: 'Show care',
  curiosity: 'Stay curious',
  next: 'Make a plan',
};

const care =
  /\b(?:I (?:hear|understand|know|appreciate|value)|thanks? (?:for|you)|that sounds|it makes sense)\b/i;
const curiosity = /\b(?:what|how|which|would|could|does|can we)\b[^.!?]*\?/i;
const action =
  /\b(?:let['’]s|I['’]ll|I will|could we|can we|please|we['’]ll|we will)\b/i;
const timing =
  /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|tomorrow|today|noon|next workday|next week|by \d{1,2}|at \d{1,2}|afterward)\b/i;
const blame =
  /\b(?:you always|you never|lazy|incompetent|stupid|obviously your fault|not my problem)\b/i;

function snippet(text: string, regex: RegExp): string | null {
  return text.match(regex)?.[0] ?? null;
}

export function evaluate(text: string, round: Round): Feedback {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length < 20)
    throw new Error('Try a full sentence of at least 20 characters.');
  if (text.length > 1200)
    throw new Error('Keep your response to 1,200 characters or fewer.');
  const specific =
    round.keywords.find((word) =>
      new RegExp(
        `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'i',
      ).test(normalized),
    ) ?? null;
  const caution = blame.test(normalized)
    ? 'A label or absolute can make the conversation harder. Replace it with an observable event. This is a wording signal, not a judgment of your intent.'
    : null;
  const plan =
    normalized
      .match(/[^.!?]+[.!?]?/g)
      ?.find((sentence) => action.test(sentence) && timing.test(sentence))
      ?.trim() ?? null;
  const skills = [
    {
      skill: 'specific' as const,
      evidence: specific,
      advice:
        'Name an observable event or concrete detail from this situation, then explain its impact.',
    },
    {
      skill: 'care' as const,
      evidence: caution ? null : snippet(normalized, care),
      advice:
        'Acknowledge their perspective in your own words, without assuming how they feel.',
    },
    {
      skill: 'curiosity' as const,
      evidence: snippet(normalized, curiosity),
      advice:
        'Ask an open question or invite agreement. Leave room for an answer you did not expect.',
    },
    {
      skill: 'next' as const,
      evidence: plan,
      advice:
        'When it is time to close, agree on a small action and when you will check back.',
    },
  ].map((item) => ({ ...item, found: item.evidence !== null }));
  const count = skills.filter((item) => item.found).length;
  return {
    skills,
    count,
    caution,
    reaction: count >= 2 && !caution ? 'receptive' : 'guarded',
  };
}
