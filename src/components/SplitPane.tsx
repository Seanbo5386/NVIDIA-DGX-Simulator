/**
 * Split Pane Component
 * Renders a resizable split pane layout for multiple terminal views
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  type TerminalSplitState,
  type SplitDirection,
  flattenLayout,
  canAddPane,
  canClosePane,
} from '../utils/terminalSplitManager';

interface SplitPaneProps {
  state: TerminalSplitState;
  onSplit: (paneId: string, direction: SplitDirection) => void;
  onClose: (paneId: string) => void;
  onSelectPane: (paneId: string) => void;
  onResize?: (splitId: string, sizes: number[]) => void;
  renderPane: (terminalId: string, isActive: boolean) => React.ReactNode;
  containerWidth?: number;
  containerHeight?: number;
  showControls?: boolean;
  minPaneSize?: number;
}

export function SplitPane({
  state,
  onSplit,
  onClose,
  onSelectPane,
  onResize: _onResize,
  renderPane,
  containerWidth = 100,
  containerHeight = 100,
  showControls = true,
  minPaneSize: _minPaneSize = 10,
}: SplitPaneProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [_resizing, _setResizing] = useState(false);
  const [hoveredPane, setHoveredPane] = useState<string | null>(null);

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const flatPanes = flattenLayout(
    state,
    containerSize.width || containerWidth,
    containerSize.height || containerHeight
  );

  const handlePaneClick = useCallback(
    (paneId: string) => {
      onSelectPane(paneId);
    },
    [onSelectPane]
  );

  const handleSplitHorizontal = useCallback(
    (paneId: string) => {
      onSplit(paneId, 'horizontal');
    },
    [onSplit]
  );

  const handleSplitVertical = useCallback(
    (paneId: string) => {
      onSplit(paneId, 'vertical');
    },
    [onSplit]
  );

  return (
    <div
      ref={containerRef}
      className="split-pane-container relative w-full h-full bg-gray-900"
    >
      {flatPanes.map((pane) => (
        <div
          key={pane.id}
          className={`
            absolute transition-shadow duration-150
            ${pane.isActive ? 'z-10' : 'z-0'}
            ${pane.isActive ? 'ring-2 ring-green-500' : ''}
          `}
          style={{
            left: `${(pane.bounds.x / (containerSize.width || containerWidth)) * 100}%`,
            top: `${(pane.bounds.y / (containerSize.height || containerHeight)) * 100}%`,
            width: `${(pane.bounds.width / (containerSize.width || containerWidth)) * 100}%`,
            height: `${(pane.bounds.height / (containerSize.height || containerHeight)) * 100}%`,
          }}
          onClick={() => handlePaneClick(pane.id)}
          onMouseEnter={() => setHoveredPane(pane.id)}
          onMouseLeave={() => setHoveredPane(null)}
        >
          {/* Pane content */}
          <div className="w-full h-full overflow-hidden">
            {renderPane(pane.terminalId, pane.isActive)}
          </div>

          {/* Pane controls (visible on hover or when active) */}
          {showControls && (hoveredPane === pane.id || pane.isActive) && (
            <div className="absolute top-1 right-1 flex gap-1 z-20">
              {/* Split horizontal */}
              {canAddPane(state) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSplitHorizontal(pane.id);
                  }}
                  className="p-1 bg-gray-800 bg-opacity-80 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                  title="Split horizontal"
                  aria-label="Split pane horizontally"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}

              {/* Split vertical */}
              {canAddPane(state) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSplitVertical(pane.id);
                  }}
                  className="p-1 bg-gray-800 bg-opacity-80 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
                  title="Split vertical"
                  aria-label="Split pane vertically"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M15 4v16" />
                  </svg>
                </button>
              )}

              {/* Close pane */}
              {canClosePane(state) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(pane.id);
                  }}
                  className="p-1 bg-gray-800 bg-opacity-80 text-gray-300 hover:text-red-400 hover:bg-gray-700 rounded"
                  title="Close pane"
                  aria-label="Close pane"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Pane border */}
          <div
            className={`
              absolute inset-0 pointer-events-none border
              ${pane.isActive ? 'border-green-500' : 'border-gray-700'}
            `}
          />
        </div>
      ))}

      {/* Pane count indicator */}
      {flatPanes.length > 1 && (
        <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-gray-800 bg-opacity-80 text-gray-400 text-xs rounded z-30">
          {flatPanes.length}/{state.maxPanes} panes
        </div>
      )}
    </div>
  );
}

/**
 * Simple split pane divider for drag resizing
 */
interface SplitDividerProps {
  direction: SplitDirection;
  onDrag: (delta: number) => void;
  className?: string;
}

export function SplitDivider({
  direction,
  onDrag,
  className = '',
}: SplitDividerProps): React.ReactElement {
  const [dragging, setDragging] = useState(false);
  const startPosRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      startPosRef.current = direction === 'horizontal' ? e.clientY : e.clientX;
    },
    [direction]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientY : e.clientX;
      const delta = currentPos - startPosRef.current;
      onDrag(delta);
      startPosRef.current = currentPos;
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, direction, onDrag]);

  return (
    <div
      className={`
        ${direction === 'horizontal' ? 'h-1 w-full cursor-row-resize' : 'w-1 h-full cursor-col-resize'}
        ${dragging ? 'bg-green-500' : 'bg-gray-600 hover:bg-green-500'}
        transition-colors duration-150
        ${className}
      `}
      onMouseDown={handleMouseDown}
    />
  );
}

export default SplitPane;
