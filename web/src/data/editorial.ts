/**
 * EDITORIAL-ONLY claims (draft, review, superseded). Never import this module from app code: it
 * exists for tests and content tooling, so unpublished text stays out of the client bundle
 * (PLAN.md, assistant step 2). The catalog test fails if any app module imports it.
 */
import type { ValidatedClaim } from "@/domain/types";
import { DEMO_SOURCE } from "./catalog";

export const EDITORIAL_CLAIMS: ValidatedClaim[] = [
  {
    id: "claim-guarrazar-ocultacion",
    siteId: "site-guarrazar",
    text: "Una tradición local relaciona la ocultación del tesoro con la llegada de los musulmanes en 711.",
    evidence: "T",
    source: DEMO_SOURCE,
    status: "draft",
    version: 1,
    keywords: ["ocultacion", "711", "escondido", "tesoro"],
  },
];
