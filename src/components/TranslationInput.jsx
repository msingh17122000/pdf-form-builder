import { useState, useEffect } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { useTransliteration } from '../hooks/useTransliteration';
import PropTypes from 'prop-types';

const TranslationInput = ({ label, value, onChange, placeholder, name, style, isOverlay = false, forcePunjabi = false, onToggleLanguage }) => {
  const [usePunjabi, setUsePunjabi] = useState(forcePunjabi);
  const { transliterate, isTranslating } = useTransliteration();
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    setUsePunjabi(forcePunjabi);
  }, [forcePunjabi]);

  const handleToggle = () => {
    const newVal = !usePunjabi;
    setUsePunjabi(newVal);
    if (onToggleLanguage) onToggleLanguage(newVal);
  };

  const handleBlur = async () => {
    if (usePunjabi && localValue) {
      const translated = await transliterate(localValue);
      onChange(translated);
      setLocalValue(translated);
    } else {
      onChange(localValue);
    }
  };

  return (
    <div
      className={`flex flex-col gap-1 w-full group ${isOverlay ? 'z-20' : ''}`}
      style={style}
    >
      {!isOverlay && (
        <div className="flex justify-between items-center px-1">
          <label className="text-sm font-medium text-slate-700">{label}</label>
          <button
            type="button"
            onClick={handleToggle}
            className={`flex items-center gap-1.5 px-2 py-0.5 mt-2 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all ${usePunjabi
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200 opacity-60 hover:opacity-100'
              }`}
          >
            <Languages size={12} />
            {usePunjabi ? 'Punjabi ON' : 'Punjabi OFF'}
          </button>
        </div>
      )}
      <div className="relative h-full">
        <input
          type="text"
          name={name}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          placeholder={isOverlay ? '' : (usePunjabi ? 'Type in English...' : placeholder)}
          title={label}
          className={`w-full h-full px-2 py-1 rounded border-2 transition-all outline-none text-slate-900 font-medium text-sm ${usePunjabi
              ? 'border-amber-400 bg-amber-50 focus:bg-white focus:ring-4 focus:ring-amber-400/20'
              : 'border-blue-500/30 bg-blue-50/80 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-sm'
            } ${isOverlay ? '' : 'py-3 px-4 rounded-xl'}`}
        />
        <button
          type="button"
          onClick={handleToggle}
          className={`absolute -top-6 right-0 flex items-center gap-1 px-1.5 py-0.5 rounded-t text-[8px] font-bold transition-all ${usePunjabi
              ? 'bg-amber-400 text-white'
              : 'bg-slate-400 text-white opacity-40 hover:opacity-100'
            } ${!isOverlay ? 'hidden' : ''}`}
        >
          <Languages size={10} />
          {usePunjabi ? 'PA' : 'EN'}
        </button>
        {isTranslating && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin text-amber-500" size={14} />
          </div>
        )}
      </div>
    </div>
  );
};

TranslationInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  name: PropTypes.string.isRequired,
  style: PropTypes.object,
  isOverlay: PropTypes.bool,
};

export default TranslationInput;
