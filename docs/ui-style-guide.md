# UI Style Guide v1

Date: 2026-04-15
Source of truth: `ui-theme.md` PRD.

## Purpose
Provide a concrete visual guide for implementation teams across Kitchen, Performance, and Fusion areas without changing core UX workflows.

## Shared Foundation
- Interaction patterns stay consistent across all modes.
- Visual differentiation comes from color, typography, surface shape, and emphasis style.
- Keep density practical for utility tasks.

## Kitchen Mode (Citrus Prep Studio)
Personality: fresh, friendly, practical meal prep.

Primary colors:
- Background: `#FFF9EF`
- Surface: `#FFFFFF`
- Primary action: `#0E8F8A`
- Secondary accent: `#F59E0B`
- Success: `#2F9E58`
- Text: `#1F2933`
- Border: `#E6DDC9`

Typography:
- Display/headline: Fraunces (600-700)
- Body/UI: Source Sans 3 (400-600)

UI character:
- Softer rounded cards and controls.
- Warm neutrals and low-glare contrast.
- Friendly category/status chips.

## Performance Mode (Trackline)
Personality: focused, athletic, precise.

Primary colors:
- Background: `#0F1419`
- Surface: `#171F27`
- Primary action: `#FF5A2A`
- Secondary accent: `#00A3FF`
- Success: `#2FD17B`
- Text: `#EAF0F6`
- Border: `#2A3845`

Typography:
- Display/headline: Space Grotesk (600-700)
- Body/UI: Inter Tight (400-600)

UI character:
- Crisper card edges than Kitchen.
- High-contrast metric emphasis.
- Split/lap and progression cues for charts/cards.

## Fusion Mode (Log)
Personality: neutral, analytical, combined.

Primary colors:
- Background: `#F7F8FA`
- Surface: `#FFFFFF`
- Nutrition accent: `#0E8F8A`
- Training accent: `#FF5A2A`
- Text: `#1E2935`
- Border: `#D8E1EA`

Typography:
- Display/headline: Inter Tight (600-700)
- Body/UI: Inter (400-600)

UI character:
- Neutral scaffold with two accent systems.
- Nutrition and training blocks must be clearly grouped.
- Visual balance is more important than decorative styling.

## Hierarchy and Density Rules
- Headlines should be short and structural, not prose.
- Numeric KPIs get strongest visual emphasis in Performance and Fusion views.
- Metadata and helper text stay muted and compact.
- Do not increase click depth for existing common tasks.

## Accessibility Rules
- Meet WCAG AA contrast for text/control states.
- Visible keyboard focus on all interactive controls.
- Avoid using color alone to indicate critical status.
- Touch targets must be comfortable on mobile.

## Deliverable Checkpoints
- Kitchen routes show clear Citrus identity while preserving task speed.
- Performance routes show distinct Trackline styling and metric-first hierarchy.
- Daily log and trend/timeline views clearly present both nutrition and training.
