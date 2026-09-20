import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { sanitizeImageUrl } from '@/lib/imageUtils';

export interface ImageInputProps {
  value?: string;
  onChange: (url: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  aspect?: [number, number];
  label?: string;
  disabled?: boolean;
}

type InputTab = 'gallery' | 'url' | 'clipboard';
type UploadStatus = 'idle' | 'validating' | 'uploading' | 'success' | 'error';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export default function ImageInput({
  value,
  onChange,
  onUploadingChange,
  aspect = [4, 3],
  label = 'Product Image',
  disabled = false,
}: ImageInputProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<InputTab>('gallery');
  const [urlInput, setUrlInput] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(value || '');
  const lastFailedActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setPreviewUrl(value);
      if (value && uploadStatus === 'idle') {
        setUploadStatus('success');
      }
    }
  }, [value]);

  const updateStatus = (status: UploadStatus, progress = 0, error: string | null = null) => {
    setUploadStatus(status);
    setUploadProgress(progress);
    setErrorMessage(error);
    if (onUploadingChange) {
      onUploadingChange(status === 'uploading' || status === 'validating');
    }
  };

  /**
   * No restrictions: accept any image type and any file size
   */
  const validateAsset = (_fileName?: string | null, _fileSize?: number | null): string | null => {
    return null;
  };

  /**
   * Upload an asset or base64 data to backend gateway
   */
  const executeUploadAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const action = async () => {
      try {
        updateStatus('validating', 10);

        const validationErr = validateAsset(asset.fileName, asset.fileSize);
        if (validationErr) {
          updateStatus('error', 0, validationErr);
          toast.error(validationErr, 'Validation Error');
          return;
        }

        updateStatus('uploading', 30);

        // Immediate preview of asset
        setPreviewUrl(asset.uri);

        let finalUrl = asset.uri;

        if (asset.base64) {
          const fileName = asset.fileName || `product-${Date.now()}`;
          const contentType = asset.mimeType || 'image/jpeg';
          finalUrl = asset.base64.startsWith('data:')
            ? asset.base64
            : `data:${contentType};base64,${asset.base64}`;

          try {
            updateStatus('uploading', 60);
            const res = await api.upload.base64(asset.base64, fileName, contentType);
            if (res?.url) finalUrl = res.url;
          } catch (uploadErr) {
            console.warn('[ImageInput] Remote upload failed, keeping data URI directly:', uploadErr);
          }
        } else {
          try {
            const res = await (api.upload.image as any)({
              uri: asset.uri,
              name: asset.fileName || `product-${Date.now()}`,
              type: asset.mimeType || 'image/jpeg',
            });
            if (res?.url) finalUrl = res.url;
          } catch (uploadErr) {
            console.warn('[ImageInput] Remote upload failed, keeping asset URI:', uploadErr);
          }
        }

        updateStatus('success', 100);
        setPreviewUrl(finalUrl);
        onChange(finalUrl);
        toast.success('Image attached successfully', 'Upload Complete');
      } catch (err: any) {
        const msg = err?.message || 'Attached image via local link.';
        updateStatus('success', 100);
        setPreviewUrl(asset.uri);
        onChange(asset.uri);
        toast.info(msg, 'Image Attached');
      }
    };

    lastFailedActionRef.current = action;
    await action();
  };

  /**
   * 1. Pick from Gallery
   */
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow gallery access to upload product photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await executeUploadAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not open photo library');
    }
  };

  /**
   * Camera Capture
   */
  const handleCaptureCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to take product photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await executeUploadAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not access camera');
    }
  };

  const [imageLoadError, setImageLoadError] = useState(false);

  /**
   * 2. Process Pasted URL or Base64 String
   */
  const handleProcessUrlOrBase64 = async (rawInput?: string) => {
    const raw = (rawInput !== undefined ? rawInput : urlInput).trim();
    const text = sanitizeImageUrl(raw);
    if (!text) {
      toast.error('Please paste or type an image link or base64 data URL.');
      return;
    }

    const action = async () => {
      try {
        updateStatus('validating', 15);
        setImageLoadError(false);

        // Case A: Base64 data:image/...
        let finalUrl = text;

        if (text.startsWith('data:')) {
          const mimeMatch = text.match(/^data:([^;]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';
          try {
            updateStatus('uploading', 50);
            const res = await api.upload.base64(text, `pasted-${Date.now()}`, mimeType);
            if (res?.url) finalUrl = res.url;
          } catch (uploadErr) {
            console.warn('[ImageInput] Remote upload failed, keeping data URI directly:', uploadErr);
          }
        } else if (text.startsWith('http://') || text.startsWith('https://')) {
          try {
            updateStatus('uploading', 50);
            const res = await api.upload.url(text);
            if (res?.url) finalUrl = res.url;
          } catch {
            // Keep remote URL as-is
          }
        }

        updateStatus('success', 100);
        setPreviewUrl(finalUrl);
        onChange(finalUrl);
        setUrlInput('');
        toast.success('Image attached successfully');
        return;
      } catch (err: any) {
        const text = sanitizeImageUrl(urlInput.trim());
        updateStatus('success', 100);
        setPreviewUrl(text);
        onChange(text);
        setUrlInput('');
        toast.info('Image attached');
      }
    };

    lastFailedActionRef.current = action;
    await action();
  };

  /**
   * 3. Paste from Clipboard
   */
  const handlePasteFromClipboard = async () => {
    const action = async () => {
      try {
        updateStatus('validating', 15);

        // Native / Expo Clipboard: check for image first
        try {
          const hasImage = await Clipboard.hasImageAsync();
          if (hasImage) {
            updateStatus('uploading', 30);
            const imageResult = await Clipboard.getImageAsync({ format: 'png' });
            if (imageResult && imageResult.data) {
              const fullBase64 = `data:image/png;base64,${imageResult.data}`;
              setPreviewUrl(fullBase64);

              const res = await api.upload.base64(fullBase64, `clipboard-${Date.now()}.png`, 'image/png');
              if (!res?.url) throw new Error('Could not upload clipboard image to server.');

              updateStatus('success', 100);
              setPreviewUrl(res.url);
              onChange(res.url);
              toast.success('Clipboard image uploaded to cloud storage', 'Upload Complete');
              return;
            }
          }
        } catch {
          // Native getImageAsync may fail on web; proceed to web fallback
        }

        // Web navigator.clipboard fallback for copied image blobs
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.read) {
          try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
              const imageType = item.types.find((t) => t.startsWith('image/'));
              if (imageType) {
                const blob = await item.getType(imageType);
                if (blob.size > MAX_IMAGE_SIZE_BYTES) {
                  throw new Error('Clipboard image exceeds 5MB limit.');
                }
                const base64Data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });

                updateStatus('uploading', 45);
                setPreviewUrl(base64Data);

                const res = await api.upload.base64(base64Data, `web-clipboard-${Date.now()}.png`, imageType);
                if (!res?.url) throw new Error('Failed to upload clipboard image.');

                updateStatus('success', 100);
                setPreviewUrl(res.url);
                onChange(res.url);
                toast.success('Clipboard image saved to cloud storage');
                return;
              }
            }
          } catch (webErr: any) {
            console.log('[ImageInput] Web clipboard item read error:', webErr?.message);
          }
        }

        // Check text in clipboard (URL or data:image/ string)
        const hasString = await Clipboard.hasStringAsync();
        if (hasString) {
          const text = (await Clipboard.getStringAsync()).trim();
          if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/')) {
            await handleProcessUrlOrBase64(text);
            return;
          }
        }

        updateStatus('idle', 0);
        toast.info('No image or image link detected in your clipboard.', 'Clipboard Empty');
      } catch (err: any) {
        const msg = err?.message || 'Could not paste image from clipboard.';
        updateStatus('error', 0, msg);
        toast.error(msg, 'Paste Error');
      }
    };

    lastFailedActionRef.current = action;
    await action();
  };

  const handleRetry = () => {
    if (lastFailedActionRef.current) {
      lastFailedActionRef.current();
    } else {
      updateStatus('idle', 0);
    }
  };

  const handleClearImage = () => {
    setPreviewUrl('');
    onChange('');
    updateStatus('idle', 0);
  };

  const isUploading = uploadStatus === 'uploading' || uploadStatus === 'validating';

  return (
    <View style={styles.container}>
      {/* Label and Status Row */}
      <View style={styles.headerRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Text style={styles.validationNotice}>JPG, PNG, WebP (Max 5MB)</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('gallery')}
          style={[styles.tabButton, activeTab === 'gallery' && styles.tabButtonActive]}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={14} color={activeTab === 'gallery' ? '#ffc400' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'gallery' && styles.tabTextActive]}>Gallery / Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('url')}
          style={[styles.tabButton, activeTab === 'url' && styles.tabButtonActive]}
          activeOpacity={0.8}
        >
          <Ionicons name="link-outline" size={14} color={activeTab === 'url' ? '#ffc400' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'url' && styles.tabTextActive]}>Paste URL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('clipboard')}
          style={[styles.tabButton, activeTab === 'clipboard' && styles.tabButtonActive]}
          activeOpacity={0.8}
        >
          <Ionicons name="clipboard-outline" size={14} color={activeTab === 'clipboard' ? '#ffc400' : '#94a3b8'} />
          <Text style={[styles.tabText, activeTab === 'clipboard' && styles.tabTextActive]}>Clipboard</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Panels */}
      <View style={styles.panelCard}>
        {activeTab === 'gallery' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handlePickFromGallery}
              disabled={isUploading || disabled}
              style={[styles.actionBtn, styles.primaryActionBtn]}
              activeOpacity={0.8}
            >
              <Ionicons name="image" size={16} color="#000000" />
              <Text style={styles.primaryActionBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity
                onPress={handleCaptureCamera}
                disabled={isUploading || disabled}
                style={[styles.actionBtn, styles.secondaryActionBtn]}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color="#f8fafc" />
                <Text style={styles.secondaryActionBtnText}>Camera</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'url' && (
          <View style={styles.urlInputContainer}>
            <View style={styles.urlInputFieldWrap}>
              <Ionicons name="link" size={15} color="#64748b" style={{ marginRight: 6 }} />
              <TextInput
                value={urlInput}
                onChangeText={(val) => {
                  setUrlInput(val);
                  setImageLoadError(false);
                }}
                placeholder="Paste HTTPS image link or base64..."
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                editable={!isUploading && !disabled}
                style={styles.urlTextInput}
              />
              {urlInput.length > 0 && (
                <TouchableOpacity onPress={() => setUrlInput('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={14} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            {/* Live Detected Preview */}
            {urlInput.trim().length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 8, borderRadius: 8, marginVertical: 6, gap: 8 }}>
                <Image
                  source={{ uri: sanitizeImageUrl(urlInput) }}
                  style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: '#1e293b' }}
                  resizeMode="cover"
                  {...(Platform.OS === 'web' ? { referrerPolicy: 'no-referrer' } as any : {})}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#f8fafc' }}>Image Detected</Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8' }} numberOfLines={1}>
                    {sanitizeImageUrl(urlInput)}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => handleProcessUrlOrBase64()}
              disabled={isUploading || disabled || !urlInput.trim()}
              style={[styles.urlSubmitBtn, (!urlInput.trim() || isUploading) && { opacity: 0.5 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={14} color="#000" />
              <Text style={styles.urlSubmitBtnText}>Attach Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'clipboard' && (
          <View style={styles.clipboardPanel}>
            <TouchableOpacity
              onPress={handlePasteFromClipboard}
              disabled={isUploading || disabled}
              style={[styles.actionBtn, styles.primaryActionBtn]}
              activeOpacity={0.8}
            >
              <Ionicons name="clipboard" size={16} color="#000000" />
              <Text style={styles.primaryActionBtnText}>Paste from Clipboard</Text>
            </TouchableOpacity>
            <Text style={styles.clipboardHint}>
              Copies from Chrome (Right Click → Copy image) or screenshots automatically detected and uploaded.
            </Text>
          </View>
        )}
      </View>

      {/* Upload State & Progress Feedback */}
      {isUploading && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator size="small" color="#ffc400" />
              <Text style={styles.progressLabelText}>
                {uploadStatus === 'validating' ? 'Validating image...' : 'Uploading image...'}
              </Text>
            </View>
            <Text style={styles.progressPercentText}>{uploadProgress}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.max(5, uploadProgress)}%` }]} />
          </View>
        </View>
      )}

      {/* Error State with Retry */}
      {uploadStatus === 'error' && (
        <View style={styles.errorCard}>
          <View style={styles.errorTextRow}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={styles.errorText}>{errorMessage || 'Image upload failed.'}</Text>
          </View>
          <TouchableOpacity onPress={handleRetry} style={styles.retryBtn} activeOpacity={0.8}>
            <Ionicons name="refresh" size={14} color="#ef4444" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success Badge & Preview */}
      {previewUrl ? (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              <Text style={styles.verifiedBadgeText}>
                {previewUrl.startsWith('http') ? 'Permanent Cloud URL' : 'Image Ready'}
              </Text>
            </View>

            <TouchableOpacity onPress={handleClearImage} style={styles.clearBtn} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={14} color="#f87171" />
              <Text style={styles.clearBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.imageCard}>
            {imageLoadError ? (
              <View style={{ flex: 1, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                <Ionicons name="alert-circle-outline" size={24} color="#f59e0b" />
                <Text style={{ fontSize: 12, color: '#f8fafc', fontWeight: '600', marginTop: 4 }}>
                  Preview failed to load
                </Text>
                <Text style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2, marginBottom: 8 }}>
                  The source site may block hotlinking. You can mirror it via server storage:
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      updateStatus('uploading', 40);
                      const res = await api.upload.url(previewUrl);
                      if (res?.url) {
                        setPreviewUrl(res.url);
                        onChange(res.url);
                        setImageLoadError(false);
                        toast.success('Mirrored image via server');
                      }
                      updateStatus('success', 100);
                    } catch (e: any) {
                      toast.error('Could not mirror image');
                      updateStatus('idle', 0);
                    }
                  }}
                  style={{ backgroundColor: '#ffc400', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="cloud-download-outline" size={13} color="#000" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#000' }}>Fetch via Server</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Image
                source={{ uri: previewUrl }}
                style={styles.previewImage}
                resizeMode="cover"
                onError={() => setImageLoadError(true)}
                {...(Platform.OS === 'web' ? { referrerPolicy: 'no-referrer' } as any : {})}
              />
            )}
            <View style={styles.urlOverlay}>
              <Ionicons name="cloud-done" size={13} color="#10b981" />
              <Text style={styles.urlOverlayText} numberOfLines={1} ellipsizeMode="middle">
                {previewUrl}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  validationNotice: {
    fontSize: 11,
    color: '#94a3b8',
  },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 0, 0.4)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ffc400',
    fontWeight: '700',
  },
  panelCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: '#ffc400',
  },
  primaryActionBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    backgroundColor: '#334155',
  },
  secondaryActionBtnText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlInputFieldWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  urlTextInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    paddingVertical: 8,
  },
  urlSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 196, 0, 0.15)',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 0, 0.4)',
  },
  urlSubmitBtnText: {
    color: '#ffc400',
    fontSize: 13,
    fontWeight: '700',
  },
  clipboardPanel: {
    alignItems: 'center',
    gap: 6,
  },
  clipboardHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffc400',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffc400',
    borderRadius: 3,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
    flex: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  previewContainer: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearBtnText: {
    fontSize: 11,
    color: '#f87171',
    fontWeight: '600',
  },
  imageCard: {
    position: 'relative',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#020617',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  urlOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urlOverlayText: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
});
