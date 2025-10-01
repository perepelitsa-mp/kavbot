'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
    <div className="mt-4 space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange('')}
        >
          Все
        </Button>
        {categories.map((cat: any) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.slug ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(cat.slug)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tags.map((tag: any) => (
            <Button
              key={tag.id}
              variant={selectedTags.includes(tag.slug) ? 'secondary' : 'ghost'}
              size="sm"
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