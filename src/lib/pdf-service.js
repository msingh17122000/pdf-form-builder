import { PDFDocument, PDFName, PDFTextField, PDFCheckBox, PDFDropdown, PDFDict, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import 'regenerator-runtime/runtime';

const hexToRgb = (hex) => {
  if (!hex) return rgb(0, 0, 0);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
};

// We'll use a transparent Gurmukhi font to ensure Punjabi characters are saved correctly
const GURMUKHI_FONT_URL = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansGurmukhi/NotoSansGurmukhi-Regular.ttf';

export const parsePdfForm = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const pages = pdfDoc.getPages();

  return fields.map((field) => {
    const type = field.constructor.name;
    const name = field.getName();
    let value = '';
    
    // Get current value if any
    try {
      if (field instanceof PDFTextField) value = field.getText() || '';
      if (field instanceof PDFCheckBox) value = field.isChecked();
      if (field instanceof PDFDropdown) value = field.getSelected() || '';
    } catch (e) {
      console.warn(`Could not get value for field ${name}`, e);
    }

    // Get coordinates for interactive overlay
    const widgets = field.acroField.getWidgets();
    let rect = { x: 0, y: 0, width: 0, height: 0 };
    let pageIndex = 0;

    if (widgets.length > 0) {
      try {
        const widget = widgets[0];
        const rectangle = widget.getRectangle();
        
        // Use a more defensive way to get the page
        let page = null;
        if (typeof widget.getPage === 'function') {
          page = widget.getPage();
        } else if (widget.getDict) {
          const pageRef = widget.getDict().get(PDFName.of('P'));
          if (pageRef) {
            page = pages.find(p => p.node === pageRef || p.ref === pageRef);
          }
        }
        
        if (!page && pages.length > 0) page = pages[0]; // Fallback to first page
        
        if (page) {
          pageIndex = pages.findIndex(p => p.node === page.node || p === page);
          
          if (pageIndex !== -1) {
            const { width: pageWidth, height: pageHeight } = pages[pageIndex].getSize();
            
            rect = {
              x: rectangle.x, 
              y: pageHeight - rectangle.y - rectangle.height,
              width: rectangle.width,
              height: rectangle.height,
              pageWidth,
              pageHeight
            };
          } else {
            // Fallback: try direct comparison if node check failed
            pageIndex = pages.indexOf(page);
            if (pageIndex === -1) {
              console.warn(`Could not find page for field ${name}. Defaulting to page 0.`);
              pageIndex = 0;
            }
          }
        }
      } catch (err) {
        console.warn(`Error calculating rect for field ${name}:`, err);
      }
    }

    console.log(`Parsed field ${name}: page=${pageIndex}, rect=`, rect);

    return {
      name,
      type,
      value,
      label: name.replace(/_/g, ' ').replace(/\[\d+\]/g, ''),
      rect,
      pageIndex,
    };
  });
};

export const fillAndSavePdf = async (originalFile, fieldData, customFields = []) => {
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  pdfDoc.registerFontkit(fontkit);
  
  // Embed Gurmukhi font for Punjabi support
  let gurmukhiFont;
  try {
    const fontBytes = await fetch(GURMUKHI_FONT_URL).then((res) => res.arrayBuffer());
    gurmukhiFont = await pdfDoc.embedFont(fontBytes);
  } catch (e) {
    console.error('Failed to load Gurmukhi font, falling back to Helvetica', e);
  }

  const form = pdfDoc.getForm();
  
  try {
    const acroFormRef = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    if (acroFormRef) {
      if (typeof acroFormRef.set === 'function') {
        acroFormRef.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(true));
      } else {
        const dict = pdfDoc.context.lookup(acroFormRef);
        if (dict && typeof dict.set === 'function') {
          dict.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(true));
        }
      }
    }
  } catch (e) {
    console.warn('Could not set NeedAppearances', e);
  }

  Object.entries(fieldData).forEach(([name, value]) => {
    try {
      const field = form.getField(name);
      if (field instanceof PDFTextField) {
        field.setText(value);
        if (gurmukhiFont) {
          field.updateAppearances(gurmukhiFont);
        }
      } else if (field instanceof PDFCheckBox) {
        if (value) field.check();
        else field.uncheck();
      } else if (field instanceof PDFDropdown) {
        field.select(value);
      }
    } catch (e) {
      // Ignore warnings for purely custom form builder fields
      if (!customFields.find(cf => cf.name === name)) {
        console.warn(`Could not fill native field ${name}`, e);
      }
    }
  });

// Helper to generate a PNG from text exactly as the browser shapes it natively
const createTextPngUrl = (text, fontSize, fontWeight, color, isPunjabi) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Use Noto Sans Gurmukhi if Punjabi, else standard sans
  const fontFam = isPunjabi ? '"Noto Sans Gurmukhi", sans-serif' : 'sans-serif';
  const fontStr = `${fontWeight || '400'} ${fontSize}px ${fontFam}`;
  
  // Initial measurement
  ctx.font = fontStr;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width) + 8; // Add slight padding
  const height = Math.ceil(fontSize * 1.5); 
  
  // Ultra-high 4x resolution for PDF crispness
  canvas.width = width * 4; 
  canvas.height = height * 4;
  
  // Reset context after resizing
  ctx.scale(4, 4);
  ctx.font = fontStr;
  ctx.fillStyle = color || '#000000';
  ctx.textBaseline = 'top';
  
  ctx.fillText(text, 2, 2); // Slight offset
  return canvas.toDataURL('image/png');
};

  // Render Custom Form Builder Fields
  const pages = pdfDoc.getPages();
  for (const field of customFields) {
    const value = fieldData[field.name];
    if (value) {
      const page = pages[field.pageIndex];
      if (page) {
        const { height: pageHeight } = page.getSize();
        
        // Setup coordinates with padding support
        const padX = field.padX || 0;
        const padY = field.padY || 0;
        const startX = field.x + padX + 2; // base + user pad + default safe breathing room

        // If it is Punjabi, we capture the browser's exact shaping via Canvas
        if (field.isPunjabi) {
          const pngUrl = createTextPngUrl(value, field.fontSize || 12, field.fontWeight, field.color, true);
          const pngBytes = await fetch(pngUrl).then(res => res.arrayBuffer());
          const pngImage = await pdfDoc.embedPng(pngBytes);
          
          // PDF origin is bottom-left, canvas origin is top-left
          const pdfY = pageHeight - field.y - padY - (field.fontSize || 12) * 1.5;
          
          page.drawImage(pngImage, {
            x: startX,
            y: pdfY,
            width: pngImage.width / 4, // Scale back down from 4x super-sampling
            height: pngImage.height / 4,
          });
        } else {
          // Fallback to standard PDF drawing for english text
          const baselineAdjust = (field.fontSize || 12) * 0.2;
          const pdfY = pageHeight - field.y - padY - (field.fontSize || 12) + baselineAdjust;
          
          page.drawText(value, {
            x: startX,
            y: pdfY,
            size: field.fontSize || 12,
            font: gurmukhiFont || undefined, // still safe for standard ascii
            color: hexToRgb(field.color || '#000000'),
          });
        }
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `filled_${originalFile.name}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
