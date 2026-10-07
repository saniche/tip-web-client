export interface ProfileFileTextExtractors {
  docx: (file: File) => Promise<string>;
  pdf: (file: File) => Promise<string>;
}

const DEFAULT_EXTRACTORS: ProfileFileTextExtractors = {
  docx: extractDocxText,
  pdf: extractPdfText,
};

export async function mergeProfileFiles(
  files: File[],
  extractors: ProfileFileTextExtractors = DEFAULT_EXTRACTORS,
): Promise<File> {
  if (files.length === 0) {
    throw new Error('Select at least one file to merge.');
  }

  const sections: string[] = [];
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let text: string;

    try {
      if (extension === 'md') {
        text = await file.text();
      } else if (extension === 'docx') {
        text = await extractors.docx(file);
      } else if (extension === 'pdf') {
        text = await extractors.pdf(file);
      } else {
        throw new Error(`Unsupported file type: ${file.name}`);
      }
    } catch (error) {
      throw new Error(
        `Could not extract text from "${file.name}". Disable merge mode to upload the original files separately.`,
        { cause: error },
      );
    }

    if (!text.trim()) {
      throw new Error(
        `No readable text was found in "${file.name}". Scanned PDFs may need OCR. Disable merge mode to upload the original files separately.`,
      );
    }

    const heading = file.name.replace(/[\r\n]+/g, ' ');
    sections.push(`## ${heading}\n\n${text.trim()}`);
  }

  return new File([sections.join('\n\n---\n\n')], 'merged-profile.md', {
    type: 'text/markdown',
  });
}

async function extractDocxText(file: File): Promise<string> {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const documentXml = archive['word/document.xml'];
  if (!documentXml) {
    throw new Error('The DOCX document body is missing.');
  }

  const xml = new DOMParser().parseFromString(strFromU8(documentXml), 'application/xml');
  if (xml.getElementsByTagName('parsererror').length > 0) {
    throw new Error('The DOCX document body is invalid.');
  }

  const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const paragraphs = Array.from(xml.getElementsByTagNameNS(wordNamespace, 'p'));
  return paragraphs
    .map((paragraph) =>
      Array.from(paragraph.getElementsByTagNameNS(wordNamespace, 't'))
        .map((text) => text.textContent ?? '')
        .join(''),
    )
    .filter((paragraph) => paragraph.length > 0)
    .join('\n');
}

async function extractPdfText(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = new URL('assets/pdf.worker.mjs', document.baseURI).toString();
  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });

  try {
    const document = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter((item) => item.length > 0)
        .join(' ');
      if (text) {
        pages.push(text);
      }
    }
    return pages.join('\n\n');
  } finally {
    await loadingTask.destroy();
  }
}
import { strFromU8, unzipSync } from 'fflate';
