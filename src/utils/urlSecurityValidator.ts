// src/utils/urlSecurityValidator.ts
export interface SecurityResult {
  safe: boolean;
  reason?: string;
  url: string;
}

// বেসিক চেক: HTTPS + ফিশিং
export async function validateUrl(rawUrl: string): Promise<SecurityResult> {
  let url = rawUrl.trim();
  
  // ১. প্রোটোকল যোগ করুন
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url; // ডিফল্ট HTTPS
  }
  
  // ২. HTTPS ফোর্স করুন (localhost ছাড়া)
  if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = url.replace('http://', 'https://');
  }
  
  // ৩. URL ঠিক আছে কিনা চেক করুন
  try {
    new URL(url);
  } catch {
    return { safe: false, reason: 'Invalid URL', url: rawUrl };
  }
  
  // ৪. বেসিক ফিশিং চেক
  const suspicious = ['-secure', '-verify', 'login', 'account', 'bank'];
  const lowerUrl = url.toLowerCase();
  for (const word of suspicious) {
    if (lowerUrl.includes(word) && !lowerUrl.includes('google') && !lowerUrl.includes('facebook')) {
      return { 
        safe: false, 
        reason: `Suspicious: contains "${word}"`, 
        url: rawUrl 
      };
    }
  }
  
  return { safe: true, url };
}