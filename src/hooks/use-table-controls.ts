
'use client';

import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc';

interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

interface UseTableControlsOptions<T> {
    initialSort?: SortConfig<T>;
    searchKeys?: (keyof T)[];
}

export function useTableControls<T>(
  initialItems: T[],
  options: UseTableControlsOptions<T> = {}
) {
  const { initialSort, searchKeys = [] } = options;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(initialSort || null);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return initialItems;

    return initialItems.filter(item =>
      searchKeys.some(key => {
        const value = item[key];
        return typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [initialItems, searchTerm, searchKeys]);

  const sortedItems = useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredItems, sortConfig]);

  const requestSort = (key: keyof T) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return {
    items: sortedItems,
    searchTerm,
    setSearchTerm,
    sortConfig,
    requestSort,
  };
}
