/**
 * StateManager - Handles state snapshots and isolation for scenarios
 *
 * Provides snapshot/restore functionality to prevent state contamination
 * between different lab scenarios. Each scenario can work with an isolated
 * copy of the cluster state without affecting the main simulation.
 */

import { useSimulationStore } from './simulationStore';
import type { ClusterConfig } from '@/types/hardware';

export interface StateSnapshot {
  id: string;
  name: string;
  description?: string;
  cluster: ClusterConfig;
  timestamp: number;
  scenarioId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface StateChange {
  type: 'gpu-update' | 'node-update' | 'job-update' | 'fault-injection';
  nodeId?: string;
  gpuId?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: any;
  timestamp: number;
  command?: string;
}

export class StateManager {
  private static instance: StateManager;
  private snapshots: Map<string, StateSnapshot> = new Map();
  private maxSnapshots: number = 20;
  private baselineSnapshot: StateSnapshot | null = null;

  private constructor() {
    // Load snapshots from localStorage if available
    this.loadSnapshots();
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Create a snapshot of the current cluster state
   */
  createSnapshot(name: string, description?: string): string {
    const store = useSimulationStore.getState();
    const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const snapshot: StateSnapshot = {
      id: snapshotId,
      name,
      description,
      cluster: structuredClone(store.cluster),
      timestamp: Date.now(),
      scenarioId: store.activeScenario?.id,
      metadata: {
        nodeCount: store.cluster.nodes.length,
        gpuCount: store.cluster.nodes.reduce((sum, n) => sum + n.gpus.length, 0),
        scenarioName: store.activeScenario?.title,
      }
    };

    this.snapshots.set(snapshotId, snapshot);
    this.pruneOldSnapshots();
    this.saveSnapshots();

    console.log(`Created snapshot: ${name} (${snapshotId})`);
    return snapshotId;
  }

  /**
   * Create a baseline snapshot to use as the clean state for scenarios
   */
  createBaselineSnapshot(): void {
    const store = useSimulationStore.getState();
    this.baselineSnapshot = {
      id: 'baseline',
      name: 'Baseline State',
      description: 'Clean cluster state for scenario initialization',
      cluster: structuredClone(store.cluster),
      timestamp: Date.now()
    };
    console.log('Created baseline snapshot');
  }

  /**
   * Restore cluster state from a snapshot
   */
  restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      console.error(`Snapshot not found: ${snapshotId}`);
      return false;
    }

    const store = useSimulationStore.getState();

    // Deep clone to prevent reference issues
    const restoredCluster = structuredClone(snapshot.cluster);

    // Update the store with restored state
    store.setCluster(restoredCluster);

    console.log(`Restored snapshot: ${snapshot.name} (${snapshotId})`);
    return true;
  }

  /**
   * Restore to baseline (clean) state
   */
  restoreBaseline(): boolean {
    if (!this.baselineSnapshot) {
      console.error('No baseline snapshot available');
      return false;
    }

    const store = useSimulationStore.getState();
    const restoredCluster = structuredClone(this.baselineSnapshot.cluster);
    store.setCluster(restoredCluster);

    console.log('Restored to baseline state');
    return true;
  }

  /**
   * Get all available snapshots
   */
  getSnapshots(): StateSnapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get a specific snapshot
   */
  getSnapshot(snapshotId: string): StateSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    const deleted = this.snapshots.delete(snapshotId);
    if (deleted) {
      this.saveSnapshots();
      console.log(`Deleted snapshot: ${snapshotId}`);
    }
    return deleted;
  }

  /**
   * Clear all snapshots except baseline
   */
  clearAllSnapshots(): void {
    this.snapshots.clear();
    this.saveSnapshots();
    console.log('Cleared all snapshots');
  }

  /**
   * Compare two snapshots and return differences
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compareSnapshots(snapshotId1: string, snapshotId2: string): any {
    const snapshot1 = this.snapshots.get(snapshotId1);
    const snapshot2 = this.snapshots.get(snapshotId2);

    if (!snapshot1 || !snapshot2) {
      console.error('One or both snapshots not found');
      return null;
    }

    // Basic diff - can be enhanced with deep diff library
    const diff = {
      nodeChanges: this.compareNodes(snapshot1.cluster, snapshot2.cluster),
      timestamp1: snapshot1.timestamp,
      timestamp2: snapshot2.timestamp,
      name1: snapshot1.name,
      name2: snapshot2.name
    };

    return diff;
  }

  /**
   * Create a snapshot before starting a scenario
   */
  snapshotBeforeScenario(scenarioId: string): string {
    const snapshotId = this.createSnapshot(
      `Pre-Scenario: ${scenarioId}`,
      `Automatic snapshot before starting scenario ${scenarioId}`
    );

    // Store reference to pre-scenario snapshot could be stored separately
    // For now, just return the snapshot ID

    return snapshotId;
  }

  /**
   * Restore state after scenario completion
   */
  restoreAfterScenario(): boolean {
    // Try to find the most recent pre-scenario snapshot
    const preScenarioSnapshots = this.getSnapshots()
      .filter(s => s.name.startsWith('Pre-Scenario:'));

    if (preScenarioSnapshots.length > 0) {
      return this.restoreSnapshot(preScenarioSnapshots[0].id);
    }

    // Fallback to baseline if no pre-scenario snapshot
    return this.restoreBaseline();
  }

  // Private helper methods

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private compareNodes(cluster1: ClusterConfig, cluster2: ClusterConfig): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changes: any[] = [];

    // Compare node counts
    if (cluster1.nodes.length !== cluster2.nodes.length) {
      changes.push({
        type: 'node-count',
        before: cluster1.nodes.length,
        after: cluster2.nodes.length
      });
    }

    // Compare GPU states (simplified)
    cluster1.nodes.forEach((node1, idx: number) => {
      const node2 = cluster2.nodes[idx];
      if (node2) {
        node1.gpus.forEach((gpu1, gpuIdx: number) => {
          const gpu2 = node2.gpus[gpuIdx];
          if (gpu2) {
            // Check for XID errors
            if (gpu1.xidErrors.length !== gpu2.xidErrors.length) {
              changes.push({
                type: 'xid-errors',
                nodeId: node1.id,
                gpuId: gpu1.id,
                before: gpu1.xidErrors.length,
                after: gpu2.xidErrors.length
              });
            }
            // Check health status
            if (gpu1.healthStatus !== gpu2.healthStatus) {
              changes.push({
                type: 'health-status',
                nodeId: node1.id,
                gpuId: gpu1.id,
                before: gpu1.healthStatus,
                after: gpu2.healthStatus
              });
            }
          }
        });
      }
    });

    return changes;
  }

  private pruneOldSnapshots(): void {
    if (this.snapshots.size <= this.maxSnapshots) return;

    // Sort by timestamp and remove oldest
    const snapshots = Array.from(this.snapshots.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);

    const toRemove = snapshots.slice(this.maxSnapshots);
    toRemove.forEach(([id]) => {
      this.snapshots.delete(id);
      console.log(`Pruned old snapshot: ${id}`);
    });
  }

  private saveSnapshots(): void {
    try {
      // Convert Map to array for serialization
      const snapshotArray = Array.from(this.snapshots.entries());
      localStorage.setItem('simulator-snapshots', JSON.stringify(snapshotArray));
    } catch (error) {
      console.error('Failed to save snapshots to localStorage:', error);
      // Clear old snapshots if storage is full
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.snapshots.clear();
        localStorage.removeItem('simulator-snapshots');
        console.log('Cleared snapshots due to storage limit');
      }
    }
  }

  private loadSnapshots(): void {
    try {
      const stored = localStorage.getItem('simulator-snapshots');
      if (stored) {
        const snapshotArray = JSON.parse(stored);
        this.snapshots = new Map(snapshotArray);
        console.log(`Loaded ${this.snapshots.size} snapshots from storage`);
      }
    } catch (error) {
      console.error('Failed to load snapshots from localStorage:', error);
      this.snapshots.clear();
    }
  }
}

// Export singleton instance for convenience
export const stateManager = StateManager.getInstance();