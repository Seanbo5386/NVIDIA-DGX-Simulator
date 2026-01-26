/**
 * MIG Partitioning Visual Configurator
 *
 * Interactive visual tool for configuring Multi-Instance GPU (MIG) partitions.
 * Shows GPU memory/compute slices and allows drag-and-drop partition creation.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { GPU, MIGInstance } from '@/types/hardware';
import { Cpu, Layers, Check, X, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface MIGConfiguratorProps {
  gpu: GPU;
  onApply?: (instances: MIGProfile[]) => void;
  className?: string;
}

// MIG Profile definitions for A100/H100
interface MIGProfile {
  id: number;
  name: string;
  memoryGB: number;
  smCount: number;
  maxInstances: number;
  slices: number; // How many 1/7 slices it uses
  color: string;
}

const MIG_PROFILES: MIGProfile[] = [
  { id: 19, name: '1g.5gb', memoryGB: 5, smCount: 14, maxInstances: 7, slices: 1, color: '#3B82F6' },
  { id: 20, name: '1g.10gb', memoryGB: 10, smCount: 14, maxInstances: 4, slices: 1, color: '#06B6D4' },
  { id: 14, name: '2g.10gb', memoryGB: 10, smCount: 28, maxInstances: 3, slices: 2, color: '#10B981' },
  { id: 9, name: '3g.20gb', memoryGB: 20, smCount: 42, maxInstances: 2, slices: 3, color: '#F59E0B' },
  { id: 5, name: '4g.20gb', memoryGB: 20, smCount: 56, maxInstances: 1, slices: 4, color: '#F97316' },
  { id: 0, name: '7g.40gb', memoryGB: 40, smCount: 98, maxInstances: 1, slices: 7, color: '#EF4444' },
];

interface ConfiguredInstance {
  profile: MIGProfile;
  startSlice: number;
  instanceId: number;
}

export const MIGConfigurator: React.FC<MIGConfiguratorProps> = ({
  gpu,
  onApply,
  className = '',
}) => {
  const [isEnabled, setIsEnabled] = useState(gpu.migMode);
  const [instances, setInstances] = useState<ConfiguredInstance[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<MIGProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Calculate total slices used
  const usedSlices = useMemo(() => {
    return instances.reduce((sum, inst) => sum + inst.profile.slices, 0);
  }, [instances]);

  const availableSlices = 7 - usedSlices;

  // Get which profiles can still be added
  const availableProfiles = useMemo(() => {
    return MIG_PROFILES.filter(profile => {
      // Check if we have enough slices
      if (profile.slices > availableSlices) return false;
      // Check if we haven't exceeded max instances for this profile
      const existingCount = instances.filter(i => i.profile.id === profile.id).length;
      return existingCount < profile.maxInstances;
    });
  }, [instances, availableSlices]);

  // Add an instance
  const addInstance = useCallback((profile: MIGProfile) => {
    if (profile.slices > availableSlices) {
      setError(`Not enough GPU slices available. Need ${profile.slices}, have ${availableSlices}.`);
      return;
    }

    const existingCount = instances.filter(i => i.profile.id === profile.id).length;
    if (existingCount >= profile.maxInstances) {
      setError(`Maximum ${profile.maxInstances} instances of ${profile.name} allowed.`);
      return;
    }

    // Find the next available starting slice
    const usedSlicePositions = new Set<number>();
    instances.forEach(inst => {
      for (let i = inst.startSlice; i < inst.startSlice + inst.profile.slices; i++) {
        usedSlicePositions.add(i);
      }
    });

    // Find first available contiguous block
    let startSlice = -1;
    for (let i = 0; i <= 7 - profile.slices; i++) {
      let available = true;
      for (let j = 0; j < profile.slices; j++) {
        if (usedSlicePositions.has(i + j)) {
          available = false;
          break;
        }
      }
      if (available) {
        startSlice = i;
        break;
      }
    }

    if (startSlice === -1) {
      setError('No contiguous slice block available for this profile.');
      return;
    }

    const newInstance: ConfiguredInstance = {
      profile,
      startSlice,
      instanceId: instances.length,
    };

    setInstances([...instances, newInstance]);
    setError(null);
    setSelectedProfile(null);
  }, [instances, availableSlices]);

  // Remove an instance
  const removeInstance = useCallback((index: number) => {
    setInstances(instances.filter((_, i) => i !== index));
    setError(null);
  }, [instances]);

  // Clear all instances
  const clearAll = useCallback(() => {
    setInstances([]);
    setError(null);
  }, []);

  // Apply configuration
  const handleApply = useCallback(() => {
    if (onApply) {
      onApply(instances.map(i => i.profile));
    }
  }, [instances, onApply]);

  // Render the GPU slice visualization
  const renderSliceVisualization = () => {
    const slices: React.ReactNode[] = [];
    const sliceWidth = 100 / 7;

    // Create base slices
    for (let i = 0; i < 7; i++) {
      const instance = instances.find(
        inst => i >= inst.startSlice && i < inst.startSlice + inst.profile.slices
      );

      const isFirstSlice = instance && i === instance.startSlice;
      const isLastSlice = instance && i === instance.startSlice + instance.profile.slices - 1;

      slices.push(
        <div
          key={i}
          className="relative h-full border-r border-gray-700 last:border-r-0 flex items-center justify-center"
          style={{
            width: `${sliceWidth}%`,
            backgroundColor: instance ? instance.profile.color : '#374151',
            borderTopLeftRadius: isFirstSlice ? '0.5rem' : 0,
            borderBottomLeftRadius: isFirstSlice ? '0.5rem' : 0,
            borderTopRightRadius: isLastSlice ? '0.5rem' : 0,
            borderBottomRightRadius: isLastSlice ? '0.5rem' : 0,
            opacity: instance ? 1 : 0.5,
          }}
        >
          {isFirstSlice && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs font-medium px-1 truncate">
                {instance.profile.name}
              </span>
            </div>
          )}
          {!instance && (
            <span className="text-gray-500 text-xs">{i}</span>
          )}
        </div>
      );
    }

    return slices;
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-lg font-semibold text-gray-200">
            MIG Configurator - GPU {gpu.id}
          </h3>
        </div>

        {/* MIG Enable Toggle */}
        <button
          onClick={() => setIsEnabled(!isEnabled)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isEnabled
              ? 'bg-nvidia-green text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {isEnabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          MIG {isEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {!isEnabled ? (
        <div className="bg-gray-900 rounded-lg p-6 text-center">
          <Layers className="w-12 h-12 mx-auto mb-2 text-gray-500" />
          <p className="text-gray-400">Enable MIG mode to configure GPU partitions</p>
          <p className="text-sm text-gray-500 mt-1">
            MIG allows dividing the GPU into isolated instances
          </p>
        </div>
      ) : (
        <>
          {/* GPU Memory/Compute Visualization */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">GPU Slices (7 total)</span>
              <span className="text-sm text-gray-400">
                {usedSlices}/7 used ({availableSlices} available)
              </span>
            </div>
            <div className="h-16 flex bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
              {renderSliceVisualization()}
            </div>
          </div>

          {/* Memory Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">Memory Allocation</span>
              <span className="text-sm text-gray-300">
                {instances.reduce((sum, i) => sum + i.profile.memoryGB, 0)}GB /{' '}
                {Math.round(gpu.memoryTotal / 1024)}GB
              </span>
            </div>
            <div className="h-4 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-nvidia-green to-green-400 transition-all"
                style={{
                  width: `${(instances.reduce((sum, i) => sum + i.profile.memoryGB, 0) /
                    (gpu.memoryTotal / 1024)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Compute Units Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-400">Compute SMs</span>
              <span className="text-sm text-gray-300">
                {instances.reduce((sum, i) => sum + i.profile.smCount, 0)} / 108 SMs
              </span>
            </div>
            <div className="h-4 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                style={{
                  width: `${(instances.reduce((sum, i) => sum + i.profile.smCount, 0) / 108) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Profile Selection */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Add MIG Instance</h4>
            <div className="grid grid-cols-3 gap-2">
              {MIG_PROFILES.map((profile) => {
                const isAvailable = availableProfiles.includes(profile);
                const existingCount = instances.filter(i => i.profile.id === profile.id).length;

                return (
                  <button
                    key={profile.id}
                    onClick={() => isAvailable && addInstance(profile)}
                    disabled={!isAvailable}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      isAvailable
                        ? 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
                        : 'bg-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                    style={{
                      borderLeft: `4px solid ${profile.color}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-200">{profile.name}</span>
                      <Plus className={`w-4 h-4 ${isAvailable ? 'text-gray-400' : 'text-gray-600'}`} />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {profile.memoryGB}GB | {profile.smCount} SMs
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {existingCount}/{profile.maxInstances} instances
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configured Instances */}
          {instances.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-300">Configured Instances</h4>
                <button
                  onClick={clearAll}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </button>
              </div>
              <div className="space-y-2">
                {instances.map((instance, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-900 rounded-lg"
                    style={{ borderLeft: `4px solid ${instance.profile.color}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-sm font-medium text-gray-200">
                          MIG-GPU-{gpu.id}/{instance.instanceId}
                        </span>
                        <span className="text-sm text-gray-400 ml-2">
                          ({instance.profile.name})
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Slices {instance.startSlice}-{instance.startSlice + instance.profile.slices - 1}
                      </div>
                    </div>
                    <button
                      onClick={() => removeInstance(index)}
                      className="p-1 text-gray-400 hover:text-red-400 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-200">{error}</span>
            </div>
          )}

          {/* Command Preview */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">nvidia-smi Commands</h4>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs space-y-1">
              {!gpu.migMode && (
                <div className="text-green-400">
                  $ nvidia-smi -i {gpu.id} -mig 1
                  <span className="text-gray-500 ml-2"># Enable MIG mode</span>
                </div>
              )}
              {instances.length > 0 && (
                <div className="text-cyan-400">
                  $ nvidia-smi mig -i {gpu.id} -cgi {instances.map(i => i.profile.id).join(',')} -C
                  <span className="text-gray-500 ml-2"># Create instances</span>
                </div>
              )}
              {instances.length === 0 && gpu.migMode && (
                <div className="text-gray-500">
                  # Select profiles above to generate commands
                </div>
              )}
            </div>
          </div>

          {/* Apply Button */}
          {onApply && instances.length > 0 && (
            <button
              onClick={handleApply}
              className="w-full py-2 bg-nvidia-green text-black font-medium rounded-lg hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Apply Configuration
            </button>
          )}
        </>
      )}

      {/* Info Panel */}
      <div className="mt-4 p-3 bg-gray-900 rounded-lg">
        <h4 className="text-xs font-semibold text-gray-300 mb-2">MIG Profile Reference</h4>
        <div className="grid grid-cols-6 gap-2 text-xs">
          {MIG_PROFILES.map((profile) => (
            <div
              key={profile.id}
              className="p-1.5 rounded text-center"
              style={{ backgroundColor: profile.color + '40' }}
            >
              <div className="font-medium text-gray-200">{profile.name}</div>
              <div className="text-gray-400">{profile.memoryGB}GB</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MIGConfigurator;
