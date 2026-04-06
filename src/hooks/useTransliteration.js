import { useState, useCallback } from 'react';

export const useTransliteration = () => {
  const [isTranslating, setIsTranslating] = useState(false);

  const transliterate = useCallback(async (text) => {
    if (!text || text.trim() === '') return '';
    
    setIsTranslating(true);
    try {
      const response = await fetch(
        `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=pa-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=test`
      );
      const data = await response.json();
      
      if (data[0] === 'SUCCESS' && data[1][0][1][0]) {
        return data[1][0][1][0];
      }
      return text;
    } catch (error) {
      console.error('Transliteration failed:', error);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  return { transliterate, isTranslating };
};
