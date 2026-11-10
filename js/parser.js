/**
 * parser.js - Парсер разметки Discord и Markdown с защитой от XSS
 */
import { esc, safeUrl } from './utils.js';

export function inline(s) {
  if (!s) return '';
  // Удаляем эмодзи вида <:name:123456>
  s = String(s).replace(/<:[a-zA-Z0-9_]+:\d+>/g, '');
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="spoiler">$1</span>');
  // Markdown ссылки вида [текст](https://...)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, txt, url) => {
    return '<a href="' + safeUrl(url) + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>';
  });
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<u>$1</u>');
  s = s.replace(/(^|[^_])_([^_]+)_(?![_a-zA-Z0-9])/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(https?:\/\/[^\s<]+)/g, (m, url) => {
    return '<a href="' + safeUrl(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>';
  });
  return s;
}

export function renderMarkdown(raw) {
  if (!raw) return '';
  const src = String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<span class=['"]?attachment-note['"]?>([\s\S]*?)<\/span>/gi, (m, c) => '\n-# 📎 ' + c.trim());

  const lines = src.split('\n');
  let html = '', inCode = false, codeBuf = [], listType = null;

  const closeList = () => {
    if (listType) {
      html += '</' + listType + '>';
      listType = null;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (!inCode) {
        closeList();
        inCode = true;
        codeBuf = [];
      } else {
        html += '<pre class="dc-code">' + esc(codeBuf.join('\n')) + '</pre>';
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    const t = line.trim();
    if (!t) {
      closeList();
      continue;
    }

    if (/^(?:─+|---+|\*\*\*+|___+)\s*$/.test(t)) {
      closeList();
      html += '<div class="dc-divider"></div>';
      continue;
    }
    if (/^⠀+$/.test(t)) {
      closeList();
      html += '<div class="dc-gap"></div>';
      continue;
    }
    if (t.startsWith('> ')) {
      closeList();
      html += '<blockquote class="dc-quote">' + inline(t.slice(2)) + '</blockquote>';
      continue;
    }
    if (t.startsWith('-# ')) {
      closeList();
      html += '<div class="small-text">' + inline(t.slice(3)) + '</div>';
      continue;
    }
    if (t.startsWith('#### ')) {
      closeList();
      html += '<div class="dc-h3">' + inline(t.slice(5)) + '</div>';
      continue;
    }
    if (t.startsWith('### ')) {
      closeList();
      html += '<div class="dc-h3">' + inline(t.slice(4)) + '</div>';
      continue;
    }
    if (t.startsWith('## ')) {
      closeList();
      html += '<div class="dc-h2">' + inline(t.slice(3)) + '</div>';
      continue;
    }
    if (t.startsWith('# ')) {
      closeList();
      html += '<div class="dc-h1">' + inline(t.slice(2)) + '</div>';
      continue;
    }

    const ulm = t.match(/^[-*+] (.+)/);
    if (ulm) {
      if (listType !== 'ul') {
        closeList();
        html += '<ul class="dc-list">';
        listType = 'ul';
      }
      html += '<li>' + inline(ulm[1]) + '</li>';
      continue;
    }

    const olm = t.match(/^\d+[.)] (.+)/);
    if (olm) {
      if (listType !== 'ol') {
        closeList();
        html += '<ol class="dc-list">';
        listType = 'ol';
      }
      html += '<li>' + inline(olm[1]) + '</li>';
      continue;
    }

    closeList();
    html += '<p class="dc-p">' + inline(t) + '</p>';
  }

  if (inCode) html += '<pre class="dc-code">' + esc(codeBuf.join('\n')) + '</pre>';
  closeList();
  return html;
}

export function md(t) {
  return renderMarkdown(t);
}
