import { AuthRequest, makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { AuthState } from '../types';
import { saveAuth, clearAuth } from '../utils/storage';

// Web/Default Client ID
// TODO: Replace this with web client ID from Google Cloud Console
const GOOGLE_CLIENT_ID =  'WEB_CLIENT_ID_HERE.apps.googleusercontent.com';// Android Client ID (for OAuth type "Android" in Google Cloud Console)
const GOOGLE_ANDROID_CLIENT_ID = '16949272129-dhv9fckqks0fr7f0b8sd23tviortdsav.apps.googleusercontent.com';
// iOS Client ID
// TODO: Replace this with iOS OAuth client ID from Google Cloud Console
const GOOGLE_IOS_CLIENT_ID = 'IOS_CLIENT_ID_HERE.apps.googleusercontent.com';

/**
 * Get the platform-specific Google Client ID
 */
const getGoogleClientId = (): string => {
  return (
    Platform.select({
      android: GOOGLE_ANDROID_CLIENT_ID,
      ios: GOOGLE_IOS_CLIENT_ID,
      default: GOOGLE_CLIENT_ID,
    }) || GOOGLE_CLIENT_ID
  );
};

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export class AuthService {
  async signInWithGoogle(): Promise<AuthState> {
    try {
      const redirectUri = makeRedirectUri({
        scheme: 'ytmusicmanager',
      });

      const clientId = getGoogleClientId();

      const request = new AuthRequest({
        clientId,
        scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
        redirectUri,
      });

      await request.makeAuthUrlAsync(discovery);

      const result = await request.promptAsync(discovery);

      if (result.type !== 'success') {
        throw new Error('Authentication failed');
      }

      const { code } = result.params;
      const codeVerifier = request.codeVerifier;

      const tokenResponse = await this.exchangeCodeForToken(code, redirectUri, codeVerifier);

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
    redirectUri: string,
    codeVerifier?: string
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    const clientId = getGoogleClientId();

    const params: Record<string, string> = {
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };

    // Include code_verifier for PKCE flow if available
    if (codeVerifier) {
      params.code_verifier = codeVerifier;
    }

    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthState> {
    try {
      const clientId = getGoogleClientId();

      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
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
