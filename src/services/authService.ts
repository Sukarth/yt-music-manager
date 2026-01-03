import * as AuthSession from 'expo-auth-session';
import { AuthState } from '../types';
import { saveAuth, clearAuth } from '../utils/storage';

const GOOGLE_CLIENT_ID = '16949272129-9nsr5j9cfsit7ksugpgbu8m08r8tkj7o.apps.googleusercontent.com';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export class AuthService {
  async signInWithGoogle(): Promise<AuthState> {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'ytmusicmanager',
      });

      const [request, , promptAsync] = AuthSession.useAuthRequest(
        {
          clientId: GOOGLE_CLIENT_ID,
          scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
          redirectUri,
        },
        discovery
      );

      if (!request) {
        throw new Error('Failed to create auth request');
      }

      const result = await promptAsync();

      if (result.type !== 'success') {
        throw new Error('Authentication failed');
      }

      const { code } = result.params;

      const tokenResponse = await this.exchangeCodeForToken(code, redirectUri);

      const authState: AuthState = {
        isAuthenticated: true,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || null,
        tokenExpiry: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
        userEmail: null,
        authMode: 'oauth',
      };

      await saveAuth(authState);

      return authState;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw new Error('Failed to sign in with Google');
    }
  }

  private async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthState> {
    try {
      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: GOOGLE_CLIENT_ID,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();

      const authState: AuthState = {
        isAuthenticated: true,
        accessToken: data.access_token,
        refreshToken: refreshToken,
        tokenExpiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        userEmail: null,
        authMode: 'oauth',
      };

      await saveAuth(authState);

      return authState;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    await clearAuth();
  }

  useNoAuth(): AuthState {
    return {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      userEmail: null,
      authMode: 'none',
    };
  }
}

export const authService = new AuthService();
