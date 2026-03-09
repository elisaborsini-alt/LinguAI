import {useTheme} from '@state/hooks/useTheme';
import {iconSize, borderRadius} from '@ui/theme';
import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';


import {Text} from './Text';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
  small: iconSize.avatarSm,
  medium: iconSize.avatarMd,
  large: iconSize.avatarLg,
  xlarge: iconSize.avatarXl,
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name = '',
  size = 'medium',
  style,
}) => {
  const {colors} = useTheme();
  const dimension = sizeMap[size];

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: borderRadius.avatar,
    backgroundColor: colors.brand.primaryLight,
    overflow: 'hidden',
  };

  if (source) {
    return (
      <View style={[containerStyle, style]}>
        <FastImage
          source={{uri: source, priority: FastImage.priority.normal}}
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
        />
      </View>
    );
  }

  const getFontSize = (): number => {
    switch (size) {
      case 'small':
        return 12;
      case 'medium':
        return 16;
      case 'large':
        return 24;
      case 'xlarge':
        return 32;
      default:
        return 16;
    }
  };

  return (
    <View style={[containerStyle, styles.initialsContainer, style]}>
      <Text
        style={{
          fontSize: getFontSize(),
          color: colors.brand.primary,
          fontWeight: '600',
        }}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Avatar;
