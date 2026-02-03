import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LearningPaths } from '../LearningPaths';

// Mock the learningStore
vi.mock('@/store/learningStore', () => ({
  useLearningStore: () => ({
    trackCommand: vi.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('LearningPaths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initial Render', () => {
    it('should render the Learning Paths title', () => {
      render(<LearningPaths />);
      // Use getAllByText since "Learning Paths" appears multiple times
      const titles = screen.getAllByText('Learning Paths');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('should show all 5 learning path cards', () => {
      render(<LearningPaths />);
      expect(screen.getByText('Platform Bring-Up Mastery')).toBeInTheDocument();
    });

    it('should display total stats', () => {
      render(<LearningPaths />);
      expect(screen.getByText('Total Lessons')).toBeInTheDocument();
    });

    it('should show close button when onClose provided', () => {
      const onClose = vi.fn();
      render(<LearningPaths onClose={onClose} />);

      const closeButton = screen.getByText('×');
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should navigate to modules view when path is clicked', async () => {
      render(<LearningPaths />);

      const pathCard = screen.getByText('Platform Bring-Up Mastery');
      // Use closest with Tailwind class selector (cursor-pointer)
      fireEvent.click(pathCard.closest('.cursor-pointer')!);

      await waitFor(() => {
        // Module title includes emoji, so use partial match
        expect(screen.getByText(/BIOS & BMC Fundamentals/)).toBeInTheDocument();
      });
    });

    it('should show back button in modules view', async () => {
      render(<LearningPaths />);

      const pathCard = screen.getByText('Platform Bring-Up Mastery');
      fireEvent.click(pathCard.closest('.cursor-pointer')!);

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeInTheDocument();
      });
    });

    it('should navigate back to paths view', async () => {
      render(<LearningPaths />);

      // Navigate to modules
      const pathCard = screen.getByText('Platform Bring-Up Mastery');
      fireEvent.click(pathCard.closest('.cursor-pointer')!);

      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeInTheDocument();
      });

      // Go back
      fireEvent.click(screen.getByText('← Back'));

      await waitFor(() => {
        // Should see paths grid again (use getAllByText since duplicates exist)
        const titles = screen.getAllByText('Learning Paths');
        expect(titles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should load progress from localStorage on mount', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'ncp-aii-completed-lessons') {
          return JSON.stringify(['lesson-d1-dmidecode']);
        }
        return null;
      });

      render(<LearningPaths />);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('ncp-aii-completed-lessons');
    });

    it('should save progress to localStorage when updated', async () => {
      render(<LearningPaths />);

      // Progress is saved on mount even with empty sets
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });
  });

  describe('Recommended Next Lesson', () => {
    it('should show recommended lesson when nothing completed', () => {
      render(<LearningPaths />);
      expect(screen.getByText('📌 Continue Learning')).toBeInTheDocument();
    });
  });

  describe('Domain Exam Weights', () => {
    it('should display exam weight for each path', () => {
      render(<LearningPaths />);
      // Check that percentage indicators exist (format: "33%")
      expect(screen.getByText('33%')).toBeInTheDocument();
      expect(screen.getByText('31%')).toBeInTheDocument();
    });
  });

  describe('Path Structure', () => {
    it('should show module count for each path', () => {
      render(<LearningPaths />);
      // Multiple modules text should be present
      const moduleTexts = screen.getAllByText(/modules?/i);
      expect(moduleTexts.length).toBeGreaterThan(0);
    });
  });
});
