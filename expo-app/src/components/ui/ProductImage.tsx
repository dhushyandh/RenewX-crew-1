import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageProps,
  ImageStyle,
  StyleProp,
} from 'react-native';
import { getCategoryDeviceImage, resolveImageSource } from '@/lib/imageUtils';

export interface ProductImageProps extends Omit<ImageProps, 'source'> {
  source?: any;
  category?: string;
  name?: string;
  isSoldOut?: boolean;
  style?: StyleProp<ImageStyle>;
}

export default function ProductImage({
  source,
  category,
  name,
  isSoldOut,
  style,
  resizeMode = 'contain',
  ...rest
}: ProductImageProps) {
  const initialSource = resolveImageSource(source, category, name);
  const fallbackSource = getCategoryDeviceImage(category, name);
  const [currentSource, setCurrentSource] = useState(initialSource);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setCurrentSource(resolveImageSource(source, category, name));
    setHasFailed(false);
  }, [source, category, name]);

  const handleError = () => {
    if (!hasFailed) {
      setHasFailed(true);
      setCurrentSource(fallbackSource);
    }
  };

  return (
    <Image
      {...rest}
      source={currentSource}
      style={[style, isSoldOut && { opacity: 0.52 }]}
      resizeMode={resizeMode}
      onError={handleError}
    />
  );
}

