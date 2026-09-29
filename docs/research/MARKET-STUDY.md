# Tourism app market study and UX recommendations

Research date: 29 September 2026. Project: Ruta Visigoda de Toledo Plus. Companion documents: [implementation plan](../PLAN.md) and [skills shortlist](../skills.md).

**Recommendation**

Position the product as a trusted cultural-route companion: plan a realistic visit, understand the heritage, and continue confidently on location. Combine a curated editorial identity with map-based planning and a simple active-visit screen. Keep the independent web-plus-Android architecture already proposed.

The strongest reference set for this particular brief is Wanderlog for itinerary/map coordination, VoiceMap for tour preparation, Bloomberg Connects for expert cultural interpretation, Komoot for offline preparation, and Urbs Regia for visual identity. This is a project-specific assessment, not a measured ranking of the tourism market.

**Research scope and confidence**

This is desk research using product-owned pages, support documentation, public interface illustrations, official tourism statistics, and a regional tourism portal. Three published UI images were downloaded and visually inspected: Wanderlog desktop itinerary, Wanderlog mobile map, and VoiceMap tour start. Other interface recommendations are inferred from documented features and page structure, not hands-on testing of their native apps.

No competitor account was created, paid subscription purchased, booking placed, or field usability study conducted. Marketing claims demonstrate positioning and advertised capabilities, not reliability. Missing evidence means unknown rather than absent. Prices, app-store ratings and install counts are not used to rank quality because they change, differ by market and do not establish suitability. All recommendations below are distinguished from observations; local demand and willingness to pay remain unvalidated.

**Market context and addressable demand**

Spain recorded approximately 96.8 million international tourist arrivals in 2025, up 3.2% in the cited provisional release. This establishes a large tourism context, but it is not the addressable market for a Toledo heritage app: arrivals are not unique potential users, and domestic visitors also matter. [INE, FRONTUR December/full-year 2025](https://www.ine.es/dyngs/Prensa/FRONTUR1225.htm).

The official Castilla-La Mancha tourism site already offers a directory of tourism apps, alongside archaeological, museum, rural and route discovery categories. A new regional directory alone would overlap existing provision. The stronger hypothesis is value from connecting specific heritage sites, approved explanations, feasible visits and local services. [Regional tourism apps directory](https://www.turismocastillalamancha.es/es/organizar-mi-viaje/apps).

There is no defensible numerical TAM/SAM/SOM estimate for this route in the supplied material or this research. Build a bottom-up model from annual/monthly unique visitors to the pilot sites, domestic/international split, participating accommodation reach, school groups, repeat visitors and actual referral traffic. De-duplicate people visiting multiple sites; do not add hotel nights to attraction admissions as though they were unique visitors.

For an adoption forecast, use: reachable eligible visits × exposure to the offer × activation rate × route-start rate. An illustrative sensitivity calculation of 10,000 exposures × 10% activation × 40% route start gives 400 starts. These inputs are hypothetical, not a forecast. Android installation is a separate conversion after web activation; do not require it to count someone as a successful user.

**Who we serve and who sustains it**

| Segment | Main job | Product implication | Validation question |
| --- | --- | --- | --- |
| Independent cultural visitors | Fit meaningful heritage into a day/weekend | Curated routes, timings, map, practical details | Will they choose a route and actually begin it? |
| Families | Keep a manageable pace and explain what children see | Short stories, breaks, accessible controls, optional later quiz | Can an adult use it with limited attention? |
| Heritage enthusiasts | Understand contested interpretations and linked objects/sites | Expandable sources, expert depth, origin relationships | Do provenance and uncertainty increase trust? |
| Visitors needing access information | Decide whether a visit is suitable | Specific terrain/access facts, dated evidence, contact fallback | Are unknowns and barriers clear before departure? |
| Schools and guided groups | Use coherent approved educational material | Later educator workflow and reusable content | Does it support the guide rather than interrupt the group? |
| Municipalities and cultural institutions | Maintain credible information and distribute visits | Scoped editing, accountable ownership, aggregate reporting | Who funds and performs continuing updates? |
| Local businesses | Receive relevant qualified visits/bookings | Current service records and traceable referrals | Will they keep availability/contact details current? |

The first four are visitor segments; the last two are potential partners/payers. Their incentives overlap but are not identical. Sponsored placement must not quietly override visitor suitability.

**Competitive landscape**

The table describes verified advertised capabilities and our proposed lessons. It does not assert that competitors lack functionality not covered by their cited pages.

| Product/category | Evidence from its own materials | Pattern worth adapting | Boundary for our project |
| --- | --- | --- | --- |
| [Wanderlog](https://wanderlog.com/) — general planner | Itinerary and map together; collaboration, reservations and offline trip access advertised | Day timeline coordinated with map pins; easy place-to-plan action | Start with two constrained cultural routes; avoid bringing its entire travel-management scope into the pilot |
| [Mindtrip](https://mindtrip.ai/) — AI travel discovery | Conversational planning with imagery, maps and flexible itineraries | Convert a question into visible place cards and proposed itinerary actions | Historical responses require approved evidence; conversation cannot establish opening times or feasibility |
| [VoiceMap](https://voicemap.me/) — self-guided audio tours | GPS-triggered audio, offline tours, start/pause/resume and multiple tour formats | Preparation screen, identifiable starting point, strong start/resume action | Retain the brief's tap-to-play stories; automatic audio is not adopted simply because a competitor uses it |
| [izi.TRAVEL](https://www.izi.travel/es/app) — city and museum audio | Indoor/outdoor guides and downloaded offline use | One content system spanning town, site and museum | Restrict publication to our validated scope; coverage size alone is not the objective |
| [Bloomberg Connects](https://www.bloombergconnects.org/faq/) — cultural guides | Free access to institution-produced audio/video and exhibition material | Editorial authorship and interpretation close to the object/place | Publicly funded/free cultural guides are a relevant substitute when evaluating a visitor paywall |
| [Smartify](https://smartify.org/partners/about) — cultural visitor platform | Object recognition origins and institutional engagement across the visit lifecycle | Link objects to stories and venues; connect pre-visit and on-site contexts | Recognition and CRM are later possibilities, not pilot requirements |
| [Komoot](https://support.komoot.com/hc/en-us/articles/360023078891) — outdoor route companion | Downloaded routes/maps support offline navigation | Explicit route preparation and offline readiness | Do not treat outdoor routing as proof of cultural opening-hour or accessibility feasibility |
| [GetYourGuide](https://www.getyourguide.com/en-gb/apps) — activities marketplace | Paperless access, offline functionality and upcoming-activity updates promoted | Clear booked-activity access and practical reminders | Partner transactions are later; avoid a new marketplace in the core pilot |
| [Civitatis](https://www.civitatis.com/es/app/) — Spanish-language activity commerce | Destination recommendations, saved plans and digital voucher/QR presentation | Clear activity detail and separation of saved versus confirmed plans | A saved route is not a reservation; keep confirmation states explicit |
| [Castilla-La Mancha tourism](https://www.turismocastillalamancha.es/es/organizar-mi-viaje/apps) — official destination discovery | Regional discovery structure and app directory | Locally meaningful categories and partner referral opportunities | Complement its coverage with route-specific depth and execution |

General maps, museum websites, printed information and human guides are also substitutes. A visitor can already assemble a trip using several tools. Our proposed advantage must be demonstrated as reduced effort and increased confidence, not merely more features.

**Competitive position and business model**

The defendable asset is the combination of approved claims, maintained practical data, narrative connections between sites and a tested local route network. Chat, map pins and attractive cards are readily reproducible. Editorial operations are therefore part of the product investment, not a one-time content upload.

Recommended initial model: institution/destination-funded service with free core visitor access, subject to confirmation of the deployment owner and operating budget. This is a hypothesis informed by the public-cultural brief and the availability of free cultural alternatives, not evidence of procurement demand. Later, evaluate transparent booking referrals or paid guided experiences. A recurring visitor subscription is a weaker initial fit for a short, infrequent local visit; test it before considering it.

Account for ongoing editorial verification, translations, audio production, support, hosting, map/routing calls, AI usage, Android maintenance and merchant onboarding. Model monthly cost as fixed operation/content costs plus usage-dependent costs; for any commission scenario, use confirmed bookings × net revenue per booking minus fulfilment/support costs. No competitor commission rates or unsupported revenue assumptions are inserted here.

| Strategic risk | Consequence | Response |
| --- | --- | --- |
| Too little unique utility | Visitors keep using familiar maps and websites | Lead with one complete curated route and measure time-to-plan/usefulness |
| Installation friction | Visitors leave before receiving value | Open directly on web; explain Android benefits after route selection |
| Stale operational records | An attractive itinerary becomes unusable | Named data owners, expiry rules and visible confirmation needs |
| Content bottleneck | Assistant coverage grows slower than UI scope | Publish fewer sites completely; measure unanswered questions |
| Weak institutional ownership | Funding and updates lapse after launch | Assign ongoing responsibilities and budget before public release |
| Fragile legacy integration | Visitor flow inherits Destino Plus failures | Owned content store and outage-tested adapters |

**Best UI patterns for this project**

“Best” here means understandable, reliable and usable during a cultural visit. Evaluate prototypes with a proposed rubric: task completion/clarity 30%, evidence and practical confidence 25%, on-site usability 20%, accessibility 15%, visual coherence 10%. Do not assign competitor scores until equivalent flows have been tested on devices.

The published Wanderlog desktop image visibly pairs a day list with numbered map markers and inter-stop travel information. Its mobile image uses a map above a bottom sheet with day selection. Adapt that relationship: selecting a stop highlights the same numbered pin; filtering a day updates both list and map; mobile exposes an equivalent list for people who cannot comfortably use a map. [Desktop source image](https://wanderlog.com/p/images/66eb305ad906ce7110b7274e_itinerary.png), [mobile source image](https://wanderlog.com/p/images/66e9a04a39a13429f398d85d_66be178e77ef3045dd0cda54_map_view_feature_tab_mobile.jpeg).

The VoiceMap published start screen visibly prioritizes a starting-place photo, distance to start, a large start action, directions and resume/virtual-playback options. Adapt its readiness hierarchy: show the starting site, route download status and a primary "Comenzar visita" or "Continuar visita" action. Relegate planning edits to secondary actions once a visit has begun. [Source image](https://media.voicemap.me/assets/home/app_feature/iphone-b44600376de883f959ed723fa501ce7ce89a5ae6954e832b753b03498d1a2ef0.webp).

These are promotional screenshots, not proof that every current Android screen looks identical. Local research copies are in `docs/evidence/`; they are competitor reference material, not assets to ship in our app.

| Surface | Proposed UI | Why it fits |
| --- | --- | --- |
| Explore | Compact location/search, heritage photograph, two route choices, relevant dated activities | Reduces initial decisions while retaining Urbs Regia's cultural identity |
| Route detail | Theme, stops, realistic duration, transport/access facts, date selection, primary "Adaptar ruta" | Lets a visitor judge fit before using chat |
| Plan | Day timeline linked to map; travel gaps and warnings visible | Shows what the proposed day actually entails |
| Active visit | Current stop, next stop, short story/audio action, progress, download/connection state | Prioritizes the immediate task outdoors |
| Site | One concise story followed by practical information and optional depth | Avoids forcing a choice between useful logistics and interpretation |
| Assistant | Short answer, evidence label, expandable source, concrete follow-up/action | Keeps trust visible without making every answer read like a paper |
| Activity | Date, locality, event type, organizer/source and booking state | Prevents past events or saved ideas looking like confirmed bookings |
| Download | Content included, size, progress, version/date, retry/remove actions | Makes offline readiness understandable and testable |

Keep the five destinations already proposed in PLAN.md for the first prototype; show a prominent active-trip entry on home when appropriate. Test whether an assistant tab earns its navigation space versus contextual access before changing the structure. This is a test question, not justification to add another navigation layer now.

The visual system should retain Urbs Regia's olive-gold and typography, with warm neutral surfaces, readable charcoal text and real heritage imagery. The activities page supports chronological event organization alongside imagery and details links. Use restrained editorial styling for discovery and compact, high-contrast controls during a visit. [Urbs Regia](https://urbsregia.eu/), [activities reference](https://urbsregia.eu/actividades-urbs-regia/).

Avoid copying luxury-hotel booking templates, unreadable text on photos, oversized hero sections hiding core actions, mandatory chat onboarding, fabricated ratings, decorative medieval lettering, autoplay stories and opaque “AI optimized” itineraries. Each warning is a proposed design constraint for this project, not a claim that every competitor uses those patterns.

**Web/Android implications**

The market references reinforce a dual entry model: web for low-friction discovery and Android for repeat use during a trip. Smartify's museum deployment at Hamburger Kunsthalle explicitly offers app or browser access through QR codes. VoiceMap's publisher guidance distinguishes the native app's GPS/offline capabilities from web playback. [Hamburger Kunsthalle](https://d11.hamburger-kunsthalle.de/en/hamburger-kunsthalle-smartify), [VoiceMap access guide](https://docsbk.voicemap.me/tour-publishers/how-listeners-access-to-your-tour/).

Keep Capacitor as the first implementation hypothesis, subject to the physical-device spike in PLAN.md. The competitor review does not establish the competitors' internal stacks or prove Capacitor is sufficient. Define offline packages as a product capability, including approved text/audio and route stops, with maps subject to provider rights. AI answers and live availability must expose their online dependency.

Ask for notification/location permissions when the user enables the corresponding feature. An arrival alert should identify the nearby site and offer a story, not silently start playback. Keep recorded historical content distinct from live operational information and make manual/QR use complete. Native background behavior still follows the platform restrictions documented in PLAN.md.

**Acquisition and rollout hypothesis**

Start with relevant visits rather than broad app-store acquisition. Candidate channels are Urbs Regia route/activity pages, QR codes at participating sites, museum/tourist-office recommendations, partner accommodation messages and guide introductions. These are proposals; no partner contact or publication was performed.

Measure source landing → route detail → saved plan → route start → meaningful story interaction. Separate web use from optional Android installs. A route-start event is an app action, not proof of physical presence, and a service click is not spending. Avoid daily-active-user targets as the main success measure for an episodic travel product.

Start with a small supervised pilot of the two planned routes. Validate the visitor journey and maintenance workflow before expanding to more towns, bookings, rewards or multilingual content. Extend only when both content readiness and practical route feasibility meet release gates.

**Validation plan to move beyond desk research**

1. Interview 8–12 visitors spanning general cultural travel, families, enthusiasts and access needs, plus 4–6 operational stakeholders. Ask about their last actual planning/visit experience rather than whether they “like an AI app.” This is a proposed qualitative sample, not a statistical market survey.
2. Test two prototypes: curated route-first discovery and map-first discovery, both under the Urbs Regia identity. Use the same tasks and counterbalance order; do not judge only screenshot preference.
3. Observe tasks: choose a half-day route; understand an unknown opening time; change a stop; explain a historical hypothesis; continue with location denied; find a downloaded story; recognize a saved versus confirmed activity.
4. Proposed pilot targets: at least 80% unaided completion of critical prototype tasks, first usable curated plan in under three minutes, and no observed critical misunderstanding of booking/access/evidence states. Small-sample results trigger revisions rather than claims of population-wide performance.
5. Field-test Android with screen off, low signal, battery saving and revoked permissions. Measure missed/duplicate arrival offers and compare battery usage against a no-alert baseline on the same route/device; define acceptable budgets from that test.
6. Collect at least a month of pilot usage plus content-update effort before estimating scale or operating economics. Interview non-adopters as well as successful users.

**Resulting project priorities**

| Priority | Decision | Evidence/reason |
| --- | --- | --- |
| P0 | One complete trustworthy route experience | Local differentiation depends on approved content plus feasible visits |
| P0 | Coordinated map/timeline and an active-visit screen | Directly inspected planning/start-screen patterns |
| P0 | Guest web access and manual location flow | Reduce entry friction and preserve usefulness with denied permissions |
| P0 | Visible source, operational date and unknown states | Specific to the heritage/operational split in the brief |
| P1 | Explicit offline packs and Android readiness flow | Strong fit with rural field use and documented audio/outdoor patterns |
| P1 | Contextual assistant actions | AI discovery references support concrete places/plans alongside conversation |
| P2 | Transactions, rewards, recognition and broad social features | Need separate supply, integration and demand validation |

Proceed with the focused independent product, supported by a small set of reviewed skills. Do not expand the pilot into a general travel marketplace on the basis of competitor feature lists.
