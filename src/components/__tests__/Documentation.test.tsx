import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================

// Mock lucide-react icons explicitly (Proxy causes vitest to hang)
vi.mock("lucide-react", () => {
  const mk = (n: string) => {
    const C = () => null;
    C.displayName = n;
    return C;
  };
  return {
    Server: mk("Server"),
    Terminal: mk("Terminal"),
    AlertTriangle: mk("AlertTriangle"),
    Network: mk("Network"),
    Shield: mk("Shield"),
    Activity: mk("Activity"),
    Cpu: mk("Cpu"),
    HardDrive: mk("HardDrive"),
    Wifi: mk("Wifi"),
    ChevronRight: mk("ChevronRight"),
    ChevronDown: mk("ChevronDown"),
    Search: mk("Search"),
    Zap: mk("Zap"),
    Link: mk("Link"),
    Thermometer: mk("Thermometer"),
    Settings: mk("Settings"),
    Code: mk("Code"),
    GraduationCap: mk("GraduationCap"),
    FileText: mk("FileText"),
    Target: mk("Target"),
    CheckCircle: mk("CheckCircle"),
    ExternalLink: mk("ExternalLink"),
    BookOpen: mk("BookOpen"),
    Award: mk("Award"),
    Clock: mk("Clock"),
    Brain: mk("Brain"),
    Lightbulb: mk("Lightbulb"),
    List: mk("List"),
    Monitor: mk("Monitor"),
  };
});

import { Documentation } from "../Documentation";

// ============================================================================
// Tests
// ============================================================================

describe("Documentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Basic rendering
  // --------------------------------------------------------------------------

  it("renders without crashing", () => {
    const { container } = render(<Documentation />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows the page title and subtitle", () => {
    render(<Documentation />);
    expect(screen.getByText("Documentation & Reference")).toBeInTheDocument();
    expect(
      screen.getByText(/Comprehensive guide to the DGX SuperPOD simulator/),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 2. All five tabs are rendered in the tab bar
  // --------------------------------------------------------------------------

  it("renders all five tab labels in the tab bar", () => {
    render(<Documentation />);
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("Commands")).toBeInTheDocument();
    expect(screen.getByText("Troubleshooting")).toBeInTheDocument();
    expect(screen.getByText("XID Reference")).toBeInTheDocument();
    expect(screen.getByText("Exam Guide")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 3. Default tab is Architecture
  // --------------------------------------------------------------------------

  it("shows Architecture content by default", () => {
    render(<Documentation />);
    expect(
      screen.getByText("Cluster Topology: DGX SuperPOD"),
    ).toBeInTheDocument();
  });

  it("does not show Commands content by default", () => {
    render(<Documentation />);
    expect(screen.queryByText("CLI Tool Reference")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 4. Active tab styling
  // --------------------------------------------------------------------------

  it("applies active styling to the Architecture tab by default", () => {
    render(<Documentation />);
    const archLabel = screen.getByText("Architecture");
    const archButton = archLabel.closest("button")!;
    expect(archButton.className).toContain("border-nvidia-green");
    expect(archButton.className).toContain("text-nvidia-green");
  });

  it("applies inactive styling to non-active tabs", () => {
    render(<Documentation />);
    const cmdLabel = screen.getByText("Commands");
    const cmdButton = cmdLabel.closest("button")!;
    expect(cmdButton.className).toContain("border-transparent");
    expect(cmdButton.className).toContain("text-gray-400");
  });

  // --------------------------------------------------------------------------
  // 5. Tab switching: Commands tab
  // --------------------------------------------------------------------------

  it("switches to Commands tab and shows CLI Tool Reference", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("Commands").closest("button")!);
    expect(screen.getByText("CLI Tool Reference")).toBeInTheDocument();
    expect(
      screen.queryByText("Cluster Topology: DGX SuperPOD"),
    ).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 6. Tab switching: Troubleshooting tab
  // --------------------------------------------------------------------------

  it("switches to Troubleshooting tab and shows diagnostic playbooks", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("Troubleshooting").closest("button")!);
    expect(screen.getByText("Diagnostic Playbooks")).toBeInTheDocument();
    expect(
      screen.getByText("Scenario A: XID Errors (GPU Faults)"),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 7. Tab switching: XID Reference tab
  // --------------------------------------------------------------------------

  it("switches to XID Reference tab and shows XID error content", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("XID Reference").closest("button")!);
    expect(screen.getByText("XID Error Code Reference")).toBeInTheDocument();
    expect(screen.getByText("About XID Errors")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 8. Tab switching: Exam Guide tab
  // --------------------------------------------------------------------------

  it("switches to Exam Guide tab and shows exam preparation content", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("Exam Guide").closest("button")!);
    expect(
      screen.getByText("NCP-AII Certification Study Guide"),
    ).toBeInTheDocument();
    expect(screen.getByText("Exam Overview")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 9. Architecture tab: shows system overview content
  // --------------------------------------------------------------------------

  it("Architecture tab shows node layout and hardware specs", () => {
    render(<Documentation />);
    expect(screen.getByText("Node Layout")).toBeInTheDocument();
    expect(
      screen.getByText("Hardware Specifications (Per Node)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Network Fabric Architecture")).toBeInTheDocument();
    // Verify specific node hostnames are rendered
    expect(screen.getByText("dgx-00")).toBeInTheDocument();
    expect(screen.getByText("dgx-07")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 10. Commands tab: search filters commands
  // --------------------------------------------------------------------------

  it("Commands tab search input filters categories by name", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("Commands").closest("button")!);

    const searchInput = screen.getByPlaceholderText("Search commands...");
    expect(searchInput).toBeInTheDocument();

    // Type a search query that matches only one category
    fireEvent.change(searchInput, { target: { value: "GPU Health" } });

    // "Check GPU Health" category should remain
    expect(screen.getByText("Check GPU Health")).toBeInTheDocument();
    // "Diagnose Network" should be filtered out
    expect(screen.queryByText("Diagnose Network")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 11. Commands tab: categories are collapsible
  // --------------------------------------------------------------------------

  it("Commands tab categories expand to show commands on click", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("Commands").closest("button")!);

    // Click the "Check GPU Health" category header to expand
    fireEvent.click(screen.getByText("Check GPU Health").closest("button")!);

    // Once expanded, individual commands should appear
    expect(screen.getByText("nvidia-smi")).toBeInTheDocument();
  });

  it("Commands tab categories collapse when clicked again", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("Commands").closest("button")!);

    const categoryHeader = screen.getByText("Check GPU Health");

    // Expand
    fireEvent.click(categoryHeader.closest("button")!);
    expect(screen.getByText("nvidia-smi")).toBeInTheDocument();

    // Collapse
    fireEvent.click(categoryHeader.closest("button")!);
    expect(screen.queryByText("nvidia-smi")).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 12. Troubleshooting tab: shows all four scenarios
  // --------------------------------------------------------------------------

  it("Troubleshooting tab shows all four diagnostic scenarios", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("Troubleshooting").closest("button")!);

    expect(
      screen.getByText("Scenario A: XID Errors (GPU Faults)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Scenario B: Thermal Throttling"),
    ).toBeInTheDocument();
    expect(screen.getByText("Scenario C: NVLink Errors")).toBeInTheDocument();
    expect(
      screen.getByText("Scenario D: InfiniBand Connectivity"),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 13. XID Reference tab: severity filter buttons
  // --------------------------------------------------------------------------

  it("XID Reference tab has All, Critical, and Warning severity filter buttons", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("XID Reference").closest("button")!);

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Critical" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Warning" })).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 14. Exam Guide tab: shows exam statistics
  // --------------------------------------------------------------------------

  it("Exam Guide tab displays exam statistics", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("Exam Guide").closest("button")!);

    expect(screen.getByText("50-60")).toBeInTheDocument();
    expect(screen.getByText("90 min")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("$395")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 15. Exam Guide tab: shows all five exam domains
  // --------------------------------------------------------------------------

  it("Exam Guide tab displays all five exam domain sections", () => {
    render(<Documentation />);
    fireEvent.click(screen.getByText("Exam Guide").closest("button")!);

    expect(
      screen.getByText("Domain 1: System Installation & Configuration"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Domain 2: Physical Layer Management"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Domain 3: Control Plane Installation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Domain 4: Validation & Troubleshooting"),
    ).toBeInTheDocument();
    expect(screen.getByText("Domain 5: Maintenance")).toBeInTheDocument();
  });
});
