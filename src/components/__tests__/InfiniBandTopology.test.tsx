import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfiniBandTopology } from '../InfiniBandTopology';
import type { DGXNode, GPU, InfiniBandHCA, InfiniBandPort } from '@/types/hardware';

// Mock D3 with chainable selection methods
vi.mock('d3', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSelection: any = {};
  const methods = ['selectAll', 'select', 'remove', 'data', 'enter', 'append', 'attr', 'style', 'text', 'on', 'each'];
  methods.forEach(method => {
    mockSelection[method] = vi.fn(() => mockSelection);
  });

  return {
    select: vi.fn(() => mockSelection),
  };
});

describe('InfiniBandTopology', () => {
  const createMockPort = (portNumber: number, state: 'Active' | 'Down' = 'Active'): InfiniBandPort => ({
    portNumber,
    state,
    physicalState: state === 'Active' ? 'LinkUp' : 'LinkDown',
    rate: 400,
    lid: portNumber,
    guid: `0x${portNumber.toString(16).padStart(16, '0')}`,
    linkLayer: 'InfiniBand',
    errors: {
      symbolErrors: 0,
      linkDowned: 0,
      portRcvErrors: 0,
      portXmitDiscards: 0,
      portXmitWait: 0,
    },
  });

  const createMockHCA = (id: number, portsActive: boolean = true): InfiniBandHCA => ({
    id,
    devicePath: `/dev/infiniband/umad${id}`,
    pciAddress: `0000:${(0xc1 + id).toString(16)}:00.0`,
    caType: 'ConnectX-7',
    firmwareVersion: '22.35.1012',
    ports: [
      createMockPort(1, portsActive ? 'Active' : 'Down'),
      createMockPort(2, portsActive ? 'Active' : 'Down'),
    ],
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
    utilization: 15,
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

  const createMockNode = (id: string, hostname: string, hcaCount: number = 8): DGXNode => ({
    id,
    hostname,
    systemType: 'DGX-A100',
    gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i)),
    dpus: [],
    hcas: Array.from({ length: hcaCount }, (_, i) => createMockHCA(i)),
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
    slurmState: 'idle',
  });

  const mockNodes: DGXNode[] = [
    createMockNode('dgx-00', 'dgx-00.local'),
    createMockNode('dgx-01', 'dgx-01.local'),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText(/InfiniBand Fat-Tree Topology/)).toBeInTheDocument();
    });

    it('should show node count in header', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText(/2 nodes/)).toBeInTheDocument();
    });

    it('should show HCA count in header', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText(/16 HCAs/)).toBeInTheDocument();
    });

    it('should render SVG element', () => {
      const { container } = render(<InfiniBandTopology nodes={mockNodes} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle empty nodes array', () => {
      render(<InfiniBandTopology nodes={[]} />);

      expect(screen.getByText(/0 nodes/)).toBeInTheDocument();
    });
  });

  describe('Legend', () => {
    it('should show Spine Switch legend item', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText('Spine Switch')).toBeInTheDocument();
    });

    it('should show Leaf Switch legend item', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText('Leaf Switch')).toBeInTheDocument();
    });

    it('should show HCA Active legend item', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText('HCA Active')).toBeInTheDocument();
    });

    it('should show DGX Node legend item', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText('DGX Node')).toBeInTheDocument();
    });

    it('should show Active Link legend item', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText('Active Link')).toBeInTheDocument();
    });
  });

  describe('Instructions', () => {
    it('should show click instruction', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText(/Click on DGX nodes or HCAs for details/)).toBeInTheDocument();
    });

    it('should mention NDR connections', () => {
      render(<InfiniBandTopology nodes={mockNodes} />);

      expect(screen.getByText(/NDR.*400Gb\/s/)).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should accept onNodeClick callback', () => {
      const onNodeClick = vi.fn();
      render(<InfiniBandTopology nodes={mockNodes} onNodeClick={onNodeClick} />);

      // Component renders without error
      expect(screen.getByText(/InfiniBand Fat-Tree Topology/)).toBeInTheDocument();
    });

    it('should accept onHCAClick callback', () => {
      const onHCAClick = vi.fn();
      render(<InfiniBandTopology nodes={mockNodes} onHCAClick={onHCAClick} />);

      expect(screen.getByText(/InfiniBand Fat-Tree Topology/)).toBeInTheDocument();
    });

    it('should accept selectedNodeId prop', () => {
      render(<InfiniBandTopology nodes={mockNodes} selectedNodeId="dgx-00" />);

      expect(screen.getByText(/InfiniBand Fat-Tree Topology/)).toBeInTheDocument();
    });
  });

  describe('Different Node Configurations', () => {
    it('should handle single node', () => {
      const singleNode = [createMockNode('dgx-00', 'dgx-00.local')];
      render(<InfiniBandTopology nodes={singleNode} />);

      expect(screen.getByText(/1 nodes/)).toBeInTheDocument();
    });

    it('should handle four nodes', () => {
      const fourNodes = [
        createMockNode('dgx-00', 'dgx-00.local'),
        createMockNode('dgx-01', 'dgx-01.local'),
        createMockNode('dgx-02', 'dgx-02.local'),
        createMockNode('dgx-03', 'dgx-03.local'),
      ];
      render(<InfiniBandTopology nodes={fourNodes} />);

      expect(screen.getByText(/4 nodes/)).toBeInTheDocument();
    });

    it('should handle node with different HCA counts', () => {
      const nodeWithFewHCAs = createMockNode('dgx-00', 'dgx-00.local', 4);
      render(<InfiniBandTopology nodes={[nodeWithFewHCAs]} />);

      expect(screen.getByText(/4 HCAs/)).toBeInTheDocument();
    });
  });

  describe('Node Health States', () => {
    it('should handle node with Warning health', () => {
      const warningNode: DGXNode = {
        ...createMockNode('dgx-00', 'dgx-00.local'),
        healthStatus: 'Warning',
      };

      render(<InfiniBandTopology nodes={[warningNode]} />);

      expect(screen.getByText(/InfiniBand Fat-Tree Topology/)).toBeInTheDocument();
    });

    it('should handle node with Critical health', () => {
      const criticalNode: DGXNode = {
        ...createMockNode('dgx-00', 'dgx-00.local'),
        healthStatus: 'Critical',
      };

      render(<InfiniBandTopology nodes={[criticalNode]} />);

      expect(screen.getByText(/InfiniBand Fat-Tree Topology/)).toBeInTheDocument();
    });
  });

  describe('HCA Health States', () => {
    it('should handle HCA with all ports down', () => {
      const nodeWithDownHCA: DGXNode = {
        ...createMockNode('dgx-00', 'dgx-00.local', 2),
        hcas: [
          createMockHCA(0, true),
          createMockHCA(1, false), // All ports down
        ],
      };

      render(<InfiniBandTopology nodes={[nodeWithDownHCA]} />);

      expect(screen.getByText(/InfiniBand Fat-Tree Topology/)).toBeInTheDocument();
    });

    it('should handle HCA with mixed port states', () => {
      const hcaWithMixedPorts: InfiniBandHCA = {
        ...createMockHCA(0),
        ports: [
          createMockPort(1, 'Active'),
          createMockPort(2, 'Down'),
        ],
      };

      const nodeWithMixedHCA: DGXNode = {
        ...createMockNode('dgx-00', 'dgx-00.local', 1),
        hcas: [hcaWithMixedPorts],
      };

      render(<InfiniBandTopology nodes={[nodeWithMixedHCA]} />);

      expect(screen.getByText(/InfiniBand Fat-Tree Topology/)).toBeInTheDocument();
    });
  });

  describe('Different System Types', () => {
    it('should handle H100 system type', () => {
      const h100Node: DGXNode = {
        ...createMockNode('dgx-00', 'dgx-00.local'),
        systemType: 'DGX-H100',
        gpus: Array.from({ length: 8 }, (_, i) => ({
          ...createMockGPU(i),
          name: 'H100-SXM5-80GB',
          type: 'H100-SXM' as const,
        })),
      };

      render(<InfiniBandTopology nodes={[h100Node]} />);

      expect(screen.getByText(/InfiniBand Fat-Tree Topology/)).toBeInTheDocument();
    });
  });
});
