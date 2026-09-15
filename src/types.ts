export type Category = 'Feedback' | 'Boundaries' | 'Saying no';
export type Skill = 'specific' | 'care' | 'curiosity' | 'next';
export type Confidence = 1 | 2 | 3 | 4 | 5;

export interface Round {
  title: string;
  prompt: string;
  aim: string;
  example: string;
  keywords: string[];
  receptive: string;
  guarded: string;
}

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  category: Category;
  premium: boolean;
  difficulty: 'Foundations' | 'Stretch';
  person: string;
  role: string;
  context: string;
  goal: string;
  rounds: [Round, Round, Round];
}

export interface SkillResult {
  skill: Skill;
  found: boolean;
  evidence: string | null;
  advice: string;
}

export interface Feedback {
  skills: SkillResult[];
  count: number;
  caution: string | null;
  reaction: 'receptive' | 'guarded';
}

export interface Turn {
  text: string;
  feedback: Feedback;
  reply: string;
}

export interface Session {
  id: string;
  scenarioId: string;
  startedAt: string;
  completedAt: string;
  before: Confidence;
  after: Confidence;
  turns: [Turn, Turn, Turn];
}

export interface Draft {
  scenarioId: string;
  startedAt: string;
  before: Confidence;
  turns: Turn[];
  text: string;
  showingFeedback: boolean;
}

export interface SavedState {
  version: 1;
  sessions: Session[];
  draft: Draft | null;
}
