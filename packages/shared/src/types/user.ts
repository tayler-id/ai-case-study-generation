/**
 * User data model interfaces
 * Based on Architecture Document specifications
 */

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
}