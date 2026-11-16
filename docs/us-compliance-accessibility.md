# US launch: accessibility, compliance and product flows

Written 13 Nov 2026, after the stakeholder shared Headspace as a reference and confirmed the client is US-based. Headspace was studied for **business model and flows only**; nothing from its UI, copy or artwork is reused.

---

## 1. What changes because the client is in the US

SOW v1.3 was written for a different legal position. These lines no longer fit a US client and need a change request or a decision from NFF's counsel:

| SOW today | Why it matters for a US client | Decision needed from |
|---|---|---|
| Privacy "aligned to GDPR and the DPDP Act" (§6 #5) | US law is state by state: CCPA/CPRA (California), plus Colorado, Connecticut, Virginia, Texas, Oregon and others. Meditation and mental-wellbeing data can be **consumer health data** under Washington's My Health My Data Act and Nevada SB 370: they need separate consent, their own privacy policy and a deletion right. The FTC Health Breach Notification Rule (amended 2024) covers wellness apps. | NFF legal |
| "Accepted web accessibility practice, without certification" (§4, §13) | ADA Title III cases against US websites use WCAG 2.1/2.2 AA as the benchmark. A named target (WCAG 2.2 AA, with AAA where feasible) protects the client better than "accepted practice". | NFF + iProgrammer (change request) |
| AWS region ap-south-1 (Mumbai) (§13) | No US law requires US hosting, but US users' health-adjacent data sitting in India must be named in the privacy notice. Some US enterprise or health-plan buyers will require US hosting. | NFF legal |
| "Free previews · No card needed · **Cancel anytime**" (home hero and detail pages) | The SOW has no paid plan. "Cancel anytime" implies a subscription. Under the FTC Act, and the auto-renewal laws of California and other states, subscription wording must match a real offer. | Remove "Cancel anytime" unless a paid plan is added |
| No age rule in the SOW | COPPA applies if children under 13 can sign up. Headspace has kids' content; Meadow does not. | NFF: set a minimum age (13+ or 18+) in the terms, and add an age confirmation at sign-up |

---

## 2. Accessibility: WCAG 2.2 AAA

### An honest note on "AAA everywhere"
The W3C says plainly that full AAA conformance is not achievable for all content and is **not recommended as a site-wide requirement**. Some AAA criteria depend on the content itself, not on the build:
- 1.2.6: sign-language interpretation of every meditation.
- 1.2.7: extended audio description.
- 3.1.5: a lower-secondary reading level for every essay.

The defensible commitment is **WCAG 2.2 AA in full, plus every AAA criterion the product and build can meet**. That is what the work below does. The accessibility statement page (`/accessibility`, currently "coming soon") should say exactly this, once it has been tested. Claiming AAA conformance before testing would itself be a risk.

### Done in this pass (whole platform, through shared tokens and components)
| Criterion | Change |
|---|---|
| 1.4.6 Contrast (Enhanced), AAA | Every text token is now at least **7:1** on every light surface. Before, secondary text was 6.0–7.2, tertiary text 5.0–5.9, links 6.7, success and info text 6.5–6.8, and white text on hovered brand or status buttons 5.6–6.5. The inverse surfaces (dark green footer and bands) also reach 7:1: secondary was 5.7 and accent 6.2. Hard-coded light text in the home hero and About was fixed too. An in-browser scan of 10 public, practitioner and account pages finds no text below 7:1 (large text below 4.5:1). The scan skips text over photos and gradients. |
| 2.5.5 Target Size (Enhanced), AAA | `nff-target` gives every Button, Checkbox, Switch, Radio, Tab and Select a 44×44px pointer area without changing how it looks. Inputs are now 44px tall. No page scrolls sideways at 375px. |
| 3.2.5 Change on Request, AAA | The sign-in code no longer submits by itself when the sixth digit is typed; the person presses Log in. |
| 3.3.8 / 3.3.9 Accessible Authentication, AA/AAA | Sign-in uses an emailed code with paste and `one-time-code` autofill. There is no password to remember and no puzzle. |
| 3.3.7 Redundant Entry, A | The email typed at log-in carries over to sign-up, and back. |
| 3.3.1 / 3.3.3 Error identification and suggestion | Code errors say how many tries are left. A locked email says how long the pause lasts. An unknown email offers sign-up. |

### Still to do (AA or A level, so these come first)
1. **1.2.1 Audio-only (A): meditations need transcripts.** Audio without a transcript fails WCAG at the lowest level. The fix needs a CMS transcript field (meditation editor) and a "Read transcript" disclosure on the player and detail page. This is **not in SOW v1.3**, so it needs a change request. NFF supplies the text.
2. **1.4.7 Low or No Background Audio (AAA):** a content rule for NFF. Background music in meditations should be 20 dB below the voice, or offered as a voice-only track.
3. **2.4.9 Link Purpose (link only) (AAA):** remove "Learn more" and "See all" links whose purpose is unclear out of context, or give them visually hidden context.
4. **2.4.13 Focus Appearance (AAA):** the focus ring is already 2px at 3:1+. Check the custom components in the CMS rebuild.
5. **3.3.6 Error Prevention (All) (AAA):** every destructive CMS action needs a confirm step or undo. The CMS revamp session has been briefed.
6. **Accessibility statement and feedback route:** publish `/accessibility` with the target, the known gaps and a contact for reporting issues. This is standard practice for US ADA risk.
7. **Manual testing:** run VoiceOver (Safari) and NVDA (Firefox) through sign-up, the player and the CMS. Test keyboard-only use, 200% and 400% zoom, and reduced motion. No automated scan replaces this.

---

## 3. US privacy: done and to do

**Done**
- **Global Privacy Control:** a GPC signal from the browser is honoured as an opt-out. Analytics stay off, the banner doesn't ask, and the cookie preferences page explains why. California's CCPA regulations (§7025), Colorado and Connecticut require this.
- The footer link now reads **"Your privacy choices"**, the label US regulations recognise.

- **Sample legal pages** at `/privacy`, `/terms` and the new `/cookies`. Each page has a contents list, a last-updated date, is printable (the CCPA asks for this) and carries a visible "Sample text for the demo" notice. Anything NFF must supply (legal entity, address, minimum age, governing law, retention periods, email provider) is shown as a highlighted placeholder in brackets.
  - The privacy policy follows the CCPA/CPRA sections: a notice-at-collection table, sharing, no sale or sharing, retention, rights, how to use them, authorised agents and GPC.
  - The terms include the "not medical care" statement with the 988 and 911 crisis numbers.
  - The cookie policy lists the real browser storage and the GA4 `_ga` and `_ga_<ID>` cookies (2 years by default, per Google's documentation).
  - The footer now links Privacy policy, Terms of use, Cookie policy and Your privacy choices.

**To do (needs legal text from NFF)**
- A California "Notice at Collection" at sign-up, and a CA privacy notice linked in the footer.
- A consumer health data privacy policy and a separate consent, if NFF's counsel decides Washington MHMDA applies.
- **CAN-SPAM for the daily email:** a physical postal address in every email, a clear sender, and unsubscribe honoured within 10 business days. The unsubscribe page already exists.
- **Crisis resources:** wellbeing products in the US normally state that they are not a substitute for professional care, and point to the **988 Suicide & Crisis Lifeline**. Headspace does this. NFF to supply the wording.

---

## 4. What we learned from Headspace (business and flows, within SOW scope)

| Headspace pattern | Meadow today | Recommendation |
|---|---|---|
| **Identifier-first sign-in**: email first, then the method. Sign-up and log-in are linked from each other. SSO for organisations. | Done this week: email, then a 6-digit code; no password and no social sign-in (SOW §3.2). | Keep. SSO for organisations is a later phase. |
| **Intent-first entry**: "What kind of headspace are you looking for?" (stress, sleep, anxiety, focus…) | The home page has "Where would you like to begin?" with the four categories. | Keep the same idea, and make each choice land on a filtered library view. |
| **Try before signing up**: a short audio plays right on the landing page. | Free preview tracks (SOW §3.1). | Put one preview player on the home page above the fold. |
| **Article anatomy**: breadcrumb, published and updated dates, author, "In this article" contents list, key takeaways, a short meditation inside the article, related meditations, then similar articles. | Explorations have a reader and related items. | Add an "In this article" contents list, which also helps with WCAG 2.4.5 and 2.4.10. Show the updated date. A "Key takeaways" block needs CMS content, so check the SOW first. |
| **Footer privacy links**: Privacy, Cookie policy, CA Privacy Notice, Your privacy settings. | Privacy, Terms, Accessibility, "Your privacy choices". | Add the CA notice once NFF supplies it. |
| **Not for Meadow**: discount banners, AI chat, therapy, download and "minutes meditated" counters, streaks. | — | Out of scope. The counters would be invented stats, and streaks were ruled out. |

---

## 5. Who owns what
- **iProgrammer (build):** the accessibility work in §2, GPC, consent UX, the transcript feature once a change request is agreed, and the accessibility statement page structure.
- **NFF (content and legal):** privacy, CA and health-data notices; terms with an age rule; crisis wording; meditation transcripts; the background-audio mix; the final text of the accessibility statement.
- **Joint decision:** the WCAG target named in a SOW change, the AWS region, and removing "Cancel anytime".
