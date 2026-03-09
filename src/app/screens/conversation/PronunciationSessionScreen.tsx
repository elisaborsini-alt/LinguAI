import type {ConversationStackScreenProps} from '@appTypes/navigation';
import type {PronunciationPhrase, ReferenceAudio} from '@appTypes/pronunciation';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '@state/hooks/useTheme';
import {Text, Card, Button} from '@ui/components';
import {
  WaveformVisualizer,
  LiveWaveform,
  RecordingButton,
  PlayButton,
  SpeedButton,
} from '@ui/components/pronunciation';
import {spacing} from '@ui/theme';
import React, {useState, useCallback, useEffect} from 'react';
import {View, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';

type NavigationProp = ConversationStackScreenProps<'PronunciationSession'>['navigation'];
type RouteProp = ConversationStackScreenProps<'PronunciationSession'>['route'];

// Mock data - in production this would come from API
const MOCK_PHRASE: PronunciationPhrase = {
  id: '1',
  text: 'Hello, how are you?',
  phoneticIPA: 'həˈloʊ haʊ ɑːr juː',
  languageCode: 'en',
  languageVariant: 'US',
  difficulty: 'beginner',
  isCustom: false,
};

const MOCK_REFERENCE: ReferenceAudio = {
  id: 'ref1',
  phraseId: '1',
  audioUrl: 'https://example.com/audio/hello.mp3',
  durationMs: 1500,
  waveformData: Array.from({length: 50}, () => Math.random() * 0.8 + 0.1),
};

type SessionPhase = 'initial' | 'listened' | 'recording' | 'recorded' | 'comparing';

export const PronunciationSessionScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();

  const {phraseId} = route.params;

  // State
  const [phrase] = useState<PronunciationPhrase>(MOCK_PHRASE);
  const [reference] = useState<ReferenceAudio>(MOCK_REFERENCE);
  const [phase, setPhase] = useState<SessionPhase>('initial');
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [userWaveform, setUserWaveform] = useState<number[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlayingUser, setIsPlayingUser] = useState(false);

  // Mock audio level animation during recording
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.6 + 0.2);
        setRecordingDuration(prev => prev + 0.1);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  // Handle reference playback
  const handlePlayReference = useCallback(() => {
    setIsPlayingReference(true);
    // Mock playback duration
    setTimeout(() => {
      setIsPlayingReference(false);
      if (phase === 'initial') {
        setPhase('listened');
      }
    }, reference.durationMs / playbackSpeed);
  }, [phase, reference.durationMs, playbackSpeed]);

  const handlePauseReference = useCallback(() => {
    setIsPlayingReference(false);
  }, []);

  // Handle speed change
  const handleSpeedChange = useCallback(() => {
    setPlaybackSpeed(prev => {
      if (prev === 1) {return 0.75;}
      if (prev === 0.75) {return 0.5;}
      return 1;
    });
  }, []);

  // Handle recording
  const handleRecordPress = useCallback(() => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setPhase('recorded');
      // Generate mock waveform
      setUserWaveform(
        Array.from({length: 50}, () => Math.random() * 0.8 + 0.1),
      );
    } else {
      // Start recording
      setIsRecording(true);
      setPhase('recording');
      setRecordingDuration(0);
      setUserWaveform([]);
    }
  }, [isRecording]);

  // Handle user recording playback
  const handlePlayUser = useCallback(() => {
    setIsPlayingUser(true);
    setTimeout(() => {
      setIsPlayingUser(false);
    }, recordingDuration * 1000);
  }, [recordingDuration]);

  // Handle compare
  const handleCompare = useCallback(() => {
    // Navigate to results screen with analysis
    navigation.navigate('PronunciationResults', {
      sessionId: `session_${Date.now()}`,
      phraseId,
      recordingUri: 'mock://recording.wav',
    });
  }, [navigation, phraseId]);

  // Handle reset
  const handleReset = useCallback(() => {
    setPhase('listened');
    setRecordingDuration(0);
    setUserWaveform([]);
    setIsRecording(false);
    setIsPlayingUser(false);
  }, []);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text variant="titleMedium">Pronunciation Practice</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Phrase display */}
        <Card variant="elevated" style={styles.phraseCard}>
          <Text variant="headlineSmall" align="center" style={styles.phraseText}>
            {phrase.text}
          </Text>
          {phrase.phoneticIPA && (
            <Text
              variant="bodyMedium"
              color="secondary"
              align="center"
              style={styles.phonetic}>
              /{phrase.phoneticIPA}/
            </Text>
          )}
        </Card>

        {/* Reference audio section */}
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            Native Speaker
          </Text>
          <Card variant="outlined" style={styles.audioCard}>
            <WaveformVisualizer
              audioData={reference.waveformData || []}
              isPlaying={isPlayingReference}
              playbackPosition={isPlayingReference ? 0.5 : 0}
              height={50}
              color={colors.border.default}
              activeColor={colors.semantic.info}
            />
            <View style={styles.audioControls}>
              <SpeedButton speed={playbackSpeed} onPress={handleSpeedChange} />
              <PlayButton
                isPlaying={isPlayingReference}
                onPress={isPlayingReference ? handlePauseReference : handlePlayReference}
                size={56}
                color={colors.semantic.info}
              />
              <View style={styles.durationLabel}>
                <Text variant="caption" color="tertiary">
                  {(reference.durationMs / 1000).toFixed(1)}s
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* User recording section */}
        <View style={styles.section}>
          <Text variant="labelMedium" color="secondary" style={styles.sectionLabel}>
            Your Pronunciation
          </Text>
          <Card variant="outlined" style={styles.audioCard}>
            {phase === 'recording' ? (
              <LiveWaveform
                audioLevel={audioLevel}
                height={50}
                color={colors.semantic.error}
              />
            ) : userWaveform.length > 0 ? (
              <WaveformVisualizer
                audioData={userWaveform}
                isPlaying={isPlayingUser}
                playbackPosition={isPlayingUser ? 0.5 : 0}
                height={50}
                color={colors.border.default}
                activeColor={colors.brand.accent}
              />
            ) : (
              <View style={[styles.emptyWaveform, {borderColor: colors.border.light}]}>
                <Text variant="bodySmall" color="tertiary">
                  {phase === 'initial'
                    ? 'Listen to the native speaker first'
                    : 'Tap the button below to record'}
                </Text>
              </View>
            )}

            {/* Playback controls for recorded audio */}
            {phase === 'recorded' && (
              <View style={styles.audioControls}>
                <View style={styles.durationLabel} />
                <PlayButton
                  isPlaying={isPlayingUser}
                  onPress={handlePlayUser}
                  size={48}
                  color={colors.brand.accent}
                />
                <View style={styles.durationLabel}>
                  <Text variant="caption" color="tertiary">
                    {recordingDuration.toFixed(1)}s
                  </Text>
                </View>
              </View>
            )}
          </Card>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {phase === 'recorded' && (
          <View style={styles.actionButtons}>
            <Button
              title="Re-record"
              variant="outline"
              onPress={handleReset}
              style={styles.actionButton}
            />
            <Button
              title="Compare"
              variant="primary"
              onPress={handleCompare}
              style={styles.actionButton}
            />
          </View>
        )}

        {(phase === 'initial' || phase === 'listened' || phase === 'recording') && (
          <View style={styles.recordingSection}>
            <RecordingButton
              isRecording={isRecording}
              onPress={handleRecordPress}
              size={80}
              disabled={phase === 'initial'}
              recordingDuration={Math.floor(recordingDuration)}
              maxDuration={10}
            />
            {phase === 'initial' && (
              <Text variant="bodySmall" color="secondary" style={styles.hint}>
                Listen to the native speaker first
              </Text>
            )}
            {phase === 'listened' && !isRecording && (
              <Text variant="bodySmall" color="secondary" style={styles.hint}>
                Tap to start recording
              </Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
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
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  backIcon: {
    fontSize: 24,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
  },
  phraseCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  phraseText: {
    marginBottom: spacing.xs,
  },
  phonetic: {
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  audioCard: {
    padding: spacing.md,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  durationLabel: {
    width: 50,
    alignItems: 'center',
  },
  emptyWaveform: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  bottomControls: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  recordingSection: {
    alignItems: 'center',
  },
  hint: {
    marginTop: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

export default PronunciationSessionScreen;
