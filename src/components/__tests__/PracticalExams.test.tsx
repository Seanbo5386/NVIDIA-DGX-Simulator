import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PracticalExams } from '../PracticalExams';
import { PRACTICAL_EXAMS } from '../../utils/practicalExamEngine';

// Mock the practicalExamEngine to control exam data
vi.mock('../../utils/practicalExamEngine', async () => {
  const actual = await vi.importActual('../../utils/practicalExamEngine');
  return {
    ...actual,
  };
});

describe('PracticalExams Component', () => {
  const mockCommandSubmit = vi.fn().mockReturnValue({
    output: 'Command executed successfully',
    success: true,
  });

  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exam List View', () => {
    it('should render the exam list', () => {
      render(<PracticalExams />);
      expect(screen.getByText('Practical Lab Exams')).toBeInTheDocument();
    });

    it('should display all practical exams', () => {
      render(<PracticalExams />);
      PRACTICAL_EXAMS.forEach(exam => {
        expect(screen.getByText(exam.title)).toBeInTheDocument();
      });
    });

    it('should display domain filter buttons', () => {
      render(<PracticalExams />);
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Platform Bring-Up' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Troubleshooting' })).toBeInTheDocument();
    });

    it('should filter exams by domain', () => {
      render(<PracticalExams />);

      // Click domain5 (Troubleshooting) filter
      fireEvent.click(screen.getByRole('button', { name: 'Troubleshooting' }));

      // Should show troubleshooting exam
      expect(screen.getByText('GPU Troubleshooting Fundamentals')).toBeInTheDocument();
    });

    it('should display exam difficulty badges', () => {
      render(<PracticalExams />);
      // Each exam has a difficulty badge
      expect(screen.getAllByText(/beginner|intermediate|advanced/i).length).toBeGreaterThan(0);
    });

    it('should display exam metadata', () => {
      render(<PracticalExams />);
      // Check for time limit display
      expect(screen.getAllByText(/min/).length).toBeGreaterThan(0);
      // Check for points display
      expect(screen.getAllByText(/pts/).length).toBeGreaterThan(0);
    });

    it('should render close button when onClose is provided', () => {
      render(<PracticalExams onClose={mockClose} />);
      const closeButton = screen.getByText('×');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(<PracticalExams onClose={mockClose} />);
      fireEvent.click(screen.getByText('×'));
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Exam Details View', () => {
    it('should show exam details when exam is clicked', () => {
      render(<PracticalExams />);

      // Click on first exam
      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));

      // Should show details view with back button
      expect(screen.getByText('← Back')).toBeInTheDocument();
      // Should show passing score info
      expect(screen.getByText(/Passing Score:/)).toBeInTheDocument();
    });

    it('should display challenges list', () => {
      render(<PracticalExams />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));

      // Should show challenges section
      expect(screen.getByText('Challenges')).toBeInTheDocument();
    });

    it('should have start exam button', () => {
      render(<PracticalExams />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));

      expect(screen.getByText('Start Exam')).toBeInTheDocument();
    });

    it('should go back to list when back button is clicked', () => {
      render(<PracticalExams />);

      // Go to exam details
      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      expect(screen.getByText('Start Exam')).toBeInTheDocument();

      // Go back
      fireEvent.click(screen.getByText('← Back'));

      // Should be back at list view
      expect(screen.getByText('Practical Lab Exams')).toBeInTheDocument();
      expect(screen.queryByText('Start Exam')).not.toBeInTheDocument();
    });
  });

  describe('Challenge View', () => {
    it('should start exam and show first challenge', () => {
      render(<PracticalExams onCommandSubmit={mockCommandSubmit} />);

      // Select exam
      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));

      // Start exam
      fireEvent.click(screen.getByText('Start Exam'));

      // Should show challenge view with timer
      expect(screen.getByText(/Challenge \d+ \/ \d+/)).toBeInTheDocument();
    });

    it('should display objectives', () => {
      render(<PracticalExams onCommandSubmit={mockCommandSubmit} />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      fireEvent.click(screen.getByText('Start Exam'));

      // Should show objectives section
      expect(screen.getByText(/Objectives \(\d+\/\d+\)/)).toBeInTheDocument();
    });

    it('should have command input field', () => {
      render(<PracticalExams onCommandSubmit={mockCommandSubmit} />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      fireEvent.click(screen.getByText('Start Exam'));

      expect(screen.getByPlaceholderText('Enter command...')).toBeInTheDocument();
    });

    it('should submit command and show output', () => {
      render(<PracticalExams onCommandSubmit={mockCommandSubmit} />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      fireEvent.click(screen.getByText('Start Exam'));

      const input = screen.getByPlaceholderText('Enter command...');
      fireEvent.change(input, { target: { value: 'nvidia-smi' } });
      fireEvent.submit(input.closest('form')!);

      expect(mockCommandSubmit).toHaveBeenCalledWith('nvidia-smi');
    });

    it('should display hint button', () => {
      render(<PracticalExams onCommandSubmit={mockCommandSubmit} />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      fireEvent.click(screen.getByText('Start Exam'));

      expect(screen.getByText(/Request Hint/)).toBeInTheDocument();
    });

    it('should show hint when hint button is clicked', () => {
      render(<PracticalExams onCommandSubmit={mockCommandSubmit} />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      fireEvent.click(screen.getByText('Start Exam'));

      const hintButton = screen.getByText(/Request Hint/);
      fireEvent.click(hintButton);

      // Hint count should update
      expect(screen.getByText(/Request Hint \(1\//)).toBeInTheDocument();
    });

    it('should display skip/finish button', () => {
      render(<PracticalExams onCommandSubmit={mockCommandSubmit} />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      fireEvent.click(screen.getByText('Start Exam'));

      expect(screen.getByText(/Skip Challenge|Finish Exam/)).toBeInTheDocument();
    });
  });

  describe('Timer', () => {
    it('should display timer', () => {
      render(<PracticalExams onCommandSubmit={mockCommandSubmit} />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      fireEvent.click(screen.getByText('Start Exam'));

      // Timer should show time in MM:SS format
      expect(screen.getByText(/\d+:\d{2}/)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to next challenge on skip', async () => {
      render(<PracticalExams onCommandSubmit={mockCommandSubmit} />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      fireEvent.click(screen.getByText('Start Exam'));

      // Initially on challenge 1
      expect(screen.getByText('Challenge 1 / 4')).toBeInTheDocument();

      // Skip to next challenge
      fireEvent.click(screen.getByText('Skip Challenge'));

      await waitFor(() => {
        expect(screen.getByText('Challenge 2 / 4')).toBeInTheDocument();
      });
    });
  });

  describe('Standalone Mode', () => {
    it('should work without onCommandSubmit (mock output)', () => {
      render(<PracticalExams />);

      fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
      fireEvent.click(screen.getByText('Start Exam'));

      const input = screen.getByPlaceholderText('Enter command...');
      fireEvent.change(input, { target: { value: 'test command' } });
      fireEvent.submit(input.closest('form')!);

      // Should show simulated output
      expect(screen.getByText(/Simulated output for: test command/)).toBeInTheDocument();
    });
  });
});

describe('PracticalExams - Domain Filtering', () => {
  it('should show all exams when All filter is selected', () => {
    render(<PracticalExams />);

    // Initially all exams shown - check by exam titles (h3 elements)
    PRACTICAL_EXAMS.forEach(exam => {
      expect(screen.getByRole('heading', { name: exam.title, level: 3 })).toBeInTheDocument();
    });
  });

  it('should filter to show only matching domain exams', () => {
    render(<PracticalExams />);

    // Click domain2 filter
    fireEvent.click(screen.getByRole('button', { name: 'Accelerator Configuration' }));

    // Should show domain2 exam
    expect(screen.getByRole('heading', { name: 'MIG Configuration Challenge', level: 3 })).toBeInTheDocument();
  });

  it('should clear filter when All is clicked', () => {
    render(<PracticalExams />);

    // Apply filter
    fireEvent.click(screen.getByRole('button', { name: 'Troubleshooting' }));

    // Clear filter
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    // All exams should be visible
    PRACTICAL_EXAMS.forEach(exam => {
      expect(screen.getByRole('heading', { name: exam.title, level: 3 })).toBeInTheDocument();
    });
  });
});

describe('PracticalExams - Exam Flow', () => {
  const mockSubmit = vi.fn().mockReturnValue({ output: 'Output', success: true });

  it('should complete exam flow from start to finish', async () => {
    render(<PracticalExams onCommandSubmit={mockSubmit} />);

    // 1. Select exam from list
    fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));

    // 2. Start exam
    fireEvent.click(screen.getByText('Start Exam'));

    // 3. Skip through all challenges
    const exam = PRACTICAL_EXAMS.find(e => e.id === 'troubleshooting-101')!;

    for (let i = 0; i < exam.challenges.length - 1; i++) {
      fireEvent.click(screen.getByText('Skip Challenge'));
      await waitFor(() => {
        expect(screen.getByText(`Challenge ${i + 2} / ${exam.challenges.length}`)).toBeInTheDocument();
      });
    }

    // 4. Finish exam
    fireEvent.click(screen.getByText('Finish Exam'));

    // 5. Should show result
    await waitFor(() => {
      expect(screen.getByText(/Exam (Passed|Not Passed)/)).toBeInTheDocument();
    });
  });

  it('should return to list from result view', async () => {
    render(<PracticalExams onCommandSubmit={mockSubmit} />);

    // Go through exam
    fireEvent.click(screen.getByText('GPU Troubleshooting Fundamentals'));
    fireEvent.click(screen.getByText('Start Exam'));

    // Skip all challenges
    const exam = PRACTICAL_EXAMS.find(e => e.id === 'troubleshooting-101')!;
    for (let i = 0; i < exam.challenges.length; i++) {
      fireEvent.click(screen.getByText(i < exam.challenges.length - 1 ? 'Skip Challenge' : 'Finish Exam'));
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Wait for result view
    await waitFor(() => {
      expect(screen.getByText('Return to Exam List')).toBeInTheDocument();
    });

    // Return to list
    fireEvent.click(screen.getByText('Return to Exam List'));

    expect(screen.getByText('Practical Lab Exams')).toBeInTheDocument();
  });
});
