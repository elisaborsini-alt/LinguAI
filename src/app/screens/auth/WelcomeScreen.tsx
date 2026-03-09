import type {AuthStackScreenProps} from '@appTypes/navigation';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@state/hooks/useTheme';
import {Text, Button} from '@ui/components';
import {spacing} from '@ui/theme';
import React from 'react';
import {View, StyleSheet, SafeAreaView, StatusBar} from 'react-native';

type NavigationProp = AuthStackScreenProps<'Welcome'>['navigation'];

export const WelcomeScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {/* Logo/Brand Area */}
        <View style={styles.brandSection}>
          <View style={[styles.logoPlaceholder, {backgroundColor: colors.brand.primary}]}>
            <Text variant="displaySmall" style={{color: colors.text.inverse}}>
              L
            </Text>
          </View>
          <Text variant="headlineLarge" align="center" style={styles.title}>
            LinguaAI
          </Text>
          <Text variant="bodyLarge" color="secondary" align="center" style={styles.subtitle}>
            Pratica le lingue parlando, al tuo ritmo
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            title="Conversazioni naturali"
            description="Parli come faresti con qualcuno che ti ascolta davvero"
            color={colors.brand.primary}
          />
          <FeatureItem
            title="Si adatta a te"
            description="Ricorda il tuo percorso e si adatta al tuo ritmo"
            color={colors.brand.secondary}
          />
          <FeatureItem
            title="Pratica vocale"
            description="Conversazioni vocali in tempo reale, senza pressione"
            color={colors.brand.accent}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Iniziamo"
          onPress={() => navigation.navigate('Register')}
          fullWidth
          size="large"
        />
        <Button
          title="Ho già un account"
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
          fullWidth
          style={styles.loginButton}
        />
      </View>
    </SafeAreaView>
  );
};

interface FeatureItemProps {
  title: string;
  description: string;
  color: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({title, description, color}) => {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureDot, {backgroundColor: color}]} />
      <View style={styles.featureText}>
        <Text variant="titleSmall">{title}</Text>
        <Text variant="bodySmall" color="secondary">
          {description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    maxWidth: 280,
  },
  features: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  featureText: {
    flex: 1,
  },
  actions: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
});

export default WelcomeScreen;
