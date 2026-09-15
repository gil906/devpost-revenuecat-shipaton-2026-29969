import { evaluate } from './coaching';
import { getScenario } from './scenarios';
import type { Confidence, Draft, SavedState, Session, Turn } from './types';

export const STORAGE_KEY = 'steady.practice.v1';
export const MAX_SESSIONS = 100;
export const emptyState = (): SavedState => ({
  version: 1,
  sessions: [],
  draft: null,
});

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid saved record.');
  return value as Record<string, unknown>;
}

function string(value: unknown, max = 1200): string {
  if (typeof value !== 'string' || value.length > max)
    throw new Error('Invalid saved text.');
  return value;
}

function date(value: unknown): string {
  const result = string(value, 40);
  if (
    !/^\d{4}-\d{2}-\d{2}T/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    throw new Error('Invalid saved date.');
  return result;
}

export function confidence(value: unknown): Confidence {
  if (value !== 1 && value !== 2 && value !== 3 && value !== 4 && value !== 5)
    throw new Error('Choose confidence from 1 to 5.');
  return value;
}

function turns(value: unknown, scenarioId: string): Turn[] {
  if (!Array.isArray(value) || value.length > 3)
    throw new Error('Invalid saved conversation.');
  const scenario = getScenario(scenarioId);
  return value.map((item: unknown, index) => {
    const text = string(object(item).text);
    const round = scenario.rounds[index];
    const feedback = evaluate(text, round);
    return { text, feedback, reply: round[feedback.reaction] };
  });
}

export function parseState(raw: string): SavedState {
  if (raw.length > 3_000_000)
    throw new Error('Saved practice data is too large.');
  const data = object(JSON.parse(raw));
  if (data.version !== 1)
    throw new Error(
      'This saved data version is not supported. Export it before resetting.',
    );
  if (!Array.isArray(data.sessions) || data.sessions.length > MAX_SESSIONS)
    throw new Error('Invalid practice history.');
  const sessions: Session[] = data.sessions.map((entry: unknown) => {
    const item = object(entry);
    const scenarioId = string(item.scenarioId, 80);
    const conversation = turns(item.turns, scenarioId);
    if (conversation.length !== 3) throw new Error('Incomplete saved session.');
    const [a, b, c] = conversation;
    const startedAt = date(item.startedAt);
    const completedAt = date(item.completedAt);
    if (Date.parse(completedAt) < Date.parse(startedAt))
      throw new Error('Invalid session time range.');
    const id = string(item.id, 80);
    if (!id) throw new Error('Missing session identifier.');
    return {
      id,
      scenarioId,
      startedAt,
      completedAt,
      before: confidence(item.before),
      after: confidence(item.after),
      turns: [a, b, c],
    };
  });
  if (new Set(sessions.map((item) => item.id)).size !== sessions.length)
    throw new Error('Duplicate saved sessions.');
  let draft: Draft | null = null;
  if (data.draft !== null) {
    const item = object(data.draft);
    const scenarioId = string(item.scenarioId, 80);
    getScenario(scenarioId);
    const conversation = turns(item.turns, scenarioId);
    if (
      typeof item.showingFeedback !== 'boolean' ||
      (item.showingFeedback && conversation.length === 0)
    ) {
      throw new Error('Invalid draft progress.');
    }
    draft = {
      scenarioId,
      startedAt: date(item.startedAt),
      before: confidence(item.before),
      turns: conversation,
      text: string(item.text),
      showingFeedback: item.showingFeedback,
    };
  }
  return { version: 1, sessions, draft };
}

export function loadState(storage: Pick<Storage, 'getItem'>): SavedState {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? emptyState() : parseState(raw);
}

export function saveState(
  storage: Pick<Storage, 'setItem'>,
  state: SavedState,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function completeSession(
  state: SavedState,
  after: Confidence,
  id: string,
  now: string,
): SavedState {
  date(now);
  if (!string(id, 80)) throw new Error('Missing session identifier.');
  const draft = state.draft;
  if (!draft || draft.turns.length !== 3 || draft.showingFeedback)
    throw new Error('Complete all three turns before saving.');
  if (state.sessions.some((item) => item.id === id))
    throw new Error('This session has already been saved.');
  confidence(after);
  if (Date.parse(now) < Date.parse(draft.startedAt))
    throw new Error('Your device clock changed. Check the date before saving.');
  const [a, b, c] = draft.turns;
  const session: Session = {
    id,
    scenarioId: draft.scenarioId,
    startedAt: draft.startedAt,
    completedAt: now,
    before: draft.before,
    after,
    turns: [a, b, c],
  };
  return {
    version: 1,
    sessions: [session, ...state.sessions].slice(0, MAX_SESSIONS),
    draft: null,
  };
}

export function exportJournal(state: SavedState): string {
  return JSON.stringify({ app: 'Steady', ...state }, null, 2);
}
