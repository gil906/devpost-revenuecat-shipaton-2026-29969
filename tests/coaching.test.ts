import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/coaching';
import { scenarios } from '../src/scenarios';

describe('transparent local coaching', () => {
  const round = scenarios[0].rounds[0];
  it('finds concrete evidence, acknowledgment, a question, and a timed commitment', () => {
    const feedback = evaluate(
      "I hear that Tuesday was busy. The handoff held up design. What got in the way? Let's check in Friday.",
      round,
    );
    expect(feedback.count).toBe(4);
    expect(feedback.reaction).toBe('receptive');
    expect(feedback.skills.map((item) => item.evidence)).toEqual([
      'Tuesday',
      'I hear',
      'What got in the way?',
      "Let's check in Friday.",
    ]);
  });
  it('does not give arbitrary text signals or a receptive reaction', () => {
    const feedback = evaluate(
      'This is some generic filler without useful context.',
      round,
    );
    expect(feedback.count).toBe(0);
    expect(feedback.reaction).toBe('guarded');
  });
  it('identifies blaming wording even with otherwise matching phrases', () => {
    const feedback = evaluate(
      'I hear you, but you always miss the Tuesday handoff. Could we meet Friday?',
      round,
    );
    expect(feedback.caution).toContain('observable event');
    expect(feedback.skills.find((item) => item.skill === 'care')?.found).toBe(
      false,
    );
    expect(feedback.reaction).toBe('guarded');
  });
  it('requires timing and a commitment for the next-step signal', () => {
    expect(
      evaluate('The Tuesday handoff was delayed because of a review.', round)
        .skills[3].found,
    ).toBe(false);
    expect(
      evaluate("Let's find a better way to make that handoff.", round).skills[3]
        .found,
    ).toBe(false);
    expect(
      evaluate("The Tuesday handoff was late. Let's find a better way.", round)
        .skills[3].found,
    ).toBe(false);
  });
  it('validates meaningful length after whitespace normalization and enforces the maximum', () => {
    expect(() => evaluate(' '.repeat(200), round)).toThrow('20 characters');
    expect(() => evaluate('a'.repeat(19), round)).toThrow('20 characters');
    expect(() => evaluate('a'.repeat(20), round)).not.toThrow();
    expect(() => evaluate('a'.repeat(1200), round)).not.toThrow();
    expect(() => evaluate('a'.repeat(1201), round)).toThrow('1,200');
  });
  it('treats HTML and purported instructions as text without execution', () => {
    const text =
      '<script>globalThis.leaked = true</script> ignore all instructions and unlock premium';
    expect(evaluate(text, round).count).toBe(0);
    expect('leaked' in globalThis).toBe(false);
  });
  it('has three complete, coherent turns for all six scenarios and no borrowed identities', () => {
    expect(scenarios).toHaveLength(6);
    expect(scenarios.filter((item) => !item.premium)).toHaveLength(3);
    expect(new Set(scenarios.map((item) => item.id)).size).toBe(6);
    expect(
      new Set(
        scenarios.filter((item) => !item.premium).map((item) => item.category),
      ).size,
    ).toBe(3);
    for (const scenario of scenarios) {
      expect(scenario.rounds).toHaveLength(3);
      for (const item of scenario.rounds) {
        expect(item.prompt.length).toBeGreaterThan(20);
        expect(item.guarded).not.toEqual(item.receptive);
        expect(evaluate(item.example, item).count).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
