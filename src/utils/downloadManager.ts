import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface DownloadResult {
  success: boolean;
  uri?: string;
  message: string;
}

export const downloadFile = async (
  url: string, 
  filename?: string
): Promise<DownloadResult> => {
  try {
    // Generate filename from URL if not provided
    const actualFilename = filename || generateFilename(url);
    const downloadPath = `${FileSystem.documentDirectory}${actualFilename}`;
    
    // Show download start
    console.log('Downloading:', url);
    
    const result = await FileSystem.downloadAsync(url, downloadPath);
    
    if (result.status === 200) {
      // Offer to share/open the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: getMimeType(actualFilename),
          dialogTitle: `Downloaded: ${actualFilename}`,
        });
      }
      
      return {
        success: true,
        uri: result.uri,
        message: `Downloaded to ${actualFilename}`,
      };
    }
    
    return {
      success: false,
      message: 'Download failed',
    };
  } catch (error) {
    console.error('Download error:', error);
    return {
      success: false,
      message: 'Download failed: ' + (error as Error).message,
    };
  }
};

export const generateFilename = (url: string): string => {
  try {
    const path = url.split('/').pop() || '';
    if (path && path.includes('.')) {
      return path.split('?')[0];
    }
    return `download-${Date.now()}.html`;
  } catch {
    return `download-${Date.now()}.html`;
  }
};

export const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    'html': 'text/html',
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'zip': 'application/zip',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
};

export const getDownloadDirectory = (): string => {
  return FileSystem.documentDirectory || '';
};