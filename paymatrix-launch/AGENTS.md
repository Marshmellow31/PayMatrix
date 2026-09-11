# PayMatrix Launch & Video Production Guidelines

## Current approved cut: Shared Moments (2026-09-08)
- User approved a 28-second redesign and explicitly prohibited Blender use.
- `paymatrix-Shared-Moments` is the current composition: 1680 frames, 1080×2400, 60fps.
- Use `src/premium/` and its deterministic production-based UI adapters. No Blender
  execution or Blender image plates. Preserve production apps and financial behavior.
- Follow `PRODUCT.md`, `DESIGN.md`, and `SHARED-MOMENTS.md` for the current cut.
- The rules below apply only to the preserved legacy `PayMatrix-Launch` composition;
  they do not impose its pacing, typography, phone plates, or copy on Shared Moments.

## 1. Composition & Timeline Standards
- **Master Ratio**: Native 20:9 (`1080×2400` @ 60fps). Never scale down to 1080x1920 unless creating an explicit legacy export.
- **Pacing**: Fast-paced 15–20s duration (1080 frames = 18.00s @ 60fps). Scene beats must remain between 1.25s and 2.75s.
- **Sequence Mapping**: All Remotion springs, animations, and exit interpolations must strictly complete within their scene duration budget defined in `timeline.ts`.

## 2. Phone Mockup & Screen Consistency
- **Placeholder Uniformity**: All scenes featuring a smartphone (Scenes 3, 4, 6) must use the exact same 3D phone placeholder (`<PhoneMockup width={840} use3DPlate={true} />` with zero rotation variance: `rotateX={0}, rotateY={0}, rotateZ={0}`).
- **Screen Plate Alignment**: Screen plates rendered in Remotion and mounted into Blender Cycles must use `1080×2400` resolution to match the native Android emulator ground truth.

## 3. 2D vs. 3D Document Handling
- **Flat Documents**: Paper receipts, invoices, vouchers, and tickets must be displayed flat on-screen (2D, front-facing) using CSS/HTML components (`ReceiptPaper`). Do NOT use Blender 3D perspective tilt for documents.

## 4. Typography & Visual Energy
- **Headline Scale**: Primary headlines must be 100px to 144px bold uppercase with glowing gradients.
- **Card Hierarchy**: Card headings 36px–40px, body labels 24px–28px with explicit font family (`Inter` / `Manrope`), never falling back to browser default serif.
- **Energy**: Use active voice, exciting copy, and exclamation marks (`"SPLIT IT!"`, `"SETTLE INSTANTLY!"`, `"TRY TODAY!"`).
- **CTA Lockup**: On the launch screen, place the `paymatrix` brand pill side-by-side with the official Google Play Store badge directly below `"TRY TODAY!"`.

## 5. Tooling Pipeline (Windows + Blender Headless)
- **Decoupled Python Execution**: Blender's embedded Python (`bpy`) must only handle 3D scene rendering. Use system Python (`python -c`) with `Pillow` for alpha-bounding crops and image transformations.
