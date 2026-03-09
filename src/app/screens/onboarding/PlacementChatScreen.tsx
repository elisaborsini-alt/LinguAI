import type {OnboardingStackScreenProps} from '@appTypes/navigation';
import {placementApi} from '@data/api/endpoints/placement';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '@state/hooks/useTheme';
import {Text, TypingIndicator} from '@ui/components';
import {spacing, borderRadius} from '@ui/theme';
import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

// ============================================
// Types
// ============================================

type NavigationProp = OnboardingStackScreenProps<'PlacementChat'>['navigation'];
type RouteProp = OnboardingStackScreenProps<'PlacementChat'>['route'];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  failed?: boolean;
}

// ============================================
// PlacementChatScreen
// ============================================

export const PlacementChatScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const {nativeLanguage, targetLanguage, goal} = route.params;

  const flatListRef = useRef<FlatList>(null);
  const startedRef = useRef(false);

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);
  const [totalTurns, setTotalTurns] = useState(5);

  // Failed message for retry
  const [failedMessage, setFailedMessage] = useState<string | null>(null);

  // Progress bar animation
  const progressWidth = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  // Update progress bar when turn changes
  useEffect(() => {
    const target = totalTurns > 0 ? turn / totalTurns : 0;
    progressWidth.value = withTiming(target, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [turn, totalTurns, progressWidth]);

  // Scroll to bottom when messages change or loading changes
  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages, isLoading]);

  // ============================================
  // API: Start placement
  // ============================================

  const startPlacement = useCallback(async () => {
    if (startedRef.current) {return;}
    startedRef.current = true;

    setIsLoading(true);
    setError(null);

    try {
      const response = await placementApi.start({
        languageCode: targetLanguage.code,
        languageVariant: targetLanguage.variant,
      });

      const {message, turn: t, totalTurns: tt} = response.data;
      setTurn(t);
      setTotalTurns(tt);
      setMessages([{id: `ai-${t}`, role: 'assistant', content: message}]);
    } catch {
      setError('connection');
      startedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [targetLanguage]);

  useEffect(() => {
    startPlacement();
  }, [startPlacement]);

  // ============================================
  // API: Send response
  // ============================================

  const sendResponse = async (text: string) => {
    setIsLoading(true);
    setFailedMessage(null);

    // Add user message immediately
    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {id: userMsgId, role: 'user', content: text}]);

    try {
      const response = await placementApi.respond({message: text});
      const {message, turn: t, totalTurns: tt, isComplete: done} = response.data;

      setTurn(t);
      setTotalTurns(tt);

      // Add AI response
      setMessages(prev => [
        ...prev.map(m => (m.id === userMsgId ? {...m, failed: false} : m)),
        {id: `ai-${t}`, role: 'assistant', content: message},
      ]);

      if (done) {
        // Fill progress bar to 100%
        progressWidth.value = withTiming(1, {duration: 400});

        // Show completion overlay after user reads the closing message
        setTimeout(() => setIsComplete(true), 1500);
      }
    } catch {
      // Mark the message as failed for retry
      setMessages(prev =>
        prev.map(m => (m.id === userMsgId ? {...m, failed: true} : m)),
      );
      setFailedMessage(text);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Handlers
  // ============================================

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isLoading) {return;}
    setInputText('');
    sendResponse(text);
  };

  const handleRetry = () => {
    if (!failedMessage) {return;}
    // Remove the failed message before retrying
    setMessages(prev => prev.filter(m => !m.failed));
    sendResponse(failedMessage);
  };

  const handleComplete = () => {
    navigation.navigate('Preferences', {
      nativeLanguage,
      targetLanguage,
      goal,
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  // ============================================
  // Render helpers
  // ============================================

  const renderMessage = ({item}: {item: ChatMessage}) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        <View
          style={[
            styles.messageBubble,
            isUser
              ? {backgroundColor: colors.chat.userBubble}
              : {backgroundColor: colors.chat.aiBubble},
          ]}>
          <Text
            variant="bodyMedium"
            style={{color: isUser ? colors.chat.userText : colors.chat.aiText}}>
            {item.content}
          </Text>
        </View>

        {/* Failed message: retry chip */}
        {item.failed && (
          <TouchableOpacity onPress={handleRetry} style={styles.retryChip}>
            <Text variant="caption" style={{color: colors.semantic.error}}>
              Non inviato · Tocca per riprovare
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ============================================
  // Error state: connection failed on start
  // ============================================

  if (error === 'connection' && messages.length === 0) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.errorContainer}>
          <Text variant="headlineSmall" style={styles.errorEmoji}>
            😕
          </Text>
          <Text variant="titleMedium" style={styles.errorTitle}>
            Non riesco a connettermi
          </Text>
          <Text variant="bodyMedium" color="secondary" style={styles.errorSubtitle}>
            Controlla la connessione e riprova
          </Text>
          <TouchableOpacity
            onPress={startPlacement}
            style={[styles.retryButton, {backgroundColor: colors.brand.primary}]}>
            <Text variant="labelLarge" style={{color: colors.text.inverse}}>
              Riprova
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================
  // Main render
  // ============================================

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      {/* Header */}
      <View style={[styles.header, {borderBottomColor: colors.border.light}]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text variant="bodyLarge" color="link">
            Back
          </Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text variant="titleMedium">Facciamo due chiacchiere</Text>
          <Text variant="caption" color="secondary">
            Per conoscerti meglio
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Progress bar — 2px, subtle */}
      <View style={[styles.progressTrack, {backgroundColor: colors.brand.primary + '1A'}]}>
        <Animated.View
          style={[
            styles.progressFill,
            {backgroundColor: isComplete ? colors.semantic.success : colors.brand.primary},
            progressStyle,
          ]}
        />
      </View>

      {/* Messages + Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        />

        {/* Input — hidden when complete */}
        {!isComplete && (
          <View style={[styles.inputContainer, {borderTopColor: colors.border.light}]}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background.secondary,
                  color: colors.text.primary,
                },
              ]}
              placeholder="Scrivi qui..."
              placeholderTextColor={colors.text.tertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isLoading}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    inputText.trim() && !isLoading
                      ? colors.brand.primary
                      : colors.border.default,
                },
              ]}>
              <Text variant="labelMedium" style={{color: colors.text.inverse}}>
                {isLoading ? '...' : '→'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Completion overlay */}
      {isComplete && <CompletionOverlay onContinue={handleComplete} />}
    </SafeAreaView>
  );
};

// ============================================
// CompletionOverlay
// ============================================

interface CompletionOverlayProps {
  onContinue: () => void;
  personalHighlight?: string;
}

const CompletionOverlay: React.FC<CompletionOverlayProps> = ({
  onContinue,
  personalHighlight,
}) => {
  const {colors} = useTheme();

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[styles.overlay, {backgroundColor: colors.background.primary + 'F2'}]}>
      <View style={styles.overlayContent}>
        <Text variant="headlineSmall" style={styles.overlayTitle}>
          Bene, ti conosco meglio ora
        </Text>
        {personalHighlight ? (
          <Text
            variant="bodyLarge"
            color="secondary"
            style={styles.overlaySubtitle}>
            {personalHighlight}
          </Text>
        ) : (
          <Text
            variant="bodyLarge"
            color="secondary"
            style={styles.overlaySubtitle}>
            Ho capito come posso aiutarti al meglio.{'\n'}
            Personalizziamo la tua esperienza.
          </Text>
        )}
        <TouchableOpacity
          onPress={onContinue}
          style={[styles.continueButton, {backgroundColor: colors.brand.primary}]}
          activeOpacity={0.8}>
          <Text variant="labelLarge" style={{color: colors.text.inverse}}>
            Continua →
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 60,
  },

  // Progress bar
  progressTrack: {
    height: 2,
    width: '100%',
  },
  progressFill: {
    height: 2,
  },

  // Messages
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
  },
  messageRow: {
    marginBottom: spacing.sm,
    maxWidth: '80%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: spacing.messageBubblePadding,
    borderRadius: borderRadius.messageBubble,
  },

  // Retry chip
  retryChip: {
    marginTop: spacing.xxs,
    alignSelf: 'flex-end',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  errorTitle: {
    marginBottom: spacing.xs,
  },
  errorSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },

  // Completion overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenHorizontal,
  },
  overlayContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  overlayEmoji: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  overlayTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  overlaySubtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  continueButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
});

export default PlacementChatScreen;
