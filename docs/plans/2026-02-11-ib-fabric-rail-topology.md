# InfiniBand Fabric Rail-Optimized Topology Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the InfiniBand Fabric visualization to accurately represent NVIDIA DGX SuperPOD rail-optimized fat-tree topology.

**Architecture:** The current visualization shows 2 spine / 4 leaf switches with each host connected to a single leaf. Real DGX SuperPODs use a rail-optimized topology: 8 leaf switches (one per GPU rail) and 4 spine switches per Scalable Unit, where each host's 8 HCAs connect to 8 different leaf switches (HCA N → Leaf N). This creates 8 parallel "rails" spanning all hosts, with spine switches providing cross-rail connectivity.

**Tech Stack:** React 18, TypeScript, D3.js, Vitest

**Reference:** [NVIDIA DGX SuperPOD Reference Architecture](https://docs.nvidia.com/dgx-superpod/) — H100, H200, and B200 docs all confirm: 1 SU = 8 leaf + 4 spine, rail-optimized full fat-tree, QM9700 NDR switches.

---

## Background: What's Wrong

| Aspect                          | Current (Wrong)                | Correct (NVIDIA Docs)               |
| ------------------------------- | ------------------------------ | ----------------------------------- |
| Leaf switches                   | 4                              | **8** (one per rail)                |
| Spine switches                  | 2                              | **4**                               |
| Host→Leaf links                 | 1 per host (assigned by index) | **8 per host** (one to each leaf)   |
| Leaf label                      | "L0"–"L3"                      | **"R0"–"R7"** (rail number)         |
| Connectivity concept            | Random aggregation             | **Rail-optimized** (HCA N → Rail N) |
| Total host-leaf links (8 nodes) | 8                              | **64**                              |
| Total spine-leaf links          | 8                              | **32**                              |

## Key Files

- `src/components/InfiniBandMap.tsx` — Main visualization (1,045 lines)
- `src/components/NetworkNodeDetail.tsx` — Click detail panels
- `src/simulators/infinibandSimulator.ts` — `ibnetdiscover` output
- `src/components/__tests__/TopologyViewer.test.tsx` — Integration tests

---

### Task 1: Update FabricTierConfig defaults to 8 leaf / 4 spine

**Files:**

- Modify: `src/components/InfiniBandMap.tsx:28-49`

**Step 1: Update DEFAULT_FABRIC_CONFIG**

Change lines 28-33:

```typescript
const DEFAULT_FABRIC_CONFIG: FabricTierConfig = {
  spineCount: 4,
  leafCount: 8,
  spineToLeafBandwidth: 400,
  leafToHostBandwidth: 400,
};
```

**Step 2: Update deriveFabricConfig()**

Replace lines 39-49 to also derive counts:

```typescript
function deriveFabricConfig(cluster: ClusterConfig): FabricTierConfig {
  const firstPort = cluster.nodes[0]?.hcas?.[0]?.ports?.[0];
  const portRate = (firstPort?.rate || 400) as 100 | 200 | 400 | 800;
  // Rail count = HCAs per node (always 8 in DGX systems)
  const hcaCount = cluster.nodes[0]?.hcas?.length || 8;
  return {
    spineCount: 4,
    leafCount: hcaCount,
    spineToLeafBandwidth: portRate,
    leafToHostBandwidth: portRate,
  };
}
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
feat: update IB fabric config to 8 leaf / 4 spine per NVIDIA SuperPOD spec
```

---

### Task 2: Update leaf-to-host link generation (rail pattern)

**Files:**

- Modify: `src/components/InfiniBandMap.tsx` — two places: the `useMemo` animationLinks (~lines 229-247) and the D3 render effect (~lines 337-350)

**Step 1: Fix useMemo animationLinks (lines 229-247)**

Replace the leaf-to-host loop with rail-optimized pattern — each host connects to ALL leafs:

```typescript
// Leaf to Host links (rail-optimized: each host connects to all leafs)
hostNodes.forEach((host) => {
  leafNodes.forEach((leaf) => {
    links.push({
      id: `${leaf.id}-${host.id}`,
      sourceX: leaf.x,
      sourceY: leaf.y,
      targetX: host.x,
      targetY: host.y,
      active: host.active,
      utilization: host.active ? host.utilization : 0,
      bidirectional: true,
    });
  });
});
```

**Step 2: Fix D3 render effect link creation (lines 337-350)**

Replace the Leaf-to-Host link creation:

```typescript
// Create links: Leaf to Hosts (rail-optimized: each host connects to all leafs)
hostNodes.forEach((host) => {
  leafNodes.forEach((leaf) => {
    links.push({
      source: leaf,
      target: host,
      status: host.status === "active" ? "active" : "down",
      speed: bandwidthLabel(fabricConfig.leafToHostBandwidth),
    });
  });
});
```

**Step 3: Reduce host-leaf link opacity for readability**

In the link rendering section (~line 383), update the opacity callback. With 64 host-leaf links, they need to be subtle by default:

```typescript
.attr("opacity", (d) => {
  const isHostLink = d.target.type === "host";
  if (!isHostLink) return 0.7; // Spine-leaf links stay prominent

  // Host-leaf links: subtle by default, more visible if errors
  const hostNode = cluster.nodes.find((n) => n.id === d.target.id);
  const totalErrors =
    hostNode?.hcas.reduce(
      (sum, hca) =>
        sum +
        hca.ports.reduce(
          (portSum, port) =>
            portSum +
            port.errors.symbolErrors +
            port.errors.portRcvErrors,
          0,
        ),
      0,
    ) || 0;
  if (totalErrors > 0) return 0.6;
  return 0.15;
})
```

**Step 4: Reduce host-leaf link stroke width**

Update the stroke-width callback (~line 375) to make host-leaf links thinner:

```typescript
.attr("stroke-width", (d) => {
  const isBackbone =
    d.source.type === "spine" || d.target.type === "spine";
  if (isBackbone) return bandwidthToWidth(fabricConfig.spineToLeafBandwidth);
  return 1.5; // Thinner host-leaf links for readability
})
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```
feat: implement rail-optimized host-to-leaf connectivity (8 links per host)
```

---

### Task 3: Update leaf labels to rail notation and tier labels

**Files:**

- Modify: `src/components/InfiniBandMap.tsx` — leaf node creation (~line 292), tier labels (~line 790)

**Step 1: Update leaf node labels**

Change the leaf node creation (~line 292):

```typescript
for (let i = 0; i < leafCount; i++) {
  nodes.push({
    id: `leaf-${i}`,
    type: "leaf",
    label: `R${i}`,
    status: "active",
    x: (width / (leafCount + 1)) * (i + 1),
    y: 250,
  });
}
```

**Step 2: Update tier label text**

Change the "Leaf Tier" label (~line 793):

```typescript
.text("Leaf Tier (Rails)");
```

**Step 3: Commit**

```
feat: label leaf switches as rails (R0-R7) per DGX SuperPOD convention
```

---

### Task 4: Update leaf click handler for rail context

**Files:**

- Modify: `src/components/InfiniBandMap.tsx` — leaf click handler (~lines 664-682)

**Step 1: Update leaf click to show all hosts on that rail**

In the rail-optimized topology, each leaf connects to ALL hosts (not a subset). Replace the leaf click handler:

```typescript
} else {
  // Leaf (Rail) connects to ALL hosts + spines
  const leafIdx = parseInt(d.id.split("-")[1]);

  portCount = spineCount + hostNodes.length; // Uplinks to spines + one downlink per host
  bandwidth = bandwidthLabel(fabricConfig.leafToHostBandwidth);

  // All hosts connect to every rail
  hostNodes.forEach((h) => {
    connectedNodes.push(h.label.replace("dgx-", ""));
  });
}
```

**Step 2: Update leaf active port calculation**

Replace the leaf active port count section (~lines 696-708):

```typescript
} else {
  // Leaf (Rail): count hosts with active HCA for this rail
  const leafIdx = parseInt(d.id.split("-")[1]);
  let activeHosts = 0;
  clusterRef.current.nodes.forEach((host) => {
    // Rail N corresponds to HCA N on each host
    const hca = host.hcas[leafIdx];
    if (hca?.ports.some((p) => p.state === "Active")) {
      activeHosts++;
    }
  });
  computedActivePortCount = spineCount + activeHosts;
}
```

**Step 3: Update leaf throughput calculation**

Replace the connectedHosts derivation for leaf switches (~lines 713-719):

```typescript
const connectedHosts =
  d.type === "spine" ? clusterRef.current.nodes : clusterRef.current.nodes; // Rail connects to ALL hosts
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```
feat: update leaf click handler for rail-optimized topology
```

---

### Task 5: Add hover highlighting for rail connections

**Files:**

- Modify: `src/components/InfiniBandMap.tsx` — link hover handlers

**Step 1: Add hover effect on host-leaf links**

After the link rendering section, add mouse handlers to highlight an entire rail or host's connections on hover. On the invisible click-target lines (~line 429), add:

```typescript
.on("mouseover", function (_event, d) {
  // Highlight all links involving this source or target
  const highlightId = d.target.type === "host" ? d.target.id : d.source.id;
  svg.selectAll("line[data-link-source], line[data-link-target]")
    .filter(function() {
      const src = d3.select(this).attr("data-link-source");
      const tgt = d3.select(this).attr("data-link-target");
      return src === highlightId || tgt === highlightId;
    })
    .attr("opacity", 0.7)
    .attr("stroke-width", 3);
})
.on("mouseout", function () {
  // Reset all host-leaf links to default
  svg.selectAll("line[data-link-target]")
    .filter(function() {
      const tgt = d3.select(this).attr("data-link-target");
      return tgt?.startsWith("dgx-") || false;
    })
    .attr("opacity", 0.15)
    .attr("stroke-width", 1.5);
  // Keep spine-leaf links at normal opacity
  svg.selectAll("line[data-link-target]")
    .filter(function() {
      const tgt = d3.select(this).attr("data-link-target");
      return tgt?.startsWith("leaf-") || false;
    })
    .attr("opacity", 0.7)
    .attr("stroke-width", bandwidthToWidth(fabricConfig.spineToLeafBandwidth));
})
```

**Step 2: Add hover on node groups for same highlighting**

Add similar hover highlighting when mousing over a leaf or host node circle/hexagon. On the nodeGroups `.on("mouseover")` handler (~line 643):

```typescript
.on("mouseover", function (_event, d) {
  d3.select(this).select("rect,circle,polygon").attr("opacity", 1);
  // Highlight connected links
  if (d.type === "leaf" || d.type === "host") {
    svg.selectAll("line")
      .filter(function() {
        const src = d3.select(this).attr("data-link-source");
        const tgt = d3.select(this).attr("data-link-target");
        return src === d.id || tgt === d.id;
      })
      .attr("opacity", 0.7)
      .attr("stroke-width", 3);
  }
})
.on("mouseout", function (_event, d) {
  d3.select(this).select("rect,circle,polygon").attr("opacity", 0.9);
  // Reset host-leaf links
  if (d.type === "leaf" || d.type === "host") {
    svg.selectAll("line")
      .filter(function() {
        const tgt = d3.select(this).attr("data-link-target");
        return tgt?.startsWith("dgx-") || false;
      })
      .attr("opacity", 0.15)
      .attr("stroke-width", 1.5);
  }
})
```

**Step 3: Commit**

```
feat: add hover highlighting for rail connections in IB fabric
```

---

### Task 6: Update legend and description text

**Files:**

- Modify: `src/components/InfiniBandMap.tsx` — lines 1031-1041

**Step 1: Update the description text**

```typescript
<div className="mt-3 text-xs text-gray-400">
  <p>• Click on any node or link for details. Hover to highlight connections.</p>
  <p>
    • Rail-optimized fat-tree: {fabricConfig.spineCount} spine, {fabricConfig.leafCount} rail (leaf) switches
  </p>
  <p>
    • Each host connects to all {fabricConfig.leafCount} rails (HCA N → Rail N)
  </p>
  <p>
    • Spine↔Leaf: {bandwidthLabel(fabricConfig.spineToLeafBandwidth)} |
    Rail↔Host: {bandwidthLabel(fabricConfig.leafToHostBandwidth)}
  </p>
</div>
```

**Step 2: Commit**

```
feat: update IB legend to explain rail-optimized topology
```

---

### Task 7: Update ibnetdiscover simulator output

**Files:**

- Modify: `src/simulators/infinibandSimulator.ts` — `executeIbnetdiscover()` method

**Step 1: Update spine/leaf counts and rail pattern**

Replace the switch generation section to match the visualization:

```typescript
// Generate switch entries (rail-optimized fat-tree)
if (!hcaOnly) {
  const numSpineSwitches = 4;
  // One leaf per rail (= HCAs per node)
  const numLeafSwitches = nodes[0]?.hcas?.length || 8;

  output += `# Spine Switches\n`;
  for (let i = 0; i < numSpineSwitches; i++) {
    const switchGuid = `0x${(0x1000 + i).toString(16).padStart(16, "0")}`;
    output += `Switch\t64 "${switchGuid}"\t# "${switchModel}/Spine-${i}" enhanced port 0 lid ${10 + i}\n`;

    if (showPorts) {
      for (let j = 0; j < numLeafSwitches; j++) {
        const leafGuid = `0x${(0x2000 + j).toString(16).padStart(16, "0")}`;
        output += `[${j + 1}]\t"${leafGuid}"[${(i % 18) + 1}]\t\t# "${switchModel}/Rail-${j}" lid ${20 + j}\n`;
      }
    }
    output += "\n";
  }

  output += `# Leaf (Rail) Switches\n`;
  for (let i = 0; i < numLeafSwitches; i++) {
    const switchGuid = `0x${(0x2000 + i).toString(16).padStart(16, "0")}`;
    output += `Switch\t64 "${switchGuid}"\t# "${switchModel}/Rail-${i}" enhanced port 0 lid ${20 + i}\n`;

    if (showPorts) {
      // Connect to spine switches
      for (let j = 0; j < numSpineSwitches; j++) {
        const spineGuid = `0x${(0x1000 + j).toString(16).padStart(16, "0")}`;
        output += `[${j + 1}]\t"${spineGuid}"[${i + 1}]\t\t# "${switchModel}/Spine-${j}" lid ${10 + j}\n`;
      }

      // Rail i connects to HCA i on each node
      nodes.forEach((node) => {
        const hca = node.hcas[i];
        if (hca) {
          output += `[${numSpineSwitches + nodes.indexOf(node) + 1}]\t"${hca.ports[0]?.guid}"[1]\t\t# "${node.hostname}" HCA-${i}\n`;
        }
      });
    }
    output += "\n";
  }
}
```

**Step 2: Update the HCA entries section to show rail assignment**

```typescript
if (!switchOnly) {
  output += `# Channel Adapters (HCAs)\n`;
  nodes.forEach((node) => {
    node.hcas.forEach((hca, hcaIdx) => {
      output += `Ca\t${hca.ports.length} "${hca.ports[0]?.guid}"\t# "${node.hostname}/${hca.caType}" Rail-${hcaIdx}\n`;

      if (showPorts) {
        hca.ports.forEach((port) => {
          // HCA N connects to Rail (Leaf) N
          const switchGuid = `0x${(0x2000 + hcaIdx).toString(16).padStart(16, "0")}`;
          output += `[${port.portNumber}](${hca.ports[0]?.guid})\t"${switchGuid}"[${nodes.indexOf(node) + 5}]\t\t# lid ${port.lid} lmc 0 "${node.hostname}" ${port.state}\n`;
        });
      }
      output += "\n";
    });
  });
}
```

**Step 3: Update summary**

```typescript
output += `#\n`;
output += `# Summary:\n`;
output += `#   ${nodes.reduce((sum, n) => sum + n.hcas.length, 0)} HCAs\n`;
output += `#   ${4 + (nodes[0]?.hcas?.length || 8)} Switches (4 spine + ${nodes[0]?.hcas?.length || 8} rail)\n`;
output += `#   ${nodes.reduce((sum, n) => sum + n.hcas.reduce((s, h) => s + h.ports.length, 0), 0)} Ports\n`;
output += `#\n`;
```

**Step 4: Run TypeScript check and tests**

Run: `npx tsc --noEmit && npx vitest run src/simulators/__tests__/infinibandSimulator`
Expected: Pass

**Step 5: Commit**

```
feat: update ibnetdiscover output to show rail-optimized topology
```

---

### Task 8: Update host detail panel to show rail assignment

**Files:**

- Modify: `src/components/NetworkNodeDetail.tsx` — host HCA section (~line 476)

**Step 1: Add rail label to HCA display**

Update the HCA header to show which rail it's on:

```typescript
<span className="text-nvidia-green text-xs font-medium">
  HCA {hcaIdx} (Rail {hcaIdx}): {hca.caType} ({hcaDeviceId}) - {ibStandard}
</span>
```

**Step 2: Commit**

```
feat: show rail assignment in host detail panel HCA labels
```

---

### Task 9: Run full verification

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Lint**

Run: `npx eslint src --quiet`
Expected: 0 errors

**Step 3: Full test suite**

Run: `npx vitest run`
Expected: All 2,931+ tests pass

**Step 4: Production build**

Run: `npm run build`
Expected: Clean build

**Step 5: Commit if any fixes were needed**

```
fix: resolve any remaining issues from IB rail topology update
```

---

## Implementation Order

| Step | Task                              | Depends On | Risk                    |
| ---- | --------------------------------- | ---------- | ----------------------- |
| 1    | Update config (8 leaf, 4 spine)   | —          | Low                     |
| 2    | Rail link generation (8 per host) | Task 1     | Medium (visual density) |
| 3    | Rail labels                       | Task 1     | Low                     |
| 4    | Leaf click handler                | Task 2     | Low                     |
| 5    | Hover highlighting                | Task 2     | Medium (D3 selectors)   |
| 6    | Legend text                       | Task 1     | Low                     |
| 7    | ibnetdiscover output              | —          | Low                     |
| 8    | Host detail rail label            | —          | Low                     |
| 9    | Full verification                 | All        | —                       |

Tasks 1-3 should be done first (foundation). Tasks 7-8 are independent of visualization changes.
