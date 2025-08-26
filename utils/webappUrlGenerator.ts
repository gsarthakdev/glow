import CryptoJS from 'crypto-js';

export interface WebappData {
  childName: string;
  logs: any[];
  goals: any[];
  duration: string;
  dateRangeString: string;
  timestamp: number;
}

/**
 * Generates a random encryption key
 * @param length Length of the key (default: 32 characters)
 * @returns Random string key
 */
function generateRandomKey(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Encrypts data for the therapist webapp using a specific key
 * @param data The data to encrypt
 * @param encryptionKey The encryption key to use
 * @returns Encrypted string
 */
export function encryptDataForWebapp(data: WebappData, encryptionKey: string): string {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
    return encodeURIComponent(encrypted);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data for webapp');
  }
}

/**
 * Generates a URL for the therapist webapp with a random encryption key
 * @param data The data to include in the webapp
 * @param webappBaseUrl The base URL of the therapist webapp
 * @returns Object containing the URL and the encryption key used
 */
export function generateWebappUrl(data: WebappData, webappBaseUrl: string): { url: string; encryptionKey: string } {
  try {
    // Generate a new random key for each URL
    const encryptionKey = generateRandomKey(32);
    const encrypted = encryptDataForWebapp(data, encryptionKey);

    // Format: #<encrypted-data>?k=<decryption-key>
    const webappUrl = `${webappBaseUrl}#${encrypted}?k=${encryptionKey}`;

    return {
      url: webappUrl,
      encryptionKey: encryptionKey
    };
  } catch (error) {
    console.error('Error generating webapp URL:', error);
    throw new Error('Failed to generate webapp URL');
  }
}

/**
 * Prepares data from PastLogsScreen for the webapp
 * @param logs Array of behavior logs
 * @param goals Array of goals
 * @param childName Name of the child
 * @param duration Duration string (e.g., "This Week", "Today")
 * @returns Formatted data ready for webapp
 */
export function prepareDataForWebapp(
  logs: any[], 
  goals: any[], 
  childName: string, 
  duration: string,
  dateRangeString: string,
): WebappData {
  // Filter out archived goals
  const activeGoals = goals.filter((goal: any) => !goal.isArchived);
  
  return {
    childName,
    logs: logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      responses: log.responses,
      edited: log.edited || false
    })),
    goals: activeGoals.map(goal => ({
      id: goal.id,
      text: goal.text,
      dailyCounts: goal.dailyCounts || [],
      comments: goal.comments || [],
      createdAt: goal.createdAt,
      isArchived: goal.isArchived
    })),
    duration,
    dateRangeString,
    timestamp: Date.now()
  };
}

/**
 * Example usage in the PDF generation:
 * 
 * const webappData = prepareWebappData(childName, selectedLogs, goals, selectedDuration);
 * const { url: webappUrl, encryptionKey } = generateWebappUrl(webappData, 'https://yourdomain.com');
 * 
 * // Add to PDF footer:
 * page.drawText('View full logs here', {
 *   x: x,
 *   y: y,
 *   size: 10,
 *   font: font,
 *   color: rgb(0, 0, 1), // Blue color for link
 * });
 * 
 * // Add hyperlink annotation
 * const linkAnnot = pdfDoc.context.obj({
 *   Type: 'Annot',
 *   Subtype: 'Link',
 *   Rect: [x, y, x + linkWidth, y + 12],
 *   Border: [0, 0, 0],
 *   A: {
 *     Type: 'Action',
 *     S: 'URI',
 *     URI: PDFString.of(webappUrl),
 *   },
 * });
 * 
 * // Note: encryptionKey is returned but not stored - each URL gets a unique key
 */
