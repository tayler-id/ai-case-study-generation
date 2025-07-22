/**
 * Project Scope data model interfaces
 * Based on Architecture Document specifications
 */

export interface ProjectScope {
  id: string;
  userId: string;
  name: string;
  dateFrom?: Date;
  dateTo?: Date;
  participants?: string[];
  keywords?: string[];
  driveFolderId?: string;
  createdAt: Date;
  updatedAt: Date;
}