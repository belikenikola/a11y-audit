/**
 * Input validation utilities
 */

/**
 * Validates if a string is a properly formatted URL
 * @param {string} url - The URL to validate
 * @returns {{ valid: boolean, error?: string, url?: URL }}
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  // Check if URL has any protocol
  let urlToValidate = trimmedUrl;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmedUrl)) {
    // No protocol found, add https://
    urlToValidate = `https://${trimmedUrl}`;
  }

  try {
    const parsedUrl = new URL(urlToValidate);

    // Only allow http and https protocols (check this first!)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are supported' };
    }

    // Check for localhost or common dev domains
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return { valid: true, url: parsedUrl, warning: 'Auditing localhost URL' };
    }

    // Basic hostname validation
    if (!hostname.includes('.') && hostname !== 'localhost') {
      return { valid: false, error: 'Invalid hostname' };
    }

    return { valid: true, url: parsedUrl };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates WCAG level input
 * @param {string} level - The WCAG level (A, AA, AAA)
 * @returns {{ valid: boolean, error?: string, level?: string }}
 */
export function validateLevel(level) {
  const validLevels = ['A', 'AA', 'AAA'];
  const normalizedLevel = level?.toUpperCase?.();

  if (!normalizedLevel || !validLevels.includes(normalizedLevel)) {
    return {
      valid: false,
      error: `Invalid WCAG level. Must be one of: ${validLevels.join(', ')}`
    };
  }

  return { valid: true, level: normalizedLevel };
}

/**
 * Validates output format
 * @param {string} format - The output format (json, html, md)
 * @returns {{ valid: boolean, error?: string, format?: string }}
 */
export function validateFormat(format) {
  const validFormats = ['json', 'html', 'md'];
  const normalizedFormat = format?.toLowerCase?.();

  if (!normalizedFormat || !validFormats.includes(normalizedFormat)) {
    return {
      valid: false,
      error: `Invalid format. Must be one of: ${validFormats.join(', ')}`
    };
  }

  return { valid: true, format: normalizedFormat };
}

/**
 * Validates timeout value
 * @param {number|string} timeout - Timeout in milliseconds
 * @returns {{ valid: boolean, error?: string, timeout?: number }}
 */
export function validateTimeout(timeout) {
  const parsed = parseInt(timeout, 10);

  if (isNaN(parsed) || parsed < 1000) {
    return {
      valid: false,
      error: 'Timeout must be a number >= 1000 (milliseconds)'
    };
  }

  if (parsed > 300000) {
    return {
      valid: false,
      error: 'Timeout cannot exceed 300000ms (5 minutes)'
    };
  }

  return { valid: true, timeout: parsed };
}

/**
 * Validates output file path
 * @param {string} outputPath - The output file path
 * @param {string} format - The expected format
 * @returns {{ valid: boolean, error?: string, path?: string }}
 */
export function validateOutputPath(outputPath, format) {
  if (!outputPath || typeof outputPath !== 'string') {
    return { valid: false, error: 'Output path is required' };
  }

  const trimmedPath = outputPath.trim();
  const expectedExtension = `.${format}`;

  // If path doesn't have the right extension, we'll add it
  const finalPath = trimmedPath.endsWith(expectedExtension)
    ? trimmedPath
    : `${trimmedPath}${expectedExtension}`;

  return { valid: true, path: finalPath };
}
