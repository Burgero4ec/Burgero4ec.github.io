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
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<u>$1</u>');
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

    if (/^─+$/.test(t)) {
      closeList();
      html += '<div class="dc-divider"></div>';
      continue;
    }
    if (/^⠀+$/.test(t)) {
      closeList();
      html += '<div class="dc-gap"></div>';
      continue;
    }
    if (t.startsWith('-# ')) {
      closeList();
      html += '<div class="small-text">' + inline(t.slice(3)) + '</div>';
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

    const ulm = t.match(/^[-*] (.+)/);
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
  if (!t) return '';
  return t.split(/\r?\n/).map(line => {
    const l = line.trim();
    if (!l) return '';
    if (l.startsWith('### ')) return '<h4>' + esc(l.slice(4)) + '</h4>';
    if (l.startsWith('## ')) return '<h4>' + esc(l.slice(3)) + '</h4>';
    if (l.startsWith('# ')) return '<h3>' + esc(l.slice(2)) + '</h3>';
    if (/^[-*] /.test(l)) return '<p style="margin-left:16px">— ' + esc(l.slice(2)) + '</p>';
    return '<p>' + esc(l) + '</p>';
  }).join('');
}
