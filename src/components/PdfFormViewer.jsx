import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, X, Plus } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfFormViewer = ({
  file,
  mode, // 'fill' or 'build'
  customFields,
  onFieldAdd,
  onFieldSelect,
  selectedFieldId,
  formData,
  onInputChange
}) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loadError, setLoadError] = useState(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const pageContainerRef = useRef(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoadError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF Load Error:', error);
    setLoadError(error.message);
  };

  const changePage = (offset) => {
    setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages));
  };

  // Mouse Handlers for Drawing Fields
  const handleMouseDown = (e) => {
    if (mode !== 'build') return;
    if (e.target.closest('.custom-field-box')) return; // Don't draw if clicking an existing field

    // Deselect if clicking empty space
    if (onFieldSelect) onFieldSelect(null);

    const rect = pageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setDrawCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);

    // Ignore tiny accidental clicks
    if (width > 10 && height > 10) {
      const x = Math.min(drawCurrent.x, drawStart.x);
      const y = Math.min(drawCurrent.y, drawStart.y);

      onFieldAdd({
        pageIndex: pageNumber - 1,
        // Convert screen pixels back to unscaled PDF points
        x: x / scale,
        y: y / scale,
        width: width / scale,
        height: height / scale,
      });
    }
  };

  // Prevent default drag behaviors to avoid text highlighting while drawing
  useEffect(() => {
    const preventDrag = (e) => {
      if (isDrawing) e.preventDefault();
    };
    window.addEventListener('dragstart', preventDrag);
    return () => window.removeEventListener('dragstart', preventDrag);
  }, [isDrawing]);


  const pageFields = customFields.filter(f => f.pageIndex === pageNumber - 1);

  return (
    <div className="h-full flex flex-col bg-slate-200 overflow-hidden relative">
      {/* Viewer Controls */}
      <div className="absolute w-full bg-[#ffffff40] backdrop-blur-[8px] border-b border-slate-200 p-3 flex items-center justify-between shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-sm font-bold text-slate-700 min-w-[80px] text-center">
              {pageNumber} / {numPages || '--'}
            </div>
            <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {mode === 'build' && (
          <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            BUILD MODE: Click & Drag to create fields
          </div>
        )}

        <div className="flex items-center gap-2 ">
          <button onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
            <Minimize2 color='black' size={18} />
          </button>
          <div className="text-xs font-black  bg-white rounded-full p-2 px-4 text-center">
            {Math.round(scale * 100)}%
          </div>
          <button onClick={() => setScale(prev => Math.min(2.0, prev + 0.1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
            <Maximize2 color='black' size={18} />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div ref={containerRef} className="mt-12 flex-1 overflow-auto p-4 flex flex-col items-center custom-scrollbar select-none">
        <div className="relative shadow-2xl bg-white min-w-min border border-slate-200">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div className="flex flex-col items-center justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>}
          >
            {loadError ? (
              <div className="p-20 text-center bg-rose-50 border border-rose-100 rounded-3xl m-4"><X className="text-rose-500 mx-auto" size={48} /></div>
            ) : (
              <div
                ref={pageContainerRef}
                className="relative inline-block"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: mode === 'build' ? 'crosshair' : 'default' }}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />

                {/* Overlays */}
                <div className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>

                  {/* The Drawing Box Preview */}
                  {isDrawing && (
                    <div
                      className="absolute border-2 border-indigo-500 bg-indigo-500/20"
                      style={{
                        left: Math.min(drawStart.x, drawCurrent.x),
                        top: Math.min(drawStart.y, drawCurrent.y),
                        width: Math.abs(drawCurrent.x - drawStart.x),
                        height: Math.abs(drawCurrent.y - drawStart.y),
                        zIndex: 50
                      }}
                    />
                  )}

                  {/* Render Custom Fields */}
                  {pageFields.map((field) => {
                    const isSelected = selectedFieldId === field.id;
                    return (
                      <div
                        key={field.id}
                        className={`custom-field-box absolute flex items-center px-1 overflow-hidden pointer-events-auto transition-all ${mode === 'build'
                          ? isSelected
                            ? 'border-2 border-indigo-600 bg-indigo-100/50 shadow-lg z-40'
                            : 'border border-slate-400 bg-blue-50/40 hover:bg-blue-100/60 z-10'
                          : 'border-b-2 border-blue-200 bg-blue-50/20 z-10 focus-within:border-blue-600 focus-within:bg-blue-100/40'
                          }`}
                        style={{
                          left: field.x * scale,
                          top: field.y * scale,
                          width: field.width * scale,
                          height: field.height * scale,
                          cursor: mode === 'build' ? 'pointer' : 'text'
                        }}
                        onClick={(e) => {
                          if (mode === 'build') {
                            e.stopPropagation();
                            onFieldSelect(field.id);
                          }
                        }}
                      >
                        {mode === 'build' ? (
                          <div className="w-full text-[10px] font-black text-indigo-700 truncate opacity-80 pointer-events-none text-center">
                            {field.name}
                          </div>
                        ) : (
                          // In Fill mode, render an invisible input/textarea
                          field.height > 35 ? (
                            <textarea
                              className="w-full h-full bg-transparent resize-none outline-none"
                              style={{
                                fontSize: `${(field.fontSize || 12) * scale}px`,
                                lineHeight: 1.2,
                                fontWeight: field.fontWeight || '400',
                                color: field.color || '#000000',
                                padding: `${(field.padY || 0) * scale}px ${(field.padX || 0) * scale}px`
                              }}
                              value={formData[field.name] || ''}
                              onChange={(e) => onInputChange(field.name, e.target.value)}
                              placeholder={field.name}
                            />
                          ) : (
                            <input
                              type="text"
                              name={field.name}
                              className="w-full h-full bg-transparent outline-none"
                              style={{
                                fontSize: `${(field.fontSize || 12) * scale}px`,
                                fontWeight: field.fontWeight || '400',
                                color: field.color || '#000000',
                                padding: `${(field.padY || 0) * scale}px ${(field.padX || 0) * scale}px`
                              }}
                              value={formData[field.name] || ''}
                              onChange={(e) => onInputChange(field.name, e.target.value)}
                              placeholder={field.name}
                            />
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Document>
        </div>
      </div>
    </div>
  );
};

export default PdfFormViewer;
