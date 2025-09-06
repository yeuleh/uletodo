/**
 * Virtual scrolling component for performance optimization with large datasets
 * Renders only visible items to maintain smooth scrolling performance
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './VirtualScrollList.css';

export interface VirtualScrollItem {
  id: string;
  height?: number; // Optional fixed height, will be measured if not provided
}

export interface VirtualScrollListProps<T extends VirtualScrollItem> {
  items: T[];
  itemHeight?: number; // Default item height if not specified per item
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number; // Number of items to render outside visible area
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemKey?: (item: T, index: number) => string;
}

interface VirtualScrollState {
  scrollTop: number;
  containerHeight: number;
  itemHeights: Map<string, number>;
}

export function VirtualScrollList<T extends VirtualScrollItem>({
  items,
  itemHeight = 60,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  getItemKey = (item, index) => item.id || index.toString()
}: VirtualScrollListProps<T>) {
  const [state, setState] = useState<VirtualScrollState>({
    scrollTop: 0,
    containerHeight,
    itemHeights: new Map()
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Update container height when prop changes
  useEffect(() => {
    setState(prev => ({ ...prev, containerHeight }));
  }, [containerHeight]);

  // Measure item heights after render
  useEffect(() => {
    const newHeights = new Map(state.itemHeights);
    let hasChanges = false;

    itemRefs.current.forEach((element, key) => {
      if (element) {
        const height = element.getBoundingClientRect().height;
        if (newHeights.get(key) !== height) {
          newHeights.set(key, height);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setState(prev => ({ ...prev, itemHeights: newHeights }));
    }
  });

  // Calculate visible range and total height
  const { visibleRange, totalHeight, itemPositions } = useMemo(() => {
    const positions: number[] = [];
    let currentPosition = 0;

    // Calculate positions for each item
    items.forEach((item, index) => {
      positions[index] = currentPosition;
      const height = item.height || state.itemHeights.get(getItemKey(item, index)) || itemHeight;
      currentPosition += height;
    });

    const totalHeight = currentPosition;

    // Find visible range
    const startIndex = Math.max(0, 
      positions.findIndex(pos => pos + itemHeight > state.scrollTop) - overscan
    );
    
    let endIndex = positions.findIndex(pos => pos > state.scrollTop + state.containerHeight);
    if (endIndex === -1) endIndex = items.length;
    endIndex = Math.min(items.length, endIndex + overscan);

    return {
      visibleRange: { start: startIndex, end: endIndex },
      totalHeight,
      itemPositions: positions
    };
  }, [items, state.scrollTop, state.containerHeight, state.itemHeights, itemHeight, overscan, getItemKey]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    setState(prev => ({ ...prev, scrollTop }));
    onScroll?.(scrollTop);
  }, [onScroll]);

  const setItemRef = useCallback((key: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(key, element);
    } else {
      itemRefs.current.delete(key);
    }
  }, []);

  // Render visible items
  const visibleItems = useMemo(() => {
    const result: React.ReactNode[] = [];
    
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const item = items[i];
      if (!item) continue;

      const key = getItemKey(item, i);
      const top = itemPositions[i];
      const height = item.height || state.itemHeights.get(key) || itemHeight;

      const style: React.CSSProperties = {
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height,
        minHeight: height
      };

      result.push(
        <div
          key={key}
          ref={(el) => setItemRef(key, el)}
          style={style}
          className="virtual-scroll-item"
        >
          {renderItem(item, i, style)}
        </div>
      );
    }

    return result;
  }, [visibleRange, items, itemPositions, state.itemHeights, itemHeight, renderItem, getItemKey, setItemRef]);

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div
        className="virtual-scroll-content"
        style={{ height: totalHeight, position: 'relative' }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

export default VirtualScrollList;