import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { Icon } from './Icon';
import { evaluate, skillLabels } from './coaching';
import { getScenario, scenarios } from './scenarios';
import {
  completeSession,
  confidence,
  emptyState,
  exportJournal,
  loadState,
  MAX_SESSIONS,
  saveState,
  STORAGE_KEY,
} from './storage';
import { useBilling } from './useBilling';
import type {
  Category,
  Confidence,
  Draft,
  Feedback,
  SavedState,
  Scenario,
  Session,
} from './types';

type Page = 'practice' | 'journal' | 'scenario' | 'rehearsal' | 'result';
type Modal = 'plus' | 'privacy' | 'export' | 'recovery' | 'erase' | null;
const categories: ('All' | Category)[] = [
  'All',
  'Feedback',
  'Boundaries',
  'Saying no',
];
const confidenceLabels = [
  'Not ready yet',
  'A little unsure',
  'Getting there',
  'Quite ready',
  'Ready to try',
];

function ModalDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby="dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-body">
        <button
          className="icon-button dialog-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <h2 id="dialog-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

function ConfidencePicker({
  value,
  onChange,
  label,
}: {
  value: Confidence;
  onChange: (value: Confidence) => void;
  label: string;
}) {
  return (
    <fieldset className="confidence">
      <legend>{label}</legend>
      <div className="confidence-options">
        {confidenceLabels.map((text, index) => (
          <label key={text} className={value === index + 1 ? 'selected' : ''}>
            <input
              type="radio"
              name={label}
              value={index + 1}
              checked={value === index + 1}
              onChange={() => onChange(confidence(index + 1))}
            />
            <span>{index + 1}</span>
            <small>{text}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  return (
    <div className="feedback-panel">
      <div className="eyebrow">WORDING SIGNALS, NOT A GRADE</div>
      <h3>
        {feedback.count >= 2
          ? 'You have a useful starting point.'
          : 'A little more clarity could help.'}
      </h3>
      <p className="muted small">
        These are simple phrase checks. A missing signal can still be
        appropriate, especially before it is time to make a plan.
      </p>
      {feedback.caution && <p className="notice">{feedback.caution}</p>}
      <div className="signal-grid">
        {feedback.skills.map((item) => (
          <div
            className={`signal ${item.found ? 'found' : ''}`}
            key={item.skill}
          >
            <strong>
              <Icon name={item.found ? 'check' : 'spark'} size={17} />
              {skillLabels[item.skill]}
            </strong>
            {item.found ? (
              <p>
                Noticed: <q>{item.evidence}</q>
              </p>
            ) : (
              <p>{item.advice}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initialData(): { state: SavedState; error: string } {
  try {
    return { state: loadState(localStorage), error: '' };
  } catch {
    return {
      state: emptyState(),
      error:
        'Your saved practice data could not be read. It has not been changed. Export the original data before resetting, or retry if storage access was temporarily blocked.',
    };
  }
}

export function App() {
  const [initial] = useState(initialData);
  const [state, setState] = useState(initial.state);
  const [loadError, setLoadError] = useState(initial.error);
  const [saveError, setSaveError] = useState('');
  const [page, setPage] = useState<Page>('practice');
  const [category, setCategory] = useState<'All' | Category>('All');
  const [selected, setSelected] = useState<Scenario>(scenarios[0]);
  const [before, setBefore] = useState<Confidence>(3);
  const [after, setAfter] = useState<Confidence>(3);
  const [result, setResult] = useState<Session | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState('');
  const [recoveryText, setRecoveryText] = useState('');
  const billing = useBilling();
  const heading = useRef<HTMLHeadingElement>(null);
  const draft = state.draft;
  const activeScenario = draft ? getScenario(draft.scenarioId) : selected;
  const locked = activeScenario.premium && !billing.premium;

  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (page === 'rehearsal') document.getElementById('response')?.focus();
    setFormError('');
  }, [page]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let remove: (() => Promise<void>) | undefined;
    void NativeApp.addListener('backButton', () => {
      if (modal) setModal(null);
      else if (page === 'result') setPage('journal');
      else if (page !== 'practice') setPage('practice');
      else
        void NativeApp.exitApp().catch(() =>
          setNotice('The app could not close. Use your device Home control.'),
        );
    })
      .then((handle) => {
        if (disposed) return handle.remove();
        remove = () => handle.remove();
      })
      .catch(() =>
        setNotice(
          'Device Back navigation is unavailable. The on-screen navigation still works.',
        ),
      );
    return () => {
      disposed = true;
      void remove?.().catch(() =>
        console.error('Back navigation listener cleanup failed.'),
      );
    };
  }, [page, modal]);

  function persist(next: SavedState): boolean {
    setState(next);
    try {
      saveState(localStorage, next);
      setSaveError('');
      return true;
    } catch {
      setSaveError(
        'Changes are only in memory: device storage could not save them. Export your journal before closing this app.',
      );
      return false;
    }
  }

  function openPlus() {
    setModal('plus');
    void billing.loadOfferings();
  }
  function select(scenario: Scenario) {
    if (scenario.premium && !billing.premium) {
      openPlus();
      return;
    }
    setSelected(scenario);
    setBefore(3);
    setPage('scenario');
  }

  function start() {
    if (selected.premium && !billing.premium) {
      openPlus();
      return;
    }
    if (draft) {
      setFormError(
        'Finish or discard your current rehearsal before starting another.',
      );
      return;
    }
    persist({
      ...state,
      draft: {
        scenarioId: selected.id,
        startedAt: new Date().toISOString(),
        before,
        turns: [],
        text: '',
        showingFeedback: false,
      },
    });
    setPage('rehearsal');
  }

  function updateDraft(next: Draft) {
    persist({ ...state, draft: next });
  }
  function respond() {
    if (!draft || locked || draft.showingFeedback || draft.turns.length >= 3)
      return;
    try {
      const round = activeScenario.rounds[draft.turns.length];
      const feedback = evaluate(draft.text, round);
      const turn = {
        text: draft.text.trim(),
        feedback,
        reply: round[feedback.reaction],
      };
      updateDraft({
        ...draft,
        turns: [...draft.turns, turn],
        showingFeedback: true,
        text: '',
      });
      setFormError('');
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Your response could not be checked. Try again.',
      );
    }
  }

  function finish() {
    if (locked) {
      openPlus();
      return;
    }
    try {
      const next = completeSession(
        state,
        after,
        crypto.randomUUID(),
        new Date().toISOString(),
      );
      const saved = persist(next);
      setResult(next.sessions[0]);
      setNotice(
        saved
          ? 'Rehearsal saved on this device.'
          : 'Rehearsal completed, but not saved to device storage.',
      );
      setPage('result');
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'The rehearsal could not be completed.',
      );
    }
  }

  function navigate(next: 'practice' | 'journal') {
    setPage(next);
    setNotice('');
  }
  function resetData() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setState(emptyState());
      setLoadError('');
      setSaveError('');
      setModal(null);
      setResult(null);
      setNotice(
        'Practice history and unfinished drafts deleted from this device.',
      );
      setPage('practice');
    } catch {
      setSaveError(
        'Device storage could not be cleared. No deletion was confirmed. Please retry.',
      );
    }
  }

  const journalText = exportJournal(state);
  const recovering = modal === 'recovery';
  const exportText = recovering ? recoveryText : journalText;
  const completedScenarios = new Set(
    state.sessions.map((item) => item.scenarioId),
  );
  const totalDelta = state.sessions.reduce(
    (sum, item) => sum + item.after - item.before,
    0,
  );
  const averageDelta = state.sessions.length
    ? totalDelta / state.sessions.length
    : null;
  const practicePage = page !== 'journal';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate('practice')}
          aria-label="Steady home"
        >
          <span className="brand-mark">
            <Icon name="leaf" size={26} />
          </span>
          steady<span className="brand-dot">.</span>
        </button>
        <p className="sidebar-caption">
          A little practice.
          <br />A little more you.
        </p>
        <nav aria-label="Main navigation">
          <button
            className={practicePage ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('practice')}
          >
            <Icon name="chat" />
            Practice <span className="nav-dot" />
          </button>
          <button
            className={!practicePage ? 'nav-item active' : 'nav-item'}
            onClick={() => navigate('journal')}
          >
            <Icon name="book" />
            My journal <span className="count">{state.sessions.length}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="plus-mini">
            <Icon name="spark" />
            <strong>A little room to grow</strong>
            <p>
              More nuanced conversations.
              <br />
              The same safe place to try.
            </p>
            <button className="text-button" onClick={openPlus}>
              {billing.premium ? 'Manage Steady Plus' : 'Explore Steady Plus'}
              <Icon name="arrow" size={16} />
            </button>
          </div>
          <button className="privacy-link" onClick={() => setModal('privacy')}>
            <Icon name="shield" size={16} />
            Private by design
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <span>YOUR PRACTICE SPACE</span>
          <button className="mode-pill" onClick={openPlus}>
            <span />
            {billing.premium
              ? 'Steady Plus'
              : Capacitor.isNativePlatform()
                ? 'Free practice'
                : 'Browser preview'}
          </button>
        </header>
        <main id="main-content">
          {loadError ? (
            <section className="paper recovery">
              <h1 ref={heading} tabIndex={-1}>
                Let&apos;s protect your journal.
              </h1>
              <p role="alert">{loadError}</p>
              <div className="actions">
                <button
                  className="button secondary"
                  onClick={() => {
                    try {
                      const raw = localStorage.getItem(STORAGE_KEY);
                      if (raw === null) {
                        setSaveError(
                          'No saved data was found to export. Retry reading to check the current storage state.',
                        );
                        return;
                      }
                      setRecoveryText(raw);
                      setCopied('');
                      setSaveError('');
                      setModal('recovery');
                    } catch {
                      setSaveError(
                        'The original data could not be accessed for export. Check your browser storage permissions.',
                      );
                    }
                  }}
                >
                  Export original data
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    const loaded = initialData();
                    setLoadError(loaded.error);
                    if (!loaded.error) {
                      setState(loaded.state);
                      setSaveError('');
                    }
                  }}
                >
                  Retry reading
                </button>
                <button
                  className="button danger"
                  onClick={() => setModal('erase')}
                >
                  Reset local data
                </button>
              </div>
            </section>
          ) : (
            <>
              {saveError && (
                <div className="notice warning" role="alert">
                  {saveError}{' '}
                  <button
                    className="text-button"
                    onClick={() => setModal('export')}
                  >
                    Export journal
                  </button>
                </div>
              )}
              {notice && (
                <div className="notice" role="status">
                  {notice}
                </div>
              )}
              {page === 'practice' && (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="eyebrow">
                        <span className="tiny-sun" /> SMALL STEPS. REAL
                        CONVERSATIONS.
                      </span>
                      <h1 ref={heading} tabIndex={-1}>
                        Find your words.
                        <br />
                        <em>Keep your calm.</em>
                      </h1>
                      <p>
                        That conversation on your mind?
                        <br />
                        Let&apos;s give it a little practice first.
                      </p>
                      <button
                        className="button primary"
                        onClick={() =>
                          draft ? setPage('rehearsal') : select(scenarios[0])
                        }
                      >
                        {draft
                          ? 'Resume your rehearsal'
                          : 'Try a 5-minute rehearsal'}
                        <Icon name="arrow" />
                      </button>
                      <span className="hero-footnote">
                        No perfect answers. Just a place to begin.
                      </span>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <span className="art-star star-one">+</span>
                      <span className="art-star star-two">+</span>
                      <div className="bubble bubble-back">
                        <i />
                        <i />
                        <i />
                      </div>
                      <div className="bubble bubble-front">
                        <Icon name="leaf" size={58} />
                      </div>
                      <div className="art-note">
                        <span className="check-circle">
                          <Icon name="check" size={14} />
                        </span>
                        A little more ready.
                      </div>
                    </div>
                  </section>

                  <div className="practice-strip">
                    <span>
                      <Icon name="shield" size={19} />
                      Your words stay on your device
                    </span>
                    <span>
                      <Icon name="chat" size={19} />3 turns, one small step
                    </span>
                    <span>
                      <Icon name="spark" size={19} />
                      Practice, not perfection
                    </span>
                  </div>

                  {draft && (
                    <section className="resume-card">
                      <div>
                        <span className="eyebrow">
                          RIGHT WHERE YOU LEFT OFF
                        </span>
                        <h3>{getScenario(draft.scenarioId).title}</h3>
                        <p>
                          {draft.turns.length} of 3 responses practised. Your
                          draft is kept on this device.
                        </p>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => setPage('rehearsal')}
                      >
                        Continue
                        <Icon name="arrow" />
                      </button>
                    </section>
                  )}

                  <section className="library" aria-labelledby="library-title">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">THE REHEARSAL ROOM</span>
                        <h2 id="library-title">What&apos;s on your mind?</h2>
                      </div>
                      <span className="muted small">
                        Start with something familiar.
                      </span>
                    </div>
                    <div className="filters" aria-label="Filter scenarios">
                      {categories.map((item) => (
                        <button
                          aria-pressed={category === item}
                          className={category === item ? 'selected' : ''}
                          key={item}
                          onClick={() => setCategory(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="scenario-grid">
                      {scenarios
                        .filter(
                          (item) =>
                            category === 'All' || item.category === category,
                        )
                        .map((scenario) => (
                          <button
                            className="scenario-card"
                            key={scenario.id}
                            onClick={() => select(scenario)}
                            aria-label={`${scenario.title}${scenario.premium && !billing.premium ? ' - Steady Plus' : ''}`}
                          >
                            <div
                              className={`card-illustration ${scenario.category === 'Feedback' ? 'sage' : scenario.category === 'Boundaries' ? 'peach' : 'lavender'}`}
                            >
                              <div
                                className={`mini-art ${scenario.category === 'Boundaries' ? 'boundary-art' : scenario.category === 'Saying no' ? 'no-art' : ''}`}
                              >
                                <span />
                                <span />
                              </div>
                              <span className="card-tag">
                                {scenario.premium ? (
                                  <>
                                    <Icon
                                      name={billing.premium ? 'spark' : 'lock'}
                                      size={12}
                                    />
                                    PLUS
                                  </>
                                ) : (
                                  'FREE PRACTICE'
                                )}
                              </span>
                            </div>
                            <div className="card-copy">
                              <span className="eyebrow">
                                {scenario.category}
                              </span>
                              <h3>{scenario.title}</h3>
                              <p>{scenario.subtitle}</p>
                              <div className="card-footer">
                                <span>
                                  {completedScenarios.has(scenario.id) ? (
                                    <>
                                      <Icon name="check" size={14} />
                                      Practised
                                    </>
                                  ) : (
                                    <>
                                      {scenario.difficulty}{' '}
                                      <span aria-hidden="true">/</span> 5 min
                                    </>
                                  )}
                                </span>
                                <Icon name="arrow" size={18} />
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </section>
                  <section className="gentle-note">
                    <Icon name="leaf" size={25} />
                    <p>
                      You don&apos;t need to become someone else.
                      <br />
                      <strong>
                        Just a little more prepared to be yourself.
                      </strong>
                    </p>
                    <span>ONE CONVERSATION AT A TIME</span>
                  </section>
                </>
              )}

              {page === 'scenario' && (
                <section className="flow-layout">
                  <button
                    className="text-button back-button"
                    onClick={() => navigate('practice')}
                  >
                    <Icon name="back" />
                    All rehearsals
                  </button>
                  <span className="eyebrow">
                    {selected.category} / {selected.difficulty} / 5 MINUTES
                  </span>
                  <h1 ref={heading} tabIndex={-1}>
                    {selected.title}
                  </h1>
                  <p className="lead">{selected.subtitle}</p>
                  <div className="paper">
                    <div className="person-heading">
                      <span className="avatar">
                        {selected.person.slice(0, 1)}
                      </span>
                      <div>
                        <strong>Meet {selected.person}</strong>
                        <span>{selected.role}</span>
                      </div>
                    </div>
                    <p>{selected.context}</p>
                    <div className="goal">
                      <Icon name="spark" />
                      <div>
                        <strong>Your intention</strong>
                        <p>{selected.goal}</p>
                      </div>
                    </div>
                  </div>
                  <div className="paper">
                    <ConfidencePicker
                      value={before}
                      onChange={setBefore}
                      label="How ready do you feel right now?"
                    />
                    <p className="small muted">
                      Only for your reflection. There is no score you need to
                      reach.
                    </p>
                  </div>
                  <p className="small muted">
                    <Icon name="shield" size={15} /> Use fictional details, not
                    real names or confidential work information. Responses are
                    saved locally, not sent to a model.
                  </p>
                  {draft && (
                    <div className="notice">
                      You already have an unfinished rehearsal:{' '}
                      {getScenario(draft.scenarioId).title}.{' '}
                      <button
                        className="text-button"
                        onClick={() => setPage('rehearsal')}
                      >
                        Resume it
                      </button>
                    </div>
                  )}
                  {formError && (
                    <p role="alert" className="notice warning">
                      {formError}
                    </p>
                  )}
                  <button
                    className="button primary"
                    onClick={start}
                    disabled={!!draft}
                  >
                    Let&apos;s practise
                    <Icon name="arrow" />
                  </button>
                </section>
              )}

              {page === 'rehearsal' && draft && (
                <section className="flow-layout">
                  <button
                    className="text-button back-button"
                    onClick={() => navigate('practice')}
                  >
                    <Icon name="back" />
                    Pause &amp; go back
                  </button>
                  <span className="eyebrow">
                    {activeScenario.category} / YOUR REHEARSAL
                  </span>
                  <h1 ref={heading} tabIndex={-1}>
                    {activeScenario.title}
                  </h1>
                  <div
                    className="step-track"
                    aria-label={`${draft.turns.length} of 3 responses practised`}
                  >
                    {activeScenario.rounds.map((round, index) => (
                      <span
                        key={round.title}
                        className={
                          index < draft.turns.length
                            ? 'complete'
                            : index === draft.turns.length
                              ? 'current'
                              : ''
                        }
                      >
                        {index + 1}
                        <small>{round.title}</small>
                      </span>
                    ))}
                  </div>
                  {locked ? (
                    <div className="paper">
                      <h2>Plus access is needed to continue.</h2>
                      <p>
                        Your draft is safe on this device. Refresh or restore
                        your purchase to continue this stretch scenario.
                      </p>
                      <button className="button primary" onClick={openPlus}>
                        View Plus access
                      </button>
                    </div>
                  ) : draft.showingFeedback ? (
                    (() => {
                      const turn = draft.turns[draft.turns.length - 1];
                      return (
                        <div className="paper" aria-live="polite">
                          <div className="eyebrow">YOU SAID</div>
                          <blockquote className="your-words">
                            {turn.text}
                          </blockquote>
                          <div className="person-heading">
                            <span className="avatar">
                              {activeScenario.person.slice(0, 1)}
                            </span>
                            <div>
                              <strong>{activeScenario.person} might say</strong>
                              <span>Scripted practice response</span>
                            </div>
                          </div>
                          <blockquote className="reply">
                            {turn.reply}
                          </blockquote>
                          <FeedbackPanel feedback={turn.feedback} />
                          <details className="example">
                            <summary>See one possible approach</summary>
                            <p>
                              {
                                activeScenario.rounds[draft.turns.length - 1]
                                  .example
                              }
                            </p>
                            <span className="small muted">
                              One option, not a script to memorize. Try it in
                              your own voice.
                            </span>
                          </details>
                          <div className="actions">
                            <button
                              className="button secondary"
                              onClick={() =>
                                updateDraft({
                                  ...draft,
                                  turns: draft.turns.slice(0, -1),
                                  text: turn.text,
                                  showingFeedback: false,
                                })
                              }
                            >
                              Try that wording again
                            </button>
                            <button
                              className="button primary"
                              onClick={() => {
                                updateDraft({
                                  ...draft,
                                  showingFeedback: false,
                                });
                                setAfter(draft.before);
                              }}
                            >
                              {draft.turns.length === 3
                                ? 'Reflect on your practice'
                                : 'Continue conversation'}
                              <Icon name="arrow" />
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : draft.turns.length === 3 ? (
                    <div className="paper reflection">
                      <div className="completion-icon">
                        <Icon name="leaf" size={30} />
                      </div>
                      <h2>You made space to practise.</h2>
                      <p>
                        Feeling less certain can mean you noticed something
                        important. Any honest answer belongs here.
                      </p>
                      <ConfidencePicker
                        value={after}
                        onChange={setAfter}
                        label="How ready do you feel after practising?"
                      />
                      <p className="small muted">
                        Before this rehearsal: {draft.before}/5. Only your own
                        reflection, not a measure of management ability.
                      </p>
                      <button className="button primary" onClick={finish}>
                        Save to my journal
                        <Icon name="book" />
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const round = activeScenario.rounds[draft.turns.length];
                      return (
                        <form
                          className="paper"
                          onSubmit={(event) => {
                            event.preventDefault();
                            respond();
                          }}
                        >
                          <div className="person-heading">
                            <span className="avatar">
                              {activeScenario.person.slice(0, 1)}
                            </span>
                            <div>
                              <strong>{activeScenario.person}</strong>
                              <span>{activeScenario.role}</span>
                            </div>
                          </div>
                          <blockquote className="reply">
                            {round.prompt}
                          </blockquote>
                          <div className="coach-tip">
                            <Icon name="spark" />
                            <div>
                              <strong>A gentle nudge</strong>
                              <p>{round.aim}</p>
                            </div>
                          </div>
                          <label className="response-label" htmlFor="response">
                            What would you say?
                          </label>
                          <textarea
                            id="response"
                            value={draft.text}
                            maxLength={1200}
                            rows={5}
                            placeholder="Take a breath. Try a few sentences in your own words..."
                            onChange={(event) =>
                              updateDraft({
                                ...draft,
                                text: event.target.value,
                              })
                            }
                            aria-describedby="response-help response-count"
                            autoFocus
                          />
                          <div className="input-meta">
                            <span id="response-help">
                              20-1,200 characters. No perfect answer needed.
                            </span>
                            <span id="response-count">
                              {draft.text.length}/1,200
                            </span>
                          </div>
                          <button className="button primary" type="submit">
                            See how it lands
                            <Icon name="arrow" />
                          </button>
                        </form>
                      );
                    })()
                  )}
                  {formError && (
                    <p role="alert" className="notice warning">
                      {formError}
                    </p>
                  )}
                  <details className="discard">
                    <summary>Need a fresh start?</summary>
                    <p>
                      Discarding removes only this unfinished rehearsal, not
                      your journal.
                    </p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        persist({ ...state, draft: null });
                        navigate('practice');
                      }}
                    >
                      Discard this rehearsal
                    </button>
                  </details>
                </section>
              )}

              {page === 'journal' && (
                <section className="journal">
                  <span className="eyebrow">A RECORD OF SHOWING UP</span>
                  <h1 ref={heading} tabIndex={-1}>
                    Your little steps.
                  </h1>
                  <p className="lead">
                    Not a performance review. A reminder that you practised.
                  </p>
                  <div className="stat-grid">
                    <div>
                      <Icon name="book" />
                      <strong>{state.sessions.length}</strong>
                      <span>rehearsals completed</span>
                    </div>
                    <div>
                      <Icon name="chat" />
                      <strong>{completedScenarios.size}</strong>
                      <span>situations explored</span>
                    </div>
                    <div>
                      <Icon name="chart" />
                      <strong>
                        {averageDelta === null
                          ? '--'
                          : `${averageDelta > 0 ? '+' : ''}${averageDelta.toFixed(1)}`}
                      </strong>
                      <span>average readiness change / 5</span>
                    </div>
                  </div>
                  <p className="small muted">
                    Readiness is self-reported. This is not evidence of
                    real-world improvement. The latest {MAX_SESSIONS} rehearsals
                    are kept.
                  </p>
                  {!state.sessions.length ? (
                    <div className="paper empty">
                      <span className="completion-icon">
                        <Icon name="book" size={30} />
                      </span>
                      <h2>Every conversation starts somewhere.</h2>
                      <p>
                        Your completed rehearsals will appear here, with your
                        words and a reflection you can return to.
                      </p>
                      <button
                        className="button primary"
                        onClick={() => navigate('practice')}
                      >
                        Find a rehearsal
                        <Icon name="arrow" />
                      </button>
                    </div>
                  ) : (
                    <div className="journal-list">
                      {state.sessions.map((session) => (
                        <button
                          className="journal-entry"
                          key={session.id}
                          onClick={() => {
                            setResult(session);
                            setNotice('');
                            setPage('result');
                          }}
                        >
                          <span className="entry-icon">
                            <Icon name="chat" />
                          </span>
                          <span>
                            <strong>
                              {getScenario(session.scenarioId).title}
                            </strong>
                            <small>
                              {new Date(session.completedAt).toLocaleDateString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                },
                              )}{' '}
                              / 3 turns practised
                            </small>
                          </span>
                          <span className="readiness">
                            {session.before} <Icon name="arrow" size={14} />{' '}
                            {session.after}
                            <small>readiness</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="actions">
                    <button
                      className="button secondary"
                      onClick={() => {
                        setCopied('');
                        setModal('export');
                      }}
                    >
                      Export journal
                    </button>
                    <button
                      className="text-button danger-text"
                      onClick={() => setModal('erase')}
                    >
                      Delete local practice data
                    </button>
                  </div>
                </section>
              )}

              {page === 'result' && result && (
                <section className="flow-layout">
                  <button
                    className="text-button back-button"
                    onClick={() => navigate('journal')}
                  >
                    <Icon name="back" />
                    My journal
                  </button>
                  <span className="eyebrow">
                    ONE CONVERSATION. A LITTLE MORE PREPARED.
                  </span>
                  <h1 ref={heading} tabIndex={-1}>
                    {getScenario(result.scenarioId).title}
                  </h1>
                  <div className="result-banner">
                    <Icon name="leaf" size={30} />
                    <div>
                      <h2>You showed up for the conversation.</h2>
                      <p>
                        Your readiness: {result.before}/5 before, {result.after}
                        /5 after. No right direction required.
                      </p>
                    </div>
                  </div>
                  {result.turns.map((turn, index) => (
                    <details
                      className="paper result-turn"
                      key={index}
                      open={index === 2}
                    >
                      <summary>
                        <span>0{index + 1}</span>
                        {getScenario(result.scenarioId).rounds[index].title}
                      </summary>
                      <p className="small muted">
                        {getScenario(result.scenarioId).person}:{' '}
                        {getScenario(result.scenarioId).rounds[index].prompt}
                      </p>
                      <blockquote className="your-words">
                        {turn.text}
                      </blockquote>
                      <p className="reply">{turn.reply}</p>
                      <FeedbackPanel feedback={turn.feedback} />
                    </details>
                  ))}
                  <div className="paper takeaway">
                    <span className="eyebrow">TAKE ONE THING WITH YOU</span>
                    <h3>Clarity and kindness can share a sentence.</h3>
                    <p>
                      Before the real conversation, choose one observable
                      detail, one honest question, and a realistic next step.
                      Adapt to what the other person actually says.
                    </p>
                    <p className="small muted">
                      Steady is a practice aid, not HR, legal, or professional
                      advice. For harassment, discrimination, threats, or formal
                      disciplinary decisions, follow your organization&apos;s
                      policies and seek appropriate support.
                    </p>
                  </div>
                  <div className="actions">
                    <button
                      className="button primary"
                      onClick={() => select(getScenario(result.scenarioId))}
                    >
                      Practise again
                      <Icon name="arrow" />
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => navigate('practice')}
                    >
                      Explore another situation
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
          {loadError && saveError && (
            <p className="notice warning" role="alert">
              {saveError}
            </p>
          )}
          <footer className="page-footer">
            <span>
              steady. <span className="muted">Space to find your words.</span>
            </span>
            <button onClick={() => setModal('privacy')}>
              Privacy &amp; how it works
            </button>
          </footer>
        </main>
      </div>

      {modal === 'plus' && (
        <ModalDialog
          title={
            billing.premium ? 'Your Steady Plus' : 'More room to practise.'
          }
          onClose={() => setModal(null)}
        >
          <span className="plus-label">
            <Icon name="spark" size={16} />
            STEADY PLUS
          </span>
          <p>
            Some conversations have a few more layers. Unlock three stretch
            rehearsals with one purchase. No recurring subscription.
          </p>
          <ul className="feature-list">
            {scenarios
              .filter((item) => item.premium)
              .map((item) => (
                <li key={item.id}>
                  <Icon name="check" size={17} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                </li>
              ))}
          </ul>
          <p className="small muted">
            The three foundation rehearsals, feedback, journal, and export stay
            free. Plus changes the library, never ownership of your words.
          </p>
          {billing.availability ? (
            <div className="notice">{billing.availability}</div>
          ) : (
            <>
              {billing.premium ? (
                <div className="notice">
                  <Icon name="check" size={18} /> Plus is active on this device.
                </div>
              ) : (
                billing.packages.map((item) => (
                  <button
                    key={item.identifier}
                    className="button primary purchase-button"
                    disabled={billing.busy}
                    onClick={() => void billing.transact(item.identifier)}
                  >
                    Unlock Plus - {item.product.priceString}
                    <span>One-time purchase</span>
                  </button>
                ))
              )}
              <div className="actions">
                <button
                  className="text-button"
                  disabled={billing.busy}
                  onClick={() => void billing.transact()}
                >
                  Restore purchases
                </button>
                <button
                  className="text-button"
                  disabled={billing.busy}
                  onClick={() => {
                    void billing.refresh();
                    void billing.loadOfferings();
                  }}
                >
                  Refresh access
                </button>
              </div>
              {billing.busy && <p role="status">Connecting to the store...</p>}
              {billing.message && (
                <p className="notice" role="status">
                  {billing.message}
                </p>
              )}
              <p className="small muted">
                Payment is charged by Google Play after confirmation. Use the
                same store account to restore. Refunds are handled by the store;
                refunded access may be removed. No trial is promised in this
                build.
              </p>
            </>
          )}
          <p className="small">
            <a href="/privacy.html" target="_blank" rel="noreferrer">
              Privacy policy
            </a>{' '}
            /{' '}
            <a href="/terms.html" target="_blank" rel="noreferrer">
              Terms of use
            </a>
          </p>
          <button
            className="button secondary full-width"
            onClick={() => {
              setModal(null);
              navigate('practice');
            }}
          >
            Back to free practice
          </button>
        </ModalDialog>
      )}
      {modal === 'privacy' && (
        <ModalDialog
          title="Your words are yours."
          onClose={() => setModal(null)}
        >
          <p>
            Rehearsals and readiness ratings are stored only in this browser or
            app&apos;s local storage. There is no account, transcript upload,
            analytics, or model API. The Android app includes the practice
            content and works offline; store actions require a connection.
          </p>
          <h3>Helpful signals, not an assessment</h3>
          <p>
            Steady checks for situation details, acknowledgment phrases, a
            question, and an action with timing. It chooses between two authored
            reactions for each turn. It cannot understand intent, judge empathy,
            or predict someone&apos;s response. English wording checks can miss
            good responses and reward superficial ones.
          </p>
          <h3>Keep practice fictional</h3>
          <p>
            Local storage is not encrypted by Steady. Anyone with access to your
            unlocked device or browser profile may be able to read it. Avoid
            identifying details or confidential work information.
          </p>
          <h3>Purchases are separate</h3>
          <p>
            In configured Android builds, RevenueCat and Google Play process
            purchase and device-related information under their policies. Your
            rehearsal text is never attached. The browser preview does not
            initialize purchases.
          </p>
          <p>
            The journal holds your latest {MAX_SESSIONS} completed sessions and
            one unfinished draft. Clearing browser data or uninstalling may
            erase them. Export before switching devices. You can delete your
            local practice data from My journal; that does not delete store
            transaction records.
          </p>
          <p>
            <a href="/privacy.html" target="_blank" rel="noreferrer">
              Full privacy policy
            </a>{' '}
            /{' '}
            <a href="/terms.html" target="_blank" rel="noreferrer">
              Terms of use
            </a>
          </p>
        </ModalDialog>
      )}
      {(modal === 'export' || modal === 'recovery') && (
        <ModalDialog
          title={
            recovering ? 'Protect your original data.' : 'Keep your own copy.'
          }
          onClose={() => setModal(null)}
        >
          {recovering ? (
            <p>
              This is the exact saved text that could not be read, without
              repairs or changes. Copy it somewhere private before resetting.
              Import and automatic repair are not supported in this version.
            </p>
          ) : (
            <p>
              This export contains your words, readiness ratings, and unfinished
              draft. Store it somewhere private. Import is not supported in this
              version.
            </p>
          )}
          <label className="response-label" htmlFor="journal-export">
            {recovering ? 'Original saved data' : 'Journal JSON'}
          </label>
          <textarea
            id="journal-export"
            className="export-text"
            rows={8}
            readOnly
            value={exportText}
            onFocus={(event) => event.target.select()}
          />
          <div className="actions">
            <button
              className="button primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exportText);
                  setCopied(
                    'Data copied. Your clipboard now contains private practice data.',
                  );
                } catch {
                  setCopied(
                    'Clipboard access was unavailable. Select the text above and use your device copy action.',
                  );
                }
              }}
            >
              {recovering ? 'Copy original data' : 'Copy journal'}
            </button>
            {!Capacitor.isNativePlatform() && (
              <button
                className="button secondary"
                onClick={() =>
                  downloadText(
                    exportText,
                    recovering ? 'steady-recovery.json' : 'steady-journal.json',
                  )
                }
              >
                Download JSON
              </button>
            )}
          </div>
          {copied && (
            <p role="status" className="notice">
              {copied}
            </p>
          )}
        </ModalDialog>
      )}
      {modal === 'erase' && (
        <ModalDialog
          title="Delete local practice data?"
          onClose={() => setModal(null)}
        >
          <p>
            This permanently removes all rehearsals and your unfinished draft
            from this device. It does not cancel or remove a store purchase.
            Export first if you want a copy.
          </p>
          <div className="actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              Keep my data
            </button>
            <button className="button danger" onClick={resetData}>
              Delete permanently
            </button>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
