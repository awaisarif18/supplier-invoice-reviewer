import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { DocumentPage } from './document-schema';

GlobalWorkerOptions.workerSrc = worker;

export async function readPdf(file: Blob, label: string): Promise<DocumentPage[]> {
  if (file.size > 5_000_000) throw new Error(label + ' must be under 5 MB.');
  const data = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-') throw new Error(label + ' must be a PDF.');
  const task = getDocument({ data, stopAtErrors: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 12) throw new Error(label + ' must have 12 pages or fewer.');
    const pages = [];
    let length = 0;
    for (let page = 1; page <= pdf.numPages; page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      const text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
      if (text) pages.push({ page, text });
      length += text.length;
      if (length > 18000) throw new Error(label + ' has too much text. Upload only the relevant pages.');
    }
    if (!pages.length) throw new Error(label + ' has no selectable text. Use a text PDF or enter details manually.');
    return pages;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(label)) throw error;
    throw new Error(label + ' could not be opened. Try an unlocked, readable PDF.');
  } finally {
    await task.destroy();
  }
}
