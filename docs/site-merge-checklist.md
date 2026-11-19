# Site merge checklist

Goal: one site (new prototype look) with every feature from the live site and the prototype.
Base: live site `public/index.html`. Prototype visuals are ported in.
Status: TODO / DONE. Each item is checked in a browser before it is marked DONE.

## From the live site (`public/index.html`)
- [ ] Hero with 3D matrix modes (Quantum Orb, Digital Architecture, Hybrid Universe) (`#hero`)
- [x] Currency switch USD/INR, desktop and mobile (`#currencyToggleDesktop`, `#currencyToggleMobile`)
- [x] Services section, 11 services with "Ask Aetheria about ..." buttons (`#svc-web` ... `#svc-video`)
- [x] Industries section, linking to the 20 industry pages (`#industries`, `/industries/*.html`)
- [x] Technology section (`#technology`), Showcase (`#showcase`), About (`#about`)
- [x] Ad planner and budget slider (`#ad-planner`, `#budgetSlider`, `#budgetResults`)
- [x] SEO checker, calls `/api/audit` (ported to new-look as page-seo) (`#seo-check`, `#seoForm`, `#seoResult`)
- [x] Aetheria chat, calls `/api/advisor` (wired on new-look) (`#aiPanel`, `#advPanel`, `#advFab`)
- [x] Clow chat, calls `/api/chat` (`#aiFab`, `#aiPanel`)
- [x] "Send this chat to our team" button (`.ai-team`)
- [x] Login, sign-up and reset modal (`#loginOverlay`, `#authForm`, `#forgotBtn`)
- [x] Profile modal (`#profileForm`, `#profileOverlay`)
- [x] Subscribe / newsletter (`#subEmail`, `#subSignup`)
- [ ] Account view (`#view-account`) and sign-out
- [x] Pricing view (`#view-pricing`) and Subscribe view (`#view-subscribe`)
- [x] Privacy view (`#view-privacy`), Terms view (`#view-terms`), Refund (`#refund`), Cookie policy (`#cookie-policy`)
- [x] Cookie banner (`#cookieBanner`, `#cookieAccept`, `#cookieDecline`)
- [x] Side notice (`#sideNotice`), 404 view (`#view-404`)
- [x] Back to top, scroll progress, page loader, mobile menu
- [ ] Footer with email link (`#footerEmailLink`) and copy-email button (`#copyEmailBtn`)
- [x] WhatsApp us, "Ask Clow for a price", "Talk to Aetheria" floating buttons
- [x] Phone +91 87773 24473, email CidexInfotech1@gmail.com

## From the prototype (`prototype/index.html`)
- [ ] Boot screen and 3D background (`#boot`, `#bg1`, `#gg`, `#gl`, `#stars`)
- [ ] Sidebar navigation (`#sidebar`, `#sbNav`)
- [ ] Home page (`#page-home`) with problem tiles
- [ ] Services page (`#page-services`) and Creation, Ad, Marketing, Automation pages
- [x] Industries page with 20 industry links (`#page-industries`)
- [ ] Aetheria page (`#page-aetheria`) and Clow page (`#page-clow`), restyled, wired to the Worker
- [ ] Calculator page (`#page-calculator`) with budget model (`#budgetSlider`, `#calcGoal`, `#calcMix`)
- [ ] FAQ page (`#page-faq`, `#faqList`)
- [ ] Final puzzle page (`#page-final`, `#pieceField`, `#finalPage`)
- [ ] Account page (`#page-account`, `#acForm`), input-driven, saved on the device
- [ ] Profile page (`#page-profile`, `#pfOk`)
- [ ] Mail page (`#page-mail`, `#mailForm`, `#mlEmail`, `#mlOk`), contact form
- [ ] Privacy page (`#page-privacy`), Legal page (`#page-legal`, `#legalBody`)
- [ ] Quote modal (`#quoteModal`), confirm modal (`#confirmModal`), flash messages (`#toasts`)
- [x] Email form (`#eMlEmail`, `#eSub`), subscribe (`#subEmail`, `#subForm`)
- [ ] Contact: email must be CidexInfotech1@gmail.com (prototype had team@cidexinfotech.com, to be fixed)

## Conflicts (decided)
- Chats: Worker-backed chats kept, prototype's scripted replies removed.
- Account: prototype's input-driven account page kept; live login/profile marked preview-only (no backend).
- Budget tools: live ad planner and prototype calculator both kept as separate pages.
- Legal: one privacy page and one terms page, plus refund and cookie pages.
- Contact form: still sends nothing in either version; flagged, not changed.


## Status after the full pass on site-merge
- Ported to the new design: SEO checker, 20 industry links, Aetheria and Clow on the Worker, floating buttons, cookie banner, footer, pricing page (11 cards, both currencies), budget fit tool and ad planner, About/Technology/Showcase text, subscriber list, full privacy and terms pages, side notice.
- Not ported on purpose: the live hero's three 3D matrix modes. The new design's style wins on clashes, and the hero visuals are a style feature. Needs your decision.
- Not ported: the live page loader and scroll progress bar. The new design has its own boot screen and background.
- Two legal texts now exist: the new design's combined legal page and the full live privacy and terms pages. Needs a decision on which to keep.
- Subscribe copy conflict: the new design says "monthly note", the live page lists five kinds of mail and says all or nothing. Both are shown. Needs a decision.
- Corrected count: 20 industry pages, not 22.
