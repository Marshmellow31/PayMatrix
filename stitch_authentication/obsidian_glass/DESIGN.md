# Design System Specification: The Monolith Aesthetic

This document defines the visual and interaction language for a high-end, production-grade fintech experience. It moves away from "standard" dashboard tropes to embrace a signature, editorial feel rooted in tonal depth and glassmorphism.

---

## 1. Creative North Star: "The Digital Obsidian"
The design system is built on the concept of **The Digital Obsidian**. Every interface element should feel like it has been carved from dark glass or polished stone. We reject the "flat" web. Instead, we use intentional asymmetry, overlapping surfaces, and extreme typographic contrast to create a UI that feels curated and authoritative.

**Key Principles:**
*   **Tonal Authority:** Depth is signaled by light, not by lines.
*   **Intentional Friction:** High-end experiences don't rush the user; they use smooth, physics-based motion to guide the eye.
*   **Quiet Luxury:** We eliminate visual noise (no neon, no harsh borders) to let the data and typography breathe.

---

## 2. Color & Surface Architecture

The palette is strictly monochromatic, utilizing the Material Design token convention to manage a complex dark-mode hierarchy.

### The "No-Line" Rule
**Standard 1px borders are strictly prohibited for sectioning.** Boundaries must be defined through background shifts or elevation tiers.
*   *Bad:* A `#FFFFFF` border with 10% opacity.
*   *Good:* A `surface-container-high` card sitting on a `surface` background.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Each "inner" container should move up or down the tier list to define its importance.
*   **Base Layer:** `surface` (#131313)
*   **Submerged Content:** `surface-container-lowest` (#0E0E0E) for background sections that should recede.
*   **Elevated Content:** `surface-container-high` (#2A2A2A) for primary cards.

### The Glass & Gradient Rule
To achieve the premium "Glassmorphism" effect, use semi-transparent surface tokens with a `backdrop-blur` (recommended: 12px to 20px). Use a subtle gradient from `primary` (#FFFFFF) to `primary-container` (#D4D4D4) at a 45-degree angle for high-value CTAs to give them a metallic, tactile sheen.

---

## 3. Typography: Editorial Authority

We use a dual-font approach to balance character with readability. **Manrope** provides a modern, geometric feel for headlines, while **Inter** handles high-density data.

| Role | Font Family | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display-LG** | Manrope | 3.5rem | Bold | High-impact hero numbers / balances. |
| **Headline-MD** | Manrope | 1.75rem | Bold | Section titles. |
| **Title-SM** | Inter | 1rem | Medium | Card titles and primary navigation. |
| **Body-MD** | Inter | 0.875rem | Regular | Secondary data and descriptions. |
| **Label-SM** | Inter | 0.6875rem | Medium | All-caps metadata or micro-labels. |

**Hierarchy Note:** Use `on_surface_variant` (#C6C6C6) for secondary text to ensure the white `primary` headings maintain a dominant visual anchor.

---

## 4. Elevation & Depth

### The Layering Principle
Do not use shadows to define every container. Instead, "stack" tiers. Place a `surface-container-low` (#1C1B1B) card on a `surface-container-highest` (#353534) header area to create a soft, natural lift.

### Ambient Shadows
When an element must "float" (e.g., a Modal or FAB), use an **Ambient Shadow**:
*   **Blur:** 40px - 60px
*   **Opacity:** 4% - 8%
*   **Color:** Derived from `on_surface` (a tinted white/grey), never pure black. This simulates light reflecting off a dark surface.

### The "Ghost Border" Fallback
If accessibility requires a container edge, use a **Ghost Border**: `outline-variant` (#474747) at 15% opacity. It should be felt, not seen.

---

## 5. Component Guidelines

### Buttons (Tactile Solids)
*   **Primary:** Solid `primary` (#FFFFFF) with `on_primary` (#1A1C1C) text. 
*   **Secondary:** Glass-style. `surface-variant` at 40% opacity with a 12px backdrop-blur.
*   **Interaction:** On press, scale the button down to 0.96 (spring physics: damping 15, stiffness 150).

### Cards & Lists (The Spacer Rule)
**Dividers are forbidden.** 
*   Separate list items using `spacing-6` (1.5rem) of vertical whitespace.
*   For grouped items, use a background shift to `surface-container-low` with a corner radius of `xl` (1.5rem).

### Input Fields
*   **Default:** `surface-container-highest` background with a `sm` (0.25rem) radius.
*   **Focus:** Transition background to `surface-bright` and scale the label using `label-md` typography. No high-contrast glow; use a subtle increase in tonal brightness.

### Transaction Chips
*   Use `secondary-container` (#464747) for a "charcoal" fill. 
*   Radius must be `full` (9999px) for a distinct pill shape.

---

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place a large Display-LG balance on the left, balanced by small, high-density Label-SM metadata on the right.
*   **Embrace Grain:** Apply a 2% noise texture to the `background` layer to prevent "banding" in gradients.
*   **Micro-Interactions:** Every click should feel weighted. Use a 200ms spring for all hover states.

### Don't:
*   **Don't use 100% Black:** Pure `#000000` kills the depth. Always use `surface-container-lowest` (#0E0E0E) for the deepest tones to allow for subtle shadow visibility.
*   **Don't use Bright Accents:** If an "Error" state is needed, use `error_container` (#93000A) which is a deep, desaturated red, keeping with the "Digital Obsidian" theme.
*   **Don't use Standard Grids:** Break the grid occasionally. Allow images or large typography to bleed off the edge of the container to imply scale.