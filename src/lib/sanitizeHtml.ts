/**
 * Sanitize HTML to allow only safe tags for activity descriptions
 * Allowed tags: p, b, i, strong, em, ul, li, br
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  const allowedTags = ['p', 'b', 'i', 'strong', 'em', 'ul', 'li', 'br'];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove disallowed tags
  const allElements = tempDiv.getElementsByTagName('*');
  for (let i = allElements.length - 1; i >= 0; i--) {
    const el = allElements[i];
    if (!allowedTags.includes(el.tagName.toLowerCase())) {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    } else {
      // Strip all attributes (style, class, font, etc.) from allowed tags
      while (el.attributes.length > 0) {
        el.removeAttribute(el.attributes[0].name);
      }
    }
  }
  
  return tempDiv.innerHTML;
}

/**
 * Decode HTML entities and fix encoding issues in text
 * Handles common issues like broken UTF-8 characters
 */
export function decodeHtmlText(text: string): string {
  if (!text) return '';
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  let decoded = tempDiv.textContent || tempDiv.innerText || '';
  
  // Fix common encoding issues
  const replacements: { [key: string]: string } = {
    'â€™': "'",
    'â€œ': '"',
    'â€': '"',
    'â€"': '–',
    'Â': '',
    'ï¿½': '',
    '�': "'", // Common replacement character for apostrophes
  };
  
  Object.entries(replacements).forEach(([bad, good]) => {
    decoded = decoded.replace(new RegExp(bad, 'g'), good);
  });
  
  return decoded;
}
