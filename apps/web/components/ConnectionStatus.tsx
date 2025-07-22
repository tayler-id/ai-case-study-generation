/**
 * Connection Status Component
 * Displays the current connection status for Gmail and Drive services
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, HardDrive, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ServiceConnection, UserConnections } from '@case-study/shared';
import { authService } from '@/services/authService';

interface ConnectionStatusProps {
  onConnectionChange?: (service: 'gmail' | 'drive', status: string) => void;
}

export function ConnectionStatus({ onConnectionChange }: ConnectionStatusProps) {
  const [connections, setConnections] = useState<UserConnections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granting, setGranting] = useState<{ gmail: boolean; drive: boolean }>({
    gmail: false,
    drive: false
  });

  useEffect(() => {
    loadConnectionStatus();
  }, []);

  const loadConnectionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await authService.getConnectionStatus();
      setConnections(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async (service: 'gmail' | 'drive') => {
    try {
      setGranting(prev => ({ ...prev, [service]: true }));
      const response = await authService.grantServicePermission(service);
      
      // Redirect to OAuth URL
      window.location.href = response.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to grant ${service} permission`);
      setGranting(prev => ({ ...prev, [service]: false }));
    }
  };

  const handleDisconnectService = async (service: 'gmail' | 'drive') => {
    try {
      await authService.disconnectService(service);
      await loadConnectionStatus(); // Refresh status
      onConnectionChange?.(service, 'disconnected');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to disconnect ${service}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'default',
      disconnected: 'secondary',
      expired: 'destructive',
      error: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getServiceIcon = (service: string) => {
    return service === 'gmail' ? (
      <Mail className="h-5 w-5" />
    ) : (
      <HardDrive className="h-5 w-5" />
    );
  };

  const getServiceName = (service: string) => {
    return service === 'gmail' ? 'Gmail' : 'Google Drive';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading connection status...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-red-600 mb-4">
            <XCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
          <Button onClick={loadConnectionStatus} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Source Connections</CardTitle>
        <CardDescription>
          Connect your Gmail and Google Drive to enable case study generation from your project data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections?.connections.map((connection: ServiceConnection) => (
          <div
            key={connection.service}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {getServiceIcon(connection.service)}
              <div>
                <div className="font-medium">{getServiceName(connection.service)}</div>
                <div className="text-sm text-gray-500">
                  {connection.connectedAt
                    ? `Connected ${new Date(connection.connectedAt).toLocaleDateString()}`
                    : 'Not connected'
                  }
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(connection.status)}
                {getStatusBadge(connection.status)}
              </div>
              
              {connection.status === 'connected' || connection.status === 'expired' ? (
                <div className="flex space-x-2">
                  {connection.status === 'expired' && (
                    <Button
                      size="sm"
                      onClick={() => handleGrantPermission(connection.service)}
                      disabled={granting[connection.service]}
                    >
                      {granting[connection.service] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : null}
                      Reconnect
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDisconnectService(connection.service)}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleGrantPermission(connection.service)}
                  disabled={granting[connection.service]}
                >
                  {granting[connection.service] ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  Connect
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {connections && (
          <div className="text-xs text-gray-500 mt-4">
            Last updated: {new Date(connections.lastUpdated).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}