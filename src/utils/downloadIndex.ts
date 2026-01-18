import AsyncStorage from '@react-native-async-storage/async-storage';

export type DownloadIndex = Record<
  string,
  {
    size: number;
    createdAt: number;
  }
>;

const DOWNLOAD_INDEX_KEY = '@yt_music_manager_download_index';

const safeParse = (value: string | null): DownloadIndex => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as DownloadIndex;
  } catch {
    return {};
  }
};

export const loadDownloadIndex = async (): Promise<DownloadIndex> => {
  const raw = await AsyncStorage.getItem(DOWNLOAD_INDEX_KEY);
  return safeParse(raw);
};

export const saveDownloadIndex = async (index: DownloadIndex): Promise<void> => {
  await AsyncStorage.setItem(DOWNLOAD_INDEX_KEY, JSON.stringify(index));
};

export const addToDownloadIndex = async (uri: string, size: number): Promise<void> => {
  if (!uri) return;
  const safeSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : 0;

  const index = await loadDownloadIndex();
  index[uri] = {
    size: safeSize,
    createdAt: Date.now(),
  };
  await saveDownloadIndex(index);
};

export const removeFromDownloadIndex = async (uri: string): Promise<void> => {
  if (!uri) return;
  const index = await loadDownloadIndex();
  if (index[uri]) {
    delete index[uri];
    await saveDownloadIndex(index);
  }
};

export const clearDownloadIndex = async (): Promise<void> => {
  await AsyncStorage.removeItem(DOWNLOAD_INDEX_KEY);
};

export const listDownloadUris = async (): Promise<string[]> => {
  const index = await loadDownloadIndex();
  return Object.keys(index);
};

export const sumDownloadIndexBytes = async (): Promise<number> => {
  const index = await loadDownloadIndex();
  let total = 0;
  for (const entry of Object.values(index)) {
    total += entry?.size || 0;
  }
  return total;
};
