import { describe, it, expect } from "vitest";
import {
  isTierUnlocked,
  evaluateTierUnlock,
  selectGauntletScenarios,
  createEmptyTierProgressState,
  getCurrentTier,
  hasUsedAllTools,
  getToolProgress,
  FAMILY_TOOL_COUNTS,
  EXAM_DOMAIN_WEIGHTS,
  TIER_2_ACCURACY_THRESHOLD,
  DEFAULT_GAUNTLET_COUNT,
  type TierProgressState,
  type Scenario,
} from "../tierProgressionEngine";

// ============================================================================
// HELPER FUNCTIONS FOR TESTS
// ============================================================================

/**
 * Create a seeded random function for deterministic tests
 */
function createSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

/**
 * Create a state with specific configuration
 */
function createState(
  overrides: Partial<TierProgressState> = {},
): TierProgressState {
  return {
    ...createEmptyTierProgressState(),
    ...overrides,
  };
}

/**
 * Create sample scenarios for testing
 */
function createSampleScenarios(): Scenario[] {
  return [
    { id: "s1", domain: "domain1", tier: 1 },
    { id: "s2", domain: "domain1", tier: 2 },
    { id: "s3", domain: "domain1", tier: 3 },
    { id: "s4", domain: "domain2", tier: 2 },
    { id: "s5", domain: "domain3", tier: 2 },
    { id: "s6", domain: "domain3", tier: 3 },
    { id: "s7", domain: "domain4", tier: 2 },
    { id: "s8", domain: "domain4", tier: 2 },
    { id: "s9", domain: "domain4", tier: 3 },
    { id: "s10", domain: "domain5", tier: 2 },
    { id: "s11", domain: "domain5", tier: 3 },
    { id: "s12", domain: "domain4", tier: 2 },
  ];
}

// ============================================================================
// isTierUnlocked TESTS
// ============================================================================

describe("Tier Progression Engine - isTierUnlocked", () => {
  describe("Tier 1", () => {
    it("should always return true for tier 1", () => {
      const state = createEmptyTierProgressState();
      expect(isTierUnlocked("gpu-monitoring", 1, state)).toBe(true);
    });

    it("should return true for tier 1 even with empty state", () => {
      const state = createState();
      expect(isTierUnlocked("unknown-family", 1, state)).toBe(true);
    });
  });

  describe("Tier 2", () => {
    it("should return false without quiz passed", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: false, score: 0.5, attempts: 1 },
        },
      });
      expect(isTierUnlocked("gpu-monitoring", 2, state)).toBe(false);
    });

    it("should return false without all tools used", () => {
      const state = createState({
        toolsUsed: { "gpu-monitoring": ["nvidia-smi", "nvsm"] }, // Only 2 of 4
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.9, attempts: 1 },
        },
      });
      expect(isTierUnlocked("gpu-monitoring", 2, state)).toBe(false);
    });

    it("should return true with quiz passed AND all tools used", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.9, attempts: 1 },
        },
      });
      expect(isTierUnlocked("gpu-monitoring", 2, state)).toBe(true);
    });

    it("should return true if already explicitly unlocked", () => {
      const state = createState({
        unlockedTiers: { "gpu-monitoring": 2 },
      });
      expect(isTierUnlocked("gpu-monitoring", 2, state)).toBe(true);
    });

    it("should handle different family tool counts", () => {
      // bmc-hardware has 3 tools
      const state = createState({
        toolsUsed: { "bmc-hardware": ["ipmitool", "sensors", "dmidecode"] },
        familyQuizScores: {
          "bmc-hardware": { passed: true, score: 0.85, attempts: 1 },
        },
      });
      expect(isTierUnlocked("bmc-hardware", 2, state)).toBe(true);
    });

    it("should handle unknown family with at least one tool used", () => {
      const state = createState({
        toolsUsed: { "custom-family": ["tool1"] },
        familyQuizScores: {
          "custom-family": { passed: true, score: 0.9, attempts: 1 },
        },
      });
      expect(isTierUnlocked("custom-family", 2, state)).toBe(true);
    });
  });

  describe("Tier 3", () => {
    it("should return false without tier 2 unlocked", () => {
      const state = createState({
        // Missing tier 2 requirements
        explanationGateResults: {
          "gpu-monitoring": { passed: true, scenarioId: "s1" },
        },
      });
      expect(isTierUnlocked("gpu-monitoring", 3, state)).toBe(false);
    });

    it("should return false without explanation gate passed", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.85, attempts: 1 },
        },
        tierProgress: {
          "gpu-monitoring": {
            tier1Completed: 5,
            tier2Completed: 3,
            tier3Completed: 0,
          },
        },
        // No explanation gate
      });
      expect(isTierUnlocked("gpu-monitoring", 3, state)).toBe(false);
    });

    it("should return false with explanation gate failed", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.85, attempts: 1 },
        },
        tierProgress: {
          "gpu-monitoring": {
            tier1Completed: 5,
            tier2Completed: 3,
            tier3Completed: 0,
          },
        },
        explanationGateResults: {
          "gpu-monitoring": { passed: false, scenarioId: "s1" },
        },
      });
      expect(isTierUnlocked("gpu-monitoring", 3, state)).toBe(false);
    });

    it("should return false with accuracy below 80%", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.75, attempts: 1 },
        }, // Below 80%
        tierProgress: {
          "gpu-monitoring": {
            tier1Completed: 5,
            tier2Completed: 3,
            tier3Completed: 0,
          },
        },
        explanationGateResults: {
          "gpu-monitoring": { passed: true, scenarioId: "s1" },
        },
      });
      expect(isTierUnlocked("gpu-monitoring", 3, state)).toBe(false);
    });

    it("should return true with all tier 3 requirements met", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.85, attempts: 1 },
        },
        tierProgress: {
          "gpu-monitoring": {
            tier1Completed: 5,
            tier2Completed: 3,
            tier3Completed: 0,
          },
        },
        explanationGateResults: {
          "gpu-monitoring": { passed: true, scenarioId: "s1" },
        },
      });
      expect(isTierUnlocked("gpu-monitoring", 3, state)).toBe(true);
    });

    it("should return true if already explicitly unlocked", () => {
      const state = createState({
        unlockedTiers: { "gpu-monitoring": 3 },
      });
      expect(isTierUnlocked("gpu-monitoring", 3, state)).toBe(true);
    });

    it("should require exactly 80% accuracy threshold", () => {
      const stateAt80 = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.8, attempts: 1 },
        },
        tierProgress: {
          "gpu-monitoring": {
            tier1Completed: 5,
            tier2Completed: 3,
            tier3Completed: 0,
          },
        },
        explanationGateResults: {
          "gpu-monitoring": { passed: true, scenarioId: "s1" },
        },
      });
      expect(isTierUnlocked("gpu-monitoring", 3, stateAt80)).toBe(true);

      const stateBelow80 = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.79, attempts: 1 },
        },
        tierProgress: {
          "gpu-monitoring": {
            tier1Completed: 5,
            tier2Completed: 3,
            tier3Completed: 0,
          },
        },
        explanationGateResults: {
          "gpu-monitoring": { passed: true, scenarioId: "s1" },
        },
      });
      expect(isTierUnlocked("gpu-monitoring", 3, stateBelow80)).toBe(false);
    });
  });
});

// ============================================================================
// evaluateTierUnlock TESTS
// ============================================================================

describe("Tier Progression Engine - evaluateTierUnlock", () => {
  describe("From Tier 1", () => {
    it("should return 2 when tier 2 requirements are met", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.9, attempts: 1 },
        },
      });
      expect(evaluateTierUnlock("gpu-monitoring", 1, state)).toBe(2);
    });

    it("should return null when tier 2 requirements not met", () => {
      const state = createState({
        toolsUsed: { "gpu-monitoring": ["nvidia-smi"] }, // Not enough tools
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.9, attempts: 1 },
        },
      });
      expect(evaluateTierUnlock("gpu-monitoring", 1, state)).toBeNull();
    });

    it("should return null when quiz not passed", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: false, score: 0.5, attempts: 1 },
        },
      });
      expect(evaluateTierUnlock("gpu-monitoring", 1, state)).toBeNull();
    });
  });

  describe("From Tier 2", () => {
    it("should return 3 when tier 3 requirements are met", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.85, attempts: 1 },
        },
        tierProgress: {
          "gpu-monitoring": {
            tier1Completed: 5,
            tier2Completed: 3,
            tier3Completed: 0,
          },
        },
        explanationGateResults: {
          "gpu-monitoring": { passed: true, scenarioId: "s1" },
        },
      });
      expect(evaluateTierUnlock("gpu-monitoring", 2, state)).toBe(3);
    });

    it("should return null when tier 3 requirements not met", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
        familyQuizScores: {
          "gpu-monitoring": { passed: true, score: 0.7, attempts: 1 },
        }, // Below 80%
        tierProgress: {
          "gpu-monitoring": {
            tier1Completed: 5,
            tier2Completed: 3,
            tier3Completed: 0,
          },
        },
        explanationGateResults: {
          "gpu-monitoring": { passed: true, scenarioId: "s1" },
        },
      });
      expect(evaluateTierUnlock("gpu-monitoring", 2, state)).toBeNull();
    });
  });

  describe("From Tier 3", () => {
    it("should return null when already at max tier", () => {
      const state = createState({
        unlockedTiers: { "gpu-monitoring": 3 },
      });
      expect(evaluateTierUnlock("gpu-monitoring", 3, state)).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty state", () => {
      const state = createEmptyTierProgressState();
      expect(evaluateTierUnlock("gpu-monitoring", 1, state)).toBeNull();
    });

    it("should handle unknown family", () => {
      const state = createState({
        toolsUsed: { "unknown-family": ["tool1"] },
        familyQuizScores: {
          "unknown-family": { passed: true, score: 0.9, attempts: 1 },
        },
      });
      expect(evaluateTierUnlock("unknown-family", 1, state)).toBe(2);
    });
  });
});

// ============================================================================
// selectGauntletScenarios TESTS
// ============================================================================

describe("Tier Progression Engine - selectGauntletScenarios", () => {
  describe("Basic Selection", () => {
    it("should select scenarios based on domain weights", () => {
      const scenarios = createSampleScenarios();
      const randomFn = createSeededRandom(12345);

      const selected = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        10,
        randomFn,
      );

      expect(selected.length).toBeLessThanOrEqual(10);
      expect(selected.every((s) => s.tier !== undefined && s.tier >= 2)).toBe(
        true,
      );
    });

    it("should only select tier 2+ scenarios", () => {
      const scenarios = createSampleScenarios();
      const randomFn = createSeededRandom(42);

      const selected = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        10,
        randomFn,
      );

      // All selected should be tier 2 or 3
      selected.forEach((s) => {
        expect(s.tier).toBeGreaterThanOrEqual(2);
      });

      // Should not include tier 1 scenario
      expect(selected.find((s) => s.id === "s1")).toBeUndefined();
    });

    it("should use default count of 10", () => {
      // Create more tier 2+ scenarios to ensure we can select 10
      const manyScenarios: Scenario[] = [];
      for (let i = 0; i < 20; i++) {
        manyScenarios.push({
          id: `s${i}`,
          domain: ["domain1", "domain2", "domain3", "domain4", "domain5"][
            i % 5
          ] as Scenario["domain"],
          tier: 2,
        });
      }

      const selected = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        manyScenarios,
      );

      expect(selected.length).toBe(DEFAULT_GAUNTLET_COUNT);
    });

    it("should handle custom count", () => {
      const scenarios = createSampleScenarios();
      const randomFn = createSeededRandom(42);

      const selected = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        5,
        randomFn,
      );

      expect(selected.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Domain Weight Distribution", () => {
    it("should favor higher-weighted domains", () => {
      // Create many scenarios per domain
      const scenarios: Scenario[] = [];
      for (let i = 0; i < 100; i++) {
        scenarios.push({
          id: `d1-${i}`,
          domain: "domain1",
          tier: 2,
        });
        scenarios.push({
          id: `d4-${i}`,
          domain: "domain4",
          tier: 2,
        });
        scenarios.push({
          id: `d2-${i}`,
          domain: "domain2",
          tier: 2,
        });
      }

      const randomFn = createSeededRandom(42);
      const selected = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        50,
        randomFn,
      );

      // Count by domain
      const domainCounts = {
        domain1: selected.filter((s) => s.domain === "domain1").length,
        domain2: selected.filter((s) => s.domain === "domain2").length,
        domain4: selected.filter((s) => s.domain === "domain4").length,
      };

      // domain4 (33%) and domain1 (31%) should have more than domain2 (5%)
      expect(domainCounts.domain4).toBeGreaterThan(domainCounts.domain2);
      expect(domainCounts.domain1).toBeGreaterThan(domainCounts.domain2);
    });

    it("should handle custom domain weights", () => {
      const scenarios: Scenario[] = [];
      for (let i = 0; i < 50; i++) {
        scenarios.push({ id: `d1-${i}`, domain: "domain1", tier: 2 });
        scenarios.push({ id: `d5-${i}`, domain: "domain5", tier: 2 });
      }

      const customWeights = {
        domain1: 10,
        domain2: 0,
        domain3: 0,
        domain4: 0,
        domain5: 90,
      };

      const randomFn = createSeededRandom(42);
      const selected = selectGauntletScenarios(
        customWeights,
        scenarios,
        20,
        randomFn,
      );

      const domain5Count = selected.filter(
        (s) => s.domain === "domain5",
      ).length;
      const domain1Count = selected.filter(
        (s) => s.domain === "domain1",
      ).length;

      // domain5 should have significantly more with 90% weight
      expect(domain5Count).toBeGreaterThan(domain1Count);
    });
  });

  describe("Edge Cases", () => {
    it("should return empty array when no tier 2+ scenarios available", () => {
      const scenarios: Scenario[] = [
        { id: "s1", domain: "domain1", tier: 1 },
        { id: "s2", domain: "domain2", tier: 1 },
      ];

      const selected = selectGauntletScenarios(EXAM_DOMAIN_WEIGHTS, scenarios);
      expect(selected).toEqual([]);
    });

    it("should return empty array when no scenarios available", () => {
      const selected = selectGauntletScenarios(EXAM_DOMAIN_WEIGHTS, []);
      expect(selected).toEqual([]);
    });

    it("should handle scenarios without tier property", () => {
      const scenarios: Scenario[] = [
        { id: "s1", domain: "domain1" }, // No tier
        { id: "s2", domain: "domain2", tier: 2 },
      ];

      const selected = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        5,
      );

      // Should only include the one with tier >= 2
      expect(selected.length).toBe(1);
      expect(selected[0].id).toBe("s2");
    });

    it("should handle fewer available scenarios than requested count", () => {
      const scenarios: Scenario[] = [
        { id: "s1", domain: "domain1", tier: 2 },
        { id: "s2", domain: "domain4", tier: 3 },
      ];

      const selected = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        10,
      );

      // Should return only available scenarios
      expect(selected.length).toBe(2);
    });

    it("should not duplicate scenarios", () => {
      const scenarios = createSampleScenarios();
      const randomFn = createSeededRandom(42);

      const selected = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        10,
        randomFn,
      );

      const ids = selected.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe("Deterministic with Seeded Random", () => {
    it("should produce same results with same seed", () => {
      const scenarios = createSampleScenarios();

      const selected1 = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        5,
        createSeededRandom(12345),
      );

      const selected2 = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        5,
        createSeededRandom(12345),
      );

      expect(selected1.map((s) => s.id)).toEqual(selected2.map((s) => s.id));
    });

    it("should produce different results with different seeds", () => {
      const scenarios: Scenario[] = [];
      for (let i = 0; i < 50; i++) {
        scenarios.push({
          id: `s${i}`,
          domain: ["domain1", "domain4"][i % 2] as Scenario["domain"],
          tier: 2,
        });
      }

      const selected1 = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        10,
        createSeededRandom(12345),
      );

      const selected2 = selectGauntletScenarios(
        EXAM_DOMAIN_WEIGHTS,
        scenarios,
        10,
        createSeededRandom(67890),
      );

      // Very unlikely to be exactly the same with different seeds
      const ids1 = selected1
        .map((s) => s.id)
        .sort()
        .join(",");
      const ids2 = selected2
        .map((s) => s.id)
        .sort()
        .join(",");
      expect(ids1).not.toBe(ids2);
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe("Tier Progression Engine - Utility Functions", () => {
  describe("createEmptyTierProgressState", () => {
    it("should create state with empty objects", () => {
      const state = createEmptyTierProgressState();

      expect(state.toolsUsed).toEqual({});
      expect(state.familyQuizScores).toEqual({});
      expect(state.unlockedTiers).toEqual({});
      expect(state.tierProgress).toEqual({});
      expect(state.explanationGateResults).toEqual({});
    });
  });

  describe("getCurrentTier", () => {
    it("should return 1 for unknown family", () => {
      const state = createEmptyTierProgressState();
      expect(getCurrentTier("unknown", state)).toBe(1);
    });

    it("should return unlocked tier from state", () => {
      const state = createState({
        unlockedTiers: { "gpu-monitoring": 2 },
      });
      expect(getCurrentTier("gpu-monitoring", state)).toBe(2);
    });
  });

  describe("hasUsedAllTools", () => {
    it("should return false when no tools used", () => {
      const state = createEmptyTierProgressState();
      expect(hasUsedAllTools("gpu-monitoring", state)).toBe(false);
    });

    it("should return false when some tools used", () => {
      const state = createState({
        toolsUsed: { "gpu-monitoring": ["nvidia-smi", "nvsm"] },
      });
      expect(hasUsedAllTools("gpu-monitoring", state)).toBe(false);
    });

    it("should return true when all tools used", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
        },
      });
      expect(hasUsedAllTools("gpu-monitoring", state)).toBe(true);
    });

    it("should return true when more tools used than required", () => {
      const state = createState({
        toolsUsed: {
          "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop", "extra"],
        },
      });
      expect(hasUsedAllTools("gpu-monitoring", state)).toBe(true);
    });
  });

  describe("getToolProgress", () => {
    it("should return 0/4 for unused family", () => {
      const state = createEmptyTierProgressState();
      const progress = getToolProgress("gpu-monitoring", state);

      expect(progress.used).toBe(0);
      expect(progress.required).toBe(4);
    });

    it("should return correct counts for partial progress", () => {
      const state = createState({
        toolsUsed: { "gpu-monitoring": ["nvidia-smi", "nvsm"] },
      });
      const progress = getToolProgress("gpu-monitoring", state);

      expect(progress.used).toBe(2);
      expect(progress.required).toBe(4);
    });

    it("should return 0/0 for unknown family", () => {
      const state = createEmptyTierProgressState();
      const progress = getToolProgress("unknown-family", state);

      expect(progress.used).toBe(0);
      expect(progress.required).toBe(0);
    });
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe("Tier Progression Engine - Constants", () => {
  describe("FAMILY_TOOL_COUNTS", () => {
    it("should have correct tool counts", () => {
      expect(FAMILY_TOOL_COUNTS["gpu-monitoring"]).toBe(4);
      expect(FAMILY_TOOL_COUNTS["infiniband-tools"]).toBe(4);
      expect(FAMILY_TOOL_COUNTS["bmc-hardware"]).toBe(3);
      expect(FAMILY_TOOL_COUNTS["cluster-tools"]).toBe(4);
      expect(FAMILY_TOOL_COUNTS["container-tools"]).toBe(3);
      expect(FAMILY_TOOL_COUNTS["diagnostics"]).toBe(3);
    });
  });

  describe("EXAM_DOMAIN_WEIGHTS", () => {
    it("should sum to 100", () => {
      const sum = Object.values(EXAM_DOMAIN_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    });

    it("should have correct weights", () => {
      expect(EXAM_DOMAIN_WEIGHTS.domain1).toBe(31);
      expect(EXAM_DOMAIN_WEIGHTS.domain2).toBe(5);
      expect(EXAM_DOMAIN_WEIGHTS.domain3).toBe(19);
      expect(EXAM_DOMAIN_WEIGHTS.domain4).toBe(33);
      expect(EXAM_DOMAIN_WEIGHTS.domain5).toBe(12);
    });
  });

  describe("TIER_2_ACCURACY_THRESHOLD", () => {
    it("should be 0.8 (80%)", () => {
      expect(TIER_2_ACCURACY_THRESHOLD).toBe(0.8);
    });
  });

  describe("DEFAULT_GAUNTLET_COUNT", () => {
    it("should be 10", () => {
      expect(DEFAULT_GAUNTLET_COUNT).toBe(10);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Tier Progression Engine - Integration", () => {
  it("should support full progression flow", () => {
    let state = createEmptyTierProgressState();

    // Step 1: Tier 1 always unlocked
    expect(isTierUnlocked("gpu-monitoring", 1, state)).toBe(true);
    expect(isTierUnlocked("gpu-monitoring", 2, state)).toBe(false);

    // Step 2: Use all tools
    state = {
      ...state,
      toolsUsed: {
        "gpu-monitoring": ["nvidia-smi", "nvsm", "dcgmi", "nvtop"],
      },
    };
    expect(evaluateTierUnlock("gpu-monitoring", 1, state)).toBeNull(); // No quiz yet

    // Step 3: Pass quiz
    state = {
      ...state,
      familyQuizScores: {
        "gpu-monitoring": { passed: true, score: 0.9, attempts: 1 },
      },
    };
    expect(evaluateTierUnlock("gpu-monitoring", 1, state)).toBe(2);
    expect(isTierUnlocked("gpu-monitoring", 2, state)).toBe(true);

    // Step 4: Complete tier 2 scenarios and pass explanation gate
    state = {
      ...state,
      tierProgress: {
        "gpu-monitoring": {
          tier1Completed: 5,
          tier2Completed: 4,
          tier3Completed: 0,
        },
      },
      explanationGateResults: {
        "gpu-monitoring": { passed: true, scenarioId: "exp-gate-1" },
      },
    };
    expect(evaluateTierUnlock("gpu-monitoring", 2, state)).toBe(3);
    expect(isTierUnlocked("gpu-monitoring", 3, state)).toBe(true);

    // Step 5: No more unlocks at tier 3
    expect(evaluateTierUnlock("gpu-monitoring", 3, state)).toBeNull();
  });

  it("should support gauntlet scenario selection for exam prep", () => {
    const scenarios: Scenario[] = [];
    for (let i = 0; i < 30; i++) {
      scenarios.push({
        id: `scenario-${i}`,
        domain: ["domain1", "domain2", "domain3", "domain4", "domain5"][
          i % 5
        ] as Scenario["domain"],
        tier: ((i % 3) + 1) as 1 | 2 | 3,
        commandFamilies: ["gpu-monitoring"],
      });
    }

    const selected = selectGauntletScenarios(
      EXAM_DOMAIN_WEIGHTS,
      scenarios,
      10,
      createSeededRandom(42),
    );

    // Should have scenarios
    expect(selected.length).toBeGreaterThan(0);

    // All should be tier 2+
    expect(selected.every((s) => s.tier !== undefined && s.tier >= 2)).toBe(
      true,
    );
  });
});
