
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
      {/* Aircraft list is intentionally left empty */}
    </div>
  );
}
