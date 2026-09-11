# PayMatrix Instagram Carousel — Gemini Image Generation Prompt

Use this prompt verbatim with Gemini (or any AI image generator). Generate each slide separately by specifying the slide number.

---

## MASTER PROMPT (use for every slide, swap the [SLIDE-SPECIFIC CONTENT] section)

```
Create a single Instagram carousel slide for a mobile app called PayMatrix.

STRICT CANVAS DIMENSIONS:
- Canvas ratio: 4:3 (width:height) — e.g. 1200×900px or 1600×1200px
- Do NOT use square, portrait, or 16:9. Must be 4:3 landscape.

COLOR PALETTE — MONOCHROME ONLY. NO OTHER COLORS.
- Background: #0e0e0e (near black)
- Headline text: #e5e2e1 (off-white)
- Subtext / supporting copy: #919191 (medium gray)
- Borders / dividers: #2a2a2a (dark gray)
- Accent line: #ffffff (pure white, thin)
- Slide number: #474747 (dim gray)
- DO NOT use teal, purple, blue, green, or any color. Strictly monochrome.

TYPOGRAPHY:
- Font family: Manrope or Inter (clean geometric sans-serif)
- Headline: 52–60px, weight 600, color #e5e2e1
- Subtext: 20–22px, weight 400, color #919191
- Slide number: 14px, weight 400, color #474747
- All text left-aligned

LAYOUT STRUCTURE (apply to every slide):
- Top-left: a horizontal white accent line, 28px wide, 2px tall, sitting above the headline
- Below accent line: headline text (bold, large)
- Below headline: subtext (if applicable for this slide)
- Bottom-left corner: slide number in format "01 / 07"
- Thin dark gray border (1px, #2a2a2a) around the entire canvas with 8px radius
- Generous padding: 60px on all sides

SCREENSHOT PLACEHOLDER (slides 2–6 only):
- A tall portrait rectangle representing a phone screenshot
- Ratio: 9:16 (width:height) — strict portrait
- Positioned: centered or right-aligned, filling remaining vertical space after text
- Fill: #1a1a1a (slightly lighter than background)
- Border: 1px solid #2a2a2a
- Corner radius: 16px
- Inside: small centered label in #474747 that reads "screenshot"
- DO NOT add any phone frame, notch, or device chrome around it — just the rectangle

WHAT NOT TO DO:
- No gradients
- No glow effects
- No decorative shapes, stars, circles, or icons
- No neon colors
- No drop shadows
- No extra visual elements beyond what is described
- No watermarks

[SLIDE-SPECIFIC CONTENT BELOW]
```

---

## SLIDE-BY-SLIDE CONTENT

Append the following block to the master prompt for each slide:

---

### Slide 01 / 07 — Hook (NO screenshot placeholder)
```
SLIDE 01 / 07 — TEXT ONLY, NO SCREENSHOT PLACEHOLDER.
Headline: "Splitting bills with friends shouldn't feel like accounting."
Subtext: "Introducing PayMatrix"
Layout: Full canvas is text only. Headline takes up most of the space. Subtext sits below in gray. Slide number "01 / 07" in bottom-left.
```

---

### Slide 02 / 07 — Dashboard
```
SLIDE 02 / 07 — INCLUDES SCREENSHOT PLACEHOLDER.
Headline: "Your group finances. All in one place."
Subtext: (none)
Layout: Text block in top-left. Below the text, place the 9:16 screenshot placeholder rectangle filling the remaining space. Slide number "02 / 07" bottom-left below the placeholder.
```

---

### Slide 03 / 07 — AI Bill Scanning
```
SLIDE 03 / 07 — INCLUDES SCREENSHOT PLACEHOLDER.
Headline: "Scan any receipt. AI does the rest."
Subtext: "Powered by Gemini AI — extracts items, amounts, and categories instantly"
Layout: Text block top-left. Below text, 9:16 screenshot placeholder. Slide number "03 / 07" bottom-left.
```

---

### Slide 04 / 07 — Split Engine
```
SLIDE 04 / 07 — INCLUDES SCREENSHOT PLACEHOLDER.
Headline: "Split equally, by percentage, or to the rupee."
Subtext: "Equal, fixed, or custom splits for any group size"
Layout: Text block top-left. Below text, 9:16 screenshot placeholder. Slide number "04 / 07" bottom-left.
```

---

### Slide 05 / 07 — UPI Settlement
```
SLIDE 05 / 07 — INCLUDES SCREENSHOT PLACEHOLDER.
Headline: "Settle instantly. GPay, PhonePe, Paytm — your call."
Subtext: "One tap to pay. Native UPI deep-linking built in."
Layout: Text block top-left. Below text, 9:16 screenshot placeholder. Slide number "05 / 07" bottom-left.
```

---

### Slide 06 / 07 — Analytics
```
SLIDE 06 / 07 — INCLUDES SCREENSHOT PLACEHOLDER.
Headline: "Finally know where your money actually goes."
Subtext: "Visual spending breakdowns, category trends, and cohort insights"
Layout: Text block top-left. Below text, 9:16 screenshot placeholder. Slide number "06 / 07" bottom-left.
```

---

### Slide 07 / 07 — CTA (NO screenshot placeholder)
```
SLIDE 07 / 07 — TEXT ONLY, NO SCREENSHOT PLACEHOLDER.
Headline: "Free. Fast. No nonsense."
Subtext: "pay-matrix.vercel.app"
CTA line: "Try it now →" — same size as subtext, color #e5e2e1 (slightly brighter than subtext to stand out)
Layout: Full canvas text only. Headline large and bold. Subtext in gray below. CTA line below subtext. Slide number "07 / 07" bottom-left.
```

---

## TIPS FOR BEST RESULTS

- Generate each slide one at a time and paste the master prompt + the relevant slide block together.
- If Gemini adds unwanted decorations, add to the prompt: "Remove all decorative elements. Keep it strictly minimal."
- If the ratio comes out wrong, explicitly say: "The output image must be exactly 4:3 ratio, wider than it is tall."
- If text placement is off, add: "Text must be strictly left-aligned with 60px padding from the left edge."
