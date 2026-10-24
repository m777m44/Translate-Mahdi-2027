/**
 * documentTranslator.ts — translate whole documents while preserving their
 * structure. Supports plain text (.txt), SubRip subtitles (.srt) and WebVTT
 * (.vtt): cue timestamps are kept byte-for-byte and only the textual lines are
 * sent through the injected translation function (on-device neural, offline
 * dictionary or cloud — the caller decides).
 */

export type DocumentKind = 'txt' | 'srt' | 'vtt';

export interface TranslatableBlock {
  /** Lines that must be translated (joined with '\n' for the call). */
  lines: string[];
  /** Raw segment prefix to re-emit untouched (index/timestamps/headers). */
  prefix: string;
}

export interface ParsedDocument {
  kind: DocumentKind;
  fileName: string;
  blocks: TranslatableBlock[];
  header: string;
}

export function detectDocumentKind(fileName: string): DocumentKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.srt')) return 'srt';
  if (lower.endsWith('.vtt')) return 'vtt';
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'txt';
  return null;
}

export function parseDocument(fileName: string, raw: string): ParsedDocument {
  const kind = detectDocumentKind(fileName) ?? 'txt';

  if (kind === 'txt') {
    const paragraphs = raw.split(/\n\s*\n/).filter((p) => p.trim());
    return {
      kind,
      fileName,
      header: '',
      blocks: paragraphs.map((p) => ({ prefix: '', lines: [p.trim()] })),
    };
  }

  if (kind === 'vtt') {
    const lines = raw.split(/\r?\n/);
    const headerEnd = lines.findIndex((l) => l.includes('-->'));
    const header = headerEnd > 0 ? lines.slice(0, Math.max(1, headerEnd - 1)).join('\n') + '\n\n' : 'WEBVTT\n\n';
    const blocks = parseCueBlocks(lines.slice(headerEnd > 0 ? headerEnd - 1 : 0));
    return { kind, fileName, header, blocks };
  }

  // SRT
  const blocks = parseCueBlocks(raw.split(/\r?\n/));
  return { kind, fileName, header: '', blocks };
}

function parseCueBlocks(lines: string[]): TranslatableBlock[] {
  const blocks: TranslatableBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line || !line.trim()) { i += 1; continue; }

    const isTimestamp = line.includes('-->');
    // A cue starts with an optional numeric index, then a timestamp line.
    if (isTimestamp || /^\d+$/.test(line.trim())) {
      const prefixLines: string[] = [line];
      if (!isTimestamp && i + 1 < lines.length) {
        prefixLines.push(lines[i + 1]);
        i += 1;
      }
      i += 1;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        textLines.push(lines[i]);
        i += 1;
      }
      if (textLines.length) {
        blocks.push({ prefix: prefixLines.join('\n') + '\n', lines: textLines });
      }
    } else {
      // Header/comment line (e.g. WEBVTT, NOTE) — keep as-is.
      blocks.push({ prefix: line + '\n', lines: [] });
      i += 1;
    }
  }
  return blocks;
}

export interface TranslateProgress {
  done: number;
  total: number;
  /** 0..100 */
  percent: number;
}

/**
 * Run every translatable block through `translateFn` and rebuild the document.
 * Empty blocks and headers are preserved. Returns the translated file content.
 */
export async function translateDocument(
  doc: ParsedDocument,
  translateFn: (text: string) => Promise<string>,
  onProgress?: (p: TranslateProgress) => void,
): Promise<string> {
  const output: string[] = [];
  if (doc.header) output.push(doc.header);
  const translatable = doc.blocks.filter((b) => b.lines.length);
  let done = 0;

  for (const block of doc.blocks) {
    if (block.prefix && !block.lines.length) {
      output.push(block.prefix);
      continue;
    }
    const source = block.lines.join('\n');
    let translated = source;
    try {
      translated = await translateFn(source);
    } catch {
      translated = source; // keep original on failure rather than dropping the cue
    }
    if (block.prefix) output.push(block.prefix);
    output.push(translated + '\n');
    done += 1;
    onProgress?.({
      done,
      total: translatable.length,
      percent: Math.round((done / Math.max(1, translatable.length)) * 100),
    });
  }

  const separator = doc.kind === 'txt' ? '\n' : '\n';
  return output.join(separator).replace(/\n{4,}/g, '\n\n\n');
}

export function buildTranslatedFileName(fileName: string, targetLang: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0) return `${fileName}.${targetLang}.txt`;
  return `${fileName.slice(0, dot)}.${targetLang}${fileName.slice(dot)}`;
}

export function downloadTextFile(fileName: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
