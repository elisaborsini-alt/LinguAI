import type {SettingsStackScreenProps} from '@appTypes/navigation';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@state/hooks/useTheme';
import {useAuthStore} from '@state/stores/authStore';
import {Text, Button, Input, Avatar, Card} from '@ui/components';
import {spacing} from '@ui/theme';
import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

type NavigationProp = SettingsStackScreenProps<'Profile'>['navigation'];

export const ProfileScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {user: profile, updateUser} = useAuthStore();

  const [name, setName] = useState(profile?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      // Update locally
      updateUser({name: name.trim()});

      // TODO: Call API to update profile
      // await userApi.updateProfile({ name: name.trim() });

      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(profile?.name || '');
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      {/* Header */}
      <View style={[styles.header, {borderBottomColor: colors.border.light}]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text variant="bodyLarge" color="link">
            Back
          </Text>
        </TouchableOpacity>
        <Text variant="titleMedium">Profile</Text>
        <View style={styles.headerRight}>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text variant="bodyLarge" color="link">
                Edit
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleCancel}>
              <Text variant="bodyLarge" color="secondary">
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Avatar name={name || 'U'} size="xlarge" />
          {isEditing && (
            <TouchableOpacity style={styles.changePhotoButton}>
              <Text variant="bodyMedium" color="link">
                Change Photo
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            PERSONAL INFO
          </Text>
          <Card variant="outlined" padding="md">
            {isEditing ? (
              <Input
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                autoCapitalize="words"
              />
            ) : (
              <View style={styles.infoRow}>
                <Text variant="bodySmall" color="secondary">
                  Name
                </Text>
                <Text variant="bodyLarge">{profile?.name || 'Not set'}</Text>
              </View>
            )}

            <View style={[styles.infoRow, {marginTop: spacing.md}]}>
              <Text variant="bodySmall" color="secondary">
                Email
              </Text>
              <Text variant="bodyLarge">{profile?.email}</Text>
            </View>
          </Card>
        </View>

        {/* Learning Stats */}
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            LEARNING
          </Text>
          <Card variant="outlined" padding="md">
            <View style={styles.infoRow}>
              <Text variant="bodySmall" color="secondary">
                Target Language
              </Text>
              <Text variant="bodyLarge">
                {getLanguageName(profile?.targetLanguage?.code)} (
                {profile?.targetLanguage?.variant})
              </Text>
            </View>

            <View style={[styles.infoRow, {marginTop: spacing.md}]}>
              <Text variant="bodySmall" color="secondary">
                Native Language
              </Text>
              <Text variant="bodyLarge">
                {getLanguageName(profile?.nativeLanguage)}
              </Text>
            </View>

            <View style={[styles.infoRow, {marginTop: spacing.md}]}>
              <Text variant="bodySmall" color="secondary">
                Current Goal
              </Text>
              <Text variant="bodyLarge">{formatGoal(profile?.currentGoal)}</Text>
            </View>

            <View style={[styles.infoRow, {marginTop: spacing.md}]}>
              <Text variant="bodySmall" color="secondary">
                Overall Level
              </Text>
              <View
                style={[
                  styles.levelBadge,
                  {
                    backgroundColor:
                      colors.levels[profile?.estimatedLevels?.overall || 'A1'],
                  },
                ]}>
                <Text variant="labelMedium" style={{color: '#FFF'}}>
                  {profile?.estimatedLevels?.overall || 'A1'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            ACCOUNT
          </Text>
          <Card variant="outlined" padding="md">
            <View style={styles.infoRow}>
              <Text variant="bodySmall" color="secondary">
                Member Since
              </Text>
              <Text variant="bodyLarge">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </Card>
        </View>

        {/* Save Button */}
        {isEditing && (
          <View style={styles.saveButtonContainer}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving || name === profile?.name}
              fullWidth
              size="large"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getLanguageName = (code?: string): string => {
  const names: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    pt: 'Portuguese',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ar: 'Arabic',
  };
  return names[code || ''] || 'Not set';
};

const formatGoal = (goal?: string): string => {
  if (!goal) {return 'Not set';}
  return goal.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 60,
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  changePhotoButton: {
    marginTop: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  infoRow: {},
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: spacing.xxs,
  },
  saveButtonContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
});

export default ProfileScreen;
