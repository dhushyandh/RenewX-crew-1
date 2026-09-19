import { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Layers,
  Box,
  Check,
  Smartphone,
  Laptop,
  Headphones,
  Tablet,
  Watch,
  Camera,
  Sparkles,
} from 'lucide-react';
import {
  type BrandItem,
  type DeviceModelItem,
  getStoredBrands,
  saveStoredBrands,
  getStoredModels,
  saveStoredModels,
} from '@/data/brandsData';

export default function BrandsView() {
  const [brands, setBrands] = useState<BrandItem[]>(getStoredBrands);
  const [models, setModels] = useState<DeviceModelItem[]>(getStoredModels);

  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandForModels, setSelectedBrandForModels] = useState<BrandItem | null>(null);

  // Modals
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);

  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<DeviceModelItem | null>(null);
  const [preselectedBrandId, setPreselectedBrandId] = useState<string>('');

  // Save changes helper
  const updateBrandsList = (newBrands: BrandItem[]) => {
    setBrands(newBrands);
    saveStoredBrands(newBrands);
  };

  const updateModelsList = (newModels: DeviceModelItem[]) => {
    setModels(newModels);
    saveStoredModels(newModels);
  };

  // Filtered Brands
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brands;
    const query = brandSearch.toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.category.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query)
    );
  }, [brands, brandSearch]);

  // Brand CRUD
  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setBrandModalOpen(true);
  };

  const handleOpenEditBrand = (brand: BrandItem) => {
    setEditingBrand(brand);
    setBrandModalOpen(true);
  };

  const handleDeleteBrand = (brandId: string) => {
    if (window.confirm('Are you sure you want to delete this brand and all its associated models?')) {
      const newBrands = brands.filter((b) => b.id !== brandId);
      const newModels = models.filter((m) => m.brandId !== brandId);
      updateBrandsList(newBrands);
      updateModelsList(newModels);
      if (selectedBrandForModels?.id === brandId) {
        setSelectedBrandForModels(null);
      }
    }
  };

  const handleSaveBrand = (brand: BrandItem) => {
    if (editingBrand) {
      const updated = brands.map((b) => (b.id === brand.id ? brand : b));
      updateBrandsList(updated);
    } else {
      updateBrandsList([...brands, brand]);
    }
    setBrandModalOpen(false);
    setEditingBrand(null);
  };

  // Model CRUD
  const handleOpenAddModel = (brandId?: string) => {
    setEditingModel(null);
    setPreselectedBrandId(brandId || brands[0]?.id || 'apple');
    setModelModalOpen(true);
  };

  const handleOpenEditModel = (model: DeviceModelItem) => {
    setEditingModel(model);
    setPreselectedBrandId(model.brandId);
    setModelModalOpen(true);
  };

  const handleDeleteModel = (modelId: string) => {
    if (window.confirm('Delete this device model?')) {
      const updated = models.filter((m) => m.id !== modelId);
      updateModelsList(updated);
    }
  };

  const handleSaveModel = (model: DeviceModelItem) => {
    if (editingModel) {
      const updated = models.map((m) => (m.id === model.id ? model : m));
      updateModelsList(updated);
    } else {
      updateModelsList([...models, model]);
    }
    setModelModalOpen(false);
    setEditingModel(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Card (Matching Screenshot 1) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Brands & Device Models
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-xl font-medium">
                Maintain the catalog used by product discovery and the trade-in valuation engine.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenAddModel()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-slate-800 text-xs md:text-sm font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>Add Model</span>
            </button>
            <button
              onClick={handleOpenAddBrand}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 text-white text-xs md:text-sm font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Brand</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Search Brands Bar (Matching Screenshot 1) */}
      <div className="relative">
        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          placeholder="Search brands..."
          className="w-full bg-white pl-12 pr-10 py-3.5 rounded-2xl border border-gray-200 text-sm font-medium text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
        />
        {brandSearch && (
          <button
            onClick={() => setBrandSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Counter metrics */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
        <span>
          {brands.length} brands · {models.length} models
        </span>
      </div>

      {/* 3. Brand Cards Grid (Matching Screenshot 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBrands.map((brand) => {
          const brandModels = models.filter((m) => m.brandId === brand.id);
          return (
            <div
              key={brand.id}
              className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Card Top Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 p-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {brand.logo ? (
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="font-black text-lg text-slate-700">
                          {brand.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">{brand.name}</h3>
                      <p className="text-xs text-slate-400 font-semibold">{brandModels.length} models</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEditBrand(brand)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-slate-800 hover:bg-gray-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 mt-3 font-medium line-clamp-2">
                  {brand.description}
                </p>

                {/* Category Tag Pill */}
                <div className="mt-3">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black tracking-wider uppercase">
                    {brand.category}
                  </span>
                </div>
              </div>

              {/* Bottom Action Row */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => setSelectedBrandForModels(brand)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Manage Models</span>
                </button>

                <button
                  onClick={() => handleOpenAddModel(brand.id)}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-slate-700 hover:bg-gray-50 active:scale-95 transition-all"
                  title={`Add model to ${brand.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteBrand(brand.id)}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-red-500 hover:bg-red-50 active:scale-95 transition-all"
                  title="Delete brand"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Manage Models Modal / Sheet (Matching Screenshot 2) */}
      {selectedBrandForModels && (
        <ManageModelsModal
          brand={selectedBrandForModels}
          models={models.filter((m) => m.brandId === selectedBrandForModels.id)}
          onClose={() => setSelectedBrandForModels(null)}
          onAddModel={() => handleOpenAddModel(selectedBrandForModels.id)}
          onEditModel={handleOpenEditModel}
          onDeleteModel={handleDeleteModel}
        />
      )}

      {/* Brand Form Modal */}
      {brandModalOpen && (
        <BrandFormModal
          brand={editingBrand}
          onClose={() => {
            setBrandModalOpen(false);
            setEditingBrand(null);
          }}
          onSave={handleSaveBrand}
        />
      )}

      {/* Model Form Modal */}
      {modelModalOpen && (
        <ModelFormModal
          model={editingModel}
          brands={brands}
          preselectedBrandId={preselectedBrandId}
          onClose={() => {
            setModelModalOpen(false);
            setEditingModel(null);
          }}
          onSave={handleSaveModel}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Manage Models Modal (Matching Screenshot 2)
// ----------------------------------------------------------------------
function ManageModelsModal({
  brand,
  models,
  onClose,
  onAddModel,
  onEditModel,
  onDeleteModel,
}: {
  brand: BrandItem;
  models: DeviceModelItem[];
  onClose: () => void;
  onAddModel: () => void;
  onEditModel: (model: DeviceModelItem) => void;
  onDeleteModel: (modelId: string) => void;
}) {
  const [modelSearch, setModelSearch] = useState('');

  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return models;
    const q = modelSearch.toLowerCase();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.releaseYear.toString().includes(q)
    );
  }, [models, modelSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {brand.name} Models
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Manage every model associated with this brand.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddModel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-slate-800 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Models Input */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full bg-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Model Cards List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filteredModels.length === 0 ? (
            <div className="py-12 text-center">
              <Box className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No models found</p>
              <p className="text-xs text-slate-400 mt-1">
                Click "+ Add" to create a new model for {brand.name}.
              </p>
            </div>
          ) : (
            filteredModels.map((model) => (
              <div
                key={model.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between gap-3 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Box className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900 truncate">
                        {model.name}
                      </h4>
                      {model.isFeatured && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200/60">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                      <span>{model.category}</span>
                      <span>·</span>
                      <span>{model.releaseYear}</span>
                      <span>·</span>
                      <span className="font-bold text-slate-700">
                        ₹{model.basePrice.toLocaleString('en-IN')} base
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {model.storageOptions.length} storage options
                    </p>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onEditModel(model)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-slate-700 text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDeleteModel(model.id)}
                    className="p-2 rounded-xl border border-gray-200 text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Brand Form Modal
// ----------------------------------------------------------------------
function BrandFormModal({
  brand,
  onClose,
  onSave,
}: {
  brand: BrandItem | null;
  onClose: () => void;
  onSave: (brand: BrandItem) => void;
}) {
  const [name, setName] = useState(brand?.name || '');
  const [category, setCategory] = useState(brand?.category || 'SMARTPHONES');
  const [logo, setLogo] = useState(brand?.logo || '');
  const [description, setDescription] = useState(brand?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const brandItem: BrandItem = {
      id: brand?.id || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: name.trim(),
      category: category.trim().toUpperCase(),
      logo: logo.trim(),
      description: description.trim(),
    };
    onSave(brandItem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-slate-900">
            {brand ? 'Edit Brand' : 'Add New Brand'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Brand Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apple, Samsung, Dell"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="SMARTPHONES">SMARTPHONES</option>
              <option value="LAPTOPS">LAPTOPS</option>
              <option value="TABLETS">TABLETS</option>
              <option value="AUDIO">AUDIO</option>
              <option value="WEARABLES">WEARABLES</option>
              <option value="CAMERAS">CAMERAS</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Logo URL (Optional)</label>
            <input
              type="url"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this brand's product catalog..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-slate-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              {brand ? 'Save Changes' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Model Form Modal
// ----------------------------------------------------------------------
function ModelFormModal({
  model,
  brands,
  preselectedBrandId,
  onClose,
  onSave,
}: {
  model: DeviceModelItem | null;
  brands: BrandItem[];
  preselectedBrandId: string;
  onClose: () => void;
  onSave: (model: DeviceModelItem) => void;
}) {
  const [brandId, setBrandId] = useState(model?.brandId || preselectedBrandId || brands[0]?.id);
  const [name, setName] = useState(model?.name || '');
  const [category, setCategory] = useState(model?.category || 'smartphones');
  const [releaseYear, setReleaseYear] = useState(model?.releaseYear || 2024);
  const [basePrice, setBasePrice] = useState(model?.basePrice || 50000);
  const [isFeatured, setIsFeatured] = useState(model?.isFeatured ?? true);
  const [storageInput, setStorageInput] = useState(
    model?.storageOptions.join(', ') || '128GB, 256GB, 512GB'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const currentBrand = brands.find((b) => b.id === brandId);
    const storageOptions = storageInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const modelItem: DeviceModelItem = {
      id: model?.id || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      brandId,
      brandName: currentBrand?.name || 'Brand',
      name: name.trim(),
      category,
      releaseYear: Number(releaseYear),
      basePrice: Number(basePrice),
      storageOptions: storageOptions.length > 0 ? storageOptions : ['Standard'],
      isFeatured,
    };

    onSave(modelItem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-slate-900">
            {model ? 'Edit Device Model' : 'Add New Device Model'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Associated Brand</label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Model Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. iPhone 16 Pro Max"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="smartphones">Smartphones</option>
                <option value="laptops">Laptops</option>
                <option value="tablets">Tablets</option>
                <option value="audio">Audio</option>
                <option value="wearables">Wearables</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Release Year</label>
              <input
                type="number"
                min="2018"
                max="2026"
                value={releaseYear}
                onChange={(e) => setReleaseYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Base Trade-In Valuation (₹)
            </label>
            <input
              type="number"
              min="1000"
              step="500"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Storage Capacities (Comma separated)
            </label>
            <input
              type="text"
              value={storageInput}
              onChange={(e) => setStorageInput(e.target.value)}
              placeholder="e.g. 128GB, 256GB, 512GB, 1TB"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isFeatured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label htmlFor="isFeatured" className="text-xs font-bold text-slate-700 cursor-pointer">
              Mark as Featured Model (High Discovery)
            </label>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-slate-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              {model ? 'Save Changes' : 'Create Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
