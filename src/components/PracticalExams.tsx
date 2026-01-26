import React, { useState, useCallback, useEffect } from 'react';
import {
  PRACTICAL_EXAMS,
  createPracticalExamSession,
  startChallenge,
  evaluateCommand,
  completeChallenge,
  calculateExamResult,
  getExamById,
  getExamsByDomain,
  getAllPracticalExams,
  formatExamTime,
  getHint,
  calculateHintPenalty,
  type PracticalExam,
  type PracticalExamSession,
  type ChallengeResult,
  type PracticalChallenge,
  type ExamResult,
} from '../utils/practicalExamEngine';

interface PracticalExamsProps {
  onCommandSubmit?: (command: string) => { output: string; success: boolean };
  onClose?: () => void;
}

type ViewMode = 'list' | 'exam' | 'challenge' | 'result';

const DOMAIN_NAMES: Record<string, string> = {
  domain1: 'Platform Bring-Up',
  domain2: 'Accelerator Configuration',
  domain3: 'Base Infrastructure',
  domain4: 'Validation & Testing',
  domain5: 'Troubleshooting',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#4CAF50',
  intermediate: '#FF9800',
  advanced: '#F44336',
};

export const PracticalExams: React.FC<PracticalExamsProps> = ({
  onCommandSubmit,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<PracticalExam | null>(null);
  const [session, setSession] = useState<PracticalExamSession | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<PracticalChallenge | null>(null);
  const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<Array<{ command: string; output: string }>>([]);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Timer effect
  useEffect(() => {
    if (session && !session.isComplete && viewMode === 'challenge') {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
        const remaining = Math.max(0, session.timeLimitSeconds - elapsed);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          handleTimeUp();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session, viewMode]);

  const handleTimeUp = useCallback(() => {
    if (session && challengeResult) {
      // Auto-complete current challenge with whatever points earned
      const completed = completeChallenge(currentChallenge!, challengeResult);
      const updatedSession: PracticalExamSession = {
        ...session,
        challengeResults: [...session.challengeResults, completed],
        totalPointsEarned: session.totalPointsEarned + completed.pointsEarned + completed.timeBonusEarned,
        isComplete: true,
        endTime: Date.now(),
      };
      setSession(updatedSession);
      const result = calculateExamResult(updatedSession);
      setExamResult(result);
      setViewMode('result');
    }
  }, [session, challengeResult, currentChallenge]);

  const filteredExams = selectedDomain
    ? getExamsByDomain(selectedDomain as `domain${1 | 2 | 3 | 4 | 5}`)
    : getAllPracticalExams();

  const handleSelectExam = (exam: PracticalExam) => {
    setSelectedExam(exam);
    setViewMode('exam');
  };

  const handleStartExam = () => {
    if (!selectedExam) return;

    try {
      const newSession = createPracticalExamSession(selectedExam.id);
      setSession(newSession);
      setTimeRemaining(newSession.timeLimitSeconds);

      // Start first challenge
      const firstChallenge = selectedExam.challenges[0];
      setCurrentChallenge(firstChallenge);
      const result = startChallenge(newSession, 0);
      setChallengeResult(result);
      setCommandHistory([]);
      setHintsUsed(0);
      setShowHint(null);
      setViewMode('challenge');
    } catch {
      alert('Failed to start exam');
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || !currentChallenge || !challengeResult) return;

    const command = commandInput.trim();
    setCommandInput('');

    // Execute command through simulator if provided
    let output = '';
    if (onCommandSubmit) {
      const result = onCommandSubmit(command);
      output = result.output;
    } else {
      // Mock output for standalone testing
      output = `Simulated output for: ${command}`;
    }

    // Add to history
    setCommandHistory(prev => [...prev, { command, output }]);

    // Evaluate command against objectives
    const updatedResult = evaluateCommand(command, output, currentChallenge, challengeResult);
    setChallengeResult(updatedResult);

    // Check if all objectives complete
    const allComplete = updatedResult.objectiveResults.every(o => o.completed);
    if (allComplete) {
      // Auto-advance after brief delay to show completion
      setTimeout(() => handleNextChallenge(), 1500);
    }
  };

  const handleNextChallenge = () => {
    if (!session || !selectedExam || !challengeResult || !currentChallenge) return;

    // Complete current challenge
    const completed = completeChallenge(currentChallenge, {
      ...challengeResult,
      hintsUsed,
    });

    // Apply hint penalty
    const hintPenalty = calculateHintPenalty(hintsUsed, completed.pointsEarned);
    completed.pointsEarned = Math.max(0, completed.pointsEarned - hintPenalty);

    const newChallengeResults = [...session.challengeResults, completed];
    const newTotalPoints = session.totalPointsEarned + completed.pointsEarned + completed.timeBonusEarned;

    const nextIndex = session.currentChallengeIndex + 1;

    if (nextIndex >= selectedExam.challenges.length) {
      // Exam complete
      const completedSession: PracticalExamSession = {
        ...session,
        challengeResults: newChallengeResults,
        totalPointsEarned: newTotalPoints,
        currentChallengeIndex: nextIndex,
        isComplete: true,
        endTime: Date.now(),
      };
      setSession(completedSession);
      const result = calculateExamResult(completedSession);
      setExamResult(result);
      setViewMode('result');
    } else {
      // Next challenge
      const nextChallenge = selectedExam.challenges[nextIndex];
      const updatedSession: PracticalExamSession = {
        ...session,
        challengeResults: newChallengeResults,
        totalPointsEarned: newTotalPoints,
        currentChallengeIndex: nextIndex,
      };
      setSession(updatedSession);
      setCurrentChallenge(nextChallenge);
      const result = startChallenge(updatedSession, nextIndex);
      setChallengeResult(result);
      setCommandHistory([]);
      setHintsUsed(0);
      setShowHint(null);
    }
  };

  const handleRequestHint = () => {
    if (!currentChallenge) return;

    const hintResult = getHint(currentChallenge, hintsUsed);
    if (hintResult) {
      setShowHint(hintResult.hint);
      setHintsUsed(prev => prev + 1);
    } else {
      setShowHint('No more hints available');
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedExam(null);
    setSession(null);
    setCurrentChallenge(null);
    setChallengeResult(null);
    setExamResult(null);
    setCommandHistory([]);
    setHintsUsed(0);
    setShowHint(null);
  };

  // Render exam list
  if (viewMode === 'list') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Practical Lab Exams</h2>
          {onClose && (
            <button onClick={onClose} style={styles.closeButton}>
              &times;
            </button>
          )}
        </div>

        <div style={styles.domainFilter}>
          <button
            onClick={() => setSelectedDomain(null)}
            style={{
              ...styles.filterButton,
              ...(selectedDomain === null ? styles.filterButtonActive : {}),
            }}
          >
            All
          </button>
          {['domain1', 'domain2', 'domain3', 'domain4', 'domain5'].map(domain => (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              style={{
                ...styles.filterButton,
                ...(selectedDomain === domain ? styles.filterButtonActive : {}),
              }}
            >
              {DOMAIN_NAMES[domain]}
            </button>
          ))}
        </div>

        <div style={styles.examList}>
          {filteredExams.map(exam => (
            <div
              key={exam.id}
              style={styles.examCard}
              onClick={() => handleSelectExam(exam)}
            >
              <div style={styles.examHeader}>
                <h3 style={styles.examTitle}>{exam.title}</h3>
                <span
                  style={{
                    ...styles.difficultyBadge,
                    backgroundColor: DIFFICULTY_COLORS[exam.difficulty],
                  }}
                >
                  {exam.difficulty}
                </span>
              </div>
              <p style={styles.examDescription}>{exam.description}</p>
              <div style={styles.examMeta}>
                <span>{DOMAIN_NAMES[exam.domain]}</span>
                <span>{exam.timeLimitMinutes} min</span>
                <span>{exam.challenges.length} challenges</span>
                <span>{exam.totalPoints} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render exam details
  if (viewMode === 'exam' && selectedExam) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={handleBackToList} style={styles.backButton}>
            &larr; Back
          </button>
          <h2 style={styles.title}>{selectedExam.title}</h2>
        </div>

        <div style={styles.examDetails}>
          <div style={styles.examInfo}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Domain:</span>
              <span>{DOMAIN_NAMES[selectedExam.domain]}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Difficulty:</span>
              <span
                style={{
                  color: DIFFICULTY_COLORS[selectedExam.difficulty],
                  fontWeight: 'bold',
                }}
              >
                {selectedExam.difficulty}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Time Limit:</span>
              <span>{selectedExam.timeLimitMinutes} minutes</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Passing Score:</span>
              <span>{selectedExam.passingScore}%</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Total Points:</span>
              <span>{selectedExam.totalPoints}</span>
            </div>
          </div>

          <p style={styles.examDescription}>{selectedExam.description}</p>

          <h3 style={styles.sectionTitle}>Challenges</h3>
          <div style={styles.challengeList}>
            {selectedExam.challenges.map((challenge, index) => (
              <div key={challenge.id} style={styles.challengePreview}>
                <span style={styles.challengeNumber}>{index + 1}</span>
                <div>
                  <h4 style={styles.challengeTitle}>{challenge.title}</h4>
                  <p style={styles.challengeDescription}>{challenge.description}</p>
                  <span style={styles.challengePoints}>{challenge.points} pts</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleStartExam} style={styles.startButton}>
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  // Render active challenge
  if (viewMode === 'challenge' && session && currentChallenge && challengeResult) {
    const completedObjectives = challengeResult.objectiveResults.filter(o => o.completed).length;
    const totalObjectives = challengeResult.objectiveResults.length;

    return (
      <div style={styles.container}>
        <div style={styles.challengeHeader}>
          <div style={styles.timer}>
            <span style={timeRemaining < 300 ? styles.timerWarning : undefined}>
              {formatExamTime(timeRemaining)}
            </span>
          </div>
          <div style={styles.progress}>
            Challenge {session.currentChallengeIndex + 1} / {selectedExam!.challenges.length}
          </div>
          <div style={styles.score}>
            {session.totalPointsEarned} / {session.totalPointsPossible} pts
          </div>
        </div>

        <div style={styles.challengeContent}>
          <h3 style={styles.challengeTitle}>{currentChallenge.title}</h3>
          <p style={styles.challengeDescription}>{currentChallenge.description}</p>

          <div style={styles.scenarioBox}>
            <h4>Scenario</h4>
            <pre style={styles.scenarioText}>{currentChallenge.scenario}</pre>
          </div>

          <div style={styles.objectivesBox}>
            <h4>
              Objectives ({completedObjectives}/{totalObjectives})
            </h4>
            {challengeResult.objectiveResults.map(obj => {
              const objective = currentChallenge.objectives.find(o => o.id === obj.objectiveId);
              return (
                <div
                  key={obj.objectiveId}
                  style={{
                    ...styles.objective,
                    ...(obj.completed ? styles.objectiveComplete : {}),
                  }}
                >
                  <span style={styles.objectiveCheck}>
                    {obj.completed ? '✓' : '○'}
                  </span>
                  <span>{objective?.description}</span>
                  <span style={styles.objectivePoints}>
                    {obj.completed ? obj.pointsEarned : objective?.points} pts
                  </span>
                </div>
              );
            })}
          </div>

          <div style={styles.terminalBox}>
            <div style={styles.terminalOutput}>
              {commandHistory.map((entry, index) => (
                <div key={index}>
                  <div style={styles.commandLine}>
                    <span style={styles.prompt}>root@dgx-01:~# </span>
                    {entry.command}
                  </div>
                  <pre style={styles.outputText}>{entry.output}</pre>
                </div>
              ))}
            </div>
            <form onSubmit={handleCommandSubmit} style={styles.commandForm}>
              <span style={styles.prompt}>root@dgx-01:~# </span>
              <input
                type="text"
                value={commandInput}
                onChange={e => setCommandInput(e.target.value)}
                style={styles.commandInput}
                placeholder="Enter command..."
                autoFocus
              />
            </form>
          </div>

          <div style={styles.hintBox}>
            {showHint && <div style={styles.hintText}>{showHint}</div>}
            <button
              onClick={handleRequestHint}
              style={styles.hintButton}
              disabled={hintsUsed >= currentChallenge.hints.length}
            >
              Request Hint ({hintsUsed}/{currentChallenge.hints.length}) - 10% penalty each
            </button>
          </div>

          <div style={styles.challengeActions}>
            <button onClick={handleNextChallenge} style={styles.skipButton}>
              {session.currentChallengeIndex + 1 >= selectedExam!.challenges.length
                ? 'Finish Exam'
                : 'Skip Challenge'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render exam result
  if (viewMode === 'result' && examResult && session) {
    return (
      <div style={styles.container}>
        <div style={styles.resultHeader}>
          <h2 style={examResult.passed ? styles.passedTitle : styles.failedTitle}>
            {examResult.passed ? 'Exam Passed!' : 'Exam Not Passed'}
          </h2>
        </div>

        <div style={styles.resultContent}>
          <div style={styles.scoreDisplay}>
            <div style={styles.bigScore}>{examResult.percentage}%</div>
            <div style={styles.scoreDetails}>
              {examResult.score} / {selectedExam!.totalPoints} points
            </div>
            <div style={styles.passingNote}>
              Passing score: {selectedExam!.passingScore}%
            </div>
          </div>

          <div style={styles.feedbackBox}>
            <h4>Feedback</h4>
            {examResult.feedback.map((fb, index) => (
              <p key={index} style={styles.feedbackItem}>
                {fb}
              </p>
            ))}
          </div>

          {examResult.recommendations.length > 0 && (
            <div style={styles.recommendationsBox}>
              <h4>Recommendations</h4>
              <ul>
                {examResult.recommendations.map((rec, index) => (
                  <li key={index} style={styles.recommendationItem}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={styles.challengeResults}>
            <h4>Challenge Breakdown</h4>
            {session.challengeResults.map((result, index) => {
              const challenge = selectedExam!.challenges[index];
              return (
                <div key={result.challengeId} style={styles.challengeResultRow}>
                  <span style={styles.challengeResultName}>{challenge.title}</span>
                  <span style={styles.challengeResultScore}>
                    {result.pointsEarned + result.timeBonusEarned} / {result.pointsPossible} pts
                    {result.timeBonusEarned > 0 && (
                      <span style={styles.timeBonus}> (+{result.timeBonusEarned} time bonus)</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <button onClick={handleBackToList} style={styles.returnButton}>
            Return to Exam List
          </button>
        </div>
      </div>
    );
  }

  return null;
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #444',
    paddingBottom: '15px',
  },
  title: {
    margin: 0,
    color: '#76b900',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
  },
  backButton: {
    background: 'none',
    border: '1px solid #555',
    color: '#e0e0e0',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '15px',
  },
  domainFilter: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#333',
    border: '1px solid #555',
    color: '#e0e0e0',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  filterButtonActive: {
    backgroundColor: '#76b900',
    borderColor: '#76b900',
    color: '#fff',
  },
  examList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  examCard: {
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '15px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  examHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  examTitle: {
    margin: 0,
    color: '#fff',
  },
  difficultyBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  examDescription: {
    color: '#aaa',
    marginBottom: '10px',
  },
  examMeta: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: '#888',
  },
  examDetails: {
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '8px',
  },
  examInfo: {
    marginBottom: '20px',
  },
  infoRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '8px',
  },
  infoLabel: {
    color: '#888',
    minWidth: '120px',
  },
  sectionTitle: {
    color: '#76b900',
    marginTop: '20px',
    marginBottom: '15px',
  },
  challengeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  challengePreview: {
    display: 'flex',
    gap: '15px',
    padding: '10px',
    backgroundColor: '#333',
    borderRadius: '4px',
  },
  challengeNumber: {
    width: '30px',
    height: '30px',
    backgroundColor: '#76b900',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  challengeTitle: {
    margin: '0 0 5px 0',
    color: '#fff',
  },
  challengeDescription: {
    margin: '0 0 5px 0',
    color: '#aaa',
    fontSize: '14px',
  },
  challengePoints: {
    color: '#76b900',
    fontSize: '13px',
  },
  startButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  challengeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    backgroundColor: '#2a2a2a',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  timer: {
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  timerWarning: {
    color: '#F44336',
  },
  progress: {
    color: '#888',
  },
  score: {
    color: '#76b900',
    fontWeight: 'bold',
  },
  challengeContent: {
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '8px',
  },
  scenarioBox: {
    backgroundColor: '#333',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  scenarioText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  objectivesBox: {
    backgroundColor: '#333',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  objective: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    borderRadius: '4px',
    marginBottom: '5px',
  },
  objectiveComplete: {
    backgroundColor: 'rgba(118, 185, 0, 0.2)',
  },
  objectiveCheck: {
    width: '20px',
    color: '#76b900',
  },
  objectivePoints: {
    marginLeft: 'auto',
    color: '#888',
    fontSize: '13px',
  },
  terminalBox: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #444',
    borderRadius: '4px',
    marginBottom: '15px',
    maxHeight: '300px',
    overflow: 'auto',
  },
  terminalOutput: {
    padding: '10px',
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  commandLine: {
    color: '#e0e0e0',
  },
  prompt: {
    color: '#76b900',
  },
  outputText: {
    margin: '5px 0 15px 0',
    color: '#aaa',
    whiteSpace: 'pre-wrap',
  },
  commandForm: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    borderTop: '1px solid #333',
    fontFamily: 'monospace',
  },
  commandInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '13px',
    fontFamily: 'monospace',
    outline: 'none',
  },
  hintBox: {
    marginBottom: '15px',
  },
  hintText: {
    backgroundColor: '#3a3a00',
    border: '1px solid #666600',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '10px',
    color: '#ffcc00',
  },
  hintButton: {
    padding: '8px 16px',
    backgroundColor: '#444',
    border: '1px solid #666',
    borderRadius: '4px',
    color: '#e0e0e0',
    cursor: 'pointer',
  },
  challengeActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  skipButton: {
    padding: '10px 20px',
    backgroundColor: '#555',
    border: 'none',
    borderRadius: '4px',
    color: '#e0e0e0',
    cursor: 'pointer',
  },
  resultHeader: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  passedTitle: {
    color: '#76b900',
    fontSize: '32px',
  },
  failedTitle: {
    color: '#F44336',
    fontSize: '32px',
  },
  resultContent: {
    backgroundColor: '#2a2a2a',
    padding: '20px',
    borderRadius: '8px',
  },
  scoreDisplay: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  bigScore: {
    fontSize: '64px',
    fontWeight: 'bold',
    color: '#76b900',
  },
  scoreDetails: {
    fontSize: '18px',
    color: '#aaa',
  },
  passingNote: {
    fontSize: '14px',
    color: '#888',
    marginTop: '5px',
  },
  feedbackBox: {
    backgroundColor: '#333',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  feedbackItem: {
    margin: '10px 0',
  },
  recommendationsBox: {
    backgroundColor: '#333',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  recommendationItem: {
    marginBottom: '8px',
  },
  challengeResults: {
    backgroundColor: '#333',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  challengeResultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #444',
  },
  challengeResultName: {
    color: '#e0e0e0',
  },
  challengeResultScore: {
    color: '#76b900',
  },
  timeBonus: {
    color: '#ffcc00',
    fontSize: '12px',
  },
  returnButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default PracticalExams;
