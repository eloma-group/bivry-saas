# BIVRY - Fleet Management SaaS

A production-ready, authenticated **SaaS dashboard** for fleet management, built to feel
like Stripe / Linear / Vercel / Ramp - minimal, premium, enterprise-grade.

Only the **Driver Onboarding** module is functional. Every other sidebar menu is rendered
realistically but is disabled (cursor-not-allowed, reduced opacity, "Coming soon" tooltip).

## Tech stack

- **React 18** + **TypeScript** (strict)
- **Vite**
- **TailwindCSS** (single blue accent, soft shadows, 20px rounded cards)
- **shadcn/ui**-style primitives on **Radix UI**
- **React Hook Form** (validation, field arrays, live progress)
- **Framer Motion** (page fade, card stagger, hover lift, success check, micro-interactions)
- **Lucide React** icons · **Sonner** toasts · **date-fns**

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Driver Onboarding - features

- Horizontal **animated stepper** with live overall completion %
- **9 sections**: Personal, Address, Licence, Driving History, Police, Visa, Medical,
  Drug Test, Additional Documents
- **Live webcam capture** (`getUserMedia`) for profile photo + licence front/back -
  preview → capture → retake → save
- **Automatic date logic**
  - Licence "days remaining" with green / orange / red badge
  - Driving history expiry = issue date + 6 months (read-only)
  - Drug test → "Valid" once uploaded (no expiry)
- **Conditional rendering**
  - "Same as current address" toggles the permanent-address block
  - Visa section auto-hides for Australian nationals
- **Sticky summary card**: completion %, documents uploaded, expiry alerts, driver name,
  licence / medical / police / visa status
- **Real-time validation**: required fields, email, phone, licence - inline errors + toast
- Fully **responsive**: sidebar → drawer, stepper → horizontal scroll, single-column forms,
  summary moves below the form on mobile

## Structure

```
src/
  components/
    layout/     sidebar/ · navbar/ · DashboardLayout · Logo
    driver/     DriverOnboarding · Stepper · ExpiryBadge · AvatarUpload · SuccessDialog
      forms/    reusable Fields + one component per section
      upload/   FileUpload · FormUpload (reusable)
      camera/   CameraCapture (reusable webcam dialog)
      summary/  SummaryCard (sticky)
    ui/         shadcn-style primitives (button, input, select, dialog, …)
  hooks/        useCamera · useDriverProgress
  pages/        DriverOnboardingPage
  types/        driver · nav
  utils/        date · validation
  constants/    navigation · options
  lib/          utils (cn)
```

## Notes

- Uploads and camera captures are held in-memory as data URLs (no backend) and submit is
  simulated - wire `onSubmit` in `DriverOnboarding.tsx` to your API.
- Brand assets live in `public/brand/`.
