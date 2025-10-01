'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ChevronDown, X } from 'lucide-react';

interface FilterBarProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  options: { id: string; name: string; slug: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleOption = (slug: string) => {
    if (selected.includes(slug)) {
      onChange(selected.filter((s) => s !== slug));
    } else {
      onChange([...selected, slug]);
    }
  };

  const selectedNames = options
    .filter((opt) => selected.includes(opt.slug))
    .map((opt) => opt.name);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={ref} className="relative flex-1 min-w-[200px]">
      <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <span className={cn('truncate', selected.length === 0 && 'text-slate-400')}>
          {selected.length === 0
            ? placeholder
            : selected.length === 1
              ? selectedNames[0]
              : `Выбрано: ${selected.length}`}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', isOpen && 'rotate-180')} />
      </button>

      {selected.length > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange([]);
          }}
          className="absolute right-8 top-[30px] flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="sticky top-0 border-b border-slate-200 bg-white p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
          <div className="max-h-52 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">
                {searchQuery ? 'Ничего не найдено' : 'Нет опций'}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.slug)}
                    onChange={() => toggleOption(option.slug)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{option.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterBar({
  selectedCategories,
  onCategoriesChange,
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
    <div className="mt-6 flex flex-wrap gap-4">
      <MultiSelect
        label="Категории"
        options={categories}
        selected={selectedCategories}
        onChange={onCategoriesChange}
        placeholder="Все категории"
      />
      <MultiSelect
        label="Теги"
        options={tags}
        selected={selectedTags}
        onChange={onTagsChange}
        placeholder="Все теги"
      />
    </div>
  );
}
