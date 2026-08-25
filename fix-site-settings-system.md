# Project Plan: Fix All Site Settings & SMTP Relay System

## 1. Goal
Fix all Site Settings completely, ensuring 100% functionality and reliable persistent storage across Firestore, Convex, and LocalStorage so all settings (General, Channels & Support, Homepage Hero, Notice Modal, SEO, and SMTP Relay) are saved, loaded, and maintained consistently.

## 2. Domains & Assigned Specialized Agents
- `project-planner`: Architecture & data sync plan
- `database-architect` / `backend-specialist`: Triple-tier persistence & Convex mirror
- `frontend-specialist`: `SiteSettingsManager.tsx` UI enhancements, provider presets, and SMTP relay controls
- `test-engineer`: Verification, type checking, and build validation

## 3. Key Solutions
1. **Multi-Tier Persistence in `useSiteSettings.ts`**:
   - Merge Firestore records with LocalStorage and default fallback values.
   - Synchronous LocalStorage write on save to prevent any flicker or data loss.
   - Convex mirroring for backup across all 40+ configuration keys.
   - CustomEvent broadcast for instant reactive UI updates.
2. **SMTP Relay & Presets in `SiteSettingsManager.tsx`**:
   - Master Email Dispatch toggle with active/disabled badges.
   - 1-click provider presets for SendGrid, Gmail, Brevo, Resend, and Custom SMTP.
   - Secure password reveal toggle.
   - Real-time verification test sender.
3. **Flawless Save Lifecycle**:
   - Clean dirty state management, logo asset uploading, and feedback notifications.
