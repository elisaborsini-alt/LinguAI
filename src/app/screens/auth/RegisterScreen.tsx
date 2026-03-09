import type {AuthStackScreenProps} from '@appTypes/navigation';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '@state/hooks/useAuth';
import {useTheme} from '@state/hooks/useTheme';
import {Text, Button, Input} from '@ui/components';
import {spacing} from '@ui/theme';
import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

type NavigationProp = AuthStackScreenProps<'Register'>['navigation'];

export const RegisterScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {register, isLoading} = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {return;}

    try {
      await register({email, password, name: name.trim()});
    } catch (error: any) {
      setErrors({
        email: error.message || 'Registration failed. Please try again.',
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text variant="bodyLarge" color="link">
                Back
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text variant="headlineLarge" style={styles.title}>
              Create account
            </Text>
            <Text variant="bodyLarge" color="secondary" style={styles.subtitle}>
              Start your language learning journey today
            </Text>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Name"
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                error={errors.name}
              />

              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
              />

              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
                error={errors.password}
                hint="Must be at least 8 characters"
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="password-new"
                error={errors.confirmPassword}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              size="large"
            />

            <Text variant="caption" color="tertiary" align="center" style={styles.terms}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>

            <View style={styles.loginLink}>
              <Text variant="bodyMedium" color="secondary">
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text variant="bodyMedium" color="link">
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  actions: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  terms: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
});

export default RegisterScreen;
