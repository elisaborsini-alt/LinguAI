# LinguaAI — Human-Tech Design System
## Modern, Warm, Sophisticated

---

# 1. DESIGN PHILOSOPHY

**Core Principles:**
- **Human-first**: Technology should feel approachable, not intimidating
- **Clarity over decoration**: Every element serves a purpose
- **Warm professionalism**: Trustworthy yet welcoming
- **Timeless over trendy**: Designs that age gracefully

**Brand Personality:**
- Intelligent but not cold
- Premium but accessible
- Innovative but familiar
- Confident but humble

---

# 2. COLOR PALETTES

## PALETTE A: "Warm Ink" (Recommended)

A sophisticated palette inspired by editorial design and premium stationery.
Balances warmth with professionalism.

### Primary: Deep Charcoal `#2C2C2C`
```
HEX: #2C2C2C
RGB: 44, 44, 44
```
**Psychology**: Authority, sophistication, timelessness
**UX Role**: Establishes visual hierarchy and premium feel
**Usage**:
- Primary text
- Headers and titles
- Navigation elements
- Logo and brand marks

### Secondary: Warm Taupe `#8B7E74`
```
HEX: #8B7E74
RGB: 139, 126, 116
```
**Psychology**: Warmth, reliability, organic authenticity
**UX Role**: Softens the palette, adds human touch
**Usage**:
- Secondary text
- Subtle borders
- Inactive states
- Supporting icons

### Neutral Light: Soft Cream `#FAF8F5`
```
HEX: #FAF8F5
RGB: 250, 248, 245
```
**Psychology**: Openness, calm, breathing room
**UX Role**: Reduces eye strain, feels warmer than pure white
**Usage**:
- Primary backgrounds
- Card surfaces
- Content areas
- Input field backgrounds

### Neutral Mid: Stone `#E8E4DF`
```
HEX: #E8E4DF
RGB: 232, 228, 223
```
**Psychology**: Subtlety, structure without harshness
**UX Role**: Creates depth and separation
**Usage**:
- Dividers and borders
- Secondary backgrounds
- Hover states
- Disabled elements

### Neutral Dark: Graphite `#4A4A4A`
```
HEX: #4A4A4A
RGB: 74, 74, 74
```
**Psychology**: Groundedness, stability
**UX Role**: Secondary hierarchy level
**Usage**:
- Body text
- Subheadings
- Icon fills
- Footer content

### Accent: Terracotta `#C67B5C`
```
HEX: #C67B5C
RGB: 198, 123, 92
```
**Psychology**: Energy, warmth, approachability, action
**UX Role**: Draws attention without aggression
**Usage**:
- Primary CTAs (buttons)
- Active states
- Progress indicators
- Success highlights
- Links on hover

### Accent Light (for backgrounds): `#FDF5F0`
```
HEX: #FDF5F0
```
**Usage**: Accent background tints, selected states

---

## PALETTE B: "Nordic Clarity" (Alternative)

A cooler, more minimalist palette with Scandinavian influences.
Maximum clarity and calm.

### Primary: Ink Blue `#1E3A5F`
```
HEX: #1E3A5F
RGB: 30, 58, 95
```
**Psychology**: Trust, depth, intelligence, reliability
**UX Role**: Conveys expertise and stability
**Usage**:
- Primary text
- Headers
- Navigation
- Brand elements

### Secondary: Sage `#7A9E8E`
```
HEX: #7A9E8E
RGB: 122, 158, 142
```
**Psychology**: Balance, growth, calm, natural
**UX Role**: Adds organic warmth to cool palette
**Usage**:
- Secondary text
- Success states
- Icons
- Decorative elements

### Neutral Light: Snow `#FAFBFC`
```
HEX: #FAFBFC
RGB: 250, 251, 252
```
**Psychology**: Purity, simplicity, focus
**UX Role**: Maximum readability and clean canvas
**Usage**:
- Primary backgrounds
- Cards
- Modals

### Neutral Mid: Mist `#E5E9ED`
```
HEX: #E5E9ED
RGB: 229, 233, 237
```
**Psychology**: Softness, structure
**UX Role**: Subtle separation
**Usage**:
- Borders
- Dividers
- Secondary backgrounds

### Neutral Dark: Slate `#64748B`
```
HEX: #64748B
RGB: 100, 116, 139
```
**Psychology**: Neutrality, professionalism
**UX Role**: Secondary text hierarchy
**Usage**:
- Body text
- Captions
- Metadata

### Accent: Coral `#E07A5F`
```
HEX: #E07A5F
RGB: 224, 122, 95
```
**Psychology**: Warmth, energy, action, friendliness
**UX Role**: Humanizes the cool palette
**Usage**:
- CTAs
- Active states
- Notifications
- Key interactions

---

# 3. TYPOGRAPHY

## Primary Recommendation: Inter + Source Serif Pro

### Headings: Source Serif Pro
```css
font-family: 'Source Serif Pro', Georgia, serif;
```
**Weights**: 400 (Regular), 600 (SemiBold)

**Why this font?**
- **Readability**: Designed for screens with optimized x-height
- **Warmth**: Serif fonts convey trust and editorial quality
- **Accessibility**: Open letterforms, clear distinction between characters
- **Professionalism**: Used by major publications (feels credible)

**Usage**:
- H1: 32px / 40px line-height / SemiBold
- H2: 24px / 32px line-height / SemiBold
- H3: 20px / 28px line-height / SemiBold

### Body: Inter
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```
**Weights**: 400 (Regular), 500 (Medium), 600 (SemiBold)

**Why this font?**
- **Screen-optimized**: Designed specifically for digital interfaces
- **Accessibility**: Tall x-height, clear letterforms
- **Versatility**: Works at all sizes
- **Variable font**: Smooth weight transitions

**Usage**:
- Body Large: 17px / 26px line-height / Regular
- Body: 15px / 24px line-height / Regular
- Caption: 13px / 20px line-height / Regular
- Label: 14px / 20px line-height / Medium

---

## Alternative Pairing: DM Sans + Libre Baskerville

### Headings: Libre Baskerville
```css
font-family: 'Libre Baskerville', Georgia, serif;
```
**Character**: Classic, editorial, trustworthy

### Body: DM Sans
```css
font-family: 'DM Sans', sans-serif;
```
**Character**: Geometric, modern, friendly

**Best for**: More traditional/editorial feel

---

## Alternative Pairing: Instrument Sans + Instrument Serif

### Headings: Instrument Serif
```css
font-family: 'Instrument Serif', serif;
```
**Character**: Contemporary, elegant, distinctive

### Body: Instrument Sans
```css
font-family: 'Instrument Sans', sans-serif;
```
**Character**: Clean, modern, harmonious with serif

**Best for**: More premium/luxury positioning

---

# 4. TYPE SCALE

```
Display:    40px / 48px / -0.02em / SemiBold
H1:         32px / 40px / -0.01em / SemiBold
H2:         24px / 32px / 0 / SemiBold
H3:         20px / 28px / 0 / SemiBold
H4:         17px / 24px / 0 / SemiBold
Body L:     17px / 26px / 0 / Regular
Body:       15px / 24px / 0 / Regular
Body S:     14px / 22px / 0 / Regular
Caption:    13px / 20px / 0.01em / Regular
Label:      14px / 20px / 0.02em / Medium
Overline:   12px / 16px / 0.08em / Medium (uppercase)
```

---

# 5. SPACING SYSTEM

Based on 4px grid:

```
4px   — Micro (icon gaps)
8px   — XS (tight padding)
12px  — S (compact elements)
16px  — M (standard padding)
24px  — L (section gaps)
32px  — XL (major sections)
48px  — 2XL (page sections)
64px  — 3XL (hero spacing)
```

---

# 6. COMPONENT STYLING

## Buttons

### Primary Button
```css
background: #C67B5C;
color: #FFFFFF;
padding: 14px 28px;
border-radius: 8px;
font-weight: 500;
font-size: 15px;
letter-spacing: 0.01em;
transition: all 200ms ease;
```
**Hover**: Darken 10%, subtle lift (translateY -1px)
**Active**: Darken 15%

### Secondary Button
```css
background: transparent;
color: #2C2C2C;
border: 1.5px solid #E8E4DF;
padding: 14px 28px;
border-radius: 8px;
```
**Hover**: Border color #8B7E74, background #FAF8F5

### Text Button
```css
background: none;
color: #C67B5C;
padding: 8px 0;
font-weight: 500;
```
**Hover**: Underline

## Cards
```css
background: #FFFFFF;
border: 1px solid #E8E4DF;
border-radius: 12px;
padding: 24px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
```
**Hover**: box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

## Input Fields
```css
background: #FAF8F5;
border: 1.5px solid #E8E4DF;
border-radius: 8px;
padding: 14px 16px;
font-size: 15px;
```
**Focus**: border-color: #C67B5C; box-shadow: 0 0 0 3px #FDF5F0;

---

# 7. ACCESSIBILITY CHECKLIST

**Color Contrast (WCAG AA)**:
- Primary text (#2C2C2C) on cream (#FAF8F5): 12.5:1 ✓
- Body text (#4A4A4A) on cream (#FAF8F5): 8.2:1 ✓
- Accent (#C67B5C) on white: 4.6:1 ✓ (for large text/buttons)

**Typography**:
- Minimum body size: 15px
- Minimum line height: 1.5
- Maximum line length: 75 characters

**Interactive Elements**:
- Minimum touch target: 44x44px
- Clear focus states (3px accent outline)
- Visible hover states

---

# 8. MOTION PRINCIPLES

**Timing**:
- Micro interactions: 150ms
- State changes: 200ms
- Page transitions: 300ms
- Complex animations: 400ms

**Easing**:
- Standard: `cubic-bezier(0.4, 0, 0.2, 1)`
- Enter: `cubic-bezier(0, 0, 0.2, 1)`
- Exit: `cubic-bezier(0.4, 0, 1, 1)`

**Philosophy**:
- Subtle, not showy
- Purposeful, not decorative
- Natural, not mechanical

---

# 9. APPLICATION EXAMPLES

## Welcome Screen
- Background: Soft Cream (#FAF8F5)
- Headline: Deep Charcoal (#2C2C2C), Source Serif Pro SemiBold
- Subhead: Graphite (#4A4A4A), Inter Regular
- CTA Button: Terracotta (#C67B5C) with white text

## Cards
- Background: White (#FFFFFF)
- Border: Stone (#E8E4DF)
- Title: Deep Charcoal
- Description: Graphite
- Selection state: Terracotta border + Light accent background (#FDF5F0)

## Chat Interface
- AI Messages: Stone background, Deep Charcoal text
- User Messages: Terracotta background, White text
- Timestamps: Warm Taupe, 12px

---

*LinguaAI Human-Tech Design System v1.0*
*Designed for clarity, warmth, and lasting appeal.*
