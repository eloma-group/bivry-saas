# BIVRY SaaS - Project Rules (MANDATORY)

These rules are non-negotiable. Follow every one on every change, in code, comments,
UI copy, commits, and docs.

## 1. No em-dashes

- Never use em-dash (`—`) or en-dash (`–`). Use a simple hyphen (`-`) only.
- Applies everywhere: source code, comments, UI text, README, commit messages, PRs.

## 2. Responsive on every screen size

- Must look correct on **mobile, tablet, desktop, 1.5K, 2K, and 4K** screens.
- On screens larger than desktop the layout must **keep the desktop design and scale to
  fill the width**. Do NOT center the content in a narrow column with large empty margins
  (no big bezels / gutters on the left and right).
- No fixed `max-width` cap that leaves the page centered with blank sides on large
  monitors. The app should fill the available width the same way it does on desktop.
- Breakpoints: `sm` mobile-up, `md` tablet, `lg` desktop, and fluid scaling beyond.

## 3. Smooth 120 fps scrolling

- Scrolling must stay buttery (target 120 fps). Keep it GPU-friendly:
  - Prefer `transform` / `opacity` for animations; avoid animating layout properties.
  - Avoid heavy synchronous scroll listeners; use CSS sticky and IntersectionObserver.
  - Keep `backdrop-blur` and large box-shadows off elements that repaint during scroll.
  - Respect `prefers-reduced-motion`.

## 4. Git / commits

- When pushing code, **do NOT add Claude as a co-author**. No `Co-Authored-By: Claude`
  trailer and no "Generated with Claude Code" line in commits or PR bodies.

---

Keep these in sync with any future automation. If a change would violate a rule, fix the
change - do not weaken the rule.
