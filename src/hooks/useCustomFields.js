import { useState, useEffect } from 'react';

export function useCustomFields(fileId) {
  const [fields, setFields] = useState([]);
  
  // Load from local storage when fileId changes
  useEffect(() => {
    if (!fileId) return;
    const stored = localStorage.getItem(`pdfFormBuilder_${fileId}`);
    if (stored) {
      try {
        setFields(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse custom fields from localStorage");
      }
    } else {
      setFields([]);
    }
  }, [fileId]);

  // Save to local storage whenever fields change
  useEffect(() => {
    if (!fileId) return;
    localStorage.setItem(`pdfFormBuilder_${fileId}`, JSON.stringify(fields));
  }, [fields, fileId]);

  const addField = (field) => {
    setFields(prev => [...prev, {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pageIndex: 0,
      x: 10,
      y: 10,
      width: 20,
      height: 3,
      name: `Field ${prev.length + 1}`,
      fontSize: 8,
      fontWeight: '500',
      color: '#000000',
      padX: 10,
      padY: 0,
      isPunjabi: false,
      value: '',
      ...field
    }]);
  };

  const updateField = (id, updates) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const clearAllValues = () => {
    setFields(prev => prev.map(f => ({ ...f, value: '' })));
  };

  return {
    customFields: fields,
    addField,
    updateField,
    removeField,
    clearAllValues
  };
}
