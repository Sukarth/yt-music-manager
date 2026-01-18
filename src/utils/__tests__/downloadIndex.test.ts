import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addToDownloadIndex,
  clearDownloadIndex,
  listDownloadUris,
  loadDownloadIndex,
  removeFromDownloadIndex,
  sumDownloadIndexBytes,
} from '../downloadIndex';

jest.mock('@react-native-async-storage/async-storage');

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('downloadIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty index when nothing stored', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null);

    const result = await loadDownloadIndex();

    expect(result).toEqual({});
  });

  it('should return empty index for invalid JSON', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('invalid-json');

    const result = await loadDownloadIndex();

    expect(result).toEqual({});
  });

  it('should add entries with safe size', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('{}');
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(123456);

    await addToDownloadIndex('file:///track.mp3', -20);

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      '@yt_music_manager_download_index',
      JSON.stringify({
        'file:///track.mp3': {
          size: 0,
          createdAt: 123456,
        },
      })
    );

    dateSpy.mockRestore();
  });

  it('should remove entries when present', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        'file:///track.mp3': { size: 100, createdAt: 1 },
      })
    );

    await removeFromDownloadIndex('file:///track.mp3');

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      '@yt_music_manager_download_index',
      JSON.stringify({})
    );
  });

  it('should not remove missing entries', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('{}');

    await removeFromDownloadIndex('file:///missing.mp3');

    expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('should list and sum entries', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({
        'file:///a.mp3': { size: 100, createdAt: 1 },
        'file:///b.mp3': { size: 200, createdAt: 2 },
      })
    );

    const uris = await listDownloadUris();
    const total = await sumDownloadIndexBytes();

    expect(uris.sort()).toEqual(['file:///a.mp3', 'file:///b.mp3']);
    expect(total).toBe(300);
  });

  it('should clear the index', async () => {
    await clearDownloadIndex();

    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('@yt_music_manager_download_index');
  });
});
