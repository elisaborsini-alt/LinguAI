# Pronunciation Coach - User Flow

## 📱 Flusso Utente Completo

### 1. Entry Point (Practice Tab)
```
┌─────────────────────────────────────┐
│  Practice                           │
│  Choose how you want to practice    │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │    💬    │  │    📞    │        │
│  │Text Chat │  │Voice Call│        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🎤 Pronunciation Practice   →│   │
│  │ Compare with native speakers │   │
│  └─────────────────────────────┘   │
│                                     │
│  Practice Scenarios                 │
│  ├─ 💬 Free Conversation           │
│  ├─ 💼 Job Interview               │
│  └─ ...                            │
└─────────────────────────────────────┘
```

### 2. Phrase Selection (PronunciationPracticeScreen)
```
┌─────────────────────────────────────┐
│  Pronunciation Practice             │
│  Compare your pronunciation with    │
│  native speakers                    │
│                                     │
│  🔍 Search phrases...               │
│                                     │
│  Categories:                        │
│  [👋 Greetings] [🔢 Numbers] [💬..] │
│                                     │
│  Difficulty: [Beginner] [Inter] [Adv]│
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Hello                    85 │   │
│  │ /həˈloʊ/            beginner│   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Good morning             72 │   │
│  │ /ɡʊd ˈmɔːrnɪŋ/     beginner│   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ How are you?           NEW │   │
│  │ /haʊ ɑːr juː/      beginner│   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 3. Practice Session (PronunciationSessionScreen)
```
┌─────────────────────────────────────┐
│  ← Pronunciation Practice           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      "Hello, how are you?"  │   │
│  │       /həˈloʊ haʊ ɑːr juː/  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Native Speaker                     │
│  ┌─────────────────────────────┐   │
│  │ ▁▃▅▇▅▃▁▂▄▆▄▂▁▃▅▇▅▃▁       │   │
│  │                             │   │
│  │   [0.75x]    ▶️     1.5s    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Your Pronunciation                 │
│  ┌─────────────────────────────┐   │
│  │  - - - - - - - - - - - - -  │   │
│  │    Listen to native first   │   │
│  └─────────────────────────────┘   │
│                                     │
│            🎙️                       │
│       Tap to record                 │
│  (Listen to native speaker first)   │
└─────────────────────────────────────┘

After listening + recording:

┌─────────────────────────────────────┐
│  ...                                │
│  Your Pronunciation                 │
│  ┌─────────────────────────────┐   │
│  │ ▁▂▄▆▄▂▁▃▅▇▅▃▁▂▄▆▄▂        │   │
│  │           ▶️         1.8s   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌────────────┐  ┌────────────┐    │
│  │  Re-record │  │   Compare  │    │
│  └────────────┘  └────────────┘    │
└─────────────────────────────────────┘
```

### 4. Results (PronunciationResultsScreen)
```
┌─────────────────────────────────────┐
│  ← Results                          │
│                                     │
│  [Overview] [Details] [Feedback]    │
│  ─────────                          │
│                                     │
│           ╭───────╮                 │
│          ╱   78   ╲                 │
│         │  /100    │                │
│          ╲  Good! ╱                 │
│           ╰───────╯                 │
│                                     │
│  Score Breakdown                    │
│  ┌─────────────────────────────┐   │
│  │ Rhythm    ████████░░  80%   │   │
│  │ Pitch     ███████░░░  72%   │   │
│  │ Clarity   ████████░░  82%   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌────────────┐  ┌────────────┐    │
│  │  Try Again │  │ Next Phrase│    │
│  └────────────┘  └────────────┘    │
└─────────────────────────────────────┘

Details Tab:
┌─────────────────────────────────────┐
│  [Overview] [Details] [Feedback]    │
│             ─────────               │
│                                     │
│  Waveform Comparison                │
│  Native: ▁▃▅▇▅▃▁▂▄▆▄▂▁▃▅▇▅▃▁      │
│  You:    ▁▂▄▆▄▂▁▃▅▇▅▃▁▂▄▆▄▂       │
│                                     │
│  Pitch Comparison                   │
│       ╱╲    ╱╲                      │
│      ╱  ╲  ╱  ╲   ← Native (blue)  │
│     ╱    ╲╱    ╲                    │
│    ╱  ╲  ╱╲     ╲ ← You (orange)   │
│   ╱    ╲╱  ╲     ╲                  │
│                                     │
│  Word Analysis                      │
│  ┌─────────────────────────────┐   │
│  │ Hello ✓     how ⚠️    you ✓ │   │
│  │  92%        68%        85%  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

Feedback Tab:
┌─────────────────────────────────────┐
│  [Overview] [Details] [Feedback]    │
│                       ────────      │
│                                     │
│  💪 Strengths                       │
│  • Clear pronunciation of vowels    │
│  • Good speech rhythm               │
│                                     │
│  📈 Areas to Improve                │
│  • Work on the "how" sound          │
│  • Pay attention to intonation      │
│                                     │
│  💡 Tips                            │
│  • Try speaking slightly slower     │
│  • Listen to the pitch changes      │
│                                     │
│  🎯 Next Steps                      │
│  • Practice this phrase again       │
│  • Try similar phrases              │
└─────────────────────────────────────┘
```

## 🎨 Design Principles

1. **Progressive Disclosure**: L'utente deve prima ascoltare, poi può registrare
2. **Visual Feedback**: Waveform live durante la registrazione
3. **Clear Scoring**: Punteggio circolare prominente + breakdown dettagliato
4. **Actionable Feedback**: Non solo punteggi, ma suggerimenti concreti
5. **Easy Navigation**: Sempre possibile tornare indietro o riprovare
