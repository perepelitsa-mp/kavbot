'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface FilterBarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function FilterBar({
  selectedCategory,
  onCategoryChange,
  selectedTags,
  onTagsChange,
}: FilterBarProps) {
  const { data } = useQuery({
    queryKey: ['filters'],
    queryFn: api.getFilters,
  });

  const categories = data?.categories || [];
  const tags = data?.tags || [];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-full border border-transparent bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-200 hover:text-slate-900',
            selectedCategory === '' &&
              'border-slate-900 bg-slate-900 text-white shadow-lg hover:bg-slate-900 hover:text-white',
          )}
          onClick={() => onCategoryChange('')}
        >
          Все
        </Button>
        {categories.map((cat: any) => (
          <Button
            key={cat.id}
            variant="ghost"
            size="sm"
            className={cn(
              'rounded-full border border-transparent bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-200 hover:text-slate-900',
              selectedCategory === cat.slug &&
                'border-indigo-500 bg-indigo-500/10 text-indigo-600 shadow-indigo-100 hover:bg-indigo-500/10 hover:text-indigo-600',
            )}
            onClick={() => onCategoryChange(cat.slug)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
          {tags.map((tag: any) => (
            <Button
              key={tag.id}
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-full border border-transparent bg-transparent px-4 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800',
                selectedTags.includes(tag.slug) &&
                  'border-indigo-400 bg-indigo-500/10 text-indigo-600 shadow-sm shadow-indigo-100 hover:bg-indigo-500/10 hover:text-indigo-600',
              )}
              onClick={() => {
                if (selectedTags.includes(tag.slug)) {
                  onTagsChange(selectedTags.filter((t) => t !== tag.slug));
                } else {
                  onTagsChange([...selectedTags, tag.slug]);
                }
              }}
            >
              #{tag.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
