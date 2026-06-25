## Twinova Career Companion — Build Plan

Building on top of the existing AI twin app, add a career-focused layer with onboarding, AI-generated learning roadmap with skill gap analysis, and a weekly action plan. Conversational intake reuses the existing chat (the AI will also ask career questions and update the profile).

### 1. Database (one migration)

- `career_profiles` — one row per user: current_role, target_role, education_level, skills (text[]), interests (text[]), weekly_hours, notes.
- `learning_roadmaps` — generated roadmap JSON: title, summary, skill_gaps (jsonb), milestones (jsonb), generated_at.
- `weekly_action_plans` — week_start, plan (jsonb of daily tasks), progress (jsonb), generated_at.

All tables: GRANTs to authenticated + service_role, RLS scoped to `auth.uid() = user_id`, plus updated_at trigger.

### 2. Edge functions (Lovable AI Gateway, `google/gemini-3-flash-preview`)

- `generate-roadmap` — input: profile → returns `{ summary, skill_gaps: [{skill, level, why}], milestones: [{title, duration_weeks, resources, outcomes}] }`. Saves to `learning_roadmaps`.
- `generate-weekly-plan` — input: profile + latest roadmap + recent mood/behavior → returns 7-day plan with short, actionable tasks plus proactive nudges (e.g. anti-procrastination tip). Saves to `weekly_action_plans`.
- Extend existing `ai-chat` system prompt so it also asks career questions and can call (instructionally) "update your profile" — keeps short + emoji style.

### 3. Frontend

- New page `/career` (Twinova hub) with tabs: **Profile**, **Roadmap**, **This Week**.
  - Profile tab: quick form (zod-validated) — current role, target role, skills chips, interests, weekly hours. Save updates `career_profiles`.
  - Roadmap tab: "Generate roadmap" button → renders skill gaps + milestone timeline. Re-generate button.
  - This Week tab: "Generate weekly plan" → 7-day card list with checkboxes (progress saved) and a proactive nudge banner.
- Add a "Career" nav entry/button in the existing Dashboard header.
- Light rebrand touch: app name shown as "Twinova" in header (keeps existing design system tokens — no color overhaul).

### 4. Tech notes

- All edge functions: CORS, zod input validation, `verify_jwt = false`, registered in `supabase/config.toml`.
- Guest mode: career features require sign-in (gated with friendly prompt) since they persist per user.
- Reuse existing shadcn components + semantic tokens; no new color hardcoding.

### Out of scope (this iteration)

Resume upload/parsing, interview prep mode, internship recommendations — can be added next.
