import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateNextReview,
  getDueReviews,
  initializeReview,
  generateReviewQuestion,
  recordReviewResult,
  getUpcomingReviewCount,
  getReviewStats,
  REVIEW_INTERVALS,
  MS_PER_DAY,
  type ReviewScheduleEntry,
  type CommandFamily,
} from "../spacedRepetition";

describe("Spaced Repetition - Constants", () => {
  it("should have correct review intervals", () => {
    expect(REVIEW_INTERVALS).toEqual([1, 3, 7, 14, 30, 60, 120]);
  });

  it("should have correct MS_PER_DAY value", () => {
    expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000);
  });
});

describe("Spaced Repetition - calculateNextReview", () => {
  it("should return 1 day interval for first review (0 consecutive successes)", () => {
    const now = Date.now();
    const result = calculateNextReview(now, 0, 1);

    expect(result.newInterval).toBe(1);
    expect(result.nextReviewDate).toBe(now + MS_PER_DAY);
  });

  it("should follow interval progression based on consecutive successes", () => {
    const now = Date.now();

    // Test each interval in the progression
    expect(calculateNextReview(now, 0, 0).newInterval).toBe(1);
    expect(calculateNextReview(now, 1, 1).newInterval).toBe(3);
    expect(calculateNextReview(now, 2, 3).newInterval).toBe(7);
    expect(calculateNextReview(now, 3, 7).newInterval).toBe(14);
    expect(calculateNextReview(now, 4, 14).newInterval).toBe(30);
    expect(calculateNextReview(now, 5, 30).newInterval).toBe(60);
    expect(calculateNextReview(now, 6, 60).newInterval).toBe(120);
  });

  it("should cap at maximum interval for high consecutive successes", () => {
    const now = Date.now();
    const result = calculateNextReview(now, 100, 120);

    expect(result.newInterval).toBe(120);
    expect(result.nextReviewDate).toBe(now + 120 * MS_PER_DAY);
  });

  it("should calculate nextReviewDate correctly", () => {
    const now = Date.now();
    const result = calculateNextReview(now, 2, 3);

    expect(result.nextReviewDate).toBe(now + 7 * MS_PER_DAY);
  });
});

describe("Spaced Repetition - getDueReviews", () => {
  it("should return empty array for empty schedule", () => {
    const result = getDueReviews({});
    expect(result).toEqual([]);
  });

  it("should return families where nextReviewDate <= now", () => {
    const now = Date.now();
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: now - 1000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: now + 86400000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family3: {
        familyId: "family3",
        nextReviewDate: now,
        interval: 1,
        consecutiveSuccesses: 0,
      },
    };

    const result = getDueReviews(schedule);

    expect(result).toContain("family1");
    expect(result).toContain("family3");
    expect(result).not.toContain("family2");
    expect(result.length).toBe(2);
  });

  it("should sort by most overdue first", () => {
    const now = Date.now();
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: now - 1000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: now - 5000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family3: {
        familyId: "family3",
        nextReviewDate: now - 3000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
    };

    const result = getDueReviews(schedule);

    expect(result).toEqual(["family2", "family3", "family1"]);
  });

  it("should return all families if all are due", () => {
    const now = Date.now();
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: now - 1000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: now - 2000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
    };

    const result = getDueReviews(schedule);

    expect(result.length).toBe(2);
  });

  it("should return empty array if nothing is due", () => {
    const now = Date.now();
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: now + 86400000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: now + 172800000,
        interval: 3,
        consecutiveSuccesses: 1,
      },
    };

    const result = getDueReviews(schedule);

    expect(result).toEqual([]);
  });
});

describe("Spaced Repetition - initializeReview", () => {
  it("should create entry with correct familyId", () => {
    const entry = initializeReview("container-commands");
    expect(entry.familyId).toBe("container-commands");
  });

  it("should set nextReviewDate to 1 day from now", () => {
    const before = Date.now();
    const entry = initializeReview("test-family");
    const after = Date.now();

    expect(entry.nextReviewDate).toBeGreaterThanOrEqual(before + MS_PER_DAY);
    expect(entry.nextReviewDate).toBeLessThanOrEqual(after + MS_PER_DAY);
  });

  it("should set interval to 1", () => {
    const entry = initializeReview("test-family");
    expect(entry.interval).toBe(1);
  });

  it("should set consecutiveSuccesses to 0", () => {
    const entry = initializeReview("test-family");
    expect(entry.consecutiveSuccesses).toBe(0);
  });
});

describe("Spaced Repetition - generateReviewQuestion", () => {
  const mockFamilies: CommandFamily[] = [
    {
      id: "networking",
      name: "Networking Commands",
      tools: [
        {
          name: "ping",
          bestFor: "test network connectivity",
          tagline: "Test network connectivity",
        },
        {
          name: "traceroute",
          bestFor: "trace packet routes",
          tagline: "Trace network path",
        },
        {
          name: "netstat",
          bestFor: "view network statistics",
          tagline: "Display network statistics",
        },
      ],
    },
    {
      id: "containers",
      name: "Container Commands",
      tools: [
        {
          name: "docker run",
          bestFor: "start a container",
          tagline: "Run a container",
        },
        {
          name: "docker ps",
          bestFor: "list running containers",
          tagline: "List containers",
        },
      ],
    },
  ];

  it("should return a question for existing family", () => {
    const question = generateReviewQuestion("networking", mockFamilies);

    expect(question.familyId).toBe("networking");
    expect(question.scenario).toBeTruthy();
    expect(question.choices.length).toBe(3);
    expect(question.correctAnswer).toBeTruthy();
    expect(question.explanation).toBeTruthy();
  });

  it("should include all tools as choices", () => {
    const question = generateReviewQuestion("networking", mockFamilies);

    expect(question.choices).toContain("ping");
    expect(question.choices).toContain("traceroute");
    expect(question.choices).toContain("netstat");
  });

  it("should have correctAnswer that is in choices", () => {
    const question = generateReviewQuestion("networking", mockFamilies);

    expect(question.choices).toContain(question.correctAnswer);
  });

  it("should include family name in scenario", () => {
    const question = generateReviewQuestion("containers", mockFamilies);

    expect(question.scenario).toContain("Container Commands");
  });

  it("should return placeholder for non-existent family", () => {
    const question = generateReviewQuestion("nonexistent", mockFamilies);

    expect(question.familyId).toBe("nonexistent");
    expect(question.scenario).toContain("not found");
    expect(question.choices).toEqual([]);
    expect(question.correctAnswer).toBe("");
  });

  it("should return placeholder for family with no tools", () => {
    const emptyFamily: CommandFamily[] = [
      { id: "empty", name: "Empty Family", tools: [] },
    ];
    const question = generateReviewQuestion("empty", emptyFamily);

    expect(question.scenario).toContain("not found");
    expect(question.choices).toEqual([]);
  });

  it("should generate different questions on multiple calls (randomness)", () => {
    // Run multiple times to check randomness
    const answers = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const question = generateReviewQuestion("networking", mockFamilies);
      answers.add(question.correctAnswer);
    }

    // With 3 tools and 50 iterations, we should see more than 1 different answer
    // (statistically very likely)
    expect(answers.size).toBeGreaterThan(1);
  });
});

describe("Spaced Repetition - recordReviewResult", () => {
  let baseEntry: ReviewScheduleEntry;

  beforeEach(() => {
    baseEntry = {
      familyId: "test-family",
      nextReviewDate: Date.now(),
      interval: 1,
      consecutiveSuccesses: 0,
    };
  });

  describe("on success", () => {
    it("should increment consecutiveSuccesses", () => {
      const result = recordReviewResult(baseEntry, true);
      expect(result.consecutiveSuccesses).toBe(1);
    });

    it("should update interval based on new consecutive successes", () => {
      const result = recordReviewResult(baseEntry, true);
      expect(result.interval).toBe(3); // 1 consecutive success = index 1 = 3 days
    });

    it("should calculate nextReviewDate based on new interval", () => {
      const before = Date.now();
      const result = recordReviewResult(baseEntry, true);
      const after = Date.now();

      // New interval should be 3 days (index 1)
      expect(result.nextReviewDate).toBeGreaterThanOrEqual(
        before + 3 * MS_PER_DAY,
      );
      expect(result.nextReviewDate).toBeLessThanOrEqual(after + 3 * MS_PER_DAY);
    });

    it("should progress through intervals correctly", () => {
      let entry = baseEntry;

      // First success: 0 -> 1 consecutive, interval 3
      entry = recordReviewResult(entry, true);
      expect(entry.consecutiveSuccesses).toBe(1);
      expect(entry.interval).toBe(3);

      // Second success: 1 -> 2 consecutive, interval 7
      entry = recordReviewResult(entry, true);
      expect(entry.consecutiveSuccesses).toBe(2);
      expect(entry.interval).toBe(7);

      // Third success: 2 -> 3 consecutive, interval 14
      entry = recordReviewResult(entry, true);
      expect(entry.consecutiveSuccesses).toBe(3);
      expect(entry.interval).toBe(14);
    });

    it("should preserve familyId", () => {
      const result = recordReviewResult(baseEntry, true);
      expect(result.familyId).toBe("test-family");
    });
  });

  describe("on failure", () => {
    it("should reset consecutiveSuccesses to 0", () => {
      const entryWithSuccesses: ReviewScheduleEntry = {
        ...baseEntry,
        consecutiveSuccesses: 5,
        interval: 60,
      };
      const result = recordReviewResult(entryWithSuccesses, false);
      expect(result.consecutiveSuccesses).toBe(0);
    });

    it("should reset interval to 1 day", () => {
      const entryWithInterval: ReviewScheduleEntry = {
        ...baseEntry,
        consecutiveSuccesses: 3,
        interval: 14,
      };
      const result = recordReviewResult(entryWithInterval, false);
      expect(result.interval).toBe(1);
    });

    it("should set nextReviewDate to 1 day from now", () => {
      const before = Date.now();
      const result = recordReviewResult(baseEntry, false);
      const after = Date.now();

      expect(result.nextReviewDate).toBeGreaterThanOrEqual(before + MS_PER_DAY);
      expect(result.nextReviewDate).toBeLessThanOrEqual(after + MS_PER_DAY);
    });

    it("should preserve familyId", () => {
      const result = recordReviewResult(baseEntry, false);
      expect(result.familyId).toBe("test-family");
    });
  });
});

describe("Spaced Repetition - getUpcomingReviewCount", () => {
  it("should return 0 for empty schedule", () => {
    const result = getUpcomingReviewCount({});
    expect(result).toBe(0);
  });

  it("should count reviews due within 24 hours by default", () => {
    const now = Date.now();
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: now - 1000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: now + MS_PER_DAY / 2,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family3: {
        familyId: "family3",
        nextReviewDate: now + MS_PER_DAY * 2,
        interval: 3,
        consecutiveSuccesses: 1,
      },
    };

    const result = getUpcomingReviewCount(schedule);
    expect(result).toBe(2);
  });

  it("should use custom window when provided", () => {
    const now = Date.now();
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: now + 1000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: now + 5000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family3: {
        familyId: "family3",
        nextReviewDate: now + 10000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
    };

    const result = getUpcomingReviewCount(schedule, 6000);
    expect(result).toBe(2);
  });
});

describe("Spaced Repetition - getReviewStats", () => {
  it("should return zeros for empty schedule", () => {
    const result = getReviewStats({});

    expect(result.totalFamilies).toBe(0);
    expect(result.dueNow).toBe(0);
    expect(result.dueToday).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.averageInterval).toBe(0);
  });

  it("should calculate totalFamilies correctly", () => {
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: Date.now() + MS_PER_DAY,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: Date.now() + MS_PER_DAY,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family3: {
        familyId: "family3",
        nextReviewDate: Date.now() + MS_PER_DAY,
        interval: 1,
        consecutiveSuccesses: 0,
      },
    };

    const result = getReviewStats(schedule);
    expect(result.totalFamilies).toBe(3);
  });

  it("should calculate dueNow correctly", () => {
    const now = Date.now();
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: now - 1000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: now - 2000,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family3: {
        familyId: "family3",
        nextReviewDate: now + MS_PER_DAY,
        interval: 1,
        consecutiveSuccesses: 0,
      },
    };

    const result = getReviewStats(schedule);
    expect(result.dueNow).toBe(2);
  });

  it("should find longestStreak", () => {
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: Date.now() + MS_PER_DAY,
        interval: 1,
        consecutiveSuccesses: 3,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: Date.now() + MS_PER_DAY,
        interval: 7,
        consecutiveSuccesses: 7,
      },
      family3: {
        familyId: "family3",
        nextReviewDate: Date.now() + MS_PER_DAY,
        interval: 3,
        consecutiveSuccesses: 1,
      },
    };

    const result = getReviewStats(schedule);
    expect(result.longestStreak).toBe(7);
  });

  it("should calculate averageInterval correctly", () => {
    const schedule: Record<string, ReviewScheduleEntry> = {
      family1: {
        familyId: "family1",
        nextReviewDate: Date.now() + MS_PER_DAY,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      family2: {
        familyId: "family2",
        nextReviewDate: Date.now() + MS_PER_DAY,
        interval: 7,
        consecutiveSuccesses: 2,
      },
      family3: {
        familyId: "family3",
        nextReviewDate: Date.now() + MS_PER_DAY,
        interval: 14,
        consecutiveSuccesses: 3,
      },
    };

    const result = getReviewStats(schedule);
    expect(result.averageInterval).toBeCloseTo((1 + 7 + 14) / 3);
  });
});

describe("Spaced Repetition - Integration", () => {
  it("should work through a complete review cycle", () => {
    // Initialize a new review
    const initial = initializeReview("test-family");
    expect(initial.consecutiveSuccesses).toBe(0);
    expect(initial.interval).toBe(1);

    // Simulate successful reviews
    let entry = initial;

    // First success
    entry = recordReviewResult(entry, true);
    expect(entry.consecutiveSuccesses).toBe(1);
    expect(entry.interval).toBe(3);

    // Second success
    entry = recordReviewResult(entry, true);
    expect(entry.consecutiveSuccesses).toBe(2);
    expect(entry.interval).toBe(7);

    // Third success
    entry = recordReviewResult(entry, true);
    expect(entry.consecutiveSuccesses).toBe(3);
    expect(entry.interval).toBe(14);

    // Failure resets everything
    entry = recordReviewResult(entry, false);
    expect(entry.consecutiveSuccesses).toBe(0);
    expect(entry.interval).toBe(1);
  });

  it("should correctly identify due reviews after time passes", () => {
    const now = Date.now();

    // Create entries at different stages
    const schedule: Record<string, ReviewScheduleEntry> = {
      justInitialized: {
        familyId: "justInitialized",
        nextReviewDate: now + MS_PER_DAY,
        interval: 1,
        consecutiveSuccesses: 0,
      },
      overdue: {
        familyId: "overdue",
        nextReviewDate: now - MS_PER_DAY * 2,
        interval: 7,
        consecutiveSuccesses: 2,
      },
      dueNow: {
        familyId: "dueNow",
        nextReviewDate: now - 1000,
        interval: 3,
        consecutiveSuccesses: 1,
      },
    };

    const dueReviews = getDueReviews(schedule);

    expect(dueReviews).toContain("overdue");
    expect(dueReviews).toContain("dueNow");
    expect(dueReviews).not.toContain("justInitialized");

    // Most overdue should be first
    expect(dueReviews[0]).toBe("overdue");
  });
});
