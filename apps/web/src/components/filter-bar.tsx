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
      <label className="mb-2 block text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group flex h-11 w-full items-center justify-between rounded-xl border-2 bg-white px-4 text-sm font-medium text-slate-700 transition-all',
          isOpen
            ? 'border-indigo-400 ring-4 ring-indigo-100/50 shadow-md'
            : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm'
        )}
      >
        <span className={cn('truncate', selected.length === 0 && 'text-slate-400')}>
          {selected.length === 0
            ? placeholder
            : selected.length === 1
              ? selectedNames[0]
              : `Выбрано: ${selected.length}`}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-all duration-200',
            isOpen && 'rotate-180 text-indigo-500'
          )}
        />
      </button>

      {selected.length > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange([]);
          }}
          className="absolute right-10 top-[34px] flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-indigo-100 hover:text-indigo-600 hover:scale-110"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="sticky top-0 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/50 p-3">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                {searchQuery ? 'Ничего не найдено' : 'Нет опций'}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-4 py-3 text-sm font-medium transition-all',
                    selected.includes(option.slug)
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.slug)}
                    onChange={() => toggleOption(option.slug)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 transition-all"
                  />
                  <span className="flex-1">{option.name}</span>
                  {selected.includes(option.slug) && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
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
