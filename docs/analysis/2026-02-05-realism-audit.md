# Simulation Realism & Accuracy Audit

**Date:** 2026-02-05
**Auditor:** Claude Opus 4.6
**Scope:** All 19 simulator files + 3 JSON data files (1 data file `nvidia-smi.json` does not exist)
**Branch:** `feature/cli-command-updates`

---

## Executive Summary

This audit evaluates the realism and accuracy of the NVIDIA AI Infrastructure Certification Simulator against real NVIDIA datacenter tooling behavior. The simulator's educational value depends critically on output fidelity -- students who learn incorrect output formats or hardware specifications will be misled on the NCP-AII exam.

Overall, the simulator demonstrates strong structural accuracy across most tools. Command hierarchies, subcommand routing, and flag handling are well-implemented. However, several notable accuracy issues exist that could confuse exam candidates, particularly around GPU architecture labeling, InfiniBand speed standard naming, memory unit display in the default nvidia-smi view, and hardcoded hardware values that do not adapt to the configurable DGX system types.

**Finding Count by Severity:**

- Critical: 3
- High: 6
- Medium: 10
- Low: 7
- Informational: 3

---

## Audit Checklist Results

### 1. nvidia-smi Output Accuracy

#### Finding 1.1: `nvidia-smi -q` Driver Version Displays GPU Name Instead of Driver Version

- **Severity:** Critical
- **File(s):** `src/simulators/nvidiaSmiSimulator.ts` (line 1678)
- **Current State:** The formatQuery output for `nvidia-smi -q` displays:
  ```
  Driver Version                            : NVIDIA H100 80GB HBM3
  ```
  The code reads `${g.name}` instead of the node's driver version string.
- **Real Behavior:** Real `nvidia-smi -q` output shows the numeric driver version:
  ```
  Driver Version                            : 535.129.03
  ```
- **Recommendation:** Replace `${g.name}` with the actual driver version from the node context (e.g., `node.nvidiaDriverVersion`). This is a data-corruption bug that will confuse any student reading the `-q` output.

#### Finding 1.2: `nvidia-smi -q` Hardcodes "Product Architecture: Ampere" for All GPUs

- **Severity:** High
- **File(s):** `src/simulators/nvidiaSmiSimulator.ts` (line 1684)
- **Current State:** The `-q` output always shows:
  ```
  Product Architecture                      : Ampere
  ```
  regardless of whether the GPU is an A100 (Ampere), H100 (Hopper), H200 (Hopper), B200 (Blackwell), or GB200 (Blackwell).
- **Real Behavior:** Real `nvidia-smi -q` shows the correct architecture per GPU model:
  - A100 -> `Ampere`
  - H100/H200 -> `Hopper`
  - B200/GB200 -> `Blackwell`
- **Recommendation:** Derive the architecture string from `gpu.type` (the `GPUType` enum in `hardware.ts` already distinguishes these). Map `A100-80GB` -> `"Ampere"`, `H100-SXM` / `H200-SXM` -> `"Hopper"`, `B200` / `Blackwell` -> `"Blackwell"`.

#### Finding 1.3: Default nvidia-smi View Shows Memory in GiB, Not MiB

- **Severity:** High
- **File(s):** `src/simulators/nvidiaSmiSimulator.ts` (lines 1605-1610)
- **Current State:** The default table view divides `gpu.memoryUsed` and `gpu.memoryTotal` by 1024 before displaying:
  ```typescript
  const memUsed = Math.round(gpu.memoryUsed / 1024)
    .toString()
    .padStart(5);
  const memTotal = Math.round(gpu.memoryTotal / 1024)
    .toString()
    .padStart(5);
  ```
  The label says "MiB" but the actual values are in GiB. For an H100 80GB this shows ~80MiB instead of ~81920MiB.
- **Real Behavior:** Real `nvidia-smi` default view shows memory in MiB:
  ```
  |   0  NVIDIA H100 80GB HBM3   ...   |   1234MiB / 81559MiB |
  ```
  The `memoryTotal` and `memoryUsed` fields in the `GPU` interface are already in MB (per the type comment on line 67-68 of `hardware.ts`), so they should be displayed directly without division.
- **Recommendation:** Remove the `/ 1024` division. The GPU interface already stores memory in MB, and the label is "MiB". Display the raw values. If `memoryTotal` is stored as 81920 (MiB), display 81920MiB, not 80MiB.

#### Finding 1.4: Topology Matrix Uses Outdated NVLink Notation

- **Severity:** Medium
- **File(s):** `src/simulators/nvidiaSmiSimulator.ts` (lines 1354-1361)
- **Current State:** The `nvidia-smi topo -m` output uses `NV12` for adjacent GPUs and `NV6` for non-adjacent GPUs:
  ```
  GPU0  X    NV12  NV6   NV6   NV6   NV6   NV12  NV6
  ```
- **Real Behavior:** On DGX A100 with 12 NVLink connections per GPU, the matrix shows `NV12` for all GPU-GPU pairs because all GPUs connect through NVSwitches with full bandwidth. On DGX H100 with 18 NVLinks, it shows `NV18`. The notation `NVn` means "n NVLink connections." The current code incorrectly differentiates based on GPU index adjacency rather than actual NVSwitch topology.
- **Recommendation:** For a full NVSwitch topology (DGX A100/H100), all GPU-GPU pairs should show the same NVLink count (`NV12` for A100, `NV18` for H100). Differentiate based on `node.systemType`.

#### Finding 1.5: Power Max Limit Calculation May Be Inaccurate

- **Severity:** Low
- **File(s):** `src/simulators/nvidiaSmiSimulator.ts` (line 981)
- **Current State:** Max power limit is calculated as `powerLimit * 1.1` (110% of default limit). Min is `powerLimit * 0.5`.
- **Real Behavior:** For H100 SXM, the default TDP is 700W, min is 200W, and max is 700W (the default IS the max for SXM modules). For A100 SXM 80GB, default TDP is 400W, min is 100W, max is 400W. The 1.1x multiplier would show 770W for H100 which exceeds the actual hardware limit.
- **Recommendation:** Use hardware-specific max power limits rather than a fixed multiplier. For SXM form factors, max typically equals the default TDP.

---

### 2. dcgmi Diagnostic Levels

#### Finding 2.1: Diagnostic Levels Are Well-Differentiated

- **Severity:** Informational (Positive)
- **File(s):** `src/simulators/dcgmiSimulator.ts`
- **Current State:** The simulator correctly differentiates diagnostic levels:
  - Level 1: Deployment check only
  - Level 2: Adds PCIe bandwidth, SM stress, targeted stress
  - Level 3: Adds memory bandwidth, diagnostic, ECC check
- **Real Behavior:** This matches DCGM's actual diagnostic tier structure.
- **Recommendation:** No change needed. This is well-implemented.

#### Finding 2.2: DCGM Health Check Output Format Does Not Match Real DCGM

- **Severity:** Medium
- **File(s):** `src/simulators/dcgmiSimulator.ts`
- **Current State:** Health check output uses a simplified format. The real DCGM health check output uses a tabular format with `+---+` borders and specific column headers as shown in the `dcgmi.json` reference data.
- **Real Behavior:** Per the `dcgmi.json` reference data:
  ```
  Health Monitor Report
  +------------+----------+
  | System     | Status   |
  +------------+----------+
  | PCIe       | Healthy  |
  | Memory     | Healthy  |
  ...
  ```
- **Recommendation:** Update the health check output to use the bordered table format shown in the reference data. This is important for exam preparation as students need to recognize the exact output format.

#### Finding 2.3: DCGM dmon Field IDs Are Correct

- **Severity:** Informational (Positive)
- **File(s):** `src/simulators/dcgmiSimulator.ts`
- **Current State:** The dmon simulation uses field IDs 155 (GPU_UTIL), 156 (MEM_UTIL), 203 (GPU_TEMP), 204 (POWER) which are the correct DCGM field IDs.
- **Recommendation:** No change needed.

---

### 3. InfiniBand Specifications

#### Finding 3.1: ibdiagnet Labels 400 Gb/s as "HDR" Instead of "NDR"

- **Severity:** Critical
- **File(s):** `src/simulators/infinibandSimulator.ts` (line 355)
- **Current State:** The ibdiagnet output shows:
  ```
  Link Speed: 400 Gb/s (HDR)
  ```
- **Real Behavior:** InfiniBand speed standards are:
  - EDR = 100 Gb/s (25 Gb/s x 4 lanes)
  - HDR = 200 Gb/s (50 Gb/s x 4 lanes)
  - NDR = 400 Gb/s (100 Gb/s x 4 lanes)
  - XDR = 800 Gb/s (200 Gb/s x 4 lanes)

  400 Gb/s is NDR, not HDR. This is a factual error that will directly mislead NCP-AII exam candidates on a testable topic.

- **Recommendation:** Change "HDR" to "NDR" for 400 Gb/s links. Better yet, derive the standard name from the port rate in the hardware data: 100 -> "EDR", 200 -> "HDR", 400 -> "NDR", 800 -> "XDR".

#### Finding 3.2: Port GUID Format Inconsistency

- **Severity:** Low
- **File(s):** `src/simulators/infinibandSimulator.ts`
- **Current State:** The ibstat output shows Node GUID with `0x` prefix but Port GUID formatting varies between commands. Some locations show the GUID without the `0x` prefix.
- **Real Behavior:** Real ibstat consistently uses the `0x` prefix for all GUIDs:
  ```
  Node GUID: 0x506b4b0300ab1234
  Port GUID: 0x506b4b0300ab1234
  ```
- **Recommendation:** Ensure all GUID displays consistently use the `0x` prefix across ibstat, perfquery, and ibdiagnet outputs.

#### Finding 3.3: ibstat Rate Field Should Be Numeric Only

- **Severity:** Low
- **File(s):** `src/simulators/infinibandSimulator.ts`
- **Current State:** The `ibstat.json` reference data confirms the Rate field should be a plain number (e.g., `200`), not a string with units.
- **Real Behavior:** Real ibstat shows: `Rate: 200` (plain number representing Gb/s). The simulator appears to handle this correctly in the ibstat output but inconsistently in ibdiagnet.
- **Recommendation:** Verify all InfiniBand command outputs use the correct format for speed/rate display.

---

### 4. Slurm Output Formatting

#### Finding 4.1: Slurm Version and Core Formatting Are Accurate

- **Severity:** Informational (Positive)
- **File(s):** `src/simulators/slurmSimulator.ts`
- **Current State:** Version 23.02.6 is used. Node states (idle, alloc, drain, down), GRES format (`gpu:h100:N`), scontrol show node field layout, and squeue state codes (R, PD, CD, CA, F) are all accurate.
- **Recommendation:** No change needed. Slurm simulation is one of the stronger areas.

#### Finding 4.2: sinfo Partition Summary Format Could Be More Precise

- **Severity:** Low
- **File(s):** `src/simulators/slurmSimulator.ts`
- **Current State:** The sinfo output format is reasonable but the column alignment and exact header spacing may differ slightly from real Slurm output. The `sinfo.json` reference data shows precise format code options (%P, %l, %D, %t, %N) that could be used for exact matching.
- **Recommendation:** Compare column widths and padding against real sinfo output samples in the reference JSON.

---

### 5. Hardware Specifications (H100/A100)

#### Finding 5.1: DGX System Type Not Reflected in System Utilities

- **Severity:** High
- **File(s):** `src/simulators/basicSystemSimulator.ts` (lines 248, 312, 337, 389, 409, 471, 495, 779)
- **Current State:** The basicSystemSimulator hardcodes "DGX A100" across dmidecode, hostnamectl, and chassis information, and "AMD EPYC 7742" for processor information, regardless of the node's `systemType` property.
- **Real Behavior:**
  - DGX A100: AMD EPYC 7742 (Rome), DDR4 3200 MT/s, 1TB RAM typical
  - DGX H100: Intel Xeon w9-3495X (Sapphire Rapids), DDR5 4800 MT/s, 2TB RAM typical
  - DGX H200: Intel Xeon w9-3495X, DDR5, 2TB RAM typical
- **Recommendation:** Read `node.systemType` and `node.cpuModel` from the simulation store to populate dmidecode and hostnamectl output dynamically. The `DGXNode` interface already has `cpuModel` and `systemType` fields.

#### Finding 5.2: NVLink Audit Hardcodes "DGX A100" and "NVLink Version: 3.0"

- **Severity:** High
- **File(s):** `src/simulators/nvlinkAuditSimulator.ts` (lines 122-124)
- **Current State:** The NVLink audit tool always outputs:
  ```
  Architecture: DGX A100 (SXM4)
  NVLink Version: 3.0
  Links per GPU: 12
  ```
- **Real Behavior:**
  - DGX A100: NVLink 3.0, 12 links/GPU, 600 GB/s total bandwidth
  - DGX H100: NVLink 4.0, 18 links/GPU, 900 GB/s total bandwidth
  - DGX H200: Same as H100 NVLink topology
- **Recommendation:** Derive NVLink version, architecture name, and link count from `node.systemType`. The 12-link hardcoding is only correct for A100.

#### Finding 5.3: NVLink Speed Hardcoded as "50 GB/s"

- **Severity:** Medium
- **File(s):** `src/simulators/nvlinkAuditSimulator.ts` (line 298)
- **Current State:** Link speed is hardcoded as "50 GB/s" for all active links.
- **Real Behavior:**
  - NVLink 3.0 (A100): 25 GB/s per sub-link (50 GB/s bidirectional per link)
  - NVLink 4.0 (H100): 25 GB/s per sub-link (50 GB/s bidirectional per link)

  The per-link speed is actually the same (50 GB/s bidirectional) for both A100 and H100 NVLink generations, but the aggregate bandwidth differs because H100 has 18 links vs 12. The hardcoded value happens to be correct, but the lack of dynamic derivation is a maintainability concern.

- **Recommendation:** Accept current value but add a comment clarifying the derivation, and adapt the link count based on system type.

#### Finding 5.4: HPL Benchmark TFLOPS Underestimates H100

- **Severity:** Medium
- **File(s):** `src/simulators/benchmarkSimulator.ts` (lines 234-236)
- **Current State:** H100 FP64 peak is listed as 60 TFLOPS. A100 FP64 peak is listed as 19.5 TFLOPS.
- **Real Behavior:**
  - H100 SXM5: ~66.9 TFLOPS FP64 (per NVIDIA specs)
  - A100 SXM4 80GB: 19.5 TFLOPS FP64 (correct)
- **Recommendation:** Update H100 FP64 peak to 66.9 or ~67 TFLOPS. The 60 TFLOPS figure is approximately 10% low, which would lead to unrealistic HPL efficiency calculations.

#### Finding 5.5: Fabric Manager Version Should Match Driver Version

- **Severity:** Low
- **File(s):** `src/simulators/fabricManagerSimulator.ts`
- **Current State:** The Fabric Manager version is hardcoded separately from the NVIDIA driver version.
- **Real Behavior:** In production, the NVIDIA Fabric Manager version must match the NVIDIA driver version (e.g., both 535.129.03). Mismatched versions cause Fabric Manager to refuse to start.
- **Recommendation:** Read the driver version from the node data and use it as the Fabric Manager version to maintain cross-tool consistency.

---

### 6. XID Error Accuracy

#### Finding 6.1: XID Error Database Is Comprehensive and Accurate

- **Severity:** Informational (Positive)
- **File(s):** `src/simulators/nvidiaBugReportSimulator.ts`, `src/simulators/pciToolsSimulator.ts`, `src/simulators/basicSystemSimulator.ts`
- **Current State:** The XID error database includes 25+ codes with accurate descriptions and severity levels. Key codes include:
  - XID 13: Graphics Engine Exception
  - XID 31: GPU memory page fault
  - XID 43: GPU stopped responding
  - XID 48: Double-bit ECC error
  - XID 63: Row remapping failure
  - XID 74: NVLink error
  - XID 79: GPU fallen off the bus

  Cross-tool fault propagation works correctly -- XID errors set on a GPU in the store are reflected in `dmesg`, `journalctl`, `nvidia-smi`, `dcgmi health`, `lspci -v`, and `nvidia-bug-report.sh`.

- **Recommendation:** No change needed. This is one of the strongest aspects of the simulator.

#### Finding 6.2: XID Error Timestamps Use Locale-Dependent Formatting

- **Severity:** Medium
- **File(s):** `src/simulators/pciToolsSimulator.ts` (lines 237-243)
- **Current State:** XID error timestamps in journalctl use `toLocaleString("en-US", ...)` which produces output like `Jan 15, 02:30:45 PM`.
- **Real Behavior:** Real journalctl kernel messages use the format: `Jan 15 14:30:45` (24-hour, no comma, no AM/PM):
  ```
  Jan 15 14:30:45 dgx-01 kernel: NVRM: Xid (PCI:0000:10:00.0): 79, ...
  ```
- **Recommendation:** Use a fixed-format timestamp that matches the standard syslog format (`Mmm DD HH:MM:SS`) rather than locale-dependent formatting.

---

### 7. Flag Combinations and Edge Cases

#### Finding 7.1: `free -h` Correctly Handled Separately from Help

- **Severity:** Informational (Positive)
- **File(s):** `src/simulators/basicSystemSimulator.ts` (lines 170-184)
- **Current State:** The simulator correctly distinguishes between `-h` meaning "human-readable" for the `free` command and `-h` meaning "help" for other commands.
- **Recommendation:** No change needed.

#### Finding 7.2: ClusterKit `check` Subcommand Is Not Implemented

- **Severity:** Medium
- **File(s):** `src/simulators/clusterKitSimulator.ts` (lines 322-323)
- **Current State:** `clusterkit check <category>` returns "Specific check functionality coming soon" for all valid categories (gpu, network, storage, firmware, drivers).
- **Real Behavior:** This is a functional gap, not a realism issue per se, but students encountering it may be confused by a placeholder response.
- **Recommendation:** Implement the individual check handlers by reusing the existing `assessGPUs()`, `assessNetwork()`, `assessStorage()`, `assessFirmware()`, and `assessDrivers()` methods that are already written for the `assess` subcommand.

#### Finding 7.3: nvidia-smi `-q` Hardcodes Device ID 0x20B010DE

- **Severity:** Medium
- **File(s):** `src/simulators/nvidiaSmiSimulator.ts` (line 1719)
- **Current State:** PCI Device ID is hardcoded as `0x20B010DE` for all GPUs.
- **Real Behavior:** Different GPU models have different PCI Device IDs:
  - A100 SXM4: `0x20B010DE`
  - H100 SXM5: `0x233010DE`
  - A100 PCIe: `0x20F110DE`
- **Recommendation:** Derive the PCI Device ID from the GPU type.

#### Finding 7.4: ipmitool SEL Uses Locale-Dependent Date Format

- **Severity:** Medium
- **File(s):** `src/simulators/ipmitoolSimulator.ts`
- **Current State:** SEL entries use JavaScript's locale date formatting.
- **Real Behavior:** Real ipmitool SEL output uses a fixed format:
  ```
  1 | 01/15/2024 | 08:30:15 | Temperature #0x30 | Upper Critical going high
  ```
  With pipe-delimited fields and `MM/DD/YYYY` date format.
- **Recommendation:** Use a fixed date format matching the standard ipmitool SEL output format.

---

### 8. Overall Realism Assessment

#### Finding 8.1: Cross-Tool Consistency Is Strong

- **Severity:** N/A (Assessment)
- **File(s):** Multiple simulators
- **Current State:** The simulator demonstrates excellent cross-tool fault propagation:
  - GPU XID errors appear in: nvidia-smi, dcgmi health, journalctl, dmesg, lspci -v, nvidia-bug-report.sh, nvsm show health
  - GPU temperature warnings appear in: nvidia-smi, journalctl, dmesg, lspci -v, sensors
  - ECC errors appear in: nvidia-smi, dcgmi diag, journalctl, dmesg
  - InfiniBand port states are reflected in: ibstat, iblinkinfo, clusterkit assess
- **Recommendation:** This is a major strength. The shared Zustand store pattern enables realistic cross-tool correlation.

#### Finding 8.2: System Type Configuration Not Propagated Consistently

- **Severity:** High
- **File(s):** Multiple simulators
- **Current State:** The `DGXNode` interface supports `systemType: 'DGX-A100' | 'DGX-H100' | 'DGX-H200' | 'DGX-B200' | 'DGX-GB200'` but the following simulators ignore this field and hardcode A100-specific values:
  - `basicSystemSimulator.ts`: "DGX A100", "AMD EPYC 7742"
  - `nvlinkAuditSimulator.ts`: "DGX A100 (SXM4)", "NVLink Version: 3.0"
  - `nvidiaSmiSimulator.ts`: "Product Architecture: Ampere"
  - `fabricManagerSimulator.ts`: NVSwitch count logic

  Other simulators that correctly use dynamic data:
  - `slurmSimulator.ts`: Uses GPU data from store
  - `dcgmiSimulator.ts`: Reads GPU properties dynamically
  - `pciToolsSimulator.ts`: Reads GPU names from store

- **Recommendation:** Create a utility function that maps `DGXSystemType` to hardware characteristics (CPU model, architecture name, NVLink version, link count, power limit) and use it consistently across all simulators.

#### Finding 8.3: Kernel and OS Versions Are Hardcoded

- **Severity:** Low
- **File(s):** `src/simulators/basicSystemSimulator.ts`, `src/simulators/pciToolsSimulator.ts`
- **Current State:** Kernel version is hardcoded as "5.15.0-91-generic" and OS as "Ubuntu 22.04.3 LTS" across multiple simulators.
- **Real Behavior:** DGX OS versions:
  - DGX OS 6.x (current, based on Ubuntu 22.04 with kernel 5.15.x) - matches
  - The hardcoded values are reasonable for the current DGX OS generation
- **Recommendation:** The current values are acceptable. Consider reading `node.kernelVersion` and `node.osVersion` from the store for consistency.

#### Finding 8.4: GPU-Burn Simulation Uses "TFLOPS" Instead of "Gflops" Label

- **Severity:** Low
- **File(s):** `src/simulators/benchmarkSimulator.ts` (line 331)
- **Current State:** GPU-burn output shows performance in "TFLOPS" with values around 450-500.
- **Real Behavior:** Real gpu-burn typically shows output in Gflops or GFlop/s per GPU. For an H100 at ~67 TFLOPS FP64, the displayed value would be in the tens of thousands of Gflops range. The 450 TFLOPS value is unrealistically high for a single GPU (even for FP16 Tensor).
- **Recommendation:** Review the gpu-burn output format and units. Real gpu-burn shows Gflop/s per GPU during the burn test, typically in the range of 15000-65000 Gflop/s for an H100 depending on precision.

#### Finding 8.5: Mellanox Simulator Has Good Tool Coverage

- **Severity:** Low (Positive observation)
- **File(s):** `src/simulators/mellanoxSimulator.ts`
- **Current State:** The Mellanox simulator covers mst, mlxconfig, mlxlink, mlxcables, mlxup, and mlxfwmanager with realistic output formats. BlueField DPU mode switching is properly implemented.
- **Recommendation:** No critical changes needed. The BlueField DPU configuration mode display (NIC/DPU/RestrictedDPU) is well-implemented.

#### Finding 8.6: Container Simulator Missing Pyxis/Enroot Integration

- **Severity:** Medium
- **File(s):** `src/simulators/containerSimulator.ts`
- **Current State:** Docker and NGC CLI are implemented but Pyxis (Slurm container plugin) integration is minimal. The CLAUDE.md identifies `pyxis` as part of the `container-tools` command family.
- **Real Behavior:** Pyxis allows running containers via Slurm with `srun --container-image=...`. This is an important NCP-AII topic for Domain 3 (Control Plane Installation).
- **Recommendation:** Consider adding Pyxis command support to the Slurm or container simulator to complete the container tools family coverage.

---

## Summary of Findings by Priority

### Must Fix (Critical + High) -- 9 items

| #   | Finding                                                            | Severity | File                            |
| --- | ------------------------------------------------------------------ | -------- | ------------------------------- |
| 1.1 | `nvidia-smi -q` Driver Version shows GPU name                      | Critical | nvidiaSmiSimulator.ts:1678      |
| 3.1 | ibdiagnet labels 400 Gb/s as "HDR" (should be "NDR")               | Critical | infinibandSimulator.ts:355      |
| 1.2 | Product Architecture hardcoded as "Ampere" for all GPUs            | High     | nvidiaSmiSimulator.ts:1684      |
| 1.3 | Default nvidia-smi view divides memory by 1024 (shows GiB not MiB) | High     | nvidiaSmiSimulator.ts:1605-1610 |
| 5.1 | dmidecode/hostnamectl hardcode "DGX A100" and "AMD EPYC 7742"      | High     | basicSystemSimulator.ts         |
| 5.2 | NVLink audit hardcodes "DGX A100", NVLink 3.0, 12 links            | High     | nvlinkAuditSimulator.ts:122-124 |
| 8.2 | systemType not propagated to multiple simulators                   | High     | Multiple files                  |
| 1.4 | Topology matrix uses incorrect NV12/NV6 differentiation            | Medium\* | nvidiaSmiSimulator.ts:1354      |
| 5.4 | HPL benchmark underestimates H100 at 60 TFLOPS (should be ~67)     | Medium\* | benchmarkSimulator.ts:234       |

\*These two Medium findings are escalated because they involve testable exam topics.

### Should Fix (Medium) -- 8 items

| #   | Finding                                                   | Severity | File                        |
| --- | --------------------------------------------------------- | -------- | --------------------------- |
| 2.2 | DCGM health check output format differs from real DCGM    | Medium   | dcgmiSimulator.ts           |
| 5.3 | NVLink speed hardcoded (acceptable value but non-dynamic) | Medium   | nvlinkAuditSimulator.ts:298 |
| 6.2 | journalctl XID timestamps use locale-dependent formatting | Medium   | pciToolsSimulator.ts:237    |
| 7.2 | ClusterKit `check` subcommand not implemented             | Medium   | clusterKitSimulator.ts:322  |
| 7.3 | nvidia-smi -q hardcodes PCI Device ID                     | Medium   | nvidiaSmiSimulator.ts:1719  |
| 7.4 | ipmitool SEL uses locale-dependent date format            | Medium   | ipmitoolSimulator.ts        |
| 8.4 | GPU-burn shows unrealistic TFLOPS values                  | Medium   | benchmarkSimulator.ts:331   |
| 8.6 | Pyxis container integration missing                       | Medium   | containerSimulator.ts       |

### Nice to Have (Low + Informational) -- 10 items

| #   | Finding                                               | Severity | File                      |
| --- | ----------------------------------------------------- | -------- | ------------------------- |
| 1.5 | Power max limit uses 1.1x multiplier                  | Low      | nvidiaSmiSimulator.ts:981 |
| 3.2 | Port GUID 0x prefix inconsistency                     | Low      | infinibandSimulator.ts    |
| 3.3 | ibstat rate format verification                       | Low      | infinibandSimulator.ts    |
| 4.2 | sinfo column alignment precision                      | Low      | slurmSimulator.ts         |
| 5.5 | Fabric Manager version should match driver version    | Low      | fabricManagerSimulator.ts |
| 8.3 | Kernel/OS versions hardcoded (but currently correct)  | Low      | basicSystemSimulator.ts   |
| 8.5 | Mellanox simulator coverage (positive)                | Low      | mellanoxSimulator.ts      |
| 2.1 | DCGM diagnostic levels well-differentiated (positive) | Info     | dcgmiSimulator.ts         |
| 2.3 | DCGM dmon field IDs correct (positive)                | Info     | dcgmiSimulator.ts         |
| 6.1 | XID error database comprehensive (positive)           | Info     | Multiple                  |

---

## Recommendations for Systematic Improvement

1. **Create a hardware specification utility** (`src/utils/hardwareSpecs.ts`) that maps `DGXSystemType` and `GPUType` to hardware characteristics:
   - Architecture name (Ampere/Hopper/Blackwell)
   - CPU model and socket count
   - NVLink version and link count
   - PCI Device IDs
   - Max power limits
   - NVSwitch count
   - Peak TFLOPS values

2. **Create an InfiniBand speed standard utility** that maps rate values to standard names:
   - 100 -> "EDR"
   - 200 -> "HDR"
   - 400 -> "NDR"
   - 800 -> "XDR"

3. **Standardize timestamp formatting** across all simulators using a shared utility that produces syslog-format timestamps (`Mmm DD HH:MM:SS`) and ipmitool SEL format (`MM/DD/YYYY | HH:MM:SS`).

4. **Add a "realism test suite"** that validates simulator outputs against known-good reference outputs from the JSON data files, catching formatting regressions early.
