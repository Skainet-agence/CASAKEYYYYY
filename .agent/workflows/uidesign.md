---
description: Ce workflow est utilisé pour booster drastiquement le design de notre projet a un niveau dev senior. Il améliore la plupart des éléments pour intégrer des design soigné, des animations, des boutons....
---

---
description: Installs the Ultimate 'Silicon Valley' UI Stack (Framer Motion, CVA, Sonner, Tailwind Animate)
---

This workflow installs the exact technical foundation used by top modern companies (Vercel, Linear, Stripe vibe) to build "God Tier" interfaces.

1. Install the "God Tier" Design Stack
// turbo
npm install framer-motion clsx tailwind-merge sonner lucide-react class-variance-authority tailwind-animate

2. Setup The Architecture (Critical Steps)
- **Utils**: Create a `lib/utils.ts` file to export a `cn()` helper (combining `clsx` and `tailwind-merge`). This is standard practice.
- **Components**: Use `class-variance-authority` (CVA) to build strongly typed component variants (e.g., Primary/Secondary/Ghost buttons).
- **Animations**: 
  - Use `framer-motion` for complex physics, layout transitions, and shared element animations.
  - Use `tailwind-animate` for quick CSS-based entry/exit effects (fade-in, slide-in).

3. Design Guidelines (The "Secret Sauce")
- **Typography**: Always use high-quality sans-serif fonts like 'Inter', 'Geist', or 'SF Pro' (Apple).
- **Depth**: Use multiple layers of shadows and glassmorphism (backdrop-blur) for a premium feel.
- **Feedback**: Never block the user. Use `Sonner` for non-intrusive toast notifications.
- **Micro-interactions**: Every button click or hover should have a subtle scale or color shift.