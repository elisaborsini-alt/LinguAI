# LinguaAI Design System
## Premium AI Language Coach

---

## 1. BRAND ESSENCE

### Brand Personality
- **Intelligent** — AI that understands, not just responds
- **Calm** — Reduces anxiety around language learning
- **Empowering** — Builds confidence through practice
- **Human** — Feels like a patient, attentive tutor
- **Premium** — Professional quality, not gamified

### Brand Voice
> "I'm here to help you sound like yourself, in any language."

**Tone**: Warm, encouraging, never condescending
**Microcopy style**: Conversational, supportive, brief

---

## 2. COLOR PALETTE

### Primary: Deep Ocean Blue `#1A73E8`
```
HEX: #1A73E8
RGB: 26, 115, 232
```
**Why**: Trust, intelligence, calm focus. Blue reduces stress during voice interactions and conveys technological competence without feeling cold.

### Secondary: Warm Slate `#5F6368`
```
HEX: #5F6368
RGB: 95, 99, 104
```
**Why**: Neutral, professional, grounding. Provides visual rest between active elements.

### Accent: Coral Confidence `#FF6B6B`
```
HEX: #FF6B6B
RGB: 255, 107, 107
```
**Why**: Energy, encouragement, recording states. Warm enough to feel human, vibrant enough to draw attention to CTAs.

### Success: Growth Green `#34A853`
```
HEX: #34A853
RGB: 52, 168, 83
```
**Why**: Achievement, progress, positive feedback. Natural and reassuring.

### Warning: Amber Focus `#FBBC04`
```
HEX: #FBBC04
RGB: 251, 188, 4
```
**Why**: Areas needing attention without creating anxiety.

### Backgrounds
| Name | HEX | Usage |
|------|-----|-------|
| Surface | `#FAFBFC` | Main background |
| Surface Elevated | `#FFFFFF` | Cards, modals |
| Surface Dim | `#F1F3F4` | Secondary areas |

### Text Colors
| Name | HEX | Usage |
|------|-----|-------|
| On Surface | `#1F1F1F` | Primary text |
| On Surface Medium | `#5F6368` | Secondary text |
| On Surface Light | `#9AA0A6` | Tertiary, hints |

---

## 3. TYPOGRAPHY

### Font Family: **Inter**
- Highly readable at all sizes
- Excellent multilingual support (Cyrillic, Greek, Vietnamese)
- Modern, neutral, professional
- Open source, widely available

### Type Scale
```
Display Large:   36px / 44px / -0.25 tracking
Display Medium:  32px / 40px / 0 tracking
Headline Large:  28px / 36px / 0 tracking
Headline Medium: 24px / 32px / 0 tracking
Title Large:     20px / 28px / 0 tracking
Title Medium:    16px / 24px / 0.15 tracking
Body Large:      16px / 24px / 0.5 tracking
Body Medium:     14px / 20px / 0.25 tracking
Label Large:     14px / 20px / 0.1 tracking (Medium weight)
Label Medium:    12px / 16px / 0.5 tracking
Caption:         11px / 16px / 0.4 tracking
```

### Font Weights
- **Regular (400)**: Body text, descriptions
- **Medium (500)**: Labels, buttons, emphasis
- **SemiBold (600)**: Titles, headings
- **Bold (700)**: Numbers, scores, key metrics

---

## 4. SPACING SYSTEM

### Base Unit: 4px

```
xxs:  4px   — Tight spacing
xs:   8px   — Icon gaps
sm:   12px  — Compact padding
md:   16px  — Standard padding
lg:   24px  — Section spacing
xl:   32px  — Major sections
xxl:  48px  — Screen padding top
```

### Screen Horizontal Padding: 20px
### Card Border Radius: 20px
### Button Border Radius: 28px (full rounded)
### Input Border Radius: 14px

---

## 5. COMPONENT LIBRARY

### Buttons

**Primary Button**
- Background: Primary Blue
- Text: White, Label Large Medium
- Padding: 16px 32px
- Border Radius: 28px
- Shadow: 0 2px 8px rgba(26, 115, 232, 0.3)

**Secondary Button**
- Background: Transparent
- Border: 2px Primary Blue
- Text: Primary Blue
- Same dimensions as Primary

**Text Button**
- No background or border
- Text: Primary Blue
- Padding: 12px 16px

### Cards

**Elevated Card**
- Background: White
- Border Radius: 20px
- Shadow: 0 2px 12px rgba(0, 0, 0, 0.08)
- Padding: 20px

**Outlined Card**
- Background: White
- Border: 1.5px #E8EAED
- Border Radius: 16px

### Input Fields

- Background: #F1F3F4
- Border Radius: 14px
- Padding: 14px 16px
- Focus: 2px Primary Blue border

---

## 6. ONBOARDING FLOW

### Screen 1: Welcome
```
┌─────────────────────────────────────┐
│                                     │
│          [LinguaAI Logo]            │
│                                     │
│     "Speak any language            │
│      with confidence"               │
│                                     │
│     Your AI-powered coach           │
│     that adapts to you              │
│                                     │
│                                     │
│        [Get Started]                │
│                                     │
│     Already have an account?        │
└─────────────────────────────────────┘
```
**Microcopy**: Warm, promising, brief. No feature lists.

### Screen 2: Native Language
```
┌─────────────────────────────────────┐
│  ←                                  │
│                                     │
│     "What's your first             │
│      language?"                     │
│                                     │
│     We'll use this to explain       │
│     things clearly to you           │
│                                     │
│     🇮🇹 Italiano                    │
│     🇬🇧 English                     │
│     🇪🇸 Español                     │
│     🇫🇷 Français                    │
│     🇩🇪 Deutsch                     │
│     ...                             │
│                                     │
│        [Continue]                   │
└─────────────────────────────────────┘
```
**Design**: Large touch targets, flag icons for recognition

### Screen 3: Languages to Learn
```
┌─────────────────────────────────────┐
│  ←                                  │
│                                     │
│     "Which languages do you        │
│      want to practice?"             │
│                                     │
│     Select all that interest you    │
│                                     │
│     [🇬🇧 English]  [🇪🇸 Spanish]    │
│     [🇫🇷 French]   [🇩🇪 German]     │
│     [🇯🇵 Japanese] [🇨🇳 Chinese]    │
│     [🇰🇷 Korean]   [🇵🇹 Portuguese] │
│                                     │
│     + More languages                │
│                                     │
│        [Continue]                   │
└─────────────────────────────────────┘
```
**Interaction**: Multi-select chips with checkmarks

### Screen 4: Variant Selection (per language)
```
┌─────────────────────────────────────┐
│  ←                                  │
│                                     │
│     🇬🇧 English                     │
│                                     │
│     "Which accent would you        │
│      like to practice?"             │
│                                     │
│     ┌─────────────────────────┐     │
│     │ 🇺🇸 American English    │     │
│     │    Most widely used     │     │
│     └─────────────────────────┘     │
│                                     │
│     ┌─────────────────────────┐     │
│     │ 🇬🇧 British English     │     │
│     │    Classic pronunciation│     │
│     └─────────────────────────┘     │
│                                     │
│        [Continue]                   │
└─────────────────────────────────────┘
```

### Screen 5: Goals
```
┌─────────────────────────────────────┐
│  ←                                  │
│                                     │
│     "What brings you here?"         │
│                                     │
│     This helps us personalize       │
│     your practice sessions          │
│                                     │
│     ┌───────────┐  ┌───────────┐   │
│     │  💼       │  │  ✈️       │   │
│     │  Work     │  │  Travel   │   │
│     └───────────┘  └───────────┘   │
│     ┌───────────┐  ┌───────────┐   │
│     │  💬       │  │  🎯       │   │
│     │  Social   │  │ Interviews│   │
│     └───────────┘  └───────────┘   │
│                                     │
│        [Continue]                   │
└─────────────────────────────────────┘
```
**Design**: Icon cards, single or multi-select

### Screen 6: Interaction Preference
```
┌─────────────────────────────────────┐
│  ←                                  │
│                                     │
│     "How do you prefer             │
│      to practice?"                  │
│                                     │
│     ┌─────────────────────────┐     │
│     │  📞 Voice Calls         │     │
│     │  Natural conversation   │     │
│     │  like talking to a friend│    │
│     └─────────────────────────┘     │
│                                     │
│     ┌─────────────────────────┐     │
│     │  💬 Text + Voice        │     │
│     │  Type or speak,         │     │
│     │  your choice            │     │
│     └─────────────────────────┘     │
│                                     │
│        [Continue]                   │
└─────────────────────────────────────┘
```

### Screen 7: Confidence Check
```
┌─────────────────────────────────────┐
│  ←                                  │
│                                     │
│     "One quick question..."         │
│                                     │
│     How comfortable are you         │
│     having a casual conversation    │
│     in English right now?           │
│                                     │
│     ┌─────────────────────────┐     │
│     │ 😰 I struggle a lot     │     │
│     └─────────────────────────┘     │
│     ┌─────────────────────────┐     │
│     │ 😐 I get by, but it's   │     │
│     │    not comfortable      │     │
│     └─────────────────────────┘     │
│     ┌─────────────────────────┐     │
│     │ 😊 Pretty comfortable   │     │
│     └─────────────────────────┘     │
│     ┌─────────────────────────┐     │
│     │ 😎 Very confident       │     │
│     └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```
**Key**: No academic labels (A1/B2/C1). Human, relatable options.

### Screen 8: Ready
```
┌─────────────────────────────────────┐
│                                     │
│          ✨                         │
│                                     │
│     "You're all set!"               │
│                                     │
│     I'll adapt to your pace         │
│     and help you improve            │
│     with every conversation         │
│                                     │
│                                     │
│        [Start Practicing]           │
│                                     │
└─────────────────────────────────────┘
```

---

## 7. CORE UI SCREENS

### Voice Call Screen
```
┌─────────────────────────────────────┐
│  ×                           🔇     │
│                                     │
│          ╭───────────╮              │
│         │    🤖      │             │
│         │  LinguaAI  │             │
│          ╰───────────╯              │
│                                     │
│     ~~~~~ Listening ~~~~~           │
│     (animated waveform)             │
│                                     │
│     Topic: Job Interview Practice   │
│     Duration: 5:32                  │
│                                     │
│                                     │
│           ┌───────┐                 │
│           │  🔴   │ End Call        │
│           └───────┘                 │
└─────────────────────────────────────┘
```

**States**:
- Listening (blue waveform)
- Thinking (pulsing dots)
- Speaking (green waveform)

### Post-Call Summary
```
┌─────────────────────────────────────┐
│  ←  Call Summary                    │
│                                     │
│     ╭─────────────────────────╮     │
│     │   Great conversation!   │     │
│     │       ⭐⭐⭐⭐☆          │     │
│     │       8 min 32 sec      │     │
│     ╰─────────────────────────╯     │
│                                     │
│  📊 Your Performance                │
│  ├─ Fluency      ████████░░  82%   │
│  ├─ Vocabulary   ███████░░░  75%   │
│  └─ Grammar      █████████░  90%   │
│                                     │
│  💡 Feedback                        │
│  • Great use of past tense!         │
│  • Try using more connectors        │
│  • New words learned: 3             │
│                                     │
│     [Practice Again] [Home]         │
└─────────────────────────────────────┘
```

---

## 8. ANIMATION PRINCIPLES

### Durations
- Micro: 100ms (button press)
- Fast: 200ms (state changes)
- Normal: 300ms (screen transitions)
- Slow: 500ms (complex animations)

### Easing
- Standard: `cubic-bezier(0.4, 0, 0.2, 1)`
- Enter: `cubic-bezier(0, 0, 0.2, 1)`
- Exit: `cubic-bezier(0.4, 0, 1, 1)`

### Voice Waveform
- Smooth sine wave animation
- Responds to audio amplitude
- Colors indicate state:
  - Blue: AI speaking
  - Green: User speaking
  - Gray: Idle

---

## 9. ACCESSIBILITY

- **Contrast**: All text meets WCAG AA (4.5:1 minimum)
- **Touch targets**: Minimum 44x44px
- **Focus states**: Clear blue outline
- **Screen reader**: All images have alt text
- **Reduced motion**: Respect system preference
- **Font scaling**: Support up to 200%

---

## 10. VOICE-FIRST UI PRINCIPLES

1. **Minimize visual noise during calls**
   - Only essential information on screen
   - Large, clear state indicators

2. **Progressive disclosure**
   - Show details after the call, not during
   - Don't overwhelm during practice

3. **Calm feedback**
   - Gentle success animations
   - No jarring error states

4. **Clear affordances**
   - Obviously tappable elements
   - Consistent interaction patterns

---

*Design System v1.0 — LinguaAI*
