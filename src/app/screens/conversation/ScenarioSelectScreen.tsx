import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {FadeInUp, FadeInRight} from 'react-native-reanimated';

import {useTheme} from '@state/hooks/useTheme';
import {Text, Button, Card} from '@ui/components';
import {spacing} from '@ui/theme';
import {api} from '@data/api/client';

interface Scenario {
  id: string;
  goal: string;
  difficulty: string;
  name: string;
  description: string;
  aiRole: string;
  userRole: string;
  context: string;
  keyVocabulary: string[];
  languages: string[];
}

interface ScenarioGroup {
  goal: string;
  label: string;
  scenarios: Scenario[];
  count: number;
}

interface ScenarioRecommendation {
  scenario: Scenario;
  reason: string;
  confidence: number;
}

const GOAL_ICONS: Record<string, string> = {
  professional: '💼',
  travel: '✈️',
  conversation: '💬',
  interviews: '🎯',
  customer_support: '🎧',
  social: '🎉',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  A1: '#4CAF50',
  A2: '#8BC34A',
  B1: '#FFC107',
  B2: '#FF9800',
  C1: '#F44336',
  C2: '#9C27B0',
};

export const ScenarioSelectScreen: React.FC = () => {
  const {colors} = useTheme();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [scenarioGroups, setScenarioGroups] = useState<ScenarioGroup[]>([]);
  const [recommendations, setRecommendations] = useState<ScenarioRecommendation[]>([]);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      interface GroupsResponse { data: { groups: ScenarioGroup[] } }
      interface RecsResponse { data: { recommendations: ScenarioRecommendation[] } }

      const [groupsData, recommendationsData] = await Promise.all([
        api.get<GroupsResponse>('/scenarios/by-goal'),
        api.get<RecsResponse>('/scenarios/recommended'),
      ]);

      setScenarioGroups(groupsData.data.groups || []);
      setRecommendations(recommendationsData.data.recommendations || []);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScenario = async (scenarioId: string) => {
    try {
      setStarting(scenarioId);
      const response = await api.post(`/scenarios/${scenarioId}/start`, {
        mode: 'call',
      });

      const data = response as { conversationId?: string; scenario?: unknown };
      if (data.conversationId) {
        (navigation.navigate as (screen: string, params: object) => void)('Call', {
          conversationId: data.conversationId,
          scenario: data.scenario,
        });
      }
    } catch (error) {
      console.error('Error starting scenario:', error);
    } finally {
      setStarting(null);
    }
  };

  const filteredGroups = scenarioGroups.map(group => ({
    ...group,
    scenarios: group.scenarios.filter(scenario =>
      scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scenario.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(group =>
    (!selectedGoal || group.goal === selectedGoal) && group.scenarios.length > 0
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text variant="bodyMedium" color="secondary" style={{marginTop: spacing.md}}>
            Loading scenarios...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background.primary}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium">Choose a Scenario</Text>
          <Text variant="bodyMedium" color="secondary">
            Practice real-world conversations
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.background.secondary,
                color: colors.text.primary,
              },
            ]}
            placeholder="Search scenarios..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Goal Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedGoal === null
                  ? colors.brand.primary
                  : colors.background.secondary,
              },
            ]}
            onPress={() => setSelectedGoal(null)}>
            <Text
              variant="labelMedium"
              style={{color: selectedGoal === null ? '#FFF' : colors.text.primary}}>
              All
            </Text>
          </TouchableOpacity>
          {scenarioGroups.map(group => (
            <TouchableOpacity
              key={group.goal}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedGoal === group.goal
                    ? colors.brand.primary
                    : colors.background.secondary,
                },
              ]}
              onPress={() => setSelectedGoal(group.goal)}>
              <Text style={{marginRight: spacing.xxs}}>
                {GOAL_ICONS[group.goal] || '📝'}
              </Text>
              <Text
                variant="labelMedium"
                style={{color: selectedGoal === group.goal ? '#FFF' : colors.text.primary}}>
                {group.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recommendations */}
        {!selectedGoal && !searchQuery && recommendations.length > 0 && (
          <Animated.View entering={FadeInUp.delay(100)} style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Recommended for You
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationsScroll}>
              {recommendations.map((rec, index) => (
                <Animated.View
                  key={rec.scenario.id}
                  entering={FadeInRight.delay(150 + index * 50)}>
                  <TouchableOpacity
                    style={[styles.recommendationCard, {backgroundColor: colors.brand.primaryLight}]}
                    onPress={() => handleStartScenario(rec.scenario.id)}
                    disabled={starting === rec.scenario.id}>
                    <View style={styles.recommendationHeader}>
                      <Text style={{fontSize: 24}}>{GOAL_ICONS[rec.scenario.goal] || '📝'}</Text>
                      <View style={[styles.difficultyBadge, {backgroundColor: DIFFICULTY_COLORS[rec.scenario.difficulty]}]}>
                        <Text variant="caption" style={{color: '#FFF'}}>
                          {rec.scenario.difficulty}
                        </Text>
                      </View>
                    </View>
                    <Text variant="titleSmall" style={{marginTop: spacing.sm}}>
                      {rec.scenario.name}
                    </Text>
                    <Text variant="caption" color="secondary" numberOfLines={2}>
                      {rec.scenario.description}
                    </Text>
                    <View style={styles.recommendationReason}>
                      <Text variant="caption" style={{color: colors.brand.primaryDark}}>
                        {rec.reason}
                      </Text>
                    </View>
                    {starting === rec.scenario.id && (
                      <ActivityIndicator size="small" color={colors.brand.primary} style={{marginTop: spacing.sm}} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Scenario Groups */}
        {filteredGroups.map((group, groupIndex) => (
          <Animated.View
            key={group.goal}
            entering={FadeInUp.delay(200 + groupIndex * 100)}
            style={styles.section}>
            <View style={styles.groupHeader}>
              <Text style={{fontSize: 20, marginRight: spacing.sm}}>
                {GOAL_ICONS[group.goal] || '📝'}
              </Text>
              <Text variant="titleMedium">{group.label}</Text>
              <Text variant="caption" color="secondary" style={{marginLeft: spacing.sm}}>
                ({group.count})
              </Text>
            </View>

            {group.scenarios.map((scenario, index) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onStart={() => handleStartScenario(scenario.id)}
                isStarting={starting === scenario.id}
                colors={colors}
                index={index}
              />
            ))}
          </Animated.View>
        ))}

        {/* Empty State */}
        {filteredGroups.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" color="secondary" align="center">
              No scenarios found
            </Text>
            <Button
              title="Clear Filters"
              onPress={() => {
                setSearchQuery('');
                setSelectedGoal(null);
              }}
              variant="secondary"
              style={{marginTop: spacing.md}}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

interface ScenarioCardProps {
  scenario: Scenario;
  onStart: () => void;
  isStarting: boolean;
  colors: any;
  index: number;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  onStart,
  isStarting,
  colors,
  index,
}) => (
  <Animated.View entering={FadeInUp.delay(50 * index)}>
    <Card variant="outlined" style={styles.scenarioCard}>
      <View style={styles.scenarioHeader}>
        <View style={{flex: 1}}>
          <Text variant="titleSmall">{scenario.name}</Text>
          <Text variant="caption" color="secondary" numberOfLines={2}>
            {scenario.description}
          </Text>
        </View>
        <View style={[styles.difficultyBadge, {backgroundColor: DIFFICULTY_COLORS[scenario.difficulty]}]}>
          <Text variant="caption" style={{color: '#FFF'}}>
            {scenario.difficulty}
          </Text>
        </View>
      </View>

      <View style={styles.scenarioRoles}>
        <View style={styles.roleItem}>
          <Text variant="caption" color="secondary">You:</Text>
          <Text variant="bodySmall" numberOfLines={1}>{scenario.userRole}</Text>
        </View>
        <View style={styles.roleItem}>
          <Text variant="caption" color="secondary">AI:</Text>
          <Text variant="bodySmall" numberOfLines={1}>{scenario.aiRole}</Text>
        </View>
      </View>

      {scenario.keyVocabulary.length > 0 && (
        <View style={styles.vocabularyContainer}>
          {scenario.keyVocabulary.slice(0, 4).map((word, idx) => (
            <View
              key={idx}
              style={[styles.vocabChip, {backgroundColor: colors.background.secondary}]}>
              <Text variant="caption">{word}</Text>
            </View>
          ))}
          {scenario.keyVocabulary.length > 4 && (
            <Text variant="caption" color="secondary">
              +{scenario.keyVocabulary.length - 4} more
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.startButton, {backgroundColor: colors.brand.primary}]}
        onPress={onStart}
        disabled={isStarting}>
        {isStarting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text variant="labelMedium" style={{color: '#FFF'}}>
            Start Practice
          </Text>
        )}
      </TouchableOpacity>
    </Card>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.md,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  filtersScroll: {
    maxHeight: 48,
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
  },
  recommendationsScroll: {
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.md,
  },
  recommendationCard: {
    width: 200,
    padding: spacing.md,
    borderRadius: 16,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recommendationReason: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  scenarioCard: {
    marginHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  scenarioRoles: {
    marginBottom: spacing.sm,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  vocabularyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  vocabChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
});

export default ScenarioSelectScreen;
