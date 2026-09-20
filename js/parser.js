export class SafeDiscordParser {
  constructor(purify = null) {
    this.purify = purify || (typeof window !== 'undefined' ? window.DOMPurify : null);
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  parse(raw) {
    if (!raw) return '';
    let text = this.escapeHtml(raw);
    
    // Спойлеры Discord
    text = text.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    // Форматирование, цитаты, код
    text = text.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/^>\s?(.*)$/gm, '<blockquote class="discord-quote">$1</blockquote>');
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="safe-link">$1</a>');

    // Очистка от вредоносных скриптов через DOMPurify
    if (this.purify) {
      return this.purify.sanitize(text, {
        ALLOWED_TAGS: ['span', 'pre', 'code', 'strong', 'em', 'blockquote', 'a', 'p', 'br'],
        ALLOWED_ATTR: ['class', 'onclick', 'href', 'target', 'rel']
      });
    }
    return text;
  }
}
