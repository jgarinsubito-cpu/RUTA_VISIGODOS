"use client";
/**
 * Installs in the browser the catalog version the server rendered with, before anything below
 * reads content (a parent renders before its children, and the store hydrates on first read).
 * null keeps the bundled demo catalog, which the browser already has.
 */
import type { ReactNode } from "react";
import { setCatalog } from "@/data/content";
import type { Catalog } from "@/domain/types";

export function CatalogProvider({ catalog, version, children }: { catalog: Catalog | null; version: number | null; children: ReactNode }) {
  if (catalog && version !== null) setCatalog(catalog, version);
  return children;
}
