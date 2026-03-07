# LinguaAI — Premium Design System
## "Speak like yourself, in any language"

---

# 1. PREMIUM COLOR PALETTE

## Philosophy
Colors should feel **calm**, **sophisticated**, and **trustworthy**.
We avoid bright saturated colors that feel "tech startup" or "gamified".
Instead, we use **muted, warm tones** that reduce anxiety and feel human.

---

## Primary: Midnight Indigo `#2D3047`
```css
--primary: #2D3047;
--primary-light: #4A4E69;
--primary-dark: #1D1E2C;
```
**Emotional purpose**: Intelligence, depth, calm authority
**Usage**: Headers, primary actions, navigation
**Why premium**: Deep, sophisticated — like a well-tailored suit

---

## Secondary: Warm Stone `#8D99AE`
```css
--secondary: #8D99AE;
--secondary-light: #B8C0CC;
--secondary-dark: #6B7280;
```
**Emotional purpose**: Neutrality, comfort, grounding
**Usage**: Secondary text, borders, inactive states
**Why premium**: Warm gray that doesn't feel cold or corporate

---

## Accent: Soft Coral `#E07A5F`
```css
--accent: #E07A5F;
--accent-light: #F2A88F;
--accent-dark: #C45D42;
```
**Emotional purpose**: Warmth, encouragement, human connection
**Usage**: CTAs, highlights, recording indicator, progress
**Why premium**: Terracotta warmth — Mediterranean, not neon

---

## Success: Sage Green `#81B29A`
```css
--success: #81B29A;
--success-light: #A8D5BA;
--success-dark: #5F9178;
```
**Emotional purpose**: Growth, calm achievement, natural progress
**Usage**: Positive feedback, completed states, good scores
**Why premium**: Natural, organic — not artificial "gamification green"

---

## Warning: Amber Sand `#F2CC8F`
```css
--warning: #F2CC8F;
--warning-dark: #D4A85A;
```
**Emotional purpose**: Gentle attention, areas to explore
**Usage**: Suggestions, focus areas (never "errors")
**Why premium**: Warm, honey-like — inviting, not alarming

---

## Surfaces
```css
--surface-primary: #FDFCFB;      /* Warm off-white */
--surface-secondary: #F5F3F0;    /* Light warm gray */
--surface-elevated: #FFFFFF;      /* Pure white for cards */
--surface-overlay: rgba(45, 48, 71, 0.6); /* Modal backdrop */
```

---

## Text
```css
--text-primary: #2D3047;         /* Near black, warm */
--text-secondary: #6B7280;       /* Readable gray */
--text-tertiary: #9CA3AF;        /* Hints, placeholders */
--text-inverse: #FDFCFB;         /* On dark backgrounds */
```

---

## Gradients (for premium feel)
```css
--gradient-hero: linear-gradient(135deg, #2D3047 0%, #4A4E69 100%);
--gradient-warm: linear-gradient(135deg, #E07A5F 0%, #F2CC8F 100%);
--gradient-calm: linear-gradient(135deg, #81B29A 0%, #B8C0CC 100%);
```

---

# 2. TYPOGRAPHY

## Font: **Plus Jakarta Sans**
Modern, geometric, highly readable, premium feel.
Excellent multilingual support including CJK characters.

```css
--font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
```

## Type Scale
| Name | Size | Weight | Use |
|------|------|--------|-----|
| Display | 32px | 600 | Welcome screens |
| Headline | 24px | 600 | Section titles |
| Title | 20px | 500 | Screen titles |
| Body Large | 17px | 400 | Primary content |
| Body | 15px | 400 | Standard text |
| Label | 13px | 500 | Buttons, chips |
| Caption | 12px | 400 | Hints, timestamps |

---

# 3. EMOTIONAL MICROCOPY

## Onboarding Principles
- **First person plural ("we")** creates partnership
- **Questions, not commands** feel respectful
- **Acknowledge feelings** validates the user
- **No jargon** (no "CEFR", "A1", "immersion")

## Examples

❌ **Cold/Corporate**:
> "Select your native language"
> "Choose your proficiency level"
> "Configure notification preferences"

✅ **Warm/Human**:
> "What language feels like home?"
> "How confident do you feel right now?"
> "When should we remind you to practice?"

---

# 4. ONBOARDING FLOW — DETAILED

## Screen 1: Welcome

### Visual
- Full-screen gradient (Midnight → Indigo)
- Centered logo with subtle glow
- Minimal text, maximum breathing room

### Copy
```
[Logo]

Speak like yourself,
in any language.

Your AI conversation partner
that learns how you learn.

[Get Started →]

Already have an account? Sign in
```

### Design Notes
- Logo: Simple wordmark, no mascot
- Button: Soft Coral, full width
- Typography: Display size for tagline
- Animation: Subtle fade-in, no bounce

---

## Screen 2: Native Language

### Visual
- Clean white background
- Large, friendly question
- Flag + language name cards
- Search bar for 50+ languages

### Copy
```
← Back

What language feels
like home?

We'll explain everything
in this language.

[🔍 Search languages...]

🇮🇹  Italiano
🇬🇧  English
🇪🇸  Español
🇫🇷  Français
🇩🇪  Deutsch
🇵🇹  Português
🇷🇺  Русский
🇯🇵  日本語
🇨🇳  中文
🇰🇷  한국어
🇦🇷  العربية
...

[Continue →]
```

### Design Notes
- Cards: 60px height, subtle shadow
- Flags: Rounded rectangle, not circular
- Selection: Coral border + light coral fill
- Keyboard friendly for quick typing

---

## Screen 3: Languages to Learn

### Visual
- Multi-select grid
- Each language is a card with flag
- Checkmark appears on selection
- "Most popular" subtle badge

### Copy
```
← Back

Which languages would
you like to practice?

Choose as many as you like.
You can always add more later.

[ ] 🇬🇧 English         ⭐ Popular
[ ] 🇪🇸 Spanish         ⭐ Popular
[ ] 🇫🇷 French
[ ] 🇩🇪 German
[ ] 🇮🇹 Italian
[ ] 🇵🇹 Portuguese
[ ] 🇯🇵 Japanese
[ ] 🇨🇳 Chinese (Mandarin)
[ ] 🇰🇷 Korean
[ ] 🇷🇺 Russian
[ ] 🇦🇷 Arabic
[ ] 🇳🇱 Dutch

[+ Browse all languages]

[Continue with 2 languages →]
```

### Design Notes
- Grid: 2 columns
- Selection: Checkmark + coral accent
- Button: Shows count "Continue with X languages"
- Minimum: 1 language required

---

## Screen 4: Language Variant (per language selected)

### Visual
- One screen per language
- Large flag at top
- Radio button cards for variants
- Brief explanation for each

### Copy (for English)
```
← Back

🇬🇧
English

Which accent would you
like to practice?

┌─────────────────────────────────┐
│ ○  🇺🇸 American English         │
│    The most widely spoken       │
│    variety worldwide            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ○  🇬🇧 British English          │
│    Classic RP pronunciation     │
│    and vocabulary               │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ○  🇦🇺 Australian English       │
│    Unique expressions and       │
│    relaxed pronunciation        │
└─────────────────────────────────┘

[Continue →]
```

### Copy (for Spanish)
```
🇪🇸
Spanish

Which Spanish would you
like to practice?

┌─────────────────────────────────┐
│ ○  🇪🇸 Spain (Castilian)        │
│    European Spanish with        │
│    distinción pronunciation     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ○  🇲🇽 Mexican Spanish          │
│    Clear pronunciation,         │
│    widely understood            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ○  🇦🇷 Argentine Spanish        │
│    Distinctive voseo and        │
│    Italian influence            │
└─────────────────────────────────┘

[Continue →]
```

---

## Screen 5: Goals

### Visual
- Icon cards in 2-column grid
- Each card has icon, title, subtitle
- Multi-select allowed
- Subtle illustrations, not cartoons

### Copy
```
← Back

What brings you here?

This helps us personalize
your conversations.

┌─────────────┐  ┌─────────────┐
│     💼      │  │     ✈️      │
│   Work      │  │   Travel    │
│  Meetings,  │  │  Navigate   │
│  emails,    │  │  new places │
│  clients    │  │  with ease  │
└─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐
│     💬      │  │     🎯      │
│   Social    │  │ Interviews  │
│  Make       │  │  Prepare    │
│  friends,   │  │  for job    │
│  connect    │  │  interviews │
└─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐
│     🎓      │  │     🌍      │
│   Study     │  │  Moving     │
│  Academic   │  │  Relocating │
│  language   │  │  to a new   │
│  needs      │  │  country    │
└─────────────┘  └─────────────┘

[Continue →]
```

---

## Screen 6: Interaction Preference

### Visual
- Two large cards
- Illustration showing the mode
- Clear benefit statement

### Copy
```
← Back

How do you prefer
to practice?

┌─────────────────────────────────┐
│                                 │
│    [Voice wave illustration]   │
│                                 │
│    📞 Voice Conversations       │
│                                 │
│    Talk naturally, like a       │
│    phone call with a friend.    │
│    Best for building fluency.   │
│                                 │
│    ○ This is for me             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│                                 │
│    [Chat illustration]          │
│                                 │
│    💬 Text + Voice              │
│                                 │
│    Type or speak — your choice. │
│    Take your time to think.     │
│                                 │
│    ○ This is for me             │
└─────────────────────────────────┘

You can switch anytime in settings.

[Continue →]
```

---

## Screen 7: Confidence Check

### Visual
- Friendly, non-academic
- Emoji-based options
- Single select
- No progress bars or levels shown

### Copy
```
← Back

One quick question...

If someone started chatting
with you in [English] right now,
how would you feel?

┌─────────────────────────────────┐
│ 😰  I'd freeze up               │
│     I know some words but       │
│     can't really have a chat    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 😅  I'd manage, somehow         │
│     Basic conversations work,   │
│     but I make lots of mistakes │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🙂  I'd be okay                 │
│     I can chat, though complex  │
│     topics are challenging      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 😊  I'd feel comfortable        │
│     I'm pretty confident, just  │
│     want to sound more natural  │
└─────────────────────────────────┘

This isn't a test — just helps us
start at the right pace for you.

[Continue →]
```

---

## Screen 8: All Set

### Visual
- Celebration moment (subtle)
- Personalized summary
- Clear next action

### Copy
```

      ✨

You're all set, [Name]!

Here's what I learned about you:

┌─────────────────────────────────┐
│  🏠  Home: Italiano             │
│  🎯  Learning: English (US),    │
│                Spanish (MX)     │
│  💼  Goals: Work, Travel        │
│  📞  Mode: Voice conversations  │
└─────────────────────────────────┘

I'll adapt to your pace and
remember what we practice together.

Ready for your first conversation?


      [Let's talk →]

      Skip for now
```

---

# 5. CALL-MODE UI

## Philosophy
During a voice call, the UI should **fade into the background**.
The user should feel like they're having a conversation,
not using an app.

---

## Call Screen — States

### State 1: Connecting
```
┌─────────────────────────────────┐
│  ×                              │
│                                 │
│                                 │
│         ╭──────────╮            │
│        │   ◯◯◯    │           │
│        │  (dots)   │           │
│         ╰──────────╯            │
│                                 │
│       Connecting...             │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```
- Pulsing dots animation
- Minimal UI

### State 2: AI Speaking
```
┌─────────────────────────────────┐
│  ×                        🔇    │
│                                 │
│           Topic                 │
│     Job Interview Practice      │
│                                 │
│         ╭──────────╮            │
│        │  ~~~~~   │            │
│        │  ~~~~~   │  speaking  │
│         ╰──────────╯            │
│                                 │
│    ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿          │
│    (soft blue waveform)         │
│                                 │
│          05:32                  │
│                                 │
│                                 │
│         ┌───────┐               │
│         │  🔴   │               │
│         │ End   │               │
│         └───────┘               │
└─────────────────────────────────┘
```
- Waveform: Soft blue (#8D99AE)
- Avatar: Subtle pulse
- Topic: Small, non-distracting

### State 3: AI Thinking
```
┌─────────────────────────────────┐
│  ×                        🔇    │
│                                 │
│           Topic                 │
│     Job Interview Practice      │
│                                 │
│         ╭──────────╮            │
│        │   ●●●    │            │
│        │ thinking  │           │
│         ╰──────────╯            │
│                                 │
│         · · · · ·               │
│     (gentle breathing dots)     │
│                                 │
│          05:34                  │
│                                 │
│                                 │
│         ┌───────┐               │
│         │  🔴   │               │
│         │ End   │               │
│         └───────┘               │
└─────────────────────────────────┘
```
- Three dots pulsing
- Very calm, not "loading"

### State 4: User Speaking
```
┌─────────────────────────────────┐
│  ×                        🔇    │
│                                 │
│           Topic                 │
│     Job Interview Practice      │
│                                 │
│         ╭──────────╮            │
│        │  Your    │            │
│        │  turn    │            │
│         ╰──────────╯            │
│                                 │
│    ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿          │
│    (warm coral waveform)        │
│                                 │
│          05:38                  │
│                                 │
│     Listening...                │
│                                 │
│         ┌───────┐               │
│         │  🔴   │               │
│         │ End   │               │
│         └───────┘               │
└─────────────────────────────────┘
```
- Waveform: Soft Coral (#E07A5F)
- "Listening..." reassurance
- Real-time amplitude

### State 5: Call Ended
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│            ✓                    │
│                                 │
│     Great conversation!         │
│                                 │
│         08:32                   │
│       total time                │
│                                 │
│                                 │
│    [View Summary →]             │
│                                 │
│    or                           │
│                                 │
│    [Start New Call]             │
│                                 │
└─────────────────────────────────┘
```

---

## Call Summary Screen

```
┌─────────────────────────────────┐
│  ←  Conversation Summary        │
│                                 │
│  ┌─────────────────────────────┐│
│  │  Job Interview Practice     ││
│  │  Today, 3:42 PM · 8 min     ││
│  └─────────────────────────────┘│
│                                 │
│  Your Performance               │
│  ─────────────────────────────  │
│                                 │
│  Fluency                        │
│  ████████████░░░░  78%          │
│  Smooth with occasional pauses  │
│                                 │
│  Vocabulary                     │
│  ██████████░░░░░░  65%          │
│  Good basics, room to expand    │
│                                 │
│  Grammar                        │
│  ██████████████░░  88%          │
│  Very few errors, nice!         │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  💡 What went well              │
│  • Clear pronunciation          │
│  • Good use of past tense       │
│  • Natural conversation flow    │
│                                 │
│  🌱 Focus areas                 │
│  • Try using more connectors    │
│    (however, although, besides) │
│  • Practice conditional tenses  │
│                                 │
│  📝 New expressions learned     │
│  • "I'm passionate about..."    │
│  • "In my previous role..."     │
│  • "I'd be happy to..."         │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  [Practice Again]  [Home]       │
│                                 │
└─────────────────────────────────┘
```

---

# 6. MULTILINGUAL UX ADAPTATIONS

## RTL Languages (Arabic, Hebrew)
- Mirror entire layout
- Swap navigation arrows
- Align text to right

## CJK Languages (Chinese, Japanese, Korean)
- Larger base font size (+2px)
- Adjust line height (1.6 vs 1.5)
- Support vertical text in special cases

## Long Languages (German, Finnish)
- Flexible button widths
- Text truncation with ellipsis
- Multi-line labels allowed

## Implementation
```typescript
// Detect and apply RTL
const isRTL = ['ar', 'he', 'fa'].includes(locale);
I18nManager.forceRTL(isRTL);

// Adjust font size for CJK
const getFontSize = (base: number) => {
  if (['zh', 'ja', 'ko'].includes(locale)) {
    return base + 2;
  }
  return base;
};
```

---

# 7. MOTION & ANIMATION

## Principles
- **Purposeful**: Every animation has meaning
- **Subtle**: Never distracting or playful
- **Calm**: Ease-out curves, no bounce

## Durations
```css
--duration-instant: 100ms;   /* Button press */
--duration-fast: 200ms;      /* State changes */
--duration-normal: 300ms;    /* Transitions */
--duration-slow: 500ms;      /* Complex reveals */
```

## Easing
```css
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
```

## Voice Waveform Animation
- Sine wave with 5 harmonics
- Amplitude from audio input
- Smooth 60fps interpolation
- Color transitions between states

---

*LinguaAI Premium Design System v2.0*
