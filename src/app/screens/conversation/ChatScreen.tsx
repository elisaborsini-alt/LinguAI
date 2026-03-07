import React, {useState, useRef, useEffect} from 'react';
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
import {useNavigation, useRoute} from '@react-navigation/native';

import {useTheme} from '@state/hooks/useTheme';
import {useConversation} from '@state/hooks/useConversation';
import {Text, Card, IconButton} from '@ui/components';
import {spacing, borderRadius} from '@ui/theme';
import type {ConversationStackScreenProps} from '@appTypes/navigation';
import type {Message} from '@appTypes/domain';

type NavigationProp = ConversationStackScreenProps<'Chat'>['navigation'];
type RouteProp = ConversationStackScreenProps<'Chat'>['route'];

export const ChatScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const flatListRef = useRef<FlatList>(null);

  const {scenario} = route.params || {};
  const {
    currentConversation,
    messages,
    isLoading,
    startConversation,
    sendMessage,
    endConversation,
  } = useConversation();

  const [inputText, setInputText] = useState('');

  // Start conversation on mount
  useEffect(() => {
    if (!currentConversation) {
      startConversation('chat', 'conversation', scenario);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const text = inputText.trim();
    setInputText('');

    try {
      await sendMessage(text);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleEndConversation = async () => {
    const report = await endConversation();
    if (report && currentConversation) {
      navigation.replace('SessionSummary', {
        conversationId: currentConversation.id,
        report,
      });
    } else {
      navigation.goBack();
    }
  };

  const renderMessage = ({item}: {item: Message}) => {
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

        {/* Show corrections if any */}
        {item.corrections && item.corrections.length > 0 && (
          <View
            style={[
              styles.correctionBubble,
              {backgroundColor: colors.chat.correctionBubble},
            ]}>
            <Text variant="caption" style={{color: colors.chat.correctionText}}>
              💡 Correction:
            </Text>
            {item.corrections.map((correction, index) => (
              <Text
                key={index}
                variant="bodySmall"
                style={{color: colors.chat.correctionText}}>
                "{correction.original}" → "{correction.correction}"
                {correction.explanation && ` (${correction.explanation})`}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      {/* Header */}
      <View style={[styles.header, {borderBottomColor: colors.border.light}]}>
        <TouchableOpacity onPress={handleEndConversation} style={styles.backButton}>
          <Text variant="bodyLarge" color="link">
            End
          </Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text variant="titleMedium">
            {scenario?.description || 'Conversation'}
          </Text>
          <Text variant="caption" color="secondary">
            AI Language Tutor
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <View style={[styles.inputContainer, {borderTopColor: colors.border.light}]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background.secondary,
                color: colors.text.primary,
              },
            ]}
            placeholder="Type your message..."
            placeholderTextColor={colors.text.tertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!isLoading}
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
            <Text
              variant="labelMedium"
              style={{color: colors.text.inverse}}>
              {isLoading ? '...' : '→'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  correctionBubble: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xxs,
  },
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
    borderRadius: borderRadius.input,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatScreen;
