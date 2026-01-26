import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MIGConfigurator } from '../MIGConfigurator';
import { SlurmJobVisualizer } from '../SlurmJobVisualizer';
import type { DGXNode, GPU, InfiniBandHCA, InfiniBandPort } from '@/types/hardware';

describe('MIGConfigurator', () => {
  const createMockGPU = (id: number, migMode: boolean = false): GPU => ({
    id,
    uuid: `GPU-${id}-0000-0000-0000`,
    name: 'A100-SXM4-80GB',
    type: 'A100-80GB',
    pciAddress: `0000:${(0x10 + id).toString(16)}:00.0`,
    temperature: 45,
    powerDraw: 250,
    powerLimit: 400,
    memoryTotal: 81920, // 80GB
    memoryUsed: 1024,
    utilization: 50,
    clocksSM: 1410,
    clocksMem: 1215,
    eccEnabled: true,
    eccErrors: { singleBit: 0, doubleBit: 0, aggregated: { singleBit: 0, doubleBit: 0 } },
    migMode,
    migInstances: [],
    nvlinks: [],
    healthStatus: 'OK',
    xidErrors: [],
    persistenceMode: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component title', () => {
      render(<MIGConfigurator gpu={createMockGPU(0)} />);

      expect(screen.getByText(/MIG Configurator/)).toBeInTheDocument();
    });

    it('should show GPU ID in title', () => {
      render(<MIGConfigurator gpu={createMockGPU(3)} />);

      expect(screen.getByText(/GPU 3/)).toBeInTheDocument();
    });

    it('should show MIG toggle button', () => {
      render(<MIGConfigurator gpu={createMockGPU(0)} />);

      expect(screen.getByRole('button', { name: /MIG/ })).toBeInTheDocument();
    });
  });

  describe('MIG Toggle', () => {
    it('should show disabled state initially for non-MIG GPU', () => {
      render(<MIGConfigurator gpu={createMockGPU(0, false)} />);

      expect(screen.getByText(/MIG Disabled/)).toBeInTheDocument();
    });

    it('should show enabled state for MIG GPU', () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      expect(screen.getByText(/MIG Enabled/)).toBeInTheDocument();
    });

    it('should toggle MIG state on button click', () => {
      render(<MIGConfigurator gpu={createMockGPU(0, false)} />);

      const toggleButton = screen.getByRole('button', { name: /MIG/ });
      fireEvent.click(toggleButton);

      expect(screen.getByText(/MIG Enabled/)).toBeInTheDocument();
    });

    it('should show enable message when disabled', () => {
      render(<MIGConfigurator gpu={createMockGPU(0, false)} />);

      expect(screen.getByText(/Enable MIG mode to configure GPU partitions/)).toBeInTheDocument();
    });
  });

  describe('Profile Selection', () => {
    it('should show MIG profiles when enabled', () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      // Profiles appear in both buttons and reference section
      expect(screen.getAllByText('1g.5gb').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2g.10gb').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3g.20gb').length).toBeGreaterThan(0);
      expect(screen.getAllByText('7g.40gb').length).toBeGreaterThan(0);
    });

    it('should show Add MIG Instance section', () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      expect(screen.getByText('Add MIG Instance')).toBeInTheDocument();
    });
  });

  describe('Instance Management', () => {
    it('should add instance when profile is clicked', () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      // Find the profile button in the Add MIG Instance section (first occurrence)
      const profileButtons = screen.getAllByText('1g.5gb');
      const profileButton = profileButtons[0].closest('button');
      if (profileButton) {
        fireEvent.click(profileButton);
      }

      // Should show configured instances section
      expect(screen.getByText('Configured Instances')).toBeInTheDocument();
    });

    it('should show Clear All button when instances exist', () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      // Add an instance - use first occurrence which is the button
      const profileButtons = screen.getAllByText('1g.5gb');
      const profileButton = profileButtons[0].closest('button');
      if (profileButton) {
        fireEvent.click(profileButton);
      }

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  describe('Command Preview', () => {
    it('should show nvidia-smi Commands section', () => {
      render(<MIGConfigurator gpu={createMockGPU(0, true)} />);

      expect(screen.getByText('nvidia-smi Commands')).toBeInTheDocument();
    });
  });

  describe('Profile Reference', () => {
    it('should show MIG Profile Reference section', () => {
      render(<MIGConfigurator gpu={createMockGPU(0)} />);

      expect(screen.getByText('MIG Profile Reference')).toBeInTheDocument();
    });
  });

  describe('Apply Callback', () => {
    it('should show Apply button when instances configured and callback provided', () => {
      const onApply = vi.fn();
      render(<MIGConfigurator gpu={createMockGPU(0, true)} onApply={onApply} />);

      // Add an instance first - use getAllByText
      const profileButtons = screen.getAllByText('1g.5gb');
      const profileButton = profileButtons[0].closest('button');
      if (profileButton) {
        fireEvent.click(profileButton);
      }

      expect(screen.getByText('Apply Configuration')).toBeInTheDocument();
    });
  });
});

describe('SlurmJobVisualizer', () => {
  const createMockPort = (portNumber: number): InfiniBandPort => ({
    portNumber,
    state: 'Active',
    physicalState: 'LinkUp',
    rate: 400,
    width: '4x',
    linkLayer: 'InfiniBand',
    smLid: 1,
    baseLid: portNumber,
    txBytes: 1000000,
    rxBytes: 1000000,
    txPackets: 10000,
    rxPackets: 10000,
    symbolErrors: 0,
  });

  const createMockHCA = (id: number): InfiniBandHCA => ({
    guid: `0x${id.toString(16).padStart(16, '0')}`,
    caType: 'MT4125',
    numPorts: 2,
    firmwareVersion: '22.35.1012',
    driverVersion: 'MLNX_OFED-5.8',
    ports: [createMockPort(1), createMockPort(2)],
    pciAddress: `0000:${(0xc1 + id).toString(16)}:00.0`,
    boardId: 'MT_0000000001',
    sysImageGuid: `0x${(id + 1).toString(16).padStart(16, '0')}`,
    nodeDescription: `mlx5_${id}`,
  });

  const createMockGPU = (id: number): GPU => ({
    id,
    uuid: `GPU-${id}-0000-0000-0000`,
    name: 'A100-SXM4-80GB',
    type: 'A100-80GB',
    pciAddress: `0000:${(0x10 + id).toString(16)}:00.0`,
    temperature: 45,
    powerDraw: 250,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 1024,
    utilization: 50,
    clocksSM: 1410,
    clocksMem: 1215,
    eccEnabled: true,
    eccErrors: { singleBit: 0, doubleBit: 0, aggregated: { singleBit: 0, doubleBit: 0 } },
    migMode: false,
    migInstances: [],
    nvlinks: [],
    healthStatus: 'OK',
    xidErrors: [],
    persistenceMode: true,
  });

  const mockNodes: DGXNode[] = [
    {
      id: 'dgx-00',
      hostname: 'dgx-00.local',
      systemType: 'DGX-A100',
      gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i)),
      dpus: [],
      hcas: [createMockHCA(0)],
      bmc: {
        ipAddress: '192.168.0.100',
        macAddress: '00:00:00:00:00:01',
        firmwareVersion: '1.2.3',
        manufacturer: 'NVIDIA',
        sensors: [],
        powerState: 'On',
      },
      cpuModel: 'AMD EPYC 7742',
      cpuCount: 128,
      ramTotal: 2048,
      ramUsed: 256,
      osVersion: 'Ubuntu 22.04',
      kernelVersion: '5.15.0',
      nvidiaDriverVersion: '535.104.05',
      cudaVersion: '12.2',
      healthStatus: 'OK',
      slurmState: 'mixed',
    },
    {
      id: 'dgx-01',
      hostname: 'dgx-01.local',
      systemType: 'DGX-A100',
      gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i + 8)),
      dpus: [],
      hcas: [createMockHCA(1)],
      bmc: {
        ipAddress: '192.168.0.101',
        macAddress: '00:00:00:00:00:02',
        firmwareVersion: '1.2.3',
        manufacturer: 'NVIDIA',
        sensors: [],
        powerState: 'On',
      },
      cpuModel: 'AMD EPYC 7742',
      cpuCount: 128,
      ramTotal: 2048,
      ramUsed: 512,
      osVersion: 'Ubuntu 22.04',
      kernelVersion: '5.15.0',
      nvidiaDriverVersion: '535.104.05',
      cudaVersion: '12.2',
      healthStatus: 'OK',
      slurmState: 'allocated',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component title', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText(/Slurm Job Placement/)).toBeInTheDocument();
    });

    it('should show job count summary in header', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // The header shows both running and pending counts
      expect(screen.getAllByText(/Running/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Pending/).length).toBeGreaterThan(0);
    });
  });

  describe('Node Grid', () => {
    it('should display all nodes', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText('dgx-00.local')).toBeInTheDocument();
      expect(screen.getByText('dgx-01.local')).toBeInTheDocument();
    });

    it('should show node slurm state badges', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // These are state badges in the nodes
      expect(screen.getAllByText('mixed').length).toBeGreaterThan(0);
      expect(screen.getAllByText('allocated').length).toBeGreaterThan(0);
    });

    it('should display GPU allocation info', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // Should show GPU allocation info for each node
      expect(screen.getAllByText(/GPUs allocated/).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Job Queue', () => {
    it('should show Running Jobs section header', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // Use heading role or more specific query
      const headings = screen.getAllByText('Running Jobs');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should show Pending Queue section header', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText('Pending Queue')).toBeInTheDocument();
    });
  });

  describe('Job Details', () => {
    it('should show job details when a job is selected', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      // Find a running job and click it
      const jobElement = screen.getByText('llama3_finetune').closest('div');
      if (jobElement) {
        fireEvent.click(jobElement);
      }

      expect(screen.getByText('Job Details')).toBeInTheDocument();
    });
  });

  describe('Slurm Commands', () => {
    it('should show squeue command example', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText(/squeue/)).toBeInTheDocument();
    });

    it('should show scontrol command example', () => {
      render(<SlurmJobVisualizer nodes={mockNodes} />);

      expect(screen.getByText(/scontrol/)).toBeInTheDocument();
    });
  });

  describe('Single Node', () => {
    it('should handle single node cluster', () => {
      const singleNode = [mockNodes[0]];
      render(<SlurmJobVisualizer nodes={singleNode} />);

      expect(screen.getByText('dgx-00.local')).toBeInTheDocument();
      expect(screen.queryByText('dgx-01.local')).not.toBeInTheDocument();
    });
  });
});
