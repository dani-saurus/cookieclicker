const AUTOS = [
  { id: 'cursor', name: 'Cursor', baseCost: 15, baseRate: 1 },
  { id: 'grandma', name: 'Grandma', baseCost: 100, baseRate: 5 },
  { id: 'farm', name: 'Farm', baseCost: 500, baseRate: 10 },
  { id: 'mine', name: 'Mine', baseCost: 2000, baseRate: 100 },
  { id: 'factory', name: 'Factory', baseCost: 10000, baseRate: 500 },
  { id: 'bank', name: 'Bank', baseCost: 50000, baseRate: 1000 },
  { id: 'temple', name: 'Temple', baseCost: 200000, baseRate: 4000 },
  { id: 'wizard', name: 'Wizard', baseCost: 1000000, baseRate: 10000 },
];

const UPGRADES = [
  { id: 'doubleCursor', name: 'Double Cursors', cost: 1000, type: 'autoclicker', target: 'cursor', multiplier: 2 },
  { id: 'superGrandmas', name: 'Super Grandmas', cost: 5000, type: 'autoclicker', target: 'grandma', multiplier: 3 },
  { id: 'fertilizer', name: 'Fertilizer', cost: 20000, type: 'autoclicker', target: 'farm', multiplier: 2 },
  { id: 'clickingPro', name: 'Clicking Pro', cost: 10000, type: 'click', multiplier: 2 },
  { id: 'goldenTouch', name: 'Golden Touch', cost: 50000, type: 'click', multiplier: 3 },
];



class GameState {
  constructor() {
    this.cookies = 0;
    this.cookiesPerClick = 1;
    this.cookiesPerSecond = 0;
    this.autoclickers = {};
    this.autoMultipliers = {};
    this.upgrades = {};
    this.theme = 'default';
  }

  toJSON() {
    return JSON.stringify(this);
  }

  load(json) {
    const data = JSON.parse(json);
    Object.assign(this, data);
  }
}


class CookieGame {
  constructor() {
    this.state = new GameState();
    this.interval = null;
  }

  init() {
    this.loadState();
    this.buildShop();
    this.buildUpgrades();
    this.bindUI();
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = this.state.theme || 'default';
    document.body.setAttribute('data-theme', this.state.theme);
    this.startLoop();
    this.updateUI();
  }

  bindUI() {
    document.getElementById('cookie-button')?.addEventListener('click', () => this.onClickCookie());
    document.getElementById('theme-select')?.addEventListener('change', (e) => this.onChangeTheme(e));
    document.getElementById('reset-save')?.addEventListener('click', () => this.onResetSave());
  }


  buildShop() {
    const container = document.getElementById('autoclickers-container');
    if (!container) return;
    container.innerHTML = '';

    AUTOS.forEach(auto => {
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.dataset.clicker = auto.id;
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold">${auto.name}</div>
            <div class="small-muted">${auto.baseRate}/s each</div>
          </div>
          <div style="text-align:right">
            <div>Cost: <span class="cost" data-cost-for="${auto.id}">${this.getAutoCost(auto.id)}</span></div>
            <div>Owned: <span class="owned-count">${this.state.autoclickers[auto.id] || 0}</span></div>
          </div>
        </div>`;
      div.addEventListener('click', () => this.buyAuto(auto.id));
      container.appendChild(div);
    });
  }


  buildUpgrades() {
    const container = document.getElementById('upgrades-container');
    if (!container) return;
    container.innerHTML = '';

    UPGRADES.forEach(up => {
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.dataset.upgrade = up.id;
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-bold">${up.name}</div>
            <div class="small-muted">${up.type === 'click' ? 'Boosts clicks' : 'Boosts ' + up.target}</div>
          </div>
          <div style="text-align:right">
            <div>Cost: <span class="upgrade-cost">${up.cost}</span></div>
          </div>
        </div>`;
      div.addEventListener('click', () => this.buyUpgrade(up.id));
      container.appendChild(div);
    });
  }


  getAutoCost(id) {
    const auto = AUTOS.find(a => a.id === id);
    const owned = this.state.autoclickers[id] || 0;
    return Math.floor(auto.baseCost * Math.pow(1.15, owned));
  }

  buyAuto(id) {
    const cost = this.getAutoCost(id);
    if (this.state.cookies < cost) return;
    this.state.cookies -= cost;
    this.state.autoclickers[id] = (this.state.autoclickers[id] || 0) + 1;
    this.saveState();
    this.updateUI();
  }

  buyUpgrade(id) {
    const up = UPGRADES.find(u => u.id === id);
    if (!up || this.state.upgrades[id] || this.state.cookies < up.cost) return;
    this.state.cookies -= up.cost;
    this.state.upgrades[id] = true;
    if (up.type === 'click') {
      this.state.cookiesPerClick *= up.multiplier;
    } else if (up.type === 'autoclicker') {
      this.state.autoMultipliers[up.target] = (this.state.autoMultipliers[up.target] || 1) * up.multiplier;
    }
    this.saveState();
    this.updateUI();
  }


  onClickCookie() {
    this.state.cookies += this.state.cookiesPerClick;
    this.createFloating('+' + this.state.cookiesPerClick);
    this.updateUI();
  }


  startLoop() {
    this.interval = setInterval(() => {
      let prod = 0;
      AUTOS.forEach(a => {
        const owned = this.state.autoclickers[a.id] || 0;
        const mult = this.state.autoMultipliers[a.id] || 1;
        prod += a.baseRate * owned * mult;
      });
      this.state.cookies += prod;
      this.state.cookiesPerSecond = prod;
      this.updateUI();
      this.saveState();
    }, 1000);
  }


  updateUI() {
    document.getElementById('cookie-count').textContent = Math.floor(this.state.cookies);
    document.getElementById('cookies-per-second').textContent = this.state.cookiesPerSecond.toFixed(1);

    AUTOS.forEach(a => {
      const el = document.querySelector(`[data-clicker="${a.id}"]`);
      if (!el) return;
      el.querySelector(`.cost[data-cost-for="${a.id}"]`).textContent = this.getAutoCost(a.id);
      el.querySelector('.owned-count').textContent = this.state.autoclickers[a.id] || 0;
      el.classList.toggle('disabled', this.state.cookies < this.getAutoCost(a.id));
    });

    UPGRADES.forEach(u => {
      const el = document.querySelector(`[data-upgrade="${u.id}"]`);
      if (!el) return;
      el.classList.toggle('disabled', this.state.upgrades[u.id] || this.state.cookies < u.cost);
      el.classList.toggle('purchased', !!this.state.upgrades[u.id]);
    });
  }


  createFloating(text) {
    const floater = document.createElement('div');
    floater.className = 'floating-points';
    floater.textContent = text;
    const cookie = document.getElementById('cookie-button');
    const rect = cookie ? cookie.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0 };
    floater.style.left = rect.left + rect.width / 2 + 'px';
    floater.style.top = rect.top + 'px';
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 900);
  }


  saveState() {
    localStorage.setItem('cookieClickerSave', this.state.toJSON());
  }

  loadState() {
    const raw = localStorage.getItem('cookieClickerSave');
    if (raw) this.state.load(raw);
  }


  onChangeTheme(e) {
    const theme = e.target.value;
    this.state.theme = theme;
    document.body.setAttribute('data-theme', theme);
    this.saveState();
  }

  onResetSave() {
    if (!confirm('Reset save?')) return;
    localStorage.removeItem('cookieClickerSave');
    this.state = new GameState();
    this.saveState();
    this.updateUI();
    this.showMessage('Save reset');
  }


  showMessage(text, timeout = 1800) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.top = '20px';
    el.style.transform = 'translateX(-50%)';
    el.style.background = 'rgba(0,0,0,0.8)';
    el.style.color = 'white';
    el.style.padding = '8px 14px';
    el.style.borderRadius = '6px';
    el.style.zIndex = 9999;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), timeout);
  }
}


window.addEventListener('load', () => {
  const game = new CookieGame();
  game.init();
});
