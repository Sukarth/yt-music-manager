import { AuthService } from '../authService';

jest.mock('@react-native-google-signin/google-signin', () => {
  const mockGoogleSignin = {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    getTokens: jest.fn(),
    signInSilently: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
  };

  return {
    GoogleSignin: mockGoogleSignin,
    statusCodes: {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      IN_PROGRESS: 'IN_PROGRESS',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    },
  };
});

jest.mock('../../utils/storage', () => ({
  saveAuth: jest.fn(),
  clearAuth: jest.fn(),
}));

describe('AuthService', () => {
  const { GoogleSignin, statusCodes } = jest.requireMock(
    '@react-native-google-signin/google-signin'
  );
  const { saveAuth, clearAuth } = jest.requireMock('../../utils/storage');

  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('should sign in and persist auth state', async () => {
      GoogleSignin.hasPlayServices.mockResolvedValueOnce(true);
      GoogleSignin.signIn.mockResolvedValueOnce({
        type: 'success',
        data: {
          user: { email: 'test@example.com' },
        },
      });
      GoogleSignin.getTokens.mockResolvedValueOnce({ accessToken: 'access-token' });

      const result = await service.signInWithGoogle();

      expect(result.isAuthenticated).toBe(true);
      expect(result.accessToken).toBe('access-token');
      expect(result.userEmail).toBe('test@example.com');
      expect(result.authMode).toBe('oauth');
      expect(saveAuth).toHaveBeenCalled();
    });

    it('should map SIGN_IN_CANCELLED to user-friendly error', async () => {
      GoogleSignin.hasPlayServices.mockResolvedValueOnce(true);
      GoogleSignin.signIn.mockRejectedValueOnce({
        code: statusCodes.SIGN_IN_CANCELLED,
        message: 'cancelled',
      });

      await expect(service.signInWithGoogle()).rejects.toThrow('User cancelled the login flow');
    });

    it('should map IN_PROGRESS to user-friendly error', async () => {
      GoogleSignin.hasPlayServices.mockResolvedValueOnce(true);
      GoogleSignin.signIn.mockRejectedValueOnce({
        code: statusCodes.IN_PROGRESS,
        message: 'in progress',
      });

      await expect(service.signInWithGoogle()).rejects.toThrow('Sign in is already in progress');
    });

    it('should map PLAY_SERVICES_NOT_AVAILABLE to user-friendly error', async () => {
      GoogleSignin.hasPlayServices.mockResolvedValueOnce(true);
      GoogleSignin.signIn.mockRejectedValueOnce({
        code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE,
        message: 'missing services',
      });

      await expect(service.signInWithGoogle()).rejects.toThrow(
        'Play Services are not available or outdated'
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      GoogleSignin.signInSilently.mockResolvedValueOnce({});
      GoogleSignin.getTokens.mockResolvedValueOnce({ accessToken: 'new-token' });

      const result = await service.refreshAccessToken('refresh-token');

      expect(result.isAuthenticated).toBe(true);
      expect(result.accessToken).toBe('new-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(saveAuth).toHaveBeenCalled();
    });

    it('should bubble up refresh errors', async () => {
      GoogleSignin.signInSilently.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.refreshAccessToken('refresh-token')).rejects.toThrow('Network error');
    });
  });

  describe('signOut', () => {
    it('should sign out when user exists and clear auth', async () => {
      GoogleSignin.getCurrentUser.mockReturnValueOnce({ user: { email: 'test@example.com' } });
      GoogleSignin.signOut.mockResolvedValueOnce(undefined);

      await service.signOut();

      expect(GoogleSignin.signOut).toHaveBeenCalled();
      expect(clearAuth).toHaveBeenCalled();
    });

    it('should clear auth even when no user exists', async () => {
      GoogleSignin.getCurrentUser.mockReturnValueOnce(null);

      await service.signOut();

      expect(GoogleSignin.signOut).not.toHaveBeenCalled();
      expect(clearAuth).toHaveBeenCalled();
    });
  });

  describe('useNoAuth', () => {
    it('should return no-auth state', () => {
      const result = service.useNoAuth();

      expect(result).toEqual({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        userEmail: null,
        authMode: 'none',
      });
    });
  });
});
