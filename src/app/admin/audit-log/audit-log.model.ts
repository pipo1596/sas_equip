export interface AuditLogEntry {
  audId: number;
  tpId: number | null;
  actorLevel: string;
  actorPadminId: number | null;
  actorEpuId: number | null;
  actorEmpId: number | null;
  actorType: string;
  reqHostname: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  entityKey: string | null;
  isPiiEntity: 'Y' | 'N';
  beforeValue: string | null;
  afterValue: string | null;
  reason: string | null;
  sessionId: string | null;
  createdTs: string;
}

export interface AuditLogPage {
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
  };
  data: AuditLogEntry[];
}
