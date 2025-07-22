/**
 * Evaluation data model interfaces
 * Based on Architecture Document specifications
 */

export interface Evaluation {
  id: string;
  userId: string;
  caseStudyId: string;
  accuracyRating: 1 | 2 | 3 | 4 | 5;
  usefulnessRating: 1 | 2 | 3 | 4 | 5;
  comments?: string;
  createdAt: Date;
}