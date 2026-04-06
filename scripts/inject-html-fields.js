import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function injectFields() {
  const pdfPath = path.join(__dirname, '../src/assets/Correction-in-Birth-Certificate-v-2.0.pdf');
  const htmlPath = path.join(__dirname, '../src/assets/Birth Certificate Correction v2.0.html');
  const outputPath = path.join(__dirname, '../src/assets/Interactive-Birth-Certificate.html');

  console.log('Loading PDF...');
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const pages = pdfDoc.getPages();

  // Standard A4 sizes in points
  const PDF_PAGE_WIDTH = 595.28;
  const PDF_PAGE_HEIGHT = 841.89;

  // HTML page is 51em wide and 66em high
  const HTML_WIDTH_EM = 51;
  const HTML_HEIGHT_EM = 66;

  // Scale factors
  const scaleX = HTML_WIDTH_EM / PDF_PAGE_WIDTH;
  const scaleY = HTML_HEIGHT_EM / PDF_PAGE_HEIGHT;

  // Map to hold HTML overlays per page
  const pageOverlays = {};

  fields.forEach(field => {
    const widgets = field.acroField.getWidgets();
    if (widgets.length === 0) return;
    
    // Simplistic page index extraction
    let pageIndex = 0;
    try {
      const widget = widgets[0];
      const pageRef = widget.getDict().get('P');
      if (pageRef) {
        pageIndex = pages.findIndex(p => p.ref === pageRef);
      }
    } catch(e) {}
    if (pageIndex === -1) pageIndex = 0;

    const rectangle = widgets[0].getRectangle();
    const type = field.constructor.name;
    const name = field.getName();

    // Convert coordinates to em. PDF Y is bottom-up, HTML is top-down
    const htmlX = rectangle.x * scaleX;
    const htmlW = rectangle.width * scaleX;
    const htmlH = rectangle.height * scaleY;
    
    // Top-down Y coordinate
    const htmlY = (PDF_PAGE_HEIGHT - rectangle.y - rectangle.height) * scaleY;

    if (!pageOverlays[pageIndex]) pageOverlays[pageIndex] = [];

    // Basic styling for our inputs
    const baseStyle = `position:absolute; left:${htmlX}em; top:${htmlY}em; width:${htmlW}em; height:${htmlH}em; font-size:1em; font-family:sans-serif; background-color:rgba(173, 216, 230, 0.4); border:1px solid #1e3a8a; border-radius: 4px; padding: 0.2em; box-sizing: border-box; outline: none; transition: background-color 0.2s; z-index: 10000;`;
    
    let htmlElement = '';
    
    if (field instanceof PDFTextField) {
      if (field.isMultiline()) {
        htmlElement = `<textarea name="${name}" title="${name}" style="${baseStyle}"></textarea>`;
      } else {
        htmlElement = `<input type="text" name="${name}" title="${name}" style="${baseStyle}" />`;
      }
    } else if (field instanceof PDFCheckBox) {
      // Checkbox needs size adjustments
      htmlElement = `<input type="checkbox" name="${name}" title="${name}" style="${baseStyle} cursor:pointer;" />`;
    } else if (field instanceof PDFDropdown) {
      const options = field.getOptions();
      htmlElement = `<select name="${name}" title="${name}" style="${baseStyle}">
        <option value="">Select...</option>
        ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
      </select>`;
    } else {
      // Fallback
      htmlElement = `<input type="text" name="${name}" title="${name}" style="${baseStyle}" />`;
    }

    // specific hover styles
    const styleWithHover = htmlElement.replace('style="', 'onmouseover="this.style.backgroundColor=\'rgba(173, 216, 230, 0.8)\'" onmouseout="this.style.backgroundColor=\'rgba(173, 216, 230, 0.4)\'" style="');

    pageOverlays[pageIndex].push(styleWithHover);
  });

  console.log('Loading HTML template...');
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Insert our overlays into the HTML
  // We look for <div id="page_0" etc and append right inside it.
  for (let i = 0; i < pages.length; i++) {
    const overlays = pageOverlays[i];
    if (!overlays || overlays.length === 0) continue;

    const searchStr = `<div id="page_${i}" class="pdf24_ pdf24_02">`;
    const searchIdx = htmlContent.indexOf(searchStr);
    
    if (searchIdx !== -1) {
      const insertIdx = searchIdx + searchStr.length;
      htmlContent = htmlContent.slice(0, insertIdx) + 
                    `\n<!-- INJECTED FORM FIELDS -->\n` + 
                    overlays.join('\n') + 
                    `\n<!-- END INJECTED FORM FIELDS -->\n` + 
                    htmlContent.slice(insertIdx);
      console.log(`Injected ${overlays.length} fields into page ${i}`);
    } else {
      console.log(`Could not find container for page ${i}`);
    }
  }

  // Adding a final form wrapper so elements can be submitted or printed beautifully
  const bodyIdx = htmlContent.indexOf('<body>');
  if (bodyIdx !== -1) {
    htmlContent = htmlContent.replace('<body>', '<body>\n<form id="pdf-form">');
    htmlContent = htmlContent.replace('</body>', '</form>\n</body>');
  }

  // Ensure hover states stay clean when printing
  htmlContent = htmlContent.replace('</head>', `
    <style>
      @media print {
        input, textarea, select {
          border: none !important;
          background-color: transparent !important;
          box-shadow: none !important;
          outline: none !important;
        }
      }
      input:focus, textarea:focus, select:focus {
        border-color: #2563eb !important;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2) !important;
        background-color: rgba(255, 255, 255, 0.9) !important;
      }
    </style>
  </head>`);

  fs.writeFileSync(outputPath, htmlContent);
  console.log('Successfully written to', outputPath);
}

injectFields().catch(console.error);
