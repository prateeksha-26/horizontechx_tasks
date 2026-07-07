import { useEffect, useMemo, useState } from 'react';
import './FocusHubPanel.css';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
};

export default function FocusHubPanel({ socket }) {
  const [state, setState] = useState({
    agendaItems: [],
    timer: { seconds: 0, running: false, startedAt: null },
  });
  const [newAgenda, setNewAgenda] = useState('');
  const [agendaMinutes, setAgendaMinutes] = useState('5');
  const [scribeText, setScribeText] = useState('Capture the key outcomes from this session...');
  const [openSection, setOpenSection] = useState('pulse');
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollTimeLimit, setPollTimeLimit] = useState('2');
  const [activePoll, setActivePoll] = useState(null);
  const [pastPolls, setPastPolls] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleFocusState = (payload) => {
      setState((current) => ({ ...current, ...payload }));
    };

    socket.on('focus-hub-state', handleFocusState);
    return () => socket.off('focus-hub-state', handleFocusState);
  }, [socket]);

  const updateState = (changes) => {
    const next = { ...state, ...changes };
    setState(next);
    socket?.emit('focushub-change', { changes });
  };

  useEffect(() => {
    if (!state.timer.running || !state.timer.startedAt) return;

    const interval = setInterval(() => {
      const started = new Date(state.timer.startedAt).getTime();
      const elapsedSeconds = Math.max(0, Math.round((Date.now() - started) / 1000));
      setState((current) => ({
        ...current,
        timer: {
          ...current.timer,
          seconds: elapsedSeconds,
        },
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.timer.running, state.timer.startedAt]);

  const addAgenda = () => {
    const trimmed = newAgenda.trim();
    const minutes = parseInt(agendaMinutes, 10);
    if (!trimmed || Number.isNaN(minutes)) return;

    const item = { id: generateId(), text: trimmed, completed: false, duration: minutes };
    updateState({ agendaItems: [...state.agendaItems, item] });
    setNewAgenda('');
    setAgendaMinutes('5');
  };

  const toggleAgenda = (id) => {
    updateState({
      agendaItems: state.agendaItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    });
  };

  const removeAgenda = (id) => {
    updateState({ agendaItems: state.agendaItems.filter((item) => item.id !== id) });
  };

  const resetTimer = () => {
    updateState({ timer: { seconds: 0, running: false, startedAt: null } });
  };

  const toggleTimer = () => {
    if (state.timer.running) {
      updateState({ timer: { ...state.timer, running: false } });
    } else {
      updateState({ timer: { ...state.timer, running: true, startedAt: new Date().toISOString() } });
    }
  };

  const setTimerPreset = (minutes) => {
    updateState({ timer: { ...state.timer, seconds: minutes * 60, running: false, startedAt: null } });
  };

  const completedCount = state.agendaItems.filter((item) => item.completed).length;
  const totalCount = state.agendaItems.length;
  const plannedMinutes = useMemo(() => state.agendaItems.reduce((sum, item) => sum + (item.duration || 0), 0), [state.agendaItems]);
  const ringProgress = Math.min(100, Math.max(0, (state.timer.seconds / 1500) * 100));
  const timerLabel = state.timer.running ? 'Focus' : 'Ready';

  const updatePollOption = (index, value) => {
    setPollOptions((current) => current.map((option, optionIndex) => (optionIndex === index ? value : option)));
  };

  const addPollOption = () => setPollOptions((current) => [...current, '']);

  const launchPoll = () => {
    const cleanedQuestion = pollQuestion.trim();
    const cleanedOptions = pollOptions.map((option) => option.trim()).filter(Boolean);

    if (!cleanedQuestion || cleanedOptions.length < 2) return;

    const nextPoll = {
      id: generateId(),
      question: cleanedQuestion,
      options: cleanedOptions,
      votes: Array(cleanedOptions.length).fill(0),
      timeLimit: Number(pollTimeLimit) || 2,
    };

    if (activePoll) {
      setPastPolls((current) => [activePoll, ...current].slice(0, 3));
    }

    setActivePoll(nextPoll);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollTimeLimit('2');
    setShowPollComposer(false);
  };

  const voteOnPoll = (optionIndex) => {
    if (!activePoll) return;

    setActivePoll((current) => {
      if (!current) return current;
      const nextVotes = [...current.votes];
      nextVotes[optionIndex] += 1;
      return { ...current, votes: nextVotes };
    });
  };

  const toggleSection = (section) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  return (
    <div className="focus-hub-panel">
      <div className="focus-hub-header">
        <div>
          <p className="focus-hub-label">Focus Hub</p>
          <h2 className="focus-hub-title">Agenda, timer, and pulse for smoother sessions</h2>
        </div>
        <span className={`status-pill ${state.timer.running ? 'running' : 'paused'}`}>
          {state.timer.running ? 'Timer running' : 'Timer paused'}
        </span>
      </div>

      <div className="focus-hub-accordion">
        <section className="focus-accordion-section">
          <button type="button" className={`focus-section-header ${openSection === 'pulse' ? 'open' : ''}`} onClick={() => toggleSection('pulse')}>
            <span>Pulse</span>
            <svg viewBox="0 0 24 24" className={`section-chevron ${openSection === 'pulse' ? 'open' : ''}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className={`focus-section-content ${openSection === 'pulse' ? 'open' : ''}`}>
            <button type="button" className="ghost-button full-width" onClick={() => setShowPollComposer((current) => !current)}>
              Create Poll
            </button>

            {showPollComposer && (
              <div className="poll-form">
                <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Question" />
                {pollOptions.map((option, index) => (
                  <input key={index} value={option} onChange={(e) => updatePollOption(index, e.target.value)} placeholder={`Option ${index + 1}`} />
                ))}
                <button type="button" className="text-link" onClick={addPollOption}>+ Add option</button>
                <div className="toggle-row">
                  <span>Time limit</span>
                  <select value={pollTimeLimit} onChange={(e) => setPollTimeLimit(e.target.value)}>
                    <option value="1">1 min</option>
                    <option value="2">2 min</option>
                    <option value="5">5 min</option>
                  </select>
                </div>
                <button type="button" className="accent-button full-width" onClick={launchPoll}>Launch Poll</button>
              </div>
            )}

            {activePoll && (
              <div className="poll-card">
                <h3>{activePoll.question}</h3>
                {activePoll.options.map((option, index) => {
                  const totalVotes = activePoll.votes.reduce((sum, vote) => sum + vote, 0) || 1;
                  const percent = Math.round((activePoll.votes[index] / totalVotes) * 100);
                  return (
                    <button key={option} type="button" className="poll-option" onClick={() => voteOnPoll(index)}>
                      <div className="poll-option-row">
                        <span>{option}</span>
                        <span>{activePoll.votes[index]} votes</span>
                      </div>
                      <div className="poll-bar"><div style={{ width: `${percent}%` }} /></div>
                    </button>
                  );
                })}
              </div>
            )}

            {pastPolls.length > 0 && (
              <div className="past-polls">
                <h4>Past polls</h4>
                {pastPolls.map((poll) => (
                  <div key={poll.id} className="past-poll-item">
                    <span>{poll.question}</span>
                    <small>{poll.timeLimit} min</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="focus-accordion-section">
          <button type="button" className={`focus-section-header ${openSection === 'timer' ? 'open' : ''}`} onClick={() => toggleSection('timer')}>
            <span>Timer</span>
            <svg viewBox="0 0 24 24" className={`section-chevron ${openSection === 'timer' ? 'open' : ''}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className={`focus-section-content ${openSection === 'timer' ? 'open' : ''}`}>
            <div className="timer-section">
              <div className="timer-ring-wrap">
                <svg className="timer-ring" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" className="timer-ring-track" />
                  <circle cx="60" cy="60" r="54" className="timer-ring-progress" style={{ strokeDashoffset: 339 - (339 * ringProgress) / 100 }} />
                </svg>
                <div className="timer-ring-center">
                  <span>{Math.floor(state.timer.seconds / 60).toString().padStart(2, '0')}:{(state.timer.seconds % 60).toString().padStart(2, '0')}</span>
                  <small>{timerLabel}</small>
                </div>
              </div>
              <div className="preset-row">
                <button type="button" className="ghost-button" onClick={() => setTimerPreset(25)}>25m</button>
                <button type="button" className="ghost-button" onClick={() => setTimerPreset(5)}>5m</button>
                <button type="button" className="ghost-button" onClick={() => setTimerPreset(10)}>10m</button>
              </div>
              <button type="button" className="accent-button full-width" onClick={toggleTimer}>{state.timer.running ? 'Pause' : 'Start'}</button>
              <button type="button" className="ghost-button full-width" onClick={resetTimer}>Reset</button>
            </div>
          </div>
        </section>

        <section className="focus-accordion-section">
          <button type="button" className={`focus-section-header ${openSection === 'scribe' ? 'open' : ''}`} onClick={() => toggleSection('scribe')}>
            <span>Scribe</span>
            <svg viewBox="0 0 24 24" className={`section-chevron ${openSection === 'scribe' ? 'open' : ''}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className={`focus-section-content ${openSection === 'scribe' ? 'open' : ''}`}>
            <div className="scribe-block">
              <div className="scribe-meta">Last edited by · 10:20</div>
              <textarea value={scribeText} onChange={(e) => setScribeText(e.target.value)} placeholder="Capture notes..." />
              <div className="scribe-status">Someone is editing...</div>
              <div className="scribe-actions">
                <button type="button" className="ghost-button full-width" onClick={() => navigator.clipboard.writeText(scribeText)}>Copy</button>
                <button type="button" className="ghost-button full-width" onClick={() => setScribeText('')}>Clear</button>
              </div>
            </div>
          </div>
        </section>

        <section className="focus-accordion-section">
          <button type="button" className={`focus-section-header ${openSection === 'agenda' ? 'open' : ''}`} onClick={() => toggleSection('agenda')}>
            <span>Agenda</span>
            <svg viewBox="0 0 24 24" className={`section-chevron ${openSection === 'agenda' ? 'open' : ''}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div className={`focus-section-content ${openSection === 'agenda' ? 'open' : ''}`}>
            <div className="agenda-block">
              <div className="agenda-stats">{totalCount} items · {plannedMinutes}m planned</div>
              {state.agendaItems.length === 0 ? (
                <div className="agenda-empty">No items yet. Add one below to keep momentum.</div>
              ) : (
                <ul className="agenda-list">
                  {state.agendaItems.map((item) => (
                    <li key={item.id} className={item.completed ? 'completed' : ''}>
                      <button type="button" className={`agenda-check ${item.completed ? 'done' : ''}`} onClick={() => toggleAgenda(item.id)}>
                        {item.completed ? '✓' : ''}
                      </button>
                      <div className="agenda-item-copy">
                        <span className={`agenda-title ${item.completed ? 'done' : ''}`}>{item.text}</span>
                        <span className="agenda-duration">{item.duration}m</span>
                      </div>
                      <div className="agenda-item-actions">
                        <button type="button" className="icon-button" onClick={() => toggleAgenda(item.id)} aria-label="Activate item">▶</button>
                        <button type="button" className="icon-button" onClick={() => removeAgenda(item.id)} aria-label="Delete item">×</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="agenda-form">
                <input value={newAgenda} onChange={(e) => setNewAgenda(e.target.value)} placeholder="Add agenda item..." />
                <input value={agendaMinutes} onChange={(e) => setAgendaMinutes(e.target.value)} placeholder="Duration (minutes)" />
                <button type="button" className="ghost-button full-width" onClick={addAgenda}>Add Item</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
