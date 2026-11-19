# Site merge checklist

Goal: one site (new prototype look) with every feature from the live site and the prototype.
Base: live site `public/index.html`. Prototype visuals are ported in.
Status: TODO / DONE. Each item is checked in a browser before it is marked DONE.

## From the live site (`public/index.html`)
- [ ] Hero with 3D matrix modes (Quantum Orb, Digital Architecture, Hybrid Universe) (`#hero`)
- [ ] Currency switch USD/INR, desktop and mobile (`#currencyToggleDesktop`, `#currencyToggleMobile`)
- [ ] Services section, 11 services with "Ask Aetheria about ..." buttons (`#svc-web` ... `#svc-video`)
- [ ] Industries section, linking to the 20 industry pages (`#industries`, `/industries/*.html`)
- [ ] Technology section (`#technology`), Showcase (`#showcase`), About (`#about`)
- [ ] Ad planner and budget slider (`#ad-planner`, `#budgetSlider`, `#budgetResults`)
- [x] SEO checker, calls `/api/audit` (ported to new-look as page-seo) (`#seo-check`, `#seoForm`, `#seoResult`)
- [x] Aetheria chat, calls `/api/advisor` (wired on new-look) (`#aiPanel`, `#advPanel`, `#advFab`)
- [ ] Clow chat, calls `/api/chat` (`#aiFab`, `#aiPanel`)
- [ ] "Send this chat to our team" button (`.ai-team`)
- [ ] Login, sign-up and reset modal (`#loginOverlay`, `#authForm`, `#forgotBtn`)
- [ ] Profile modal (`#profileForm`, `#profileOverlay`)
- [ ] Subscribe / newsletter (`#subEmail`, `#subSignup`)
- [ ] Account view (`#view-account`) and sign-out
- [ ] Pricing view (`#view-pricing`) and Subscribe view (`#view-subscribe`)
- [ ] Privacy view (`#view-privacy`), Terms view (`#view-terms`), Refund (`#refund`), Cookie policy (`#cookie-policy`)
- [ ] Cookie banner (`#cookieBanner`, `#cookieAccept`, `#cookieDecline`)
- [ ] Side notice (`#sideNotice`), 404 view (`#view-404`)
- [ ] Back to top, scroll progress, page loader, mobile menu
- [ ] Footer with email link (`#footerEmailLink`) and copy-email button (`#copyEmailBtn`)
- [ ] WhatsApp us, "Ask Clow for a price", "Talk to Aetheria" floating buttons
- [ ] Phone +91 87773 24473, email CidexInfotech1@gmail.com

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
- [ ] Email form (`#eMlEmail`, `#eSub`), subscribe (`#subEmail`, `#subForm`)
- [ ] Contact: email must be CidexInfotech1@gmail.com (prototype had team@cidexinfotech.com, to be fixed)

## Conflicts (decided)
- Chats: Worker-backed chats kept, prototype's scripted replies removed.
- Account: prototype's input-driven account page kept; live login/profile marked preview-only (no backend).
- Budget tools: live ad planner and prototype calculator both kept as separate pages.
- Legal: one privacy page and one terms page, plus refund and cookie pages.
- Contact form: still sends nothing in either version; flagged, not changed.
