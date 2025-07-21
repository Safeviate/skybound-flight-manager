
'use client';

import React from 'react';

const GanttTimelineHeader = React.forwardRef<HTMLDivElement>((props, ref) => {
    return (
      <div ref={ref} className="relative h-full" style={{ width: '1920px' }}>
        {Array.from({ length: 24 }).map((_, hour) => (
          <div
            key={hour}
            className="absolute top-0 flex items-center justify-center h-full text-xs text-muted-foreground"
            style={{
              left: `${hour * 80}px`,
              width: '80px',
            }}
          >
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>
    );
});

GanttTimelineHeader.displayName = 'GanttTimelineHeader';

export { GanttTimelineHeader };
