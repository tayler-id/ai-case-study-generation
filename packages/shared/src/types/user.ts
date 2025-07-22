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
  
  // Gmail connection status
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
  gmailTokenExpiresAt?: Date;
  gmailConnectedAt?: Date;
  
  // Google Drive connection status  
  driveAccessToken?: string;
  driveRefreshToken?: string;
  driveTokenExpiresAt?: Date;
  driveConnectedAt?: Date;
}

/**
 * Connection status for external services
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error';

/**
 * Service connection information
 */
export interface ServiceConnection {
  service: 'gmail' | 'drive';
  status: ConnectionStatus;
  connectedAt?: Date;
  expiresAt?: Date;
  error?: string;
}

/**
 * User connection summary
 */
export interface UserConnections {
  userId: string;
  connections: ServiceConnection[];
  lastUpdated: Date;
}

/**
 * Permission grant request for OAuth services
 */
export interface PermissionGrantRequest {
  service: 'gmail' | 'drive';
  scopes?: string[];
  redirectUri?: string;
}

/**
 * Permission grant response with OAuth URL
 */
export interface PermissionGrantResponse {
  service: 'gmail' | 'drive';
  authUrl: string;
  state: string;
}