import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/coaching';
import { scenarios } from '../src/scenarios';
import {
  completeSession,
  confidence,
  emptyState,
  exportJournal,
  loadState,
  MAX_SESSIONS,
  parseState,
  saveState,
} from '../src/storage';
import type { SavedState } from '../src/types';

const scenario = scenarios[0];
function finishedDraft(): SavedState {
  return {
    ...emptyState(),
    draft: {
      scenarioId: scenario.id,
      startedAt: '2026-09-15T10:00:00.000Z',
      before: 2,
      turns: scenario.rounds.map((round) => {
        const feedback = evaluate(round.example, round);
        return {
          text: round.example,
          feedback,
          reply: round[feedback.reaction],
        };
      }),
      text: '',
      showingFeedback: false,
    },
  };
}

describe('local journal and recovery', () => {
  it('starts empty only when there is no saved data', () => {
    expect(loadState({ getItem: () => null })).toEqual(emptyState());
    expect(() => loadState({ getItem: () => '{broken' })).toThrow();
  });
  it('saves, reloads, exports and preserves all three turns and readiness', () => {
    let raw = '';
    const state = completeSession(
      finishedDraft(),
      4,
      'session-one',
      '2026-09-15T10:05:00.000Z',
    );
    saveState(
      {
        setItem: (_key, value) => {
          raw = value;
        },
      },
      state,
    );
    expect(loadState({ getItem: () => raw })).toEqual(state);
    const exported = JSON.parse(exportJournal(state));
    expect(exported.app).toBe('Steady');
    expect(exported.sessions[0].before).toBe(2);
    expect(exported.sessions[0].after).toBe(4);
    expect(exported.sessions[0].turns).toHaveLength(3);
    expect(exported.draft).toBeNull();
  });
  it('retains an unfinished response and feedback step across reloads', () => {
    const state = finishedDraft();
    state.draft!.turns = state.draft!.turns.slice(0, 1);
    state.draft!.showingFeedback = true;
    expect(parseState(JSON.stringify(state))).toEqual(state);
    state.draft!.showingFeedback = false;
    state.draft!.text = 'A response I have not finished writing';
    expect(parseState(JSON.stringify(state)).draft?.text).toBe(
      state.draft!.text,
    );
  });
  it('recomputes feedback rather than trusting stored scores or scripted replies', () => {
    const raw = JSON.parse(JSON.stringify(finishedDraft()));
    raw.draft.turns[0].feedback.count = 999;
    raw.draft.turns[0].reply = 'Tampered response';
    raw.premium = true;
    const parsed = parseState(JSON.stringify(raw));
    expect(parsed.draft?.turns[0].feedback.count).toBeLessThanOrEqual(4);
    expect(parsed.draft?.turns[0].reply).not.toBe('Tampered response');
    expect(parsed).not.toHaveProperty('premium');
  });
  it.each([
    '{"version":2,"sessions":[],"draft":null}',
    '{"version":1,"sessions":{},"draft":null}',
    '{"version":1,"sessions":[],"draft":{}}',
    '{"version":1,"sessions":[]}',
    'null',
  ])(
    'rejects corrupted or unknown state without a success-shaped default: %s',
    (raw) => {
      expect(() => parseState(raw)).toThrow();
    },
  );
  it('rejects impossible draft progress and unknown scenarios', () => {
    const state = finishedDraft();
    state.draft!.scenarioId = 'missing';
    expect(() => parseState(JSON.stringify(state))).toThrow();
    state.draft!.scenarioId = scenario.id;
    state.draft!.turns = [];
    state.draft!.showingFeedback = true;
    expect(() => parseState(JSON.stringify(state))).toThrow();
  });
  it('surfaces quota and unavailable storage errors', () => {
    expect(() =>
      saveState(
        {
          setItem: () => {
            throw new Error('Quota exceeded');
          },
        },
        emptyState(),
      ),
    ).toThrow('Quota');
    expect(() =>
      loadState({
        getItem: () => {
          throw new Error('Permission denied');
        },
      }),
    ).toThrow('Permission');
  });
  it('requires three reviewed turns, valid readiness, and a forward clock', () => {
    expect(() =>
      completeSession(emptyState(), 3, 'one', '2026-09-15T10:05:00.000Z'),
    ).toThrow();
    const state = finishedDraft();
    state.draft!.showingFeedback = true;
    expect(() =>
      completeSession(state, 3, 'one', '2026-09-15T10:05:00.000Z'),
    ).toThrow();
    state.draft!.showingFeedback = false;
    expect(() =>
      completeSession(state, 3, 'one', '2026-09-14T10:05:00.000Z'),
    ).toThrow('clock');
    for (const value of [0, 6, 2.5, '3', null])
      expect(() => confidence(value)).toThrow();
  });
  it('bounds retention to the latest 100 without duplicate session IDs', () => {
    let state = finishedDraft();
    for (let index = 0; index < MAX_SESSIONS + 4; index++) {
      state = completeSession(
        { ...state, draft: finishedDraft().draft },
        3,
        `session-${index}`,
        '2026-09-15T10:05:00.000Z',
      );
    }
    expect(state.sessions).toHaveLength(MAX_SESSIONS);
    expect(state.sessions[0].id).toBe('session-103');
    expect(state.sessions.at(-1)?.id).toBe('session-4');
    expect(() =>
      completeSession(
        { ...state, draft: finishedDraft().draft },
        3,
        'session-103',
        '2026-09-15T10:05:00.000Z',
      ),
    ).toThrow('already');
    expect(parseState(JSON.stringify(state)).sessions).toHaveLength(
      MAX_SESSIONS,
    );
  });
});
