/**
 * parser.js - Безопасный Discord Markdown парсер со встроенной защитой DOMPurify
 */

export class SafeDiscordParser {
  constructor(domPurifyInstance = null) {
    this.purify = domPurifyInstance || (typeof window !== 'undefined' ? window.DOMPurify : null);
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  parse(rawMarkdown) {
    if (!rawMarkdown) return '';

    // Сначала экранируем базовый HTML для предотвращения XSS
    let text = this.escapeHtml(rawMarkdown);

    // 1. Спойлеры Discord: ||текст||
    text = text.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');

    // 2. Блоки кода: ```js\nкод\n```
    text = text.replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

    // 3. Инлайн код: `код`
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // 4. Жирный и курсив
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/__([^_]+)__/g, '<u>$1</u>');
    text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 5. Цитаты Discord: > текст
    text = text.replace(/^>\s?(.*)$/gm, '<blockquote class="discord-quote">$1</blockquote>');

    // 6. Заголовки Discord: # Заголовок
    text = text.replace(/^### (.*$)/gm, '<h3 class="post-h3">$1</h3>');
    text = text.replace(/^## (.*$)/gm, '<h2 class="post-h2">$1</h2>');
    text = text.replace(/^# (.*$)/gm, '<h1 class="post-h1">$1</h1>');

    // 7. Ссылки: [название](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="safe-link">$1</a>');

    // 8. Финальная очистка через DOMPurify (если доступен в рантайме)
    if (this.purify && typeof this.purify.sanitize === 'function') {
      return this.purify.sanitize(text, {
        ALLOWED_TAGS: ['span', 'pre', 'code', 'strong', 'em', 'u', 'del', 'blockquote', 'h1', 'h2', 'h3', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['class', 'onclick', 'href', 'target', 'rel']
      });
    }

    return text;
  }
}
