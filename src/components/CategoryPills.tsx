import { Grid3x3, Laptop, Smartphone, Headphones, Watch, Camera, Tablet } from 'lucide-react';

export const iconMap: Record<string, typeof Laptop> = {
  Grid3x3,
  Laptop,
  Smartphone,
  Headphones,
  Watch,
  Camera,
  Tablet,
};

export const staticCategories = [
  { name: 'All', icon: 'Grid3x3' },
  { name: 'Laptops', icon: 'Laptop' },
  { name: 'Phones', icon: 'Smartphone' },
  { name: 'Audio', icon: 'Headphones' },
  { name: 'Wearables', icon: 'Watch' },
  { name: 'Cameras', icon: 'Camera' },
  { name: 'Tablets', icon: 'Tablet' },
];

export default function CategoryPills({
  active,
  onChange,
}: {
  active: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="py-2">
      <div className="flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {staticCategories.map((cat) => {
          const Icon = iconMap[cat.icon] || Grid3x3;
          const isActive = active === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => onChange(cat.name)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border whitespace-nowrap transition-all active:scale-95 ${
                isActive
                  ? 'bg-black border-black text-white font-bold'
                  : 'bg-white border-[#e5e1d8] text-[#4f4b42]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#ffc400]' : 'text-black'}`} />
              <span className="text-xs font-semibold">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
