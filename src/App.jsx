import { useState } from 'react';
import { Upload, FileText, Save, X, Loader2, Sparkles, Plus, Settings2, Hand, Trash2, ShieldAlert } from 'lucide-react';
import { fillAndSavePdf } from './lib/pdf-service';
import TranslationInput from './components/TranslationInput';
import PdfFormViewer from './components/PdfFormViewer';
import { useCustomFields } from './hooks/useCustomFields';

function App() {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState('fill'); // 'build' or 'fill'
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // use custom fields built-in hook
  const fileId = file && typeof file !== 'string' ? file.name : null;
  const {
    customFields,
    addField,
    updateField,
    removeField,
    clearAllValues
  } = useCustomFields(fileId);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setIsLoading(true);
      try {
        setFile(selectedFile);
        // We no longer try to parse AcroFields automatically here, 
        // as the user is using the Custom PDF Form Builder.
      } catch (err) {
        console.error('Error parsing PDF:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Sync formData when customFields values are cleared
  const handleClearAll = () => {
    setFormData({});
    clearAllValues();
    setShowClearConfirm(false);
  };

  const handleSave = async () => {
    if (!file) return;
    setIsSaving(true);
    try {
      // Pass customFields and formData to pdf-service
      await fillAndSavePdf(file, formData, customFields);
    } catch (err) {
      console.error('Error saving PDF:', err);
      alert('Failed to save PDF. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeField = selectedFieldId ? customFields.find(f => f.id === selectedFieldId) : null;

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex  items-center gap-4">
              <h1 className="text-xl font-black tracking-tight italic">PDF<span className="text-indigo-600">BUILDER</span></h1>
              <span className="text-[10px] font-bold text-slate-400">
                Created by  <a title='Manpreet Singh' href="https://instagram.com/msingh_2000" target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-600 hover:underline">@msingh_2000</a>
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] font-bold text-amber-600 uppercase bg-amber-50 px-1 rounded">Bilingual Custom Forms </span>
              <Sparkles size={8} className="text-amber-500" />
            </div>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-4 border border-slate-200 rounded-full p-2 bg-slate-50">
            <button
              onClick={() => {
                setMode('build');
                setSelectedFieldId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${mode === 'build' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Settings2 size={16} /> Edit Layout
            </button>
            <button
              onClick={() => {
                setMode('fill');
                setSelectedFieldId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${mode === 'fill' ? 'bg-black text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Hand size={16} /> Fill Form
            </button>
          </div>
        )}

        {file && (
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 text-sm"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSaving ? 'Processing...' : 'Export & Save PDF'}
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: PDF Viewer */}
        <section className={` flex-1 flex flex-col min-w-0 border-r border-slate-200`}>
          {!file ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
              <Upload size={64} strokeWidth={1} className="mb-6 text-slate-300" />
              <h2 className="text-2xl font-black text-slate-800 mb-2">Create Custom Forms</h2>
              <p className="text-sm max-w-xs mx-auto mb-8 text-slate-500">Upload any PDF to manually draw perfect bounding boxes and create a bilingual form.</p>
              <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold shadow-xl transition-all cursor-pointer active:scale-95">
                Upload Document
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
              </label>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white m-4 rounded-3xl shadow-inner">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
              <p className="font-bold text-slate-600">Loading Document...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <PdfFormViewer
                file={file}
                mode={mode}
                customFields={customFields}
                onFieldAdd={addField}
                onFieldSelect={setSelectedFieldId}
                selectedFieldId={selectedFieldId}
                formData={formData}
                onInputChange={handleInputChange}
              />
            </div>
          )}
        </section>

        {/* Right Side: Configuration Sidebar */}
        <section className="w-[400px] bg-white flex flex-col shadow-2xl z-20 relative">
          {!file ? (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                <FileText size={40} />
              </div>
              <p className="text-sm font-bold text-slate-400 max-w-[200px]">Unlock the toolkit by uploading a document</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">

              {/* BUILD MODE SIDEBAR */}
              {mode === 'build' && (
                <>
                  <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex flex-col shrink-0">
                    <h2 className="text-lg font-black text-indigo-900 tracking-tight">Form Designer</h2>
                    <p className="text-xs text-indigo-600/70 mt-1 font-medium">Draw boxes directly on the PDF to create input fields.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                    {!activeField ? (
                      <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
                        <Plus className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-sm font-bold text-slate-400">Click and drag on the PDF to create a new field, or click an existing field to edit.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Field Name / Label</label>
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                            value={activeField.name}
                            onChange={(e) => updateField(activeField.id, { name: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Font Size (px)</label>
                            <input
                              type="number"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                              value={activeField.fontSize}
                              onChange={(e) => updateField(activeField.id, { fontSize: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Language</label>
                            <select
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold"
                              value={activeField.isPunjabi ? 'punjabi' : 'english'}
                              onChange={(e) => updateField(activeField.id, { isPunjabi: e.target.value === 'punjabi' })}
                            >
                              <option value="english">English</option>
                              <option value="punjabi">Punjabi</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Font Weight</label>
                            <select
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold"
                              value={activeField.fontWeight || '400'}
                              onChange={(e) => updateField(activeField.id, { fontWeight: e.target.value })}
                            >
                              <option value="400">Normal (400)</option>
                              <option value="500">Medium (500)</option>
                              <option value="600">Semibold (600)</option>
                              <option value="700">Bold (700)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Text Color</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                className="w-8 h-8 rounded shrink-0 cursor-pointer"
                                value={activeField.color || '#000000'}
                                onChange={(e) => updateField(activeField.id, { color: e.target.value })}
                              />
                              <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold uppercase"
                                value={activeField.color || '#000000'}
                                onChange={(e) => updateField(activeField.id, { color: e.target.value })}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">X-Pad (px)</label>
                            <input
                              type="number"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                              value={activeField.padX || 0}
                              onChange={(e) => updateField(activeField.id, { padX: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Y-Pad (px)</label>
                            <input
                              type="number"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                              value={activeField.padY || 0}
                              onChange={(e) => updateField(activeField.id, { padY: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">X Pos (px)</label>
                            <input
                              type="number"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                              value={Math.round(activeField.x)}
                              onChange={(e) => updateField(activeField.id, { x: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Y Pos (px)</label>
                            <input
                              type="number"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                              value={Math.round(activeField.y)}
                              onChange={(e) => updateField(activeField.id, { y: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Width (px)</label>
                            <input
                              type="number"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                              value={Math.round(activeField.width)}
                              onChange={(e) => updateField(activeField.id, { width: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Height (px)</label>
                            <input
                              type="number"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold"
                              value={Math.round(activeField.height)}
                              onChange={(e) => updateField(activeField.id, { height: Number(e.target.value) })}
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                          <button
                            onClick={() => {
                              removeField(activeField.id);
                              setSelectedFieldId(null);
                            }}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-colors text-sm"
                          >
                            <Trash2 size={16} /> Remove Field
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* FILL MODE SIDEBAR */}
              {mode === 'fill' && (
                <>
                  <div className="p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center shrink-0">
                    <div>
                      <h2 className="text-lg font-black text-blue-900 tracking-tight">Data Entry</h2>
                      <p className="text-xs text-blue-600/70 mt-1 font-medium">{customFields.length} active fields</p>
                    </div>
                    {customFields.length > 0 && (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="text-xs font-bold text-rose-600 bg-white border border-rose-200 px-3 py-1.5 rounded-lg active:scale-95 shadow-sm"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50">
                    {showClearConfirm && (
                      <div className="p-4 bg-rose-100 border border-rose-200 rounded-2xl shadow-sm mb-4">
                        <div className="flex gap-3">
                          <ShieldAlert className="text-rose-600 shrink-0" size={24} />
                          <div>
                            <h4 className="text-sm font-black text-rose-900 mb-1">Clear all text?</h4>
                            <p className="text-xs text-rose-700/80 mb-3 font-medium">This will wipe everything you have typed across all pages. The layout fields will remain.</p>
                            <div className="flex gap-2">
                              <button onClick={handleClearAll} className="bg-rose-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm">Yes, clear data</button>
                              <button onClick={() => setShowClearConfirm(false)} className="bg-white text-rose-600 text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm border border-rose-200">Cancel</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {customFields.length === 0 ? (
                      <div className="text-center p-8 text-slate-400 font-bold text-sm">
                        No fields created yet. Switch to "Edit Layout" to draw some inputs.
                      </div>
                    ) : (
                      customFields.map((field) => (
                        <div key={field.id} className="bg-white border p-4 rounded-2xl shadow-sm   focus-within:border-blue-400 transition-colors">
                          <TranslationInput
                            label={field.name}
                            name={field.name}
                            value={formData[field.name]}
                            onChange={(val) => handleInputChange(field.name, val)}
                            placeholder={`Enter ${field.name}...`}
                            forcePunjabi={field.isPunjabi}
                            onToggleLanguage={(isPunjabi) => updateField(field.id, { isPunjabi })}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    setFile(null);
                    setMode('fill');
                    setSelectedFieldId(null);
                  }}
                  className="w-full py-2.5 text-[10px] font-black text-slate-400 hover:text-red-500 border border-slate-200 border-dashed rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <X size={14} />
                  CLOSE DOCUMENT
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
