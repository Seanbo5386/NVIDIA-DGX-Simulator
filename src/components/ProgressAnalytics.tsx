import React, { useMemo } from 'react';
import {
  predictPassProbability,
  calculateImprovementTrend,
  getReviewQueue,
  getStudyRecommendations,
  type LearnerProfile,
  type DomainPerformance,
  type QuestionPerformance,
} from '../utils/adaptiveLearning';
import { DOMAIN_INFO, type DomainId } from '../utils/certificationResources';

interface ProgressAnalyticsProps {
  profile: LearnerProfile;
  performanceHistory?: { date: number; accuracy: number }[];
  onClose?: () => void;
}

const DOMAIN_WEIGHTS: Record<DomainId, number> = {
  domain1: 31,
  domain2: 5,
  domain3: 19,
  domain4: 33,
  domain5: 12,
};

const TREND_COLORS = {
  improving: '#4CAF50',
  stable: '#FF9800',
  declining: '#F44336',
};

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({
  profile,
  performanceHistory = [],
  onClose,
}) => {
  // Calculate pass probability
  const passPrediction = useMemo(() => {
    return predictPassProbability(
      profile.domainPerformance as Record<DomainId, DomainPerformance>,
      DOMAIN_WEIGHTS,
      70
    );
  }, [profile.domainPerformance]);

  // Calculate improvement trend
  const trend = useMemo(() => {
    if (performanceHistory.length === 0) {
      // Generate from profile data if no history provided
      const syntheticHistory = Object.values(profile.domainPerformance)
        .filter(d => d.questionsAnswered > 0)
        .map(d => ({
          date: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
          accuracy: d.accuracy,
        }));
      return calculateImprovementTrend(syntheticHistory);
    }
    return calculateImprovementTrend(performanceHistory);
  }, [performanceHistory, profile.domainPerformance]);

  // Get review queue
  const reviewQueue = useMemo(() => {
    return getReviewQueue(profile.questionHistory);
  }, [profile.questionHistory]);

  // Get recommendations
  const recommendations = useMemo(() => {
    return getStudyRecommendations(profile, DOMAIN_WEIGHTS);
  }, [profile]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const domains = Object.values(profile.domainPerformance);
    const totalQuestions = domains.reduce((sum, d) => sum + d.questionsAnswered, 0);
    const totalCorrect = domains.reduce((sum, d) => sum + d.correctAnswers, 0);
    const overallAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

    return {
      totalQuestions,
      totalCorrect,
      overallAccuracy,
      studyStreak: profile.studyStreak,
    };
  }, [profile]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Progress Analytics</h2>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            &times;
          </button>
        )}
      </div>

      {/* Pass Probability Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Exam Readiness</h3>
        <div style={styles.probabilityCard}>
          <div style={styles.probabilityMain}>
            <div style={styles.probabilityCircle}>
              <svg viewBox="0 0 100 100" style={styles.probabilitySvg}>
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#333"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={getProbabilityColor(passPrediction.probability)}
                  strokeWidth="8"
                  strokeDasharray={`${passPrediction.probability * 283} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div style={styles.probabilityText}>
                <span style={styles.probabilityPercent}>
                  {Math.round(passPrediction.probability * 100)}%
                </span>
                <span style={styles.probabilityLabel}>Pass Chance</span>
              </div>
            </div>
            <div style={styles.probabilityDetails}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Predicted Score:</span>
                <span style={styles.detailValue}>
                  {passPrediction.predictedScore.toFixed(0)}%
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Passing Score:</span>
                <span style={styles.detailValue}>70%</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Confidence:</span>
                <span style={styles.detailValue}>
                  {(passPrediction.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {passPrediction.weakestDomains.length > 0 && (
            <div style={styles.weakDomains}>
              <span style={styles.weakDomainsLabel}>Focus Areas:</span>
              {passPrediction.weakestDomains.map(domain => (
                <span key={domain} style={styles.weakDomainBadge}>
                  {DOMAIN_INFO[domain].name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Improvement Trend Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Improvement Trend</h3>
        <div style={styles.trendCard}>
          <div style={styles.trendIndicator}>
            <span
              style={{
                ...styles.trendArrow,
                color: TREND_COLORS[trend.trend],
                transform: trend.trend === 'improving' ? 'rotate(-45deg)' :
                           trend.trend === 'declining' ? 'rotate(45deg)' : 'none',
              }}
            >
              {trend.trend === 'stable' ? '→' : '↗'}
            </span>
            <span
              style={{
                ...styles.trendText,
                color: TREND_COLORS[trend.trend],
              }}
            >
              {trend.trend.charAt(0).toUpperCase() + trend.trend.slice(1)}
            </span>
          </div>
          <div style={styles.trendDetails}>
            <div style={styles.trendStat}>
              <span style={styles.trendStatLabel}>Recent Average</span>
              <span style={styles.trendStatValue}>
                {(trend.recentAverage * 100).toFixed(0)}%
              </span>
            </div>
            <div style={styles.trendStat}>
              <span style={styles.trendStatLabel}>Previous Average</span>
              <span style={styles.trendStatValue}>
                {(trend.previousAverage * 100).toFixed(0)}%
              </span>
            </div>
            <div style={styles.trendStat}>
              <span style={styles.trendStatLabel}>Change</span>
              <span
                style={{
                  ...styles.trendStatValue,
                  color: trend.changePercent > 0 ? '#4CAF50' :
                         trend.changePercent < 0 ? '#F44336' : '#888',
                }}
              >
                {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Simple trend visualization */}
          <div style={styles.trendChart}>
            <div style={styles.trendBar}>
              <div
                style={{
                  ...styles.trendBarFill,
                  width: `${trend.previousAverage * 100}%`,
                  backgroundColor: '#555',
                }}
              />
            </div>
            <div style={styles.trendBar}>
              <div
                style={{
                  ...styles.trendBarFill,
                  width: `${trend.recentAverage * 100}%`,
                  backgroundColor: TREND_COLORS[trend.trend],
                }}
              />
            </div>
            <div style={styles.trendLabels}>
              <span>Previous</span>
              <span>Recent</span>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Performance Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Domain Performance</h3>
        <div style={styles.domainGrid}>
          {(['domain1', 'domain2', 'domain3', 'domain4', 'domain5'] as DomainId[]).map(domainId => {
            const domain = DOMAIN_INFO[domainId];
            const perf = profile.domainPerformance[domainId];
            const accuracy = perf.accuracy * 100;
            const weight = DOMAIN_WEIGHTS[domainId];

            return (
              <div key={domainId} style={styles.domainCard}>
                <div style={styles.domainHeader}>
                  <span style={styles.domainName}>{domain.name}</span>
                  <span style={styles.domainWeight}>{weight}%</span>
                </div>
                <div style={styles.domainProgress}>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressBarFill,
                        width: `${accuracy}%`,
                        backgroundColor: getAccuracyColor(accuracy),
                      }}
                    />
                  </div>
                  <span style={styles.progressText}>{accuracy.toFixed(0)}%</span>
                </div>
                <div style={styles.domainStats}>
                  <span>{perf.questionsAnswered} questions</span>
                  <span>{perf.correctAnswers} correct</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Queue Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Spaced Repetition</h3>
        <div style={styles.reviewCard}>
          <div style={styles.reviewStats}>
            <div style={styles.reviewStat}>
              <span style={styles.reviewStatValue}>{reviewQueue.overdue.length}</span>
              <span style={styles.reviewStatLabel}>Overdue</span>
            </div>
            <div style={styles.reviewStat}>
              <span style={styles.reviewStatValue}>{reviewQueue.dueNow.length}</span>
              <span style={styles.reviewStatLabel}>Due Now</span>
            </div>
            <div style={styles.reviewStat}>
              <span style={styles.reviewStatValue}>{reviewQueue.dueToday.length}</span>
              <span style={styles.reviewStatLabel}>Due Today</span>
            </div>
            <div style={styles.reviewStat}>
              <span style={styles.reviewStatValue}>{reviewQueue.dueTomorrow.length}</span>
              <span style={styles.reviewStatLabel}>Tomorrow</span>
            </div>
          </div>
          {reviewQueue.totalDue > 0 && (
            <div style={styles.reviewAlert}>
              {reviewQueue.totalDue} questions ready for review
            </div>
          )}
        </div>
      </div>

      {/* Overall Stats Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Overall Statistics</h3>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{overallStats.totalQuestions}</span>
            <span style={styles.statLabel}>Total Questions</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>
              {(overallStats.overallAccuracy * 100).toFixed(0)}%
            </span>
            <span style={styles.statLabel}>Overall Accuracy</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{overallStats.studyStreak}</span>
            <span style={styles.statLabel}>Day Streak</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{profile.currentDifficulty}</span>
            <span style={styles.statLabel}>Current Difficulty</span>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Recommendations</h3>
          <div style={styles.recommendationsList}>
            {recommendations.map((rec, index) => (
              <div key={index} style={styles.recommendationItem}>
                <span style={styles.recommendationIcon}>💡</span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function getProbabilityColor(probability: number): string {
  if (probability >= 0.8) return '#4CAF50';
  if (probability >= 0.6) return '#76b900';
  if (probability >= 0.4) return '#FF9800';
  return '#F44336';
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return '#4CAF50';
  if (accuracy >= 70) return '#76b900';
  if (accuracy >= 50) return '#FF9800';
  return '#F44336';
}

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
  section: {
    marginBottom: '25px',
  },
  sectionTitle: {
    color: '#76b900',
    marginBottom: '15px',
    fontSize: '18px',
  },

  // Probability Card
  probabilityCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '20px',
  },
  probabilityMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
  },
  probabilityCircle: {
    position: 'relative' as const,
    width: '120px',
    height: '120px',
  },
  probabilitySvg: {
    width: '100%',
    height: '100%',
  },
  probabilityText: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center' as const,
  },
  probabilityPercent: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#fff',
  },
  probabilityLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#888',
  },
  probabilityDetails: {
    flex: 1,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #333',
  },
  detailLabel: {
    color: '#888',
  },
  detailValue: {
    color: '#fff',
    fontWeight: 'bold',
  },
  weakDomains: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #333',
  },
  weakDomainsLabel: {
    color: '#F44336',
    marginRight: '10px',
  },
  weakDomainBadge: {
    backgroundColor: '#3a2a2a',
    color: '#F44336',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    marginRight: '8px',
  },

  // Trend Card
  trendCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '20px',
  },
  trendIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  trendArrow: {
    fontSize: '32px',
    fontWeight: 'bold',
  },
  trendText: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  trendDetails: {
    display: 'flex',
    gap: '20px',
    marginBottom: '15px',
  },
  trendStat: {
    flex: 1,
    textAlign: 'center' as const,
  },
  trendStatLabel: {
    display: 'block',
    color: '#888',
    fontSize: '12px',
  },
  trendStatValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
  },
  trendChart: {
    marginTop: '10px',
  },
  trendBar: {
    height: '20px',
    backgroundColor: '#333',
    borderRadius: '4px',
    marginBottom: '8px',
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  trendLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#888',
  },

  // Domain Grid
  domainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
  },
  domainCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '15px',
  },
  domainHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  domainName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  domainWeight: {
    color: '#76b900',
    fontSize: '12px',
  },
  domainProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#333',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '4px',
  },
  progressText: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '40px',
    textAlign: 'right' as const,
  },
  domainStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#888',
  },

  // Review Card
  reviewCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '20px',
  },
  reviewStats: {
    display: 'flex',
    justifyContent: 'space-around',
  },
  reviewStat: {
    textAlign: 'center' as const,
  },
  reviewStatValue: {
    display: 'block',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#fff',
  },
  reviewStatLabel: {
    display: 'block',
    color: '#888',
    fontSize: '12px',
  },
  reviewAlert: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#3a3a00',
    border: '1px solid #666600',
    borderRadius: '4px',
    color: '#ffcc00',
    textAlign: 'center' as const,
  },

  // Stats Grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
  },
  statCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '15px',
    textAlign: 'center' as const,
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#76b900',
    textTransform: 'capitalize' as const,
  },
  statLabel: {
    display: 'block',
    color: '#888',
    fontSize: '12px',
    marginTop: '5px',
  },

  // Recommendations
  recommendationsList: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '15px',
  },
  recommendationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 0',
    borderBottom: '1px solid #333',
  },
  recommendationIcon: {
    fontSize: '16px',
  },
};

export default ProgressAnalytics;
