# Skills shortlist for Ruta Visigoda

**Current status (29 September 2026)**

| Skill | Kind | Status |
| --- | --- | --- |
| `heritage-content` | Project skill, [.claude/skills](../.claude/skills/heritage-content/SKILL.md) | Active — covers the proposed `heritage-content-validation` rules below, grounded in the demo catalog and its tests |
| `planner-change` | Project skill, [.claude/skills](../.claude/skills/planner-change/SKILL.md) | Active — first version of the proposed `route-feasibility-review`; revisit once routes are field-verified |
| `app-smoke-test` | Project skill, [.claude/skills](../.claude/skills/app-smoke-test/SKILL.md) | Active — browser smoke test and screenshots |
| `android-visit-field-test`, `destino-import-review` | Proposed project skills | Not written — need device results and legacy sample exports first |
| External skills in the table below | Third-party | Not installed — installation needs an explicit decision and a review of each revision |

Research date: 29 September 2026. Scope: discover and assess development skills for the proposed web/Android heritage app. No new skills were installed. The existing find-skills skill was used for discovery.

**Recommended starting set**

Start with four complementary skills: frontend-design for implementation styling, web-design-guidelines for interface review, vercel-react-best-practices for performance, and capacitor-best-practices for the Android prototype. Add accessibility and testing skills when building the first complete flow. Avoid loading several competing aesthetic systems into the same task.

The CLI searches covered web design, Capacitor and accessibility. Results were filtered by project relevance rather than installation counts. Linked skill listings were inspected; the actual repository files were also checked for frontend-design, web-design-guidelines, capacitor-best-practices and the Capacitor offline/push/testing candidates. This was a scope/content assessment, not a full security audit or validation of every example. One accessibility search encountered an npm cache collision and succeeded on retry; no skill installation was needed.

| Skill | Project use | Assessment and constraints |
| --- | --- | --- |
| [anthropics/skills — frontend-design](https://skills.sh/anthropics/skills/frontend-design) | Turn the Urbs Regia direction into intentional React layouts | Strong fit for typography, composition and visual identity. Project references take precedence over generic aesthetic preferences; do not let stylistic novelty reduce outdoor usability |
| [vercel-labs/agent-skills — web-design-guidelines](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines) | Review implemented UI for interaction and usability issues | A review skill, not a substitute for design research. It fetches current external guidelines during review; record the version/date used for reproducibility |
| [vercel-labs/agent-skills — vercel-react-best-practices](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) | Reduce loading waterfalls, heavy bundles and avoidable rendering work | Useful for maps/media on slower devices. Apply server guidance to the web/backend, not indiscriminately to the bundled Android client |
| [cap-go/capgo-skills — capacitor-best-practices](https://skills.sh/cap-go/capgo-skills/capacitor-best-practices) | App structure, native bridge, configuration and release considerations | Relevant vendor-authored guidance. Reviewed examples include vendor plugins, unconditional latest-version advice and a largeHeap setting; evaluate these individually rather than copying defaults. Pin compatible tested versions |
| [addyosmani/web-quality-skills — accessibility](https://skills.sh/addyosmani/web-quality-skills/accessibility) | Focus, screen-reader names, keyboard use, contrast and control alternatives | Good fit for maps, sheets, audio and itinerary editing. Automated scores do not establish full conformance; add manual TalkBack/keyboard checks |
| [anthropics/skills — webapp-testing](https://skills.sh/anthropics/skills/webapp-testing) | Browser interaction tests and visual inspection of the web flow | Use for route creation, source drawers and denied-location fallback; browser tests do not cover native background lifecycle |
| [cap-go/capgo-skills — capacitor-offline-first](https://skills.sh/cap-go/capgo-skills/capacitor-offline-first) | Route-pack caching, local persistence and synchronization design | Verify plugin/storage choices against our data/version model. Cached hours must retain timestamps; offline AI/live availability must not be implied |
| [cap-go/capgo-skills — capacitor-push-notifications](https://skills.sh/cap-go/capgo-skills/capacitor-push-notifications) | Push setup, permission handling and message delivery | Validate against current Android/Capacitor docs. Push, local reminders and geofence triggers are separate mechanisms |
| [cap-go/capgo-skills — capacitor-testing](https://github.com/cap-go/capgo-skills/blob/main/skills/capacitor-testing/SKILL.md) | Native/plugin test strategy and mobile integration checks | Repository file verified when the listing could not be opened. Prioritize real-device lifecycle tests and important rules rather than implementing every suggested test framework |

**Install references**

These commands are provided for a later installation decision; none were executed. Select individual skills rather than installing entire repositories indiscriminately. Confirm target agent and project/user scope during installation.

```powershell
npx skills add anthropics/skills --skill frontend-design
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills add cap-go/capgo-skills --skill capacitor-best-practices
npx skills add addyosmani/web-quality-skills --skill accessibility
npx skills add anthropics/skills --skill webapp-testing
npx skills add cap-go/capgo-skills --skill capacitor-offline-first
npx skills add cap-go/capgo-skills --skill capacitor-push-notifications
npx skills add cap-go/capgo-skills --skill capacitor-testing
```

Before adoption, inspect the exact revision, dependencies, license and scripts; record the revision used. Skills are instructions and examples, not an architectural authority or evidence that a plugin works on our devices. A skill's vendor preferences do not select our hosting, storage, update service or paid provider.

**Capabilities still needed beyond generic skills**

| Capability | Proposed project-specific guidance | Required evidence |
| --- | --- | --- |
| Heritage reliability | `heritage-content-validation`: D/I/H/T, provenance, publication and supersession rules | Approved editorial examples, claim schema, reviewer decisions |
| Planner feasibility | `route-feasibility-review`: windows, durations, routing, access unknowns, infeasible results | Field-verified routes and meaningful constraint cases |
| Android field behavior | `android-visit-field-test`: arrival alerts, permissions, offline packs, reboot/battery tests | Physical-device results and plugin/API contracts |
| Legacy isolation | `destino-import-review`: staging, identifier mapping, quarantine, repeatability, rollback | Sample exports and ownership agreements |

These are proposed custom skills, not existing packages found or created during this research. Write them only once their workflows and examples are stable; until then capture the requirements in schemas, tests and architecture decisions. Existing skill-creator capability can support that later work.

The team still needs cultural editorial expertise, field validation, product/interaction design, web/Android engineering, accessibility evaluation and operational ownership. Agent skills support those disciplines but do not replace named reviewers or device testing.

**Suggested use by milestone**

1. Prototype: frontend-design, followed by web-design-guidelines. Retain Urbs Regia's identity and the market study's task hierarchy.
2. First complete web route: React performance guidance, accessibility, and focused browser testing.
3. Android spike: Capacitor best practices and native testing; inspect official platform documentation for the chosen APIs.
4. Offline/notification milestone: add the corresponding focused skills after storage/provider choices are concrete.
5. Editorial and planner stabilization: consider small project-specific skills grounded in real accepted examples.

Skill discovery is complete enough to begin the prototype; installation and implementation remain separate actions.
