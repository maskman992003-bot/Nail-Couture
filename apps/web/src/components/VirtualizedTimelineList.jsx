import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import TimelineEventRow from './TimelineEventRow';

export default function VirtualizedTimelineList({ events, profile }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 132,
    overscan: 8,
  });

  if (!events.length) return null;

  return (
    <div
      ref={parentRef}
      className="h-[min(70vh,640px)] overflow-auto rounded-lg border border-light"
    >
      <div
        className="relative w-full p-1"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const event = events[virtualRow.index];
          return (
            <div
              key={event.id}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full px-1 pb-3"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <TimelineEventRow event={event} profile={profile} lazyImages />
            </div>
          );
        })}
      </div>
    </div>
  );
}
