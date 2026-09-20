/**
 * archives.js - Модульная загрузка архивов по сезонам (раздельные JSON вместо монолита на 187КБ)
 */
import { SafeDiscordParser } from './parser.js';

export class ArchiveManager {
  constructor(containerId = 'archiveContent', parser = new SafeDiscordParser()) {
    this.container = document.getElementById(containerId);
    this.parser = parser;
    this.cache = new Map();
    this.currentSeason = 26;
  }

  async loadSeason(seasonNumber = 26) {
    this.currentSeason = seasonNumber;
    if (this.cache.has(seasonNumber)) {
      this.renderSeason(this.cache.get(seasonNumber));
      return;
    }

    this.showLoader();
    try {
      // Загружаем компактный JSON конкретного сезона вместо единого файла на 187 КБ
      const response = await fetch(`data/seasons/season-${seasonNumber}.json`);
      if (!response.ok) throw new Error(`Сезон ${seasonNumber} не найден`);

      const data = await response.json();
      this.cache.set(seasonNumber, data);
      this.renderSeason(data);
    } catch (err) {
      this.showError(`Не удалось загрузить данные сезона ${seasonNumber}: ${err.message}`);
    }
  }

  renderSeason(seasonData) {
    if (!this.container) return;

    const html = `
      <div class="season-header mb-6">
        <h2 class="text-2xl font-bold text-white">${seasonData.title}</h2>
        <div class="flex items-center gap-3 text-xs text-zinc-400 mt-2">
          <span>Статус: <b class="${seasonData.status === 'active' ? 'text-emerald-400' : 'text-zinc-300'}">${seasonData.status.toUpperCase()}</b></span>
          <span>•</span>
          <span>Статей прессы: <b>${seasonData.totalArticles}</b></span>
          <span>•</span>
          <span>Фракций: <b>${seasonData.totalNations}</b></span>
        </div>
      </div>

      <div class="factions-grid grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        ${seasonData.factions.map(f => `
          <div class="faction-card p-4 rounded-xl border border-zinc-800 bg-zinc-900/60" style="border-left: 3px solid ${f.color}">
            <div class="text-xs font-mono text-zinc-400">[${f.tag}]</div>
            <div class="font-bold text-white text-sm mt-1">${f.name}</div>
            <div class="text-xs text-zinc-400 mt-2">Индекс влияния: <span class="font-mono text-white">${f.powerIndex} / 100</span></div>
          </div>
        `).join('')}
      </div>

      <div class="events-list space-y-4">
        <h3 class="text-lg font-bold text-white mb-3">Ключевая хроника событий</h3>
        ${seasonData.keyEvents.map(ev => `
          <div class="event-row p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div class="text-xs font-mono text-emerald-400 mb-1">${ev.date} · [${ev.category}]</div>
              <div class="text-sm font-semibold text-white">${ev.title}</div>
              <div class="text-xs text-zinc-300 mt-1">${this.parser.parse(ev.summary)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.container.innerHTML = html;
  }

  showLoader() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="p-12 text-center text-zinc-400">
        <div class="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <div class="text-xs font-mono">Загрузка архивов сезона ${this.currentSeason}...</div>
      </div>
    `;
  }

  showError(msg) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
        ⚠️ ${msg}
      </div>
    `;
  }
}
