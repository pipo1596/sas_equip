export interface CustomerAttachment {
  attachmentId: number;
  tpId: number;
  custId: number;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string | null;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}
