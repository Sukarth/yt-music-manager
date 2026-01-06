import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthService } from '../authService';

jest.mock('expo-secure-store');
jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  makeRedirectUri: jest.fn(() => 'http://127.0.0.1:8080'),
}));
jest.mock('react-native', () => ({
  Platform: {
    select: jest.fn(obj => obj.default),
    OS: 'android',
  },
}));
jest.mock('../../utils/storage', () => ({
  saveAuth: jest.fn(),
  clearAuth: jest.fn(),
}));

const _mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-token',
            expires_in: 3600,
          }),
      });

      const result = await service.refreshAccessToken('refresh-token');

      expect(result.isAuthenticated).toBe(true);
      expect(result.accessToken).toBe('new-token');
      expect(result.authMode).toBe('oauth');
    });

    it('should throw error on refresh failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await expect(service.refreshAccessToken('refresh-token')).rejects.toThrow(
        'Failed to refresh token'
      );
    });

    it('should throw on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.refreshAccessToken('refresh-token')).rejects.toThrow('Network error');
    });

    it('should use Web client ID for Android (loopback redirect)', async () => {
      const mockSelect = Platform.select as jest.Mock;
      mockSelect.mockImplementation(obj => obj.android);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-token',
            expires_in: 3600,
          }),
      });

      await service.refreshAccessToken('refresh-token');

      // Android should use Web Client ID (same as default) for loopback redirect
      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.any(String),
          ios: expect.any(String),
          default: expect.any(String),
        })
      );

      mockSelect.mockImplementation(obj => obj.default);
    });

    it('should use iOS client ID on iOS', async () => {
      const mockSelect = Platform.select as jest.Mock;
      mockSelect.mockImplementation(obj => obj.ios);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-token',
            expires_in: 3600,
          }),
      });

      await service.refreshAccessToken('refresh-token');

      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.any(String),
          ios: expect.any(String),
          default: expect.any(String),
        })
      );

      mockSelect.mockImplementation(obj => obj.default);
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const { clearAuth } = jest.requireMock('../../utils/storage');

      await service.signOut();

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
