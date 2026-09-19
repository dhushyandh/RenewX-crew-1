import { Grid3x3, Laptop, Smartphone, Headphones, Watch, Camera, Tablet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Grid3x3: Grid3x3,
  Laptop: Laptop,
  Smartphone: Smartphone,
  Headphones: Headphones,
  Watch: Watch,
  Camera: Camera,
  Tablet: Tablet,
};

interface CategoryFilterProps {
  categories: { name: string; icon: string }[];
  active: string;
  onChange: (category: string) => void;
}

export default function CategoryFilter({ categories, active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {categories.map((cat) => {
        const Icon = iconMap[cat.icon] || Grid3x3;
        const isActive = active === cat.name;
        return (
          <button
            key={cat.name}
            onClick={() => onChange(cat.name)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.03]'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
            }`}
          >
            <Icon className="w-4 h-4" />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
