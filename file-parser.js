/**
 * SCHOLR — File Parser
 * Extracts topics from PDF, DOCX, PPTX using PDF.js, Mammoth, and JSZip.
 * All libraries loaded from CDN – no npm needed.
 */

// Dynamically load required libraries
let librariesReady = false;
let pdfjsLib, mammoth, JSZip;

async function ensureLibraries() {
  if (librariesReady) return true;

  // Load PDF.js
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });

  // Load Mammoth for DOCX
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.onload = () => {
      mammoth = window.mammoth;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Mammoth'));
    document.head.appendChild(script);
  });

  // Load JSZip for PPTX
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => {
      JSZip = window.JSZip;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(script);
  });

  librariesReady = true;
  return true;
}

// Simple topic extraction heuristics
function extractTopicsFromText(text) {
  if (!text || text.length < 20) return [];

  // Split into lines, filter out very short ones
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 10);

  // Look for lines that look like headings or bullet points
  const candidates = [];
  const headingPatterns = [
    /^(chapter|section|unit|module|lecture|topic)\s*\d+/i,
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,6}$/,  // Title case phrases
    /^[-•*]\s+[A-Z]/,                         // bullet starting with capital
    /^\d+\.\s+[A-Z]/,                         // numbered item
  ];

  for (const line of lines) {
    // Skip lines that are too long (likely paragraph text)
    if (line.length > 120) continue;
    // Check against patterns
    for (const pattern of headingPatterns) {
      if (pattern.test(line)) {
        let cleaned = line.replace(/^[-•*\d.]+\s*/, '').trim();
        // Truncate to a reasonable length
        if (cleaned.length > 60) cleaned = cleaned.substring(0, 57) + '...';
        if (cleaned && !candidates.includes(cleaned)) {
          candidates.push(cleaned);
        }
        break;
      }
    }
  }

  // If we got very few, use the first few non-empty lines as fallback
  if (candidates.length < 3) {
    const moreLines = lines.filter(l => l.length > 15).slice(0, 10);
    for (const line of moreLines) {
      let clean = line.substring(0, 60);
      if (!candidates.includes(clean)) candidates.push(clean);
    }
  }

  // Remove duplicates and return top 15
  return [...new Set(candidates)].slice(0, 15);
}

/**
 * Parse a file and return extracted topics.
 * @param {File} file
 * @returns {Promise<{topics: string[]}>}
 */
export async function parseFile(file) {
  await ensureLibraries();

  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (fileName.endsWith('.pdf')) {
    return await parsePDF(arrayBuffer);
  } else if (fileName.endsWith('.docx')) {
    return await parseDOCX(arrayBuffer);
  } else if (fileName.endsWith('.pptx')) {
    return await parsePPTX(arrayBuffer);
  } else {
    throw new Error('Unsupported file type. Please upload PDF, DOCX, or PPTX.');
  }
}

async function parsePDF(buffer) {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(' ') + '\n';
  }
  return { topics: extractTopicsFromText(fullText) };
}

async function parseDOCX(buffer) {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return { topics: extractTopicsFromText(result.value) };
}

async function parsePPTX(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  let fullText = '';
  const slideFiles = Object.keys(zip.files).filter(name =>
    name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
  );
  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async('text');
    // Extract text between <a:t> tags
    const matches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
    if (matches) {
      for (const match of matches) {
        const text = match.replace(/<[^>]*>/g, '').trim();
        if (text) fullText += text + '\n';
      }
    }
  }
  return { topics: extractTopicsFromText(fullText) };
}

// Export a dummy function for backward compatibility
export function getLoadedLibraries() {
  return { pdfjsLib, mammoth, JSZip, ready: librariesReady };
}
