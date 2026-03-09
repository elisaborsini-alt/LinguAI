import type {ConversationStackScreenProps} from '@appTypes/navigation';
import {useEmotionAwareness} from '@core/emotion';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useConversation} from '@state/hooks/useConversation';
import {useTheme} from '@state/hooks/useTheme';
import {useVoice} from '@state/hooks/useVoice';
import {useProgressStore} from '@state/stores/progressStore';
import {Text, Card, Avatar} from '@ui/components';
import {
  EmotionIndicator,
  EmotionFeedbackBanner,
  EmotionHistory,
} from '@ui/components/EmotionIndicator';
import {spacing} from '@ui/theme';
import React, {useState, useEffect, useCallback} from 'react';
import {View, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

type NavigationProp = ConversationStackScreenProps<'Call'>['navigation'];
type RouteProp = ConversationStackScreenProps<'Call'>['route'];

export const CallScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();

  const {scenario} = route.params || {};
  const {
    voiceState,
    isCallActive,
    isMuted,
    currentTranscript,
    interimTranscript,
    isSpeaking,
    startListening,
    stopListening,
    startCall,
    endCall,
    toggleMute,
    permissionGranted,
    requestPermission,
  } = useVoice();

  const [permissionDenied, setPermissionDenied] = useState(false);

  const {startConversation, sendMessage, endConversation, messages} =
    useConversation();

  const {addEmotionSession, updateEmotionSummary} = useProgressStore();

  // Emotion awareness hook
  const {
    currentEmotion,
    confidence,
    emotionHistory,
    feedback,
    isAnalyzing,
    startAnalysis,
    stopAnalysis,
    updateFromTranscript,
    getEmotionSignals,
    reset: resetEmotion,
  } = useEmotionAwareness();

  const [callDuration, setCallDuration] = useState(0);
  const [showEmotionFeedback, setShowEmotionFeedback] = useState(true);

  // Animation for speaking indicator
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isSpeaking || voiceState === 'listening') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, {duration: 500}),
          withTiming(1, {duration: 500}),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, {duration: 200});
    }
  }, [isSpeaking, voiceState]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulseScale.value}],
  }));

  // Request permission and start call on mount
  useEffect(() => {
    const init = async () => {
      const granted = permissionGranted || (await requestPermission());
      if (!granted) {
        setPermissionDenied(true);
        return;
      }

      startCall();
      startConversation('call', 'conversation', scenario);
      startAnalysis();
    };

    init();

    return () => {
      endCall();
      stopAnalysis();
      resetEmotion();
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (!isCallActive) {return;}

    const interval = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallActive]);

  // Update emotion analysis with transcript changes
  useEffect(() => {
    if (currentTranscript || interimTranscript) {
      updateFromTranscript(currentTranscript || interimTranscript);
    }
  }, [currentTranscript, interimTranscript, updateFromTranscript]);

  // Process transcript when user stops speaking
  useEffect(() => {
    if (currentTranscript && voiceState === 'idle' && !isSpeaking) {
      handleUserMessage(currentTranscript);
    }
  }, [currentTranscript, voiceState, isSpeaking]);

  const handleUserMessage = useCallback(async (text: string) => {
    try {
      // Get emotion signals to send with the message
      const emotionSignals = getEmotionSignals(messages.length);

      // Send message with emotion signals for adaptive response
      await sendMessage(text, {
        emotionSignals,
        currentEmotion,
        emotionConfidence: confidence,
      });
      // The AI response will be spoken via TTS
      // In a real implementation, get the response text and speak it
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  }, [getEmotionSignals, messages.length, currentEmotion, confidence, sendMessage]);

  // Handle dismissing emotion feedback banner
  const handleDismissFeedback = useCallback(() => {
    setShowEmotionFeedback(false);
    // Re-show after 30 seconds if emotion changes
    setTimeout(() => setShowEmotionFeedback(true), 30000);
  }, []);

  const handleEndCall = async () => {
    // Save emotion session data before ending
    if (emotionHistory.length > 0) {
      // Calculate emotion distribution from history
      const emotionCounts: Record<string, number> = {};
      emotionHistory.forEach(({emotion}) => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });

      const total = emotionHistory.length;
      const emotionDistribution = Object.entries(emotionCounts).map(([emotion, count]) => ({
        emotion: emotion as any,
        percentage: (count / total) * 100,
      }));

      // Find dominant emotion
      const dominantEmotion = Object.entries(emotionCounts).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0] as any || 'neutral';

      // Calculate engagement level
      const positiveEmotions = ['confident', 'enthusiastic'];
      const negativeEmotions = ['frustrated', 'anxious', 'bored', 'tired'];
      const positiveCount = emotionHistory.filter((e) =>
        positiveEmotions.includes(e.emotion),
      ).length;
      const negativeCount = emotionHistory.filter((e) =>
        negativeEmotions.includes(e.emotion),
      ).length;

      let engagementLevel: 'high' | 'medium' | 'low' = 'medium';
      if (positiveCount > negativeCount * 2) {
        engagementLevel = 'high';
      } else if (negativeCount > positiveCount * 2) {
        engagementLevel = 'low';
      }

      addEmotionSession({
        sessionId: `session_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        dominantEmotion,
        engagementLevel,
        emotionDistribution,
        duration: callDuration,
      });

      updateEmotionSummary();
    }

    endCall();
    const report = await endConversation();
    if (report) {
      navigation.replace('SessionSummary', {
        conversationId: `session_${Date.now()}`,
        report,
      });
    } else {
      navigation.goBack();
    }
  };

  const handleToggleListen = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else if (!isSpeaking) {
      startListening();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateText = (): string => {
    switch (voiceState) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'AI is speaking...';
      default:
        return 'Tap the mic to speak';
    }
  };

  // Permission denied — warm, non-judgmental message
  if (permissionDenied) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>🎙️</Text>
          <Text variant="headlineSmall" style={styles.permissionTitle}>
            Microphone access needed
          </Text>
          <Text variant="bodyLarge" color="secondary" style={styles.permissionText}>
            To practice speaking together, LinguAI needs access to your microphone.
            You can enable it in your device settings whenever you&apos;re ready.
          </Text>
          <View style={styles.permissionButtons}>
            <TouchableOpacity
              onPress={async () => {
                const granted = await requestPermission();
                if (granted) {setPermissionDenied(false);}
              }}
              style={[styles.permissionButton, {backgroundColor: colors.brand.primary}]}>
              <Text variant="labelLarge" style={{color: '#fff'}}>
                Try again
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.permissionButton, {backgroundColor: colors.background.secondary}]}>
              <Text variant="labelLarge" color="secondary">
                Go back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      {/* Emotion Feedback Banner */}
      {showEmotionFeedback && (
        <EmotionFeedbackBanner
          feedback={feedback}
          onDismiss={handleDismissFeedback}
        />
      )}

      {/* Header with duration and emotion indicator */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="bodyMedium" color="secondary">
            {formatDuration(callDuration)}
          </Text>
        </View>
        {isAnalyzing && (
          <EmotionIndicator
            emotion={currentEmotion}
            confidence={confidence}
            size="small"
            showLabel={false}
          />
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* AI Avatar */}
        <Animated.View style={[styles.avatarContainer, pulseStyle]}>
          <View
            style={[
              styles.avatarRing,
              {
                borderColor:
                  isSpeaking || voiceState === 'listening'
                    ? colors.brand.primary
                    : colors.border.default,
              },
            ]}>
            <Avatar name="AI" size="xlarge" />
          </View>
        </Animated.View>

        <Text variant="headlineSmall" style={styles.tutorName}>
          AI Language Tutor
        </Text>
        <Text variant="bodyMedium" color="secondary">
          {scenario?.description || 'Free Conversation'}
        </Text>

        {/* Current Emotion Display */}
        {isAnalyzing && currentEmotion !== 'neutral' && (
          <View style={styles.emotionContainer}>
            <EmotionIndicator
              emotion={currentEmotion}
              confidence={confidence}
              size="medium"
              showLabel={true}
              animated={true}
            />
          </View>
        )}

        {/* Status */}
        <View style={styles.statusContainer}>
          <Text variant="bodyLarge" color={voiceState === 'listening' ? 'success' : 'secondary'}>
            {getStateText()}
          </Text>
        </View>

        {/* Transcript Display */}
        {(currentTranscript || interimTranscript) && (
          <Card variant="outlined" style={styles.transcriptCard}>
            <Text variant="caption" color="secondary">
              You said:
            </Text>
            <Text variant="bodyMedium">
              {currentTranscript || interimTranscript}
            </Text>
          </Card>
        )}
      </View>

      {/* Emotion History Track */}
      {emotionHistory.length > 0 && (
        <EmotionHistory history={emotionHistory} maxItems={8} />
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {/* Mute Button */}
        <TouchableOpacity
          onPress={toggleMute}
          style={[
            styles.controlButton,
            {backgroundColor: isMuted ? colors.semantic.error : colors.background.secondary},
          ]}>
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
          <Text variant="caption" color={isMuted ? 'error' : 'secondary'}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>

        {/* Main Listen Button */}
        <TouchableOpacity
          onPress={handleToggleListen}
          disabled={isSpeaking}
          style={[
            styles.mainButton,
            {
              backgroundColor:
                voiceState === 'listening'
                  ? colors.semantic.success
                  : colors.brand.primary,
              opacity: isSpeaking ? 0.5 : 1,
            },
          ]}>
          <Text style={styles.mainButtonIcon}>
            {voiceState === 'listening' ? '⏹️' : '🎙️'}
          </Text>
        </TouchableOpacity>

        {/* End Call Button */}
        <TouchableOpacity
          onPress={handleEndCall}
          style={[styles.controlButton, {backgroundColor: colors.semantic.errorLight}]}>
          <Text style={styles.controlIcon}>📞</Text>
          <Text variant="caption" color="error">
            End
          </Text>
        </TouchableOpacity>
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenHorizontal,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  avatarContainer: {
    marginBottom: spacing.lg,
  },
  avatarRing: {
    padding: 8,
    borderRadius: 100,
    borderWidth: 3,
  },
  tutorName: {
    marginBottom: spacing.xxs,
  },
  emotionContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statusContainer: {
    marginTop: spacing.xl,
    height: 40,
    justifyContent: 'center',
  },
  transcriptCard: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.screenHorizontal,
    right: spacing.screenHorizontal,
    padding: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonIcon: {
    fontSize: 32,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal * 2,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  permissionText: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  permissionButtons: {
    gap: spacing.md,
    width: '100%',
  },
  permissionButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
});

export default CallScreen;
