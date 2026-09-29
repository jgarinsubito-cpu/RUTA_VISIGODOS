# Mindtrip browser evidence

Captured 29 September 2026 using headless Chrome in an isolated, unauthenticated session. Desktop 1440×1000; mobile browser viewport 390×844. Screenshots are research evidence, not app mockups or assets for redistribution.

| Capture | URL/action | Result |
| --- | --- | --- |
| 01-homepage | https://mindtrip.ai/ | Public desktop landing page rendered |
| 02-home | https://mindtrip.ai/home?search=trip | Empty application surface in this session |
| 03-inspiration | https://mindtrip.ai/inspiration | Empty application surface in this session |
| 04-chat | https://mindtrip.ai/chat | Initial empty surface |
| 05-chat-wait | Wait at chat | Human verification dialog appeared; not bypassed |
| 06-saved | https://mindtrip.ai/saved?tab=collections | Empty application surface in this session |
| 07-home-signin-entry | https://mindtrip.ai/ | Homepage before sign-in click |
| 08-signin-dialog | Click sign-in | Email/Google/Apple choices shown; nothing submitted |
| 09-mobile-home | https://mindtrip.ai/ | Mobile landing page rendered |

Each capture has a PNG screenshot and TXT accessibility snapshot. The attempted mobile menu click timed out and produced no successful capture 10. Blank views are an environment limitation, not a finding of failure for ordinary users.

The capture utility is `../tools/mindtrip-inspect.py`; JSON recipes sit alongside it. It uses a temporary Playwright installation at `%TEMP%/visigoths-browser-tools` and installed Chrome. No personal browser profile or authenticated storage state was used. See [analysis](../../research/MINDTRIP-FLOW-ANALYSIS.md) for evidence classification and conclusions.
