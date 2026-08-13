# Product Details Redesign Plan

- **Project Type:** WEB (React + Vite + Tailwind CSS)
- **Goal:** Redesign the product details layout to be premium, fully responsive, and split into 2 columns on desktop (exclusively when viewed as a full page).

## Success Criteria
- [ ] Mobile Layout: Single column.
- [ ] Desktop Layout: 2 columns (Left: Image + Shipping + Safety; Right: Product Meta + Purchase + Dosing + Bundles).
- [ ] Overlay Modal: Stays compact/single column or custom layout on mobile, but full page is the primary target for 2 columns.
- [ ] Interactive Elements: Active item highlights, hover transitions, and glassmorphism styling.
- [ ] Performance and Build: No lint errors, builds successfully.

## Tech Stack
- React, Tailwind CSS, Lucide icons, Framer Motion.

## File Structure
- `src/components/ProductDetailModal.tsx` - Reorganize layouts and inject styles.
- `src/components/ProductPage.tsx` - Outer container wrapper check.

## Task Breakdown

### Task 1: Analyze and Map Layout Structure
- **Agent:** explorer-agent
- **Skills:** clean-code
- **Input:** `src/components/ProductDetailModal.tsx`
- **Output:** Layout mappings and element boundaries for `topPurchaseSection`.
- **Verify:** Map corresponds to visual layers in image mock.

### Task 2: Implement 2-Column Responsive Layout
- **Agent:** frontend-specialist
- **Skills:** frontend-design, ui-ux-pro-max
- **Input:** `src/components/ProductDetailModal.tsx`
- **Output:** Updated layout grid `lg:grid lg:grid-cols-2 lg:gap-10` only for `asPage` mode.
- **Verify:** View locally on desktop and mobile viewports.

### Task 3: Visual Polish & Highlights
- **Agent:** frontend-specialist
- **Skills:** ui-ux-pro-max
- **Input:** Selection buttons, hover animations, glassmorphism cards.
- **Output:** Soft glows, smooth state transitions.
- **Verify:** Interaction feels responsive and premium.

### Task 4: Final Audits & Verifications
- **Agent:** test-engineer
- **Skills:** lint-and-validate
- **Input:** Modified files.
- **Output:** Compilation and lint verification.
- **Verify:** `npm run lint` finishes with code 0.

## Phase X: Final Verification
- [ ] Lint Check
- [ ] Local build validation (`npm run build`)
- [ ] Responsiveness check (mobile, tablet, desktop)
