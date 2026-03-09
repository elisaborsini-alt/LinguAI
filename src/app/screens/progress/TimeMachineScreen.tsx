import type {ProgressStackScreenProps} from '@appTypes/navigation';
import type {TimeMachineResult} from '@data/api/endpoints/progress';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@state/hooks/useTheme';
import {Text} from '@ui/components';
import {spacing, borderRadius} from '@ui/theme';
import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {AudioContext} from 'react-native-audio-api';
import Config from 'react-native-config';
import Animated, {FadeInUp} from 'react-native-reanimated';

const API_BASE_URL = Config.API_BASE_URL || 'http://localhost:3000/api';

// ============================================
// Types
// ============================================

type Props = ProgressStackScreenProps<'TimeMachine'>;

interface SnapshotCardProps {
  label: string;
  cefrLevel: string;
  capturedAt: string;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

// ============================================
// SnapshotCard
// ============================================

const SnapshotCard: React.FC<SnapshotCardProps> = ({
  label,
  cefrLevel,
  capturedAt,
  isPlaying,
  onPlay,
  onStop,
  colors,
}) => {
  const date = new Date(capturedAt);
  const formattedDate = date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.card, {backgroundColor: colors.background.secondary}]}>
      <View style={styles.cardHeader}>
        <Text variant="titleMedium">{label}</Text>
        <View style={[styles.levelBadge, {backgroundColor: colors.background.tertiary}]}>
          <Text variant="labelSmall" color="secondary">
            {cefrLevel}
          </Text>
        </View>
      </View>
      <Text variant="bodySmall" color="secondary" style={styles.cardDate}>
        {formattedDate}
      </Text>
      <TouchableOpacity
        onPress={isPlaying ? onStop : onPlay}
        style={[styles.playButton, {backgroundColor: colors.brand.primary}]}
        activeOpacity={0.8}>
        <Text variant="labelLarge" style={styles.playButtonText}>
          {isPlaying ? 'Stop' : 'Ascolta'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================
// TimeMachineScreen
// ============================================

export const TimeMachineScreen: React.FC<Props> = ({route}) => {
  const {colors} = useTheme();
  const navigation = useNavigation();

  const [playingSlot, setPlayingSlot] = useState<'early' | 'recent' | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<any>(null);

  // Data is passed via params or fetched — for now read from route params
  // The dashboard will pass the data when navigating
  const data = (route.params as {data?: TimeMachineResult} | undefined)?.data;

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceRef.current = null;
    }
    setPlayingSlot(null);
  }, []);

  const playAudio = useCallback(
    async (audioUrl: string, slot: 'early' | 'recent') => {
      // Stop any current playback first
      stopPlayback();

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        const ctx = audioContextRef.current;
        const fullUrl = `${API_BASE_URL.replace('/api', '')}${audioUrl}`;

        const audioBuffer = await ctx.decodeAudioDataSource(fullUrl);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        sourceRef.current = source;
        setPlayingSlot(slot);

        source.start();

        // Reset state when playback ends
        setTimeout(() => {
          setPlayingSlot(current => (current === slot ? null : current));
        }, (audioBuffer.duration || 20) * 1000);
      } catch {
        setPlayingSlot(null);
      }
    },
    [stopPlayback],
  );

  if (!data) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.centered}>
          <Text variant="bodyLarge" color="secondary">
            Nessun confronto disponibile
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(400)}>
          <View style={styles.header}>
            <Text variant="headlineMedium">Il tuo percorso</Text>
          </View>
        </Animated.View>

        {/* Early snapshot */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <SnapshotCard
            label={data.early.label}
            cefrLevel={data.early.cefrLevel}
            capturedAt={data.early.capturedAt}
            isPlaying={playingSlot === 'early'}
            onPlay={() => playAudio(data.early.audioUrl, 'early')}
            onStop={stopPlayback}
            colors={colors}
          />
        </Animated.View>

        {/* Recent snapshot */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <SnapshotCard
            label={data.recent.label}
            cefrLevel={data.recent.cefrLevel}
            capturedAt={data.recent.capturedAt}
            isPlaying={playingSlot === 'recent'}
            onPlay={() => playAudio(data.recent.audioUrl, 'recent')}
            onStop={stopPlayback}
            colors={colors}
          />
        </Animated.View>

        {/* Reflective message */}
        <Animated.View entering={FadeInUp.delay(600).duration(400)}>
          <Text variant="bodyLarge" color="secondary" style={styles.message}>
            {data.message}
          </Text>
        </Animated.View>

        {/* Close button */}
        <Animated.View entering={FadeInUp.delay(800).duration(400)}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.closeButton, {borderColor: colors.border.light}]}
            activeOpacity={0.8}>
            <Text variant="labelLarge" color="secondary">
              Chiudi
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },

  // Snapshot card
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  cardDate: {
    marginBottom: spacing.md,
  },
  playButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  playButtonText: {
    color: '#FFFFFF',
  },

  // Message
  message: {
    textAlign: 'center',
    lineHeight: 24,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  // Close
  closeButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
});

export default TimeMachineScreen;
