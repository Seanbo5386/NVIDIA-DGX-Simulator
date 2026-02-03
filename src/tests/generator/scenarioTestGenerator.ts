/**
 * Scenario Test Generator
 *
 * Auto-generates comprehensive tests from scenario JSON files.
 * Uses validation inference for smart defaults with override support.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ValidationOverride, FaultConfig } from './validationInference';

interface ScenarioStep {
  id: string;
  title: string;
  expectedCommands: string[];
  validationRules?: Array<{
    type: string;
    expectedCommands: string[];
    requireAllCommands?: boolean;
  }>;
  validation_override?: ValidationOverride;
}

interface ScenarioFault {
  nodeId: string;
  gpuId: number;
  type: string;
  parameters?: Record<string, unknown>;
}

interface Scenario {
  id: string;
  title: string;
  domain: string;
  faults?: ScenarioFault[];
  steps: ScenarioStep[];
}

/**
 * Generate fault setup code for a scenario
 */
function generateFaultSetup(faults: ScenarioFault[] | undefined): string {
  if (!faults || faults.length === 0) return '// No faults to inject';

  return faults.map(fault => {
    switch (fault.type) {
      case 'xid-error':
        return `store.addXIDError('${fault.nodeId}', ${fault.gpuId}, { code: ${fault.parameters?.xid || 0}, timestamp: new Date(), description: '${fault.parameters?.description || ''}', severity: 'Critical' });`;
      case 'thermal':
        return `store.updateGPU('${fault.nodeId}', ${fault.gpuId}, { temperature: ${fault.parameters?.temperature || 95} });`;
      case 'ecc-error':
        return `store.updateGPU('${fault.nodeId}', ${fault.gpuId}, { eccErrors: { singleBit: ${fault.parameters?.singleBit || 0}, doubleBit: ${fault.parameters?.doubleBit || 0} } });`;
      case 'nvlink-down':
        return `store.updateNVLink('${fault.nodeId}', ${fault.gpuId}, ${fault.parameters?.linkId || 0}, { status: 'Inactive' });`;
      case 'infiniband-down':
        return `store.updateHCA('${fault.nodeId}', '${fault.parameters?.hcaId || 'mlx5_0'}', { state: 'Down' });`;
      default:
        return `// Unknown fault type: ${fault.type}`;
    }
  }).join('\n      ');
}

/**
 * Convert fault config to the format expected by validation inference
 */
function convertFaults(faults: ScenarioFault[] | undefined): FaultConfig[] {
  if (!faults) return [];
  return faults.map(f => ({
    nodeId: f.nodeId,
    gpuId: f.gpuId,
    type: f.type,
    parameters: f.parameters
  }));
}

/**
 * Generate test cases for a single scenario
 */
export function generateTestsFromScenario(scenario: Scenario): string {
  const testCases: string[] = [];
  const faultsJson = JSON.stringify(convertFaults(scenario.faults));

  for (const step of scenario.steps) {
    for (const command of step.expectedCommands) {
      // Escape special characters in command for test name
      const safeCommand = command.replace(/'/g, "\\'").replace(/"/g, '\\"');
      const testName = `${scenario.id} - Step ${step.id}: ${safeCommand}`;
      const overrideJson = JSON.stringify(step.validation_override || null);

      testCases.push(`
    it('${testName}', () => {
      // Setup faults for this scenario
      ${generateFaultSetup(scenario.faults)}

      // Refresh context after fault injection
      context = {
        cluster: useSimulationStore.getState().cluster,
        currentNode: 'dgx-00',
        environment: {}
      };

      // Execute command
      const result = exec('${safeCommand}', context);

      // Validate with inferred + override rules
      const validation = mergeWithOverride(
        inferValidation('${safeCommand}', context.cluster, ${faultsJson}),
        ${overrideJson}
      );

      expect(result.exitCode).toBe(validation.exitCode);
      for (const text of validation.outputContains) {
        expect(result.output.toLowerCase()).toContain(text.toLowerCase());
      }
      for (const text of validation.outputNotContains) {
        expect(result.output.toLowerCase()).not.toContain(text.toLowerCase());
      }
    });`);
    }
  }

  return `
  describe('${scenario.title}', () => {${testCases.join('\n')}
  });`;
}

/**
 * Generate all tests from all scenario JSON files
 */
export function generateAllScenarioTests(scenariosDir: string): string {
  const domains = ['domain1', 'domain2', 'domain3', 'domain4', 'domain5'];
  const allTests: string[] = [];

  for (const domain of domains) {
    const domainPath = path.join(scenariosDir, domain);
    if (!fs.existsSync(domainPath)) continue;

    const files = fs.readdirSync(domainPath).filter(f => f.endsWith('.json'));
    const domainTests: string[] = [];

    for (const file of files) {
      try {
        const scenarioPath = path.join(domainPath, file);
        const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf-8')) as Scenario;
        domainTests.push(generateTestsFromScenario(scenario));
      } catch (e) {
        console.error(`Error processing ${file}:`, e);
      }
    }

    if (domainTests.length > 0) {
      allTests.push(`
describe('${domain.toUpperCase()} Scenarios', () => {${domainTests.join('\n')}
});`);
    }
  }

  return `/**
 * AUTO-GENERATED SCENARIO TESTS
 * Generated from scenario JSON files
 * DO NOT EDIT DIRECTLY - regenerate with: npm run generate-tests
 *
 * Generated: ${new Date().toISOString()}
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSimulationStore } from '@/store/simulationStore';
import { NvidiaSmiSimulator } from '@/simulators/nvidiaSmiSimulator';
import { DcgmiSimulator } from '@/simulators/dcgmiSimulator';
import { SlurmSimulator } from '@/simulators/slurmSimulator';
import { InfiniBandSimulator } from '@/simulators/infinibandSimulator';
import { BenchmarkSimulator } from '@/simulators/benchmarkSimulator';
import { parse } from '@/utils/commandParser';
import { inferValidation, mergeWithOverride } from './generator/validationInference';
import type { CommandContext } from '@/simulators/BaseSimulator';

// Simulator instances
const nvidiaSmi = new NvidiaSmiSimulator();
const dcgmi = new DcgmiSimulator();
const slurm = new SlurmSimulator();
const infiniband = new InfiniBandSimulator();
const benchmark = new BenchmarkSimulator();

/**
 * Route command to appropriate simulator
 */
function exec(command: string, context: CommandContext) {
  const parsed = parse(command);
  const cmd = command.toLowerCase();

  if (cmd.startsWith('nvidia-smi')) {
    return nvidiaSmi.execute(parsed, context);
  }
  if (cmd.startsWith('dcgmi')) {
    return dcgmi.execute(parsed, context);
  }
  if (cmd.startsWith('sinfo') || cmd.startsWith('squeue') || cmd.startsWith('scontrol') || cmd.startsWith('sbatch') || cmd.startsWith('srun')) {
    return slurm.execute(parsed, context);
  }
  if (cmd.startsWith('ibstat') || cmd.startsWith('ibstatus') || cmd.startsWith('iblinkinfo') || cmd.startsWith('perfquery')) {
    return infiniband.execute(parsed, context);
  }
  if (cmd.startsWith('nccl') || cmd.startsWith('all_reduce') || cmd.startsWith('gpu-burn') || cmd.startsWith('hpl')) {
    return benchmark.execute(parsed, context);
  }

  throw new Error(\`Unknown command: \${command}\`);
}

let store: ReturnType<typeof useSimulationStore.getState>;
let context: CommandContext;

beforeEach(() => {
  store = useSimulationStore.getState();
  store.resetSimulation();
  context = {
    cluster: store.cluster,
    currentNode: store.cluster.nodes[0]?.id || 'dgx-00',
    environment: {}
  };
});

${allTests.join('\n\n')}
`;
}

/**
 * CLI entry point for generating tests
 */
export function main() {
  const scenariosDir = path.resolve(__dirname, '../../data/scenarios');
  const outputPath = path.resolve(__dirname, '../generatedScenarioTests.test.ts');

  console.log('Generating tests from scenarios in:', scenariosDir);

  const testContent = generateAllScenarioTests(scenariosDir);

  fs.writeFileSync(outputPath, testContent, 'utf-8');
  console.log('Tests written to:', outputPath);
}

// Run if called directly
if (require.main === module) {
  main();
}
