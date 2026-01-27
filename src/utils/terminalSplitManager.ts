/**
 * Terminal Split Manager
 * Manages split pane layouts for multiple terminal views
 */

/**
 * Split direction
 */
export type SplitDirection = 'horizontal' | 'vertical';

/**
 * Represents a pane in the split layout
 */
export interface TerminalPane {
  id: string;
  terminalId: string; // Reference to a terminal tab
  size: number; // Size as percentage (0-100)
}

/**
 * Represents a split node in the layout tree
 */
export interface SplitNode {
  id: string;
  type: 'pane' | 'split';
  direction?: SplitDirection;
  children?: SplitNode[];
  pane?: TerminalPane;
}

/**
 * Terminal split state
 */
export interface TerminalSplitState {
  root: SplitNode;
  activePaneId: string;
  maxPanes: number;
}

/**
 * Default maximum number of panes
 */
export const DEFAULT_MAX_PANES = 4;

/**
 * Minimum pane size percentage
 */
export const MIN_PANE_SIZE = 10;

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `pane-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a pane node
 */
export function createPane(terminalId: string, size: number = 100): SplitNode {
  return {
    id: generateId(),
    type: 'pane',
    pane: {
      id: generateId(),
      terminalId,
      size,
    },
  };
}

/**
 * Create initial split state with single pane
 */
export function createSplitState(terminalId: string): TerminalSplitState {
  const rootPane = createPane(terminalId);
  return {
    root: rootPane,
    activePaneId: rootPane.id,
    maxPanes: DEFAULT_MAX_PANES,
  };
}

/**
 * Count total panes in the layout
 */
export function countPanes(node: SplitNode): number {
  if (node.type === 'pane') {
    return 1;
  }
  return node.children?.reduce((sum, child) => sum + countPanes(child), 0) || 0;
}

/**
 * Find a node by ID
 */
export function findNode(root: SplitNode, id: string): SplitNode | null {
  if (root.id === id) {
    return root;
  }
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find parent of a node
 */
export function findParent(
  root: SplitNode,
  nodeId: string,
  parent: SplitNode | null = null
): SplitNode | null {
  if (root.id === nodeId) {
    return parent;
  }
  if (root.children) {
    for (const child of root.children) {
      const found = findParent(child, nodeId, root);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Split a pane in the specified direction
 */
export function splitPane(
  state: TerminalSplitState,
  paneId: string,
  direction: SplitDirection,
  newTerminalId: string
): TerminalSplitState {
  const currentPanes = countPanes(state.root);
  if (currentPanes >= state.maxPanes) {
    return state; // Can't add more panes
  }

  const node = findNode(state.root, paneId);
  if (!node || node.type !== 'pane') {
    return state;
  }

  // Create new split node with two children
  const newPane = createPane(newTerminalId, 50);
  const existingPane: SplitNode = {
    ...node,
    id: generateId(),
    pane: {
      ...node.pane!,
      size: 50,
    },
  };

  const splitNode: SplitNode = {
    id: node.id, // Reuse the original ID
    type: 'split',
    direction,
    children: [existingPane, newPane],
  };

  // Replace the node in the tree
  const newRoot = replaceNode(state.root, paneId, splitNode);

  return {
    ...state,
    root: newRoot,
    activePaneId: newPane.id,
  };
}

/**
 * Replace a node in the tree
 */
function replaceNode(root: SplitNode, nodeId: string, replacement: SplitNode): SplitNode {
  if (root.id === nodeId) {
    return replacement;
  }

  if (root.children) {
    return {
      ...root,
      children: root.children.map(child =>
        replaceNode(child, nodeId, replacement)
      ),
    };
  }

  return root;
}

/**
 * Close a pane and restructure the layout
 */
export function closePane(
  state: TerminalSplitState,
  paneId: string
): TerminalSplitState {
  const currentPanes = countPanes(state.root);
  if (currentPanes <= 1) {
    return state; // Can't close the last pane
  }

  const parent = findParent(state.root, paneId);
  if (!parent || parent.type !== 'split' || !parent.children) {
    return state;
  }

  // Find the sibling
  const siblings = parent.children.filter(child => child.id !== paneId);
  if (siblings.length === 0) {
    return state;
  }

  const sibling = siblings[0];

  // If sibling is also a split, promote it; otherwise replace parent with sibling
  const grandParent = findParent(state.root, parent.id);

  let newRoot: SplitNode;

  if (grandParent) {
    // Replace parent with sibling in grandparent's children
    newRoot = replaceNode(state.root, parent.id, sibling);
  } else {
    // Parent is root, sibling becomes new root
    newRoot = sibling;
  }

  // Update active pane if needed
  let newActivePaneId = state.activePaneId;
  if (state.activePaneId === paneId) {
    newActivePaneId = getFirstPaneId(sibling) || sibling.id;
  }

  return {
    ...state,
    root: newRoot,
    activePaneId: newActivePaneId,
  };
}

/**
 * Get the first pane ID in a node tree
 */
function getFirstPaneId(node: SplitNode): string | null {
  if (node.type === 'pane') {
    return node.id;
  }
  if (node.children && node.children.length > 0) {
    return getFirstPaneId(node.children[0]);
  }
  return null;
}

/**
 * Set the active pane
 */
export function setActivePane(
  state: TerminalSplitState,
  paneId: string
): TerminalSplitState {
  const node = findNode(state.root, paneId);
  if (!node || node.type !== 'pane') {
    return state;
  }

  return {
    ...state,
    activePaneId: paneId,
  };
}

/**
 * Resize panes in a split
 */
export function resizePanes(
  state: TerminalSplitState,
  splitId: string,
  sizes: number[]
): TerminalSplitState {
  const node = findNode(state.root, splitId);
  if (!node || node.type !== 'split' || !node.children) {
    return state;
  }

  if (sizes.length !== node.children.length) {
    return state;
  }

  // Validate sizes
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (Math.abs(total - 100) > 0.1) {
    return state; // Sizes must sum to 100
  }

  if (sizes.some(size => size < MIN_PANE_SIZE)) {
    return state; // No pane can be smaller than minimum
  }

  // Update children sizes
  const updatedChildren = node.children.map((child, index) => {
    if (child.type === 'pane' && child.pane) {
      return {
        ...child,
        pane: {
          ...child.pane,
          size: sizes[index],
        },
      };
    }
    return child;
  });

  const updatedNode: SplitNode = {
    ...node,
    children: updatedChildren,
  };

  return {
    ...state,
    root: replaceNode(state.root, splitId, updatedNode),
  };
}

/**
 * Navigate to adjacent pane
 */
export function navigatePane(
  state: TerminalSplitState,
  direction: 'up' | 'down' | 'left' | 'right'
): TerminalSplitState {
  const allPanes = getAllPanes(state.root);
  if (allPanes.length <= 1) {
    return state;
  }

  const currentIndex = allPanes.findIndex(p => p.id === state.activePaneId);
  if (currentIndex === -1) {
    return state;
  }

  // Simple navigation: cycle through panes
  // A more sophisticated implementation would consider actual positions
  let newIndex: number;
  if (direction === 'down' || direction === 'right') {
    newIndex = (currentIndex + 1) % allPanes.length;
  } else {
    newIndex = (currentIndex - 1 + allPanes.length) % allPanes.length;
  }

  return {
    ...state,
    activePaneId: allPanes[newIndex].id,
  };
}

/**
 * Get all pane nodes from the tree
 */
export function getAllPanes(node: SplitNode): SplitNode[] {
  if (node.type === 'pane') {
    return [node];
  }
  if (node.children) {
    return node.children.flatMap(child => getAllPanes(child));
  }
  return [];
}

/**
 * Get active pane
 */
export function getActivePane(state: TerminalSplitState): SplitNode | null {
  return findNode(state.root, state.activePaneId);
}

/**
 * Check if more panes can be added
 */
export function canAddPane(state: TerminalSplitState): boolean {
  return countPanes(state.root) < state.maxPanes;
}

/**
 * Check if panes can be closed
 */
export function canClosePane(state: TerminalSplitState): boolean {
  return countPanes(state.root) > 1;
}

/**
 * Reset to single pane layout
 */
export function resetLayout(
  _state: TerminalSplitState,
  terminalId: string
): TerminalSplitState {
  return createSplitState(terminalId);
}

/**
 * Get layout as flat structure for rendering
 */
export interface FlatPane {
  id: string;
  terminalId: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isActive: boolean;
}

/**
 * Flatten the layout tree for rendering
 */
export function flattenLayout(
  state: TerminalSplitState,
  containerWidth: number = 100,
  containerHeight: number = 100
): FlatPane[] {
  return flattenNode(state.root, state.activePaneId, 0, 0, containerWidth, containerHeight);
}

function flattenNode(
  node: SplitNode,
  activePaneId: string,
  x: number,
  y: number,
  width: number,
  height: number
): FlatPane[] {
  if (node.type === 'pane' && node.pane) {
    return [{
      id: node.id,
      terminalId: node.pane.terminalId,
      bounds: { x, y, width, height },
      isActive: node.id === activePaneId,
    }];
  }

  if (!node.children || node.children.length === 0) {
    return [];
  }

  const panes: FlatPane[] = [];
  let offset = 0;

  for (const child of node.children) {
    let childSize = 50; // Default equal split
    if (child.type === 'pane' && child.pane) {
      childSize = child.pane.size;
    }

    let childX = x;
    let childY = y;
    let childWidth = width;
    let childHeight = height;

    if (node.direction === 'horizontal') {
      childY = y + (offset / 100) * height;
      childHeight = (childSize / 100) * height;
    } else {
      childX = x + (offset / 100) * width;
      childWidth = (childSize / 100) * width;
    }

    panes.push(...flattenNode(child, activePaneId, childX, childY, childWidth, childHeight));
    offset += childSize;
  }

  return panes;
}

/**
 * Storage key for split state persistence
 */
const SPLIT_STATE_STORAGE_KEY = 'terminal-split';

/**
 * Save split state to localStorage
 */
export function saveSplitState(state: TerminalSplitState): void {
  try {
    localStorage.setItem(SPLIT_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Load split state from localStorage
 */
export function loadSplitState(): TerminalSplitState | null {
  try {
    const saved = localStorage.getItem(SPLIT_STATE_STORAGE_KEY);
    if (!saved) {
      return null;
    }
    return JSON.parse(saved) as TerminalSplitState;
  } catch {
    return null;
  }
}

/**
 * Clear saved split state
 */
export function clearSplitState(): void {
  try {
    localStorage.removeItem(SPLIT_STATE_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
