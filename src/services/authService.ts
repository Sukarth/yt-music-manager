import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AuthState } from '../types';
import { saveAuth, clearAuth } from '../utils/storage';

// Web Client ID is required for offline access (refresh tokens) and ID tokens.
// Even when using Android Native Auth, you should pass the WEB client ID here.
// Create a "Web application" credential in Google Cloud Console to get this.
const GOOGLE_WEB_CLIENT_ID =
  '16949272129-lbmkn1vads3bkh10185ah9gjr7rffm3c.apps.googleusercontent.com';

// Configure Google Sign-In once
GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
  webClientId: GOOGLE_WEB_CLIENT_ID, // Enable this if you put your WEB client ID above
  offlineAccess: true, // required to get a refresh token
  forceCodeForRefreshToken: true,
});

export class AuthService {
  async signInWithGoogle(): Promise<AuthState> {
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();

      if (result.type !== 'success') {
        throw new Error('User cancelled the login flow');
      }

      const userInfo = result.data;

      // Get tokens (access token and refresh token)
      const tokens = await GoogleSignin.getTokens();

      const authState: AuthState = {
        isAuthenticated: true,
        accessToken: tokens.accessToken,
        refreshToken: null,
        tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        userEmail: userInfo.user.email,
        authMode: 'oauth',
      };

      await saveAuth(authState);

      return authState;
    } catch (error: any) {
      console.error('Error signing in with Google:', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('User cancelled the login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Play Services are not available or outdated');
      } else {
        throw new Error('Failed to sign in with Google: ' + error.message);
      }
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthState> {
    try {
      // Try silent sign in to refresh tokens
      await GoogleSignin.signInSilently();
      const tokens = await GoogleSignin.getTokens();

      const authState: AuthState = {
        isAuthenticated: true,
        accessToken: tokens.accessToken,
        refreshToken: refreshToken,
        tokenExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
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
    try {
      const user = GoogleSignin.getCurrentUser();
      if (user) {
        await GoogleSignin.signOut();
      }
      await clearAuth();
    } catch (error) {
      console.error('Error signing out:', error);
      await clearAuth();
    }
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
