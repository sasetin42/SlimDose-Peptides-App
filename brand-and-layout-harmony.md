# Implementation Plan: Brand and Layout Harmony

This plan outlines the steps required to align the styling, branding, and layout consistency across the Header, Footer, and page layouts of the SlimDose website, ensuring a professional, premium visual design and seamless dark/light mode transitions.

## Goal
Improve and enhance the website's layout and design details to be highly professional and consistently branded, ensuring layout alignments (container widths, padding, responsive scaling) and colors match perfectly across the header, footer, and navigation.

---

## Project Info
- **Project Type**: WEB (React + Vite + TypeScript + Tailwind CSS)
- **Primary Agent**: `frontend-specialist`
- **Primary Skill**: `frontend-design`

---

## Success Criteria
- [ ] **Unified Layout Containers**: Both the Header and Footer use the standard `.container-global` layout wrapper (maximum width `1400px`, centered, `2rem` (`px-8`) horizontal padding) so their boundaries align vertically on all screen sizes.
- [ ] **Semantic Branding Tokens**: Replace hardcoded `#3C6CA8` blue hex color in CSS/TypeScript styles with CSS variable `--theme-accent` or a dedicated Tailwind configuration token to allow native adaptation in dark mode (`#60A5FA` / blue-400).
- [ ] **Seamless Layout Transitions**: Fix conditional rendering in `src/App.tsx` where the `Footer` was omitted on the Cart and Checkout views of the MainApp, providing a consistent layout baseline.
- [ ] **Polished Dark Mode Styling**: Ensure headers, menus, hover states, and borders transition beautifully with the global theme transitions.

---

## Tech Stack
- **Styling**: Tailwind CSS + Custom CSS Variables in `src/index.css`.
- **Framework**: React, TypeScript, React Router.
- **Icons**: Lucide React.

---

## Key Affected Files
- [src/components/Header.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/Header.tsx)
- [src/components/Footer.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/Footer.tsx)
- [src/components/SubNav.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/components/SubNav.tsx)
- [src/App.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/App.tsx)
- [src/index.css](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/SLIMDOSE%20Website/SlimDose%20Website-App/src/index.css)

---

## Task Breakdown

### Task 1: Refactor Header Layout Alignment
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `clean-code`
- **Priority**: High
- **Dependencies**: None
- **INPUT**: Current `Header.tsx` wrapper div (`max-w-[1400px] mx-auto w-full px-8`).
- **OUTPUT**: Header container aligned using the shared `.container-global` class.
- **VERIFY**: Check header markup is using the standard `container-global` CSS class, ensuring identical padding/gutters on responsive resizing.

### Task 2: Standardize Branding Colors & Variables in Header and SubNav
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `clean-code`
- **Priority**: High
- **Dependencies**: Task 1
- **INPUT**: Hardcoded `#3C6CA8` color references in `Header.tsx` and `SubNav.tsx`.
- **OUTPUT**: Replacement of hardcoded colors with `--theme-accent` CSS variable or dynamic classes that adapt to dark mode (using `var(--theme-accent)` or matching Tailwind utility colors).
- **VERIFY**: Open header in dark/light mode toggle. The accent colors, links, active bar, and category buttons must shift properly between primary brand blue (light) and vibrant soft blue (dark).

### Task 3: Align Footer Container Width and Spacing
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `clean-code`
- **Priority**: Medium
- **Dependencies**: None
- **INPUT**: Spacing and styling configuration of the footer.
- **OUTPUT**: Cleaned-up footer styling that adopts the identical border colors, container heights, and padding patterns of the header.
- **VERIFY**: Visually verify footer margins/alignments match the header layout exactly when scaled down or stretched.

### Task 4: Fix Persistent Footer Visibility on Views
- **Agent**: `frontend-specialist`
- **Skills**: `frontend-design`, `clean-code`
- **Priority**: Medium
- **Dependencies**: Task 3
- **INPUT**: `src/App.tsx` layout structure showing the conditional rendering of the Footer only on the menu view.
- **OUTPUT**: MainApp structure adjusted so `<Footer />` is rendered persistently at the bottom of the main layout, regardless of the active inner view (menu, cart, checkout), aligning it with the sub-page behavior.
- **VERIFY**: Switch between main page view, cart, and checkout. Check that the footer remains visible at the bottom of the page.

---

## Phase X: Final Verification

### 1. Verification Scripts
Run the styling and accessibility check scripts from the workspace tools:
```bash
# Run linting to ensure no code styling or syntactic issues
npm run lint

# Execute the UX and Accessibility Audits
python .agents/skills/frontend-design/scripts/ux_audit.py .
python .agents/skills/frontend-design/scripts/accessibility_checker.py .
```

### 2. Manual Checklist
- [ ] Verify that Header, SubNav, and Footer align perfectly at standard desktop breakpoints (1400px and above) and responsive viewports.
- [ ] Verify dark/light mode switches background colors, borders, and brand accents consistently.
- [ ] Socratic gate has been cleared.

### 3. Build Check
Ensure the project builds cleanly without typescript errors:
```bash
npm run build
```

## ✅ PHASE X COMPLETE
*(To be completed after implementation phase)*
- Lint: [ ]
- Security: [ ]
- Build: [ ]
- Date: [Pending]
