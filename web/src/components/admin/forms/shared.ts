import type { AnyRecord } from "@/domain/editorial/records";
import type { RecordDataByKind, RecordKind } from "@/domain/editorial/schema";
import type { Catalog } from "@/domain/types";

/** What every record form receives from the editor frame. */
export interface FormProps<K extends RecordKind> {
  data: RecordDataByKind[K];
  set: (patch: Partial<RecordDataByKind[K]>) => void;
  /** Every working copy (drafts included): what pickers offer. */
  catalog: Catalog;
  records: readonly AnyRecord[];
  isNew: boolean;
  /** The record has been on the web: its id and web address can no longer change. */
  locked: boolean;
  /** Final id once saved; for a new record, the id it will get. */
  recordId: string;
}

export const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
