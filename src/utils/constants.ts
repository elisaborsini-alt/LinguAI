import type {LearningGoal, CEFRLevel, GoalConfig} from '@appTypes/domain';

// NOTE: Language configurations are now served by GET /api/languages
// and consumed via the useLanguages() hook. See backend/src/config/languages.ts.

// ============================================
// Goal Configurations
// ============================================

export const GOALS: Record<LearningGoal, GoalConfig> = {
  professional: {
    id: 'professional',
    name: 'Professional / Work',
    description: 'Business meetings, emails, presentations',
    icon: '💼',
    scenarios: [
      {
        id: 'business_meeting',
        name: 'Business Meeting',
        description: 'Discuss projects and collaborate with colleagues',
        aiRole: 'Colleague or Manager',
        userRole: 'Team Member',
        context: 'Corporate office setting',
        difficulty: 'B1',
      },
      {
        id: 'presentation',
        name: 'Giving a Presentation',
        description: 'Present your project to stakeholders',
        aiRole: 'Audience Member',
        userRole: 'Presenter',
        context: 'Conference room',
        difficulty: 'B2',
      },
      {
        id: 'email_discussion',
        name: 'Discussing an Email',
        description: 'Follow up on a business email',
        aiRole: 'Business Partner',
        userRole: 'Professional',
        context: 'Business correspondence',
        difficulty: 'B1',
      },
    ],
    toneGuidelines: 'Professional, formal, business-appropriate vocabulary',
    vocabularyFocus: ['business', 'meetings', 'projects', 'deadlines', 'reports'],
  },
  travel: {
    id: 'travel',
    name: 'Travel',
    description: 'Hotels, restaurants, directions, sightseeing',
    icon: '✈️',
    scenarios: [
      {
        id: 'hotel_checkin',
        name: 'Hotel Check-in',
        description: 'Check into a hotel and ask about amenities',
        aiRole: 'Hotel Receptionist',
        userRole: 'Guest',
        context: 'Hotel lobby',
        difficulty: 'A2',
      },
      {
        id: 'restaurant',
        name: 'At a Restaurant',
        description: 'Order food and ask for recommendations',
        aiRole: 'Waiter',
        userRole: 'Customer',
        context: 'Restaurant',
        difficulty: 'A2',
      },
      {
        id: 'asking_directions',
        name: 'Asking for Directions',
        description: 'Find your way around a new city',
        aiRole: 'Local Resident',
        userRole: 'Tourist',
        context: 'Street in a foreign city',
        difficulty: 'A2',
      },
    ],
    toneGuidelines: 'Friendly, practical, common travel phrases',
    vocabularyFocus: ['directions', 'reservations', 'ordering', 'transportation'],
  },
  conversation: {
    id: 'conversation',
    name: 'General Conversation',
    description: 'Everyday topics, fluency, confidence',
    icon: '💬',
    scenarios: [
      {
        id: 'free_conversation',
        name: 'Free Conversation',
        description: 'Talk about anything you want',
        aiRole: 'Friendly Conversation Partner',
        userRole: 'Conversation Partner',
        context: 'Casual setting',
        difficulty: 'A2',
      },
      {
        id: 'hobbies',
        name: 'Discussing Hobbies',
        description: 'Share and learn about hobbies',
        aiRole: 'New Friend',
        userRole: 'Yourself',
        context: 'Cafe or social gathering',
        difficulty: 'A2',
      },
    ],
    toneGuidelines: 'Casual, friendly, natural conversation flow',
    vocabularyFocus: ['daily life', 'opinions', 'experiences', 'feelings'],
  },
  interviews: {
    id: 'interviews',
    name: 'Job Interviews',
    description: 'Interview prep, professional responses',
    icon: '🎯',
    scenarios: [
      {
        id: 'job_interview',
        name: 'Job Interview',
        description: 'Practice answering interview questions',
        aiRole: 'Interviewer',
        userRole: 'Job Candidate',
        context: 'Interview room',
        difficulty: 'B1',
      },
      {
        id: 'salary_negotiation',
        name: 'Salary Negotiation',
        description: 'Negotiate job offer terms',
        aiRole: 'HR Manager',
        userRole: 'Job Candidate',
        context: 'Negotiation meeting',
        difficulty: 'B2',
      },
    ],
    toneGuidelines: 'Professional, confident, structured responses',
    vocabularyFocus: ['skills', 'experience', 'achievements', 'goals'],
  },
  customer_support: {
    id: 'customer_support',
    name: 'Customer Support / Sales',
    description: 'Client calls, support scenarios, sales',
    icon: '🎧',
    scenarios: [
      {
        id: 'customer_call',
        name: 'Customer Support Call',
        description: 'Handle customer inquiries and complaints',
        aiRole: 'Customer',
        userRole: 'Support Agent',
        context: 'Phone support',
        difficulty: 'B1',
      },
      {
        id: 'sales_pitch',
        name: 'Sales Pitch',
        description: 'Present a product to a potential client',
        aiRole: 'Potential Client',
        userRole: 'Sales Representative',
        context: 'Sales meeting',
        difficulty: 'B2',
      },
    ],
    toneGuidelines: 'Helpful, patient, solution-oriented',
    vocabularyFocus: ['products', 'solutions', 'problems', 'assistance'],
  },
  social: {
    id: 'social',
    name: 'Social / Dating',
    description: 'Casual conversations, making friends',
    icon: '🤝',
    scenarios: [
      {
        id: 'meeting_people',
        name: 'Meeting New People',
        description: 'Introduce yourself at a social event',
        aiRole: 'New Acquaintance',
        userRole: 'Yourself',
        context: 'Social event',
        difficulty: 'A2',
      },
      {
        id: 'casual_date',
        name: 'Casual Date',
        description: 'Have a conversation on a date',
        aiRole: 'Date',
        userRole: 'Yourself',
        context: 'Restaurant or cafe',
        difficulty: 'B1',
      },
    ],
    toneGuidelines: 'Casual, friendly, personal, engaging',
    vocabularyFocus: ['interests', 'experiences', 'personal stories', 'feelings'],
  },
};

// ============================================
// CEFR Levels
// ============================================

export const CEFR_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CEFR_DESCRIPTIONS: Record<CEFRLevel, string> = {
  A1: 'Beginner - Can understand and use familiar everyday expressions',
  A2: 'Elementary - Can communicate in simple and routine tasks',
  B1: 'Intermediate - Can deal with most situations while travelling',
  B2: 'Upper Intermediate - Can interact with fluency and spontaneity',
  C1: 'Advanced - Can express ideas fluently and spontaneously',
  C2: 'Proficient - Can express with precision, differentiate finer shades of meaning',
};

// ============================================
// App Constants
// ============================================

export const APP_CONFIG = {
  MIN_SESSION_LENGTH: 5,
  MAX_SESSION_LENGTH: 60,
  DEFAULT_SESSION_LENGTH: 15,
  MAX_MESSAGE_LENGTH: 1000,
  MEMORY_FACTS_LIMIT: 50,
  SESSION_SUMMARIES_LIMIT: 10,
  VOCABULARY_CACHE_LIMIT: 500,
};

export const API_CONFIG = {
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const VOICE_CONFIG = {
  SPEECH_TIMEOUT: 5000, // ms to wait after user stops speaking
  MIN_AUDIO_LEVEL: 0.1,
  SPEAKING_SPEED: {
    slow: 0.75,
    normal: 1.0,
    fast: 1.25,
  },
};

// ============================================
// API Configuration
// ============================================

// Base URL for API - should be configured via environment in production
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://api.linguaai.app/api';
