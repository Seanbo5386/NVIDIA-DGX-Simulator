import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressAnalytics } from '../ProgressAnalytics';
import { createLearnerProfile, type LearnerProfile } from '../../utils/adaptiveLearning';

describe('ProgressAnalytics Component', () => {
  const createMockProfile = (overrides?: Partial<LearnerProfile>): LearnerProfile => {
    const base = createLearnerProfile('test-user');
    return {
      ...base,
      domainPerformance: {
        domain1: { questionsAnswered: 20, correctAnswers: 16, accuracy: 0.8, averageResponseTime: 30, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain2: { questionsAnswered: 10, correctAnswers: 8, accuracy: 0.8, averageResponseTime: 25, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain3: { questionsAnswered: 15, correctAnswers: 10, accuracy: 0.67, averageResponseTime: 35, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain4: { questionsAnswered: 25, correctAnswers: 20, accuracy: 0.8, averageResponseTime: 40, difficulty: 'medium', weakTopics: [], strongTopics: [] },
        domain5: { questionsAnswered: 8, correctAnswers: 5, accuracy: 0.625, averageResponseTime: 45, difficulty: 'easy', weakTopics: [], strongTopics: [] },
      },
      studyStreak: 5,
      totalQuestionsAnswered: 78,
      ...overrides,
    };
  };

  describe('Rendering', () => {
    it('should render the component', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
    });

    it('should display exam readiness section', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Exam Readiness')).toBeInTheDocument();
      expect(screen.getByText('Pass Chance')).toBeInTheDocument();
    });

    it('should display improvement trend section', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Improvement Trend')).toBeInTheDocument();
    });

    it('should display domain performance section', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Domain Performance')).toBeInTheDocument();
    });

    it('should display spaced repetition section', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
    });

    it('should display overall statistics section', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Overall Statistics')).toBeInTheDocument();
    });
  });

  describe('Pass Probability', () => {
    it('should show pass probability percentage', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      // Should show a percentage
      const percentElements = screen.getAllByText(/%$/);
      expect(percentElements.length).toBeGreaterThan(0);
    });

    it('should show predicted score', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Predicted Score:')).toBeInTheDocument();
    });

    it('should show passing score', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Passing Score:')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('should show confidence level', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Confidence:')).toBeInTheDocument();
    });

    it('should show weak domains if any', () => {
      const profile = createMockProfile();
      // Make domain5 weak
      profile.domainPerformance.domain5 = {
        questionsAnswered: 20,
        correctAnswers: 8,
        accuracy: 0.4,
        averageResponseTime: 45,
        difficulty: 'easy',
        weakTopics: [],
        strongTopics: [],
      };

      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Focus Areas:')).toBeInTheDocument();
    });
  });

  describe('Improvement Trend', () => {
    it('should show trend indicator', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      // Should show one of: Improving, Stable, or Declining
      const trendTexts = ['Improving', 'Stable', 'Declining'];
      const hasTrend = trendTexts.some(text => {
        try {
          screen.getByText(text);
          return true;
        } catch {
          return false;
        }
      });
      expect(hasTrend).toBe(true);
    });

    it('should show recent and previous averages', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Recent Average')).toBeInTheDocument();
      expect(screen.getByText('Previous Average')).toBeInTheDocument();
    });

    it('should show change percentage', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Change')).toBeInTheDocument();
    });
  });

  describe('Domain Performance', () => {
    it('should show all 5 domains', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      // Use getAllByText for domain names that may appear in multiple places (domain cards + weak domains)
      expect(screen.getAllByText('DGX System Platform Bring-Up').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Accelerator Configuration').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Base Infrastructure and Software').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Platform Validation and Testing').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Troubleshooting').length).toBeGreaterThanOrEqual(1);
    });

    it('should show domain weights', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('31%')).toBeInTheDocument();
      expect(screen.getByText('5%')).toBeInTheDocument();
      expect(screen.getByText('19%')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
      expect(screen.getByText('12%')).toBeInTheDocument();
    });

    it('should show question counts', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('20 questions')).toBeInTheDocument();
      expect(screen.getByText('16 correct')).toBeInTheDocument();
    });
  });

  describe('Spaced Repetition', () => {
    it('should show review queue categories', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Due Now')).toBeInTheDocument();
      expect(screen.getByText('Due Today')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });

    it('should show review counts', () => {
      const profile = createMockProfile();
      // Add some question history
      const now = Date.now();
      profile.questionHistory = [
        {
          questionId: 'q1',
          domain: 'domain1',
          difficulty: 'medium',
          timesAnswered: 1,
          timesCorrect: 1,
          consecutiveCorrect: 1,
          lastAnswered: now - 1000,
          nextReviewDue: now - 3600000, // 1 hour ago
          easeFactor: 2.5,
          interval: 1,
        },
      ];

      render(<ProgressAnalytics profile={profile} />);

      // Should show at least the overdue count
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });
  });

  describe('Overall Statistics', () => {
    it('should show total questions', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Total Questions')).toBeInTheDocument();
    });

    it('should show overall accuracy', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Overall Accuracy')).toBeInTheDocument();
    });

    it('should show study streak', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Day Streak')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show current difficulty', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Current Difficulty')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
    });
  });

  describe('Recommendations', () => {
    it('should show recommendations when available', () => {
      const profile = createMockProfile();
      // Create a profile with weak domain to trigger recommendations
      profile.domainPerformance.domain4 = {
        questionsAnswered: 30,
        correctAnswers: 12,
        accuracy: 0.4,
        averageResponseTime: 45,
        difficulty: 'medium',
        weakTopics: [],
        strongTopics: [],
      };

      render(<ProgressAnalytics profile={profile} />);

      expect(screen.getByText('Recommendations')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('should show close button when onClose is provided', () => {
      const mockClose = vi.fn();
      const profile = createMockProfile();

      render(<ProgressAnalytics profile={profile} onClose={mockClose} />);

      const closeButton = screen.getByText('×');
      expect(closeButton).toBeInTheDocument();
    });

    it('should not show close button when onClose is not provided', () => {
      const profile = createMockProfile();
      render(<ProgressAnalytics profile={profile} />);

      expect(screen.queryByText('×')).not.toBeInTheDocument();
    });
  });

  describe('Performance History', () => {
    it('should calculate trend from provided history', () => {
      const profile = createMockProfile();
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      const performanceHistory = [
        { date: now - day * 10, accuracy: 0.5 },
        { date: now - day * 8, accuracy: 0.6 },
        { date: now - day * 5, accuracy: 0.7 },
        { date: now - day * 3, accuracy: 0.8 },
        { date: now - day * 1, accuracy: 0.9 },
      ];

      render(<ProgressAnalytics profile={profile} performanceHistory={performanceHistory} />);

      // Should show improving trend
      expect(screen.getByText('Improving')).toBeInTheDocument();
    });
  });
});

describe('ProgressAnalytics - Edge Cases', () => {
  it('should handle empty profile', () => {
    const profile = createLearnerProfile('empty');

    render(<ProgressAnalytics profile={profile} />);

    expect(screen.getByText('Progress Analytics')).toBeInTheDocument();
  });

  it('should handle profile with no questions answered', () => {
    const profile = createLearnerProfile('new-user');

    render(<ProgressAnalytics profile={profile} />);

    // Should still render all sections
    expect(screen.getByText('Exam Readiness')).toBeInTheDocument();
    expect(screen.getByText('Domain Performance')).toBeInTheDocument();
  });
});
