// Centralized category color system
// Used across Dashboard charts and Inventory displays

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; chart: string; light: string }> = {
  'Antibiotics': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    chart: '#3B82F6', // blue-500
    light: 'rgba(59, 130, 246, 0.15)'
  },
  'Painkillers': {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    chart: '#EF4444', // red-500
    light: 'rgba(239, 68, 68, 0.15)'
  },
  'Cardiovascular': {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    chart: '#A855F7', // purple-500
    light: 'rgba(168, 85, 247, 0.15)'
  },
  'Respiratory': {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    chart: '#10B981', // green-500
    light: 'rgba(16, 185, 129, 0.15)'
  },
  'Diabetes': {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    chart: '#F97316', // orange-500
    light: 'rgba(249, 115, 22, 0.15)'
  },
  'Gastrointestinal': {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    chart: '#EAB308', // yellow-500
    light: 'rgba(234, 179, 8, 0.15)'
  },
  'Vitamins': {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-400',
    chart: '#EC4899', // pink-500
    light: 'rgba(236, 72, 153, 0.15)'
  },
  'Dermatology': {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-400',
    chart: '#6366F1', // indigo-500
    light: 'rgba(99, 102, 241, 0.15)'
  },
  'Neurology': {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-400',
    chart: '#06B6D4', // cyan-500
    light: 'rgba(6, 182, 212, 0.15)'
  },
  'Supplements': {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    chart: '#10B981', // emerald-500
    light: 'rgba(16, 185, 129, 0.15)'
  },
  'Antidepressants': {
    bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
    text: 'text-fuchsia-700 dark:text-fuchsia-400',
    chart: '#D946EF', // fuchsia-500
    light: 'rgba(217, 70, 239, 0.15)'
  },
  'Other': {
    bg: 'bg-slate-100 dark:bg-slate-800/30',
    text: 'text-slate-700 dark:text-slate-400',
    chart: '#64748B', // slate-500
    light: 'rgba(100, 116, 139, 0.15)'
  }
};

// Get color for a category (with fallback to deterministically generated color)
export const getCategoryColor = (category: string) => {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  return generateCategoryColor(category);
};

// Get all available categories
export const getAvailableCategories = () => {
  return Object.keys(CATEGORY_COLORS).filter(cat => cat !== 'Other');
};

// Generate a color for a new category (hash-based for consistency)
export const generateCategoryColor = (category: string): { bg: string; text: string; chart: string; light: string } => {
  const colors = [
    { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', chart: '#14B8A6', light: 'rgba(20, 184, 166, 0.15)' },
    { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-400', chart: '#84CC16', light: 'rgba(132, 204, 22, 0.15)' },
    { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', chart: '#F59E0B', light: 'rgba(245, 158, 11, 0.15)' },
    { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', chart: '#F43F5E', light: 'rgba(244, 63, 94, 0.15)' },
    { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', chart: '#8B5CF6', light: 'rgba(139, 92, 246, 0.15)' },
    { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400', chart: '#0EA5E9', light: 'rgba(14, 165, 233, 0.15)' },
    { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', chart: '#EC4899', light: 'rgba(236, 72, 153, 0.15)' },
    { bg: 'bg-stone-100 dark:bg-stone-800/60', text: 'text-stone-700 dark:text-stone-400', chart: '#78716C', light: 'rgba(120, 113, 108, 0.15)' }
  ];
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};
