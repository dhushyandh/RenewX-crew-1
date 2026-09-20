import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  type BrandItem,
  type DeviceModelItem,
} from '@/data/brandsData';
import { api } from '@/services/api';
import { confirmAction } from '@/lib/confirmAction';
import ImagePickerButton from '@/components/ImagePickerButton';

interface BrandsViewProps {
  initialAction?: 'addBrand' | 'addModel';
  preselectedBrandId?: string;
}

export default function BrandsView({ initialAction, preselectedBrandId: propBrandId }: BrandsViewProps = {}) {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [models, setModels] = useState<DeviceModelItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandForModels, setSelectedBrandForModels] = useState<BrandItem | null>(null);

  // Modals state
  const [brandModalVisible, setBrandModalVisible] = useState(initialAction === 'addBrand');
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);

  const [modelModalVisible, setModelModalVisible] = useState(initialAction === 'addModel');
  const [editingModel, setEditingModel] = useState<DeviceModelItem | null>(null);
  const [preselectedBrandId, setPreselectedBrandId] = useState<string>(propBrandId || 'apple');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedBrands, fetchedModels] = await Promise.all([
        api.brands.getAll(),
        api.models.getAll(),
      ]);
      setBrands(
        Array.isArray(fetchedBrands)
          ? fetchedBrands.map((b: any) => ({
              id: b.id,
              name: b.name,
              category: b.category,
              logo: b.logo_url || b.logo || '',
              description: b.description || '',
            }))
          : []
      );

      setModels(
        Array.isArray(fetchedModels)
          ? fetchedModels.map((m: any) => ({
              id: m.id,
              brandId: m.brand_id || m.brandId,
              brandName: m.brand_name || m.brandName || 'Brand',
              name: m.name,
              category: m.category,
              releaseYear: m.release_year || m.releaseYear || 2024,
              basePrice: m.base_price || m.basePrice || 50000,
              storageOptions: Array.isArray(m.storage_options) ? m.storage_options : ['128GB', '256GB'],
              isFeatured: m.is_featured ?? m.isFeatured ?? true,
            }))
          : []
      );
    } catch (err) {
      console.warn('[BrandsView] Could not load brands & models from API:', err);
      setBrands([]);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialAction === 'addBrand') {
      setEditingBrand(null);
      setBrandModalVisible(true);
    } else if (initialAction === 'addModel') {
      setEditingModel(null);
      if (propBrandId) setPreselectedBrandId(propBrandId);
      setModelModalVisible(true);
    }
  }, [initialAction, propBrandId]);

  // Filtered brands
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brands;
    const q = brandSearch.toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [brands, brandSearch]);

  // Brand actions
  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setBrandModalVisible(true);
  };

  const handleOpenEditBrand = (b: BrandItem) => {
    setEditingBrand(b);
    setBrandModalVisible(true);
  };

  const handleDeleteBrand = (brandId: string, brandName?: string) => {
    confirmAction(
      'Delete Brand',
      `Are you sure you want to delete ${brandName ? `"${brandName}"` : 'this brand'} and all associated device models?`,
      async () => {
        setBrands((prev) => prev.filter((b) => b.id !== brandId && (b as any)._id !== brandId));
        setModels((prev) => prev.filter((m) => m.brandId !== brandId && (m as any).brand_id !== brandId));
        if (selectedBrandForModels?.id === brandId || (selectedBrandForModels as any)?._id === brandId) {
          setSelectedBrandForModels(null);
        }
        try {
          await api.brands.delete(brandId);
        } catch (err) {
          console.warn('[BrandsView] Error deleting brand on API:', err);
        }
      }
    );
  };

  const BRAND_CATEGORY_OPTIONS = ['SMARTPHONES', 'LAPTOPS', 'TABLETS', 'AUDIO', 'WEARABLES', 'CAMERAS'];

const handleSaveBrand = async (b: BrandItem) => {
    const isEdit = !!editingBrand;
    if (isEdit) {
      setBrands((prev) => prev.map((item) => (item.id === b.id ? b : item)));
    } else {
      setBrands((prev) => [...prev, b]);
    }
    setBrandModalVisible(false);
    setEditingBrand(null);

    try {
      if (isEdit) {
        await api.brands.update(b.id, {
          name: b.name,
          category: b.category,
          logo_url: b.logo,
          description: b.description,
        });
      } else {
        await api.brands.create({
          id: b.id,
          name: b.name,
          category: b.category,
          logo_url: b.logo,
          description: b.description,
        });
      }
    } catch (err: any) {
      console.warn('[BrandsView] API save brand failed:', err);
    }
  };

  // Model actions
  const handleOpenAddModel = (brandId?: string) => {
    setEditingModel(null);
    setPreselectedBrandId(brandId || brands[0]?.id || 'apple');
    setModelModalVisible(true);
  };

  const handleOpenEditModel = (m: DeviceModelItem) => {
    setEditingModel(m);
    setPreselectedBrandId(m.brandId);
    setModelModalVisible(true);
  };

  const handleDeleteModel = (modelId: string, modelName?: string) => {
    confirmAction(
      'Delete Model',
      `Are you sure you want to remove ${modelName ? `"${modelName}"` : 'this model'} from the catalog?`,
      async () => {
        setModels((prev) => prev.filter((m) => m.id !== modelId && (m as any)._id !== modelId));
        try {
          await api.models.delete(modelId);
        } catch (err) {
          console.warn('[BrandsView] API delete model failed:', err);
        }
      }
    );
  };

  const handleSaveModel = async (m: DeviceModelItem) => {
    const isEdit = !!editingModel;
    if (isEdit) {
      setModels((prev) => prev.map((item) => (item.id === m.id ? m : item)));
    } else {
      setModels((prev) => [...prev, m]);
    }
    setModelModalVisible(false);
    setEditingModel(null);

    try {
      const payload = {
        brand_id: m.brandId,
        brand_name: m.brandName,
        name: m.name,
        category: m.category,
        release_year: m.releaseYear,
        base_price: m.basePrice,
        storage_options: m.storageOptions,
        is_featured: m.isFeatured,
      };
      if (isEdit) {
        await api.models.update(m.id, payload);
      } else {
        await api.models.create({ id: m.id, ...payload });
      }
    } catch (err) {
      console.warn('[BrandsView] API save model failed:', err);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header Card (Matching Screenshot 1) */}
      <View style={styles.headerCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={28} color="#2563eb" />
        </View>
        <Text style={styles.headerTitle}>Brands & Device Models</Text>
        <Text style={styles.headerSubtitle}>
          Maintain the catalog used by product discovery and the trade-in valuation engine.
        </Text>

        <View style={styles.headerButtonsRow}>
          <TouchableOpacity
            style={styles.addModelBtn}
            onPress={() => handleOpenAddModel()}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color="#0f172a" />
            <Text style={styles.addModelBtnText}>Add Model</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBrandBtn}
            onPress={handleOpenAddBrand}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.addBrandBtnText}>Add Brand</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Search Brands Bar (Matching Screenshot 1) */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          placeholder="Search brands..."
          placeholderTextColor="#9ca3af"
          value={brandSearch}
          onChangeText={setBrandSearch}
          style={styles.searchInput}
        />
        {brandSearch.length > 0 && (
          <TouchableOpacity onPress={() => setBrandSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Counter metrics */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {brands.length} brands · {models.length} models
        </Text>
      </View>

      {/* 3. Brand Cards List (Matching Screenshot 1) */}
      <View style={styles.brandList}>
        {filteredBrands.map((brand) => {
          const brandModels = models.filter((m) => m.brandId === brand.id);
          return (
            <View key={brand.id} style={styles.brandCard}>
              <View style={styles.brandCardTop}>
                <View style={styles.logoBox}>
                  {brand.logo ? (
                    <Image source={brand.logo ? { uri: brand.logo } : null} style={styles.brandLogo} resizeMode="contain" />
                  ) : (
                    <Text style={styles.brandInitial}>{brand.name.charAt(0)}</Text>
                  )}
                </View>

                <View style={styles.brandInfo}>
                  <Text style={styles.brandName}>{brand.name}</Text>
                  <Text style={styles.brandModelsCount}>{brandModels.length} models</Text>
                </View>

                <TouchableOpacity
                  style={styles.editBrandBtn}
                  onPress={() => handleOpenEditBrand(brand)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.brandDesc}>{brand.description}</Text>

              <View style={styles.categoryPillBox}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{brand.category}</Text>
                </View>
              </View>

              {/* Bottom Action Row */}
              <View style={styles.brandCardBottom}>
                <TouchableOpacity
                  style={styles.manageModelsBtn}
                  onPress={() => setSelectedBrandForModels(brand)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="layers" size={15} color="#ffffff" />
                  <Text style={styles.manageModelsBtnText}>Manage Models</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={() => handleOpenAddModel(brand.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#111827" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconCircleBtn}
                  onPress={() => handleDeleteBrand(brand.id, brand.name)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* 4. Manage Models Modal (Matching Screenshot 2) */}
      {selectedBrandForModels && (
        <ManageModelsModal
          brand={selectedBrandForModels}
          models={models.filter((m) => m.brandId === selectedBrandForModels.id)}
          visible={!!selectedBrandForModels}
          onClose={() => setSelectedBrandForModels(null)}
          onAddModel={() => handleOpenAddModel(selectedBrandForModels.id)}
          onEditModel={handleOpenEditModel}
          onDeleteModel={handleDeleteModel}
        />
      )}

      {/* Brand Add/Edit Form Modal */}
      {brandModalVisible && (
        <BrandFormModal
          visible={brandModalVisible}
          brand={editingBrand}
          onClose={() => {
            setBrandModalVisible(false);
            setEditingBrand(null);
          }}
          onSave={handleSaveBrand}
          onDelete={handleDeleteBrand}
        />
      )}

      {/* Model Add/Edit Form Modal */}
      {modelModalVisible && (
        <ModelFormModal
          visible={modelModalVisible}
          model={editingModel}
          brands={brands}
          preselectedBrandId={preselectedBrandId}
          onClose={() => {
            setModelModalVisible(false);
            setEditingModel(null);
          }}
          onSave={handleSaveModel}
          onDelete={handleDeleteModel}
        />
      )}
    </ScrollView>
  );
}

// ----------------------------------------------------------------------
// Manage Models Modal (Matching Screenshot 2)
// ----------------------------------------------------------------------
function ManageModelsModal({
  brand,
  models,
  visible,
  onClose,
  onAddModel,
  onEditModel,
  onDeleteModel,
}: {
  brand: BrandItem;
  models: DeviceModelItem[];
  visible: boolean;
  onClose: () => void;
  onAddModel: () => void;
  onEditModel: (model: DeviceModelItem) => void;
  onDeleteModel: (modelId: string, modelName?: string) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.releaseYear.toString().includes(q)
    );
  }, [models, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheetContainer}>
          {/* Header */}
          <View style={modalStyles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.sheetTitle}>{brand.name} Models</Text>
              <Text style={modalStyles.sheetSubtitle}>
                Manage every model associated with this brand.
              </Text>
            </View>

            <View style={modalStyles.sheetHeaderActions}>
              <TouchableOpacity
                style={modalStyles.addBtn}
                onPress={onAddModel}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={modalStyles.addBtnText}>Add</Text>
              </TouchableOpacity>

              <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Models Input */}
          <View style={modalStyles.searchContainer}>
            <View style={modalStyles.searchInputBox}>
              <Ionicons name="search" size={16} color="#9ca3af" />
              <TextInput
                placeholder="Search models..."
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
                style={modalStyles.searchInput}
              />
            </View>
          </View>

          {/* Models List */}
          <ScrollView style={modalStyles.modelsScroll} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <View style={modalStyles.emptyState}>
                <Ionicons name="cube-outline" size={40} color="#cbd5e1" />
                <Text style={modalStyles.emptyTitle}>No Models Found</Text>
                <Text style={modalStyles.emptySub}>
                  Tap "+ Add" above to register a new model for {brand.name}.
                </Text>
              </View>
            ) : (
              filtered.map((model) => (
                <View key={model.id} style={modalStyles.modelCard}>
                  <View style={modalStyles.modelCardLeft}>
                    <View style={modalStyles.cubeBox}>
                      <Ionicons name="cube-outline" size={22} color="#94a3b8" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={modalStyles.modelNameRow}>
                        <Text style={modalStyles.modelName}>{model.name}</Text>
                        {model.isFeatured && (
                          <View style={modalStyles.featuredBadge}>
                            <Text style={modalStyles.featuredBadgeText}>Featured</Text>
                          </View>
                        )}
                      </View>

                      <Text style={modalStyles.modelDetails}>
                        {model.category}   {model.releaseYear}   ₹{model.basePrice.toLocaleString('en-IN')} base
                      </Text>

                      <Text style={modalStyles.modelStorage}>
                        {model.storageOptions.length} storage options
                      </Text>
                    </View>
                  </View>

                  {/* Edit & Delete Action Buttons */}
                  <View style={modalStyles.modelCardActions}>
                    <TouchableOpacity
                      style={modalStyles.editBtn}
                      onPress={() => onEditModel(model)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="pencil-outline" size={13} color="#374151" />
                      <Text style={modalStyles.editBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={modalStyles.trashBtn}
                      onPress={() => onDeleteModel(model.id, model.name)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={15} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// Brand Add/Edit Form Modal
// ----------------------------------------------------------------------
function BrandFormModal({
  visible,
  brand,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  brand: BrandItem | null;
  onClose: () => void;
  onSave: (b: BrandItem) => void;
  onDelete?: (brandId: string, brandName?: string) => void;
}) {
  const BRAND_CATEGORY_OPTIONS = ['SMARTPHONES', 'LAPTOPS', 'TABLETS', 'AUDIO', 'WEARABLES', 'CAMERAS'];
  const [name, setName] = useState(brand?.name || '');
  const [category, setCategory] = useState(brand?.category || 'SMARTPHONES');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [logo, setLogo] = useState(brand?.logo || '');
  const [description, setDescription] = useState(brand?.description || '');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter brand name');
      return;
    }
    onSave({
      id: brand?.id || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: name.trim(),
      category: category.trim().toUpperCase(),
      logo: logo.trim(),
      description: description.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={formStyles.overlay}
      >
        <View style={formStyles.dialog}>
          <View style={formStyles.header}>
            <Text style={formStyles.title}>{brand ? 'Edit Brand' : 'Add Brand'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <Text style={formStyles.label}>Brand Name</Text>
          <TextInput
            placeholder="e.g. Apple, Samsung, Dell"
            value={name}
            onChangeText={setName}
            style={formStyles.input}
          />

          <Text style={formStyles.label}>Category</Text>
          <TouchableOpacity
            onPress={() => setCategoryPickerOpen(true)}
            activeOpacity={0.8}
            style={[formStyles.input, { justifyContent: 'center' }]}
          >
            <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '500' }}>{category}</Text>
          </TouchableOpacity>

          <Modal visible={categoryPickerOpen} transparent animationType="fade" onRequestClose={() => setCategoryPickerOpen(false)}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'center', padding: 24 }} activeOpacity={1} onPress={() => setCategoryPickerOpen(false)}>
              <View style={{ backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>Select Category</Text>
                </View>
                {BRAND_CATEGORY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      setCategory(option);
                      setCategoryPickerOpen(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: option === BRAND_CATEGORY_OPTIONS[BRAND_CATEGORY_OPTIONS.length - 1] ? 0 : 1,
                      borderBottomColor: '#f1f5f9',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: category === option ? '700' : '500' }}>{option}</Text>
                    {category === option && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          <Text style={formStyles.label}>Brand Logo</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                placeholder="Image URL, data:image/... or pick below"
                value={logo}
                onChangeText={setLogo}
                style={formStyles.input}
              />
            </View>
            <ImagePickerButton
              onImageUploaded={(url) => setLogo(url)}
              label="Pick"
              aspect={[1, 1]}
              buttonStyle={{ paddingVertical: 9, paddingHorizontal: 14 }}
            />
          </View>
          {logo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Image
                source={logo ? { uri: logo } : null}
                style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#f1f5f9' }}
              />
              <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '600' }}>✓ Logo linked</Text>
            </View>
          ) : null}

          <Text style={formStyles.label}>Description</Text>
          <TextInput
            placeholder="Description..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            style={[formStyles.input, { height: 60, textAlignVertical: 'top' }]}
          />

          <View style={formStyles.btnRow}>
            {brand && onDelete ? (
              <TouchableOpacity
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: '#fee2e2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 'auto',
                }}
                onPress={() => {
                  onClose();
                  onDelete(brand.id, brand.name);
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={formStyles.cancelBtn} onPress={onClose}>
              <Text style={formStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={formStyles.saveBtn} onPress={handleSave}>
              <Text style={formStyles.saveBtnText}>Save Brand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// Model Add/Edit Form Modal
// ----------------------------------------------------------------------
function ModelFormModal({
  visible,
  model,
  brands,
  preselectedBrandId,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  model: DeviceModelItem | null;
  brands: BrandItem[];
  preselectedBrandId: string;
  onClose: () => void;
  onSave: (m: DeviceModelItem) => void;
  onDelete?: (modelId: string, modelName?: string) => void;
}) {
  const MODEL_CATEGORY_OPTIONS = ['smartphones', 'laptops', 'tablets', 'audio', 'wearables', 'cameras'];
  const [brandId, setBrandId] = useState(model?.brandId || preselectedBrandId || brands[0]?.id);
  const [name, setName] = useState(model?.name || '');
  const [category, setCategory] = useState(model?.category || 'smartphones');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [releaseYear, setReleaseYear] = useState((model?.releaseYear || 2024).toString());
  const [basePrice, setBasePrice] = useState((model?.basePrice || 50000).toString());
  const [isFeatured, setIsFeatured] = useState(model?.isFeatured ?? true);
  const [storageInput, setStorageInput] = useState(
    model?.storageOptions.join(', ') || '128GB, 256GB, 512GB'
  );

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter model name');
      return;
    }
    const currentBrand = brands.find((b) => b.id === brandId);
    const storageOptions = storageInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      id: model?.id || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      brandId,
      brandName: currentBrand?.name || 'Brand',
      name: name.trim(),
      category: category.trim().toLowerCase(),
      releaseYear: Number(releaseYear) || 2024,
      basePrice: Number(basePrice) || 50000,
      storageOptions: storageOptions.length > 0 ? storageOptions : ['Standard'],
      isFeatured,
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={formStyles.overlay}
      >
        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
          <View style={formStyles.dialog}>
            <View style={formStyles.header}>
              <Text style={formStyles.title}>{model ? 'Edit Model' : 'Add Model'}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <Text style={formStyles.label}>Model Name</Text>
            <TextInput
              placeholder="e.g. iPhone 16 Pro Max"
              value={name}
              onChangeText={setName}
              style={formStyles.input}
            />

            <Text style={formStyles.label}>Category</Text>
            <TouchableOpacity
              onPress={() => setCategoryPickerOpen(true)}
              activeOpacity={0.8}
              style={[formStyles.input, { justifyContent: 'center' }]}
            >
              <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '500' }}>{category}</Text>
            </TouchableOpacity>

            <Modal visible={categoryPickerOpen} transparent animationType="fade" onRequestClose={() => setCategoryPickerOpen(false)}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'center', padding: 24 }} activeOpacity={1} onPress={() => setCategoryPickerOpen(false)}>
                <View style={{ backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>Select Category</Text>
                  </View>
                  {MODEL_CATEGORY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        setCategory(option);
                        setCategoryPickerOpen(false);
                      }}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: option === MODEL_CATEGORY_OPTIONS[MODEL_CATEGORY_OPTIONS.length - 1] ? 0 : 1,
                        borderBottomColor: '#f1f5f9',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: category === option ? '700' : '500' }}>{option}</Text>
                      {category === option && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={formStyles.label}>Release Year</Text>
                <TextInput
                  value={releaseYear}
                  onChangeText={setReleaseYear}
                  keyboardType="numeric"
                  style={formStyles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={formStyles.label}>Base Trade-In (₹)</Text>
                <TextInput
                  value={basePrice}
                  onChangeText={setBasePrice}
                  keyboardType="numeric"
                  style={formStyles.input}
                />
              </View>
            </View>

            <Text style={formStyles.label}>Storage Options (Comma separated)</Text>
            <TextInput
              value={storageInput}
              onChangeText={setStorageInput}
              placeholder="e.g. 128GB, 256GB, 512GB"
              style={formStyles.input}
            />

            <TouchableOpacity
              style={formStyles.checkboxRow}
              onPress={() => setIsFeatured(!isFeatured)}
            >
              <Ionicons
                name={isFeatured ? 'checkbox' : 'square-outline'}
                size={18}
                color={isFeatured ? '#2563eb' : '#9ca3af'}
              />
              <Text style={formStyles.checkboxLabel}>Featured Device (Highlights in Shop)</Text>
            </TouchableOpacity>

            <View style={formStyles.btnRow}>
              {model && onDelete ? (
                <TouchableOpacity
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: '#fee2e2',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 'auto',
                  }}
                  onPress={() => {
                    onClose();
                    onDelete(model.id, model.name);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={formStyles.cancelBtn} onPress={onClose}>
                <Text style={formStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={formStyles.saveBtn} onPress={handleSave}>
                <Text style={formStyles.saveBtnText}>Save Model</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e8e4da',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  addModelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addModelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  addBrandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addBrandBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  counterRow: {
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  brandList: {
    gap: 12,
  },
  brandCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8e4da',
  },
  brandCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLogo: {
    width: '80%',
    height: '80%',
  },
  brandInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  brandInfo: {
    flex: 1,
    marginLeft: 12,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  brandModelsCount: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 1,
  },
  editBrandBtn: {
    padding: 6,
  },
  brandDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 10,
    lineHeight: 16,
  },
  categoryPillBox: {
    marginTop: 8,
    flexDirection: 'row',
  },
  categoryPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  brandCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  manageModelsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0a0a0a',
    paddingVertical: 10,
    borderRadius: 12,
  },
  manageModelsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  sheetSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
  },
  modelsScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 2,
  },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e4da',
    marginBottom: 10,
  },
  modelCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  cubeBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  modelName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  featuredBadge: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  featuredBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
  },
  modelDetails: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modelStorage: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  modelCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  trashBtn: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
  },
});

const formStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  checkboxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
