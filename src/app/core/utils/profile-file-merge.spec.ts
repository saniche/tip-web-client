import { describe, expect, it, vi } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { mergeProfileFiles, ProfileFileTextExtractors } from './profile-file-merge';

describe('mergeProfileFiles', () => {
  it('combines Markdown, DOCX, and PDF text with source filename headings', async () => {
    const markdown = makeFile('notes.md');
    Object.defineProperty(markdown, 'text', { value: vi.fn().mockResolvedValue('Markdown content') });
    const docx = makeFile('resume.docx');
    const pdf = makeFile('portfolio.pdf');
    const extractors: ProfileFileTextExtractors = {
      docx: vi.fn().mockResolvedValue('DOCX content'),
      pdf: vi.fn().mockResolvedValue('PDF content'),
    };

    const merged = await mergeProfileFiles([markdown, docx, pdf], extractors);

    expect(merged.name).toBe('merged-profile.md');
    expect(merged.type).toBe('text/markdown');
    expect(await merged.text()).toContain(
      '## notes.md\n\nMarkdown content\n\n---\n\n## resume.docx\n\nDOCX content\n\n---\n\n## portfolio.pdf\n\nPDF content',
    );
    expect(extractors.docx).toHaveBeenCalledWith(docx);
    expect(extractors.pdf).toHaveBeenCalledWith(pdf);
  });

  it('rejects extraction failures with the source filename and a separate-upload action', async () => {
    const docx = makeFile('broken-resume.docx');
    const extractors: ProfileFileTextExtractors = {
      docx: vi.fn().mockRejectedValue(new Error('Invalid document')),
      pdf: vi.fn(),
    };

    await expect(mergeProfileFiles([docx], extractors)).rejects.toThrow(
      'Could not extract text from "broken-resume.docx". Disable merge mode to upload the original files separately.',
    );
  });

  it('rejects documents that contain no readable text', async () => {
    const pdf = makeFile('scanned.pdf');
    const extractors: ProfileFileTextExtractors = {
      docx: vi.fn(),
      pdf: vi.fn().mockResolvedValue(' \n '),
    };

    await expect(mergeProfileFiles([pdf], extractors)).rejects.toThrow(
      'No readable text was found in "scanned.pdf". Scanned PDFs may need OCR.',
    );
  });

  it('extracts text from the DOCX document body', async () => {
    const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const documentXml = `<w:document xmlns:w="${wordNamespace}"><w:body><w:p><w:r><w:t>DOCX text</w:t></w:r></w:p></w:body></w:document>`;
    const bytes = zipSync({ 'word/document.xml': strToU8(documentXml) });
    const docx = new File([bytes], 'resume.docx');

    const merged = await mergeProfileFiles([docx]);

    expect(await merged.text()).toContain('## resume.docx\n\nDOCX text');
  });
});

function makeFile(name: string): File {
  return new File(['placeholder'], name);
}
