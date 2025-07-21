
import type { Aircraft } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface GanttAircraftColumnProps {
  aircraft: Aircraft[];
}

const getStatusVariant = (status: Aircraft['status']) => {
    switch (status) {
      case 'Available':
        return 'success';
      case 'In Maintenance':
        return 'destructive';
      case 'Booked':
        return 'secondary';
      default:
        return 'outline';
    }
};

export function GanttAircraftColumn({ aircraft }: GanttAircraftColumnProps) {
  return (
    <div className="border-r">
      {aircraft.map((ac, index) => (
        <div
          key={ac.id}
          className="flex flex-col justify-center p-2 border-b"
          style={{ height: '60px' }}
        >
          <p className="font-semibold text-sm">{ac.tailNumber}</p>
          <p className="text-xs text-muted-foreground truncate">{ac.model}</p>
        </div>
      ))}
    </div>
  );
}
