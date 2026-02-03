---
description: Installs the Antigravity Premium UI Stack (Framer Motion, Sonner, Tailwind Merge, Lucide)
---

This workflow installs the standard UI/UX package for high-quality applications.

1. Install the dependencies
// turbo
npm install framer-motion clsx tailwind-merge sonner lucide-react

2. Setup instructions
- Import `Toaster` from `sonner` and place it at the root of your app.
- Use `clsx` and `tailwind-merge` (often combined as a `cn` utility) for dynamic classes.
- Use `framer-motion` for all enter/exit animations.
