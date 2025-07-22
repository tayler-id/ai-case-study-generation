/**
 * Case Study data model interfaces
 * Based on Architecture Document specifications
 */

export interface CaseStudy {
  id: string;
  userId: string;
  projectScopeId: string;
  title: string;
  content: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}