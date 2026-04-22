# UI Theme PRD

## Document Purpose
Define the visual and experiential requirements for evolving the app from a bland utility interface into a distinctive dual-personality product, while preserving speed, clarity, and low cognitive load.

This is a product/design requirements document. It intentionally avoids source-level implementation detail.

## Problem Statement
The current UI is functional but visually generic. It does not reflect the app's expanding purpose:
- Food planning and pantry-led recipe building.
- Health and workout analysis (including Strava data).

As the product expands, users need clearer context cues about which part of the app they are in, without losing consistency.

## Product Vision
The app should feel like one coherent product with two distinct identities:
- **Kitchen identity** for meal planning, pantry, recipes, and shopping.
- **Performance identity** for workouts and training analysis.

A third **Fusion identity** is used where food and fitness data are intentionally combined (daily log and trend/timeline views).

## Goals
1. Make the UI noticeably more appealing and branded on mobile and desktop.
2. Create clear visual distinction between Kitchen and Performance sections.
3. Ensure combined log/trend views present nutrition + workout data without ambiguity.
4. Maintain utility-first usability: fast scanning, low friction, minimal clutter.

## Non-Goals (v1)
1. Full redesign of product workflows or IA.
2. Per-user theme customization.
3. Global dark/light toggle strategy across all modes.

## Personas and Core Use Cases
1. Household planner:
Uses meal plan, recipes, pantry, and shopping list daily.
Needs quick check-off interactions and simple planning workflows.

2. Fitness-aware user:
Reviews workout load and progress, wants easy correlation with nutrition.

3. Blended user:
Uses daily log and trends to understand calories/macros alongside training performance.

## Experience Principles
1. Clarity first: hierarchy and readability over decoration.
2. Brand with restraint: identity should be visible in tone, color, and type, not visual noise.
3. Shared ergonomics: interactions stay familiar across modes.
4. Mobile parity: core screens feel designed for small screens, not compressed desktop layouts.

## Brand Modes

## 1) Kitchen Mode: Citrus Prep Studio
**Personality:** fresh, optimistic, practical meal-prep energy.

**Color direction (required):**
- Warm canvas background: `#FFF9EF`
- Primary teal: `#0E8F8A`
- Citrus amber accent: `#F59E0B`
- Fresh green success tone: `#2F9E58`
- Primary text ink: `#1F2933`
- Border neutral: `#E6DDC9`

**Typography direction (required):**
- Display/headline: **Fraunces** (weights 600-700)
- Body/UI: **Source Sans 3** (weights 400-600)

**Component feel:**
- Rounded, approachable surfaces.
- Soft warmth in cards/chips.
- Ingredient/category cues should feel friendly and practical.

## 2) Performance Mode: Trackline
**Personality:** focused, athletic, precise, data-forward.

**Color direction (required):**
- Deep slate background: `#0F1419`
- Elevated surface slate: `#171F27`
- Primary action orange: `#FF5A2A`
- Secondary pace blue: `#00A3FF`
- Positive/success green: `#2FD17B`
- Primary text (light): `#EAF0F6`

**Typography direction (required):**
- Display/headline: **Space Grotesk** (weights 600-700)
- Body/UI: **Inter Tight** (weights 400-600)

**Component feel:**
- Crisper edges than Kitchen mode.
- Strong contrast and tighter metric hierarchy.
- Visual motifs should evoke split/lap/training progression.

## 3) Fusion Mode: Log
**Personality:** neutral, analytical, integrative.

**Color direction (required):**
- Neutral app background: `#F7F8FA`
- Surface white: `#FFFFFF`
- Nutrition accent (Kitchen-linked): `#0E8F8A`
- Training accent (Performance-linked): `#FF5A2A`
- Core text: `#1E2935`

**Typography direction (required):**
- Display/headline: **Inter Tight** (600-700)
- Body/UI: **Inter** (400-600)

**Component feel:**
- Balanced, low-noise framing.
- Nutrition and workout data should be visually grouped but equally legible.

## Information Architecture and Mode Mapping
- Kitchen mode applies to meal planner, recipes, shopping, pantry, and family/profile management.
- Performance mode applies to workout and Strava analysis sections.
- Fusion mode applies to daily log and trend/timeline views where food + training are combined.

Route-level mapping should be deterministic and consistent so users always know the context they are in.

## UX Requirements by Surface

## App Shell and Navigation
1. Top-level navigation must signal active mode through color and typography cues.
2. Mobile and desktop navigation patterns remain functionally consistent.
3. Navigation should not require relearning between modes.

## Kitchen Surfaces
1. Shopping, pantry, recipes, and meal planner must share a consistent Kitchen look.
2. Lists remain dense enough for utility usage, with clearer sectioning and emphasis.
3. Category and status chips should improve scanability without adding clutter.

## Performance Surfaces
1. Training metrics should be prioritized above descriptive text.
2. Cards and charts should emphasize trend direction and effort/progression.
3. Color should support meaning (effort, pace, recovery), not decoration.

## Fusion Surfaces (Daily + Trend)
1. Nutrition and workout metrics must be grouped distinctly in each panel.
2. Daily view should support rapid “single-screen comprehension.”
3. Trend view should show correlations without overwhelming users.

## Typography and Hierarchy Requirements
1. Every mode must use its assigned display/body font pairing.
2. Type scale remains structurally consistent across modes to preserve usability.
3. Numeric metrics must be visually emphasized over metadata in Performance and Fusion surfaces.
4. Long text blocks are discouraged on primary utility screens.

## Motion and Interaction Requirements
1. Motion should be subtle and purposeful (state changes, panel transitions, not decorative choreography).
2. Button, chip, and input states must remain obvious in all modes.
3. Focus states must be clearly visible for keyboard users.

## Accessibility Requirements
1. WCAG AA contrast compliance for text and interactive controls.
2. Target Lighthouse Accessibility score: **95+** on representative screens.
3. Touch targets must be comfortably tappable on mobile.
4. Color cannot be the sole carrier of meaning for critical states.

## Success Metrics
1. Visual distinction test:
Users can correctly identify Kitchen vs Performance mode in usability testing without prompts.
2. Usability retention:
No measurable decline in key task completion time for shopping and planning flows.
3. Clarity in combined views:
Users can correctly interpret both nutrition and workout summaries in daily log/trend tasks.
4. Accessibility:
All themed screens meet contrast and focus requirements.

## Delivery Scope and Phasing

## Phase A: Design Foundation
- Finalized color, typography, component style guide for Kitchen, Performance, Fusion.
- Mobile + desktop key screen mocks.

## Phase B: Kitchen Rollout
- Apply Citrus Prep Studio branding to existing food/planning surfaces.
- Validate utility workflows remain fast and clear.

## Phase C: Performance Rollout
- Apply Trackline branding to workout and Strava analysis surfaces.
- Establish consistent metric-first presentation style.

## Phase D: Fusion Rollout
- Apply Fusion style to daily log and trend/timeline experiences.
- Validate readability and comparative interpretation of nutrition vs training data.

## Phase E: QA and Polish
- Accessibility verification, responsive pass, and visual consistency review.

## Risks and Mitigations
1. Risk: Branding reduces utility speed.
Mitigation: Keep density and interaction patterns stable; test real task flows.

2. Risk: Two identities feel like separate apps.
Mitigation: Maintain shared layout structure, interaction model, and component behavior.

3. Risk: Fusion view becomes visually confusing.
Mitigation: Enforce strict grouping rules and restrained accent usage.

## Open Decisions
1. Whether Performance mode remains dark-leaning only, or later gains a light variant.
2. Final icon style direction (outlined vs filled) for cross-mode consistency.
3. Chart library theming conventions for future performance dashboards.
