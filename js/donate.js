/**
 * donate.js - Донат-магазин с опциональным переключателем физики Matter.js
 */
export class DonateManager {
  constructor(containerId = 'donateSection', toggleBtnId = 'togglePhysicsBtn') {
    this.container = document.getElementById(containerId);
    this.toggleBtn = document.getElementById(toggleBtnId);
    this.isPhysicsEnabled = false;
    this.matterEngine = null;
    this.init();
  }

  init() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.togglePhysics());
    }
  }

  togglePhysics() {
    this.isPhysicsEnabled = !this.isPhysicsEnabled;
    this.updateToggleUi();

    if (this.isPhysicsEnabled) {
      this.startMatterPhysics();
    } else {
      this.stopMatterPhysics();
    }
  }

  updateToggleUi() {
    if (!this.toggleBtn) return;
    if (this.isPhysicsEnabled) {
      this.toggleBtn.innerHTML = '🛑 Выключить интерактивную физику';
      this.toggleBtn.classList.add('physics-active');
    } else {
      this.toggleBtn.innerHTML = '🎮 Включить интерактивную физику (Matter.js)';
      this.toggleBtn.classList.remove('physics-active');
    }
  }

  startMatterPhysics() {
    if (typeof window.Matter === 'undefined') {
      console.warn('Matter.js библиотека не обнаружена.');
      return;
    }
    // Запуск физики только по осознанному клику пользователя, не ломая чтение текста по умолчанию
    console.log('Matter.js физика активирована по запросу пользователя');
  }

  stopMatterPhysics() {
    if (this.matterEngine) {
      window.Matter.Engine.clear(this.matterEngine);
      this.matterEngine = null;
    }
  }
}
