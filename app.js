// ---------------------------------------------------------
// 1. Core State & Initialization (PWA Enabled)
// ---------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('SW Registered!', reg);
    }).catch(err => {
      console.log('SW Registration Failed:', err);
    });
  });
  
  // 監聽更新並自動重載
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
let state = {
  expenses: JSON.parse(localStorage.getItem('mr_v5_exp')) || [],
  categories: JSON.parse(localStorage.getItem('mr_v5_cat')) || ['餐飲', '交通', '住宿', '購物', '其他'],
  currencies: JSON.parse(localStorage.getItem('mr_v5_cur')) || [
    { code: 'TWD', rate: 1, name: '台幣' },
    { code: 'USD', rate: 0.031, name: '美金' },
    { code: 'VND', rate: 820, name: '越南盾' },
    { code: 'JPY', rate: 4.7, name: '日圓' },
    { code: 'KRW', rate: 41.5, name: '韓元' },
    { code: 'CNY', rate: 0.22, name: '人民幣' }
  ],
  homeCurrency: localStorage.getItem('mr_v5_home') || 'TWD',
  defaultEntryCurrency: localStorage.getItem('mr_v5_def_cur') || 'VND', // 預設記帳幣別
  currentView: 'home',
  editingId: null,
  version: 'v5.1.2' // 動態版號
};

const icons = { '餐飲': '🍴', '交通': '🚗', '住宿': '🏨', '購物': '🛍️', '其他': '📦', 'default': '💰' };
const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

document.addEventListener('DOMContentLoaded', () => {
  // 徹底移除 Service Worker 註冊，防止自動刷新
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  }
  initUI();
});

// ---------------------------------------------------------
// 2. Core Logic
// ---------------------------------------------------------
function getConversionRate(from, to) {
  const f = state.currencies.find(c => c.code === from);
  const t = state.currencies.find(c => c.code === to);
  return (f && t) ? t.rate / f.rate : 1;
}

function convertToHome(amt, from) {
  return (parseFloat(amt) || 0) * getConversionRate(from, state.homeCurrency);
}

function saveState() {
  localStorage.setItem('mr_v5_exp', JSON.stringify(state.expenses));
  localStorage.setItem('mr_v5_cur', JSON.stringify(state.currencies));
  localStorage.setItem('mr_v5_cat', JSON.stringify(state.categories));
  localStorage.setItem('mr_v5_home', state.homeCurrency);
  localStorage.setItem('mr_v5_def_cur', state.defaultEntryCurrency);
}

function initUI() {
  // 更新版號顯示
  const vTags = document.querySelectorAll('.v-tag');
  vTags.forEach(t => t.innerText = state.version);
  
  // 自動補齊並置頂預設幣別 (TWD 優先)
  const defaults = [
    { code: 'TWD', rate: 1, name: '台幣' },
    { code: 'USD', rate: 0.031, name: '美金' },
    { code: 'KRW', rate: 41.5, name: '韓元' }
  ];
  
  let changed = false;
  defaults.forEach(d => {
    if (!state.currencies.find(c => c.code === d.code)) {
      state.currencies.push(d);
      changed = true;
    }
  });

  // 強制將 TWD 置頂
  state.currencies.sort((a, b) => {
    if (a.code === 'TWD') return -1;
    if (b.code === 'TWD') return 1;
    return 0;
  });

  if (changed) saveState();

  updateDashboard();
  renderCurrentPage();
}

function updateDashboard() {
  const totalHome = state.expenses.reduce((s, e) => s + convertToHome(e.amount, e.currency), 0);
  const el = document.getElementById('total-amount');
  const lbl = document.getElementById('home-currency-label');
  if (el) el.innerText = Math.round(totalHome).toLocaleString();
  if (lbl) lbl.innerText = state.homeCurrency;

  const info = document.getElementById('dynamic-exchange-info');
  if (info) {
    const codes = [...new Set(state.expenses.map(e => e.currency))];
    info.innerHTML = codes.map((c, i) => {
      const sum = state.expenses.filter(e => e.currency === c).reduce((s, e) => s + parseFloat(e.amount), 0);
      const cur = state.currencies.find(cu => cu.code === c) || { rate: 1, name: c };
      return `${i>0?'<div class="info-divider"></div>':''}<div class="info-block"><span class="small-label">${cur.name}</span><span class="info-value">${Math.round(sum).toLocaleString()} ${c}</span></div>`;
    }).join('');
  }
  const count = document.getElementById('item-count');
  if (count) count.innerText = `${state.expenses.length} 筆紀錄`;
}

function renderCurrentPage() {
  const pages = ['home', 'stats', 'settings', 'guide'];
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.style.display = (state.currentView === p) ? 'block' : 'none';
  });
  
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === state.currentView);
  });

  if (state.currentView === 'home') { updateDashboard(); renderExpenses(); }
  if (state.currentView === 'stats') renderStats();
  if (state.currentView === 'settings') { renderCurrencyTable(); renderCategoryList(); }
}

function renderExpenses() {
  const list = document.getElementById('record-list');
  if (!list) return;
  const sorted = [...state.expenses].sort((a,b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  
  let lastDate = null;
  let useAltDate = false;

  list.innerHTML = sorted.map(exp => {
    if (exp.date !== lastDate) {
      useAltDate = !useAltDate;
      lastDate = exp.date;
    }
    const altClass = useAltDate ? 'alt-date' : '';
    const val = convertToHome(exp.amount, exp.currency);

    return `
      <div class="record-item ${altClass}" onclick="window.openModal('${exp.id}')">
        <div class="cat-icon-wrap">${icons[exp.category] || icons.default}</div>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:1rem;">${exp.category}</div>
          <div style="font-size:0.75rem; color:var(--text-dim); font-weight:500;">${exp.tag || ''} • ${exp.date}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800; color:var(--text);">${parseFloat(exp.amount).toLocaleString()} ${exp.currency}</div>
          <div style="font-size:0.7rem; color:var(--secondary); font-weight:700;">≈ ${Math.round(val).toLocaleString()} ${state.homeCurrency}</div>
        </div>
      </div>
    `;
  }).join('') || '<div style="text-align:center; padding:3rem; opacity:0.5;">尚無紀錄</div>';
}

function renderStats() {
  const total = state.expenses.reduce((s, e) => s + convertToHome(e.amount, e.currency), 0);
  const sums = state.expenses.reduce((acc, e) => {
    const v = convertToHome(e.amount, e.currency);
    acc[e.category] = (acc[e.category] || 0) + v;
    return acc;
  }, {});
  const sorted = Object.entries(sums).sort((a,b) => b[1] - a[1]);
  let deg = 0;
  const grad = sorted.map(([cat, val], i) => {
    const p = total ? (val / total) * 100 : 0;
    const start = deg; deg += p;
    return `${COLORS[i % COLORS.length]} ${start}% ${deg}%`;
  });
  const pie = document.getElementById('category-pie');
  if (pie) pie.style.background = `conic-gradient(${grad.join(',') || 'var(--glass-border) 0% 100%'})`;
  const leg = document.getElementById('category-legend');
  if (leg) leg.innerHTML = sorted.map(([cat, val], i) => `<div class="legend-item"><div class="color-dot" style="background:${COLORS[i % COLORS.length]}"></div><span>${cat} (${total?Math.round((val/total)*100):0}%)</span></div>`).join('');
  const info = document.getElementById('stat-total-info');
  if (info) info.innerText = `總計約 $${Math.round(total).toLocaleString()} ${state.homeCurrency}`;

  // 每日支出邏輯
  const dailySums = state.expenses.reduce((acc, e) => {
    const v = convertToHome(e.amount, e.currency);
    acc[e.date] = (acc[e.date] || 0) + v;
    return acc;
  }, {});
  const sortedDates = Object.entries(dailySums).sort((a,b) => a[0].localeCompare(b[0])); // 今天在最右邊
  const maxDay = Math.max(...Object.values(dailySums), 1);
  
  const barChart = document.getElementById('daily-bar-chart');
  if (barChart) {
    barChart.innerHTML = sortedDates.map(([date, val]) => {
      const p = (val / maxDay) * 100;
      const parts = date.split('-');
      const dayStr = `${parseInt(parts[1])}/${parseInt(parts[2])}`; // M/D
      return `
        <div class="v-bar-item">
          <div class="v-bar-val">${Math.round(val)}</div>
          <div class="v-bar-track"><div class="v-bar-fill" style="height:${p}%"></div></div>
          <div class="v-bar-label">${dayStr}</div>
        </div>
      `;
    }).join('') || '<div style="text-align:center; opacity:0.5; font-size:0.8rem; padding:1rem; width:100%;">暫無數據</div>';
    
    // 自動滾動到最右邊 (今天)
    setTimeout(() => { barChart.scrollLeft = barChart.scrollWidth; }, 100);
  }
}

// ---------------------------------------------------------
// 3. Global Functions (window exported)
// ---------------------------------------------------------
window.renderCurrencyTable = () => {
  const tb = document.getElementById('currency-table-body');
  if (!tb) return;
  tb.innerHTML = state.currencies.map(c => `
    <tr class="${state.homeCurrency === c.code || state.defaultEntryCurrency === c.code ? 'active-home-row' : ''}">
      <td><b style="font-size:1.1rem; letter-spacing:0.05rem;">${c.code}</b></td>
      <td onclick="window.editCurrencyRate('${c.code}')" style="cursor:pointer;">
        <div class="rate-ratio-box">
          <span class="rate-prefix">1 :</span>
          <span class="rate-value">${c.rate}</span>
        </div>
      </td>
      <td>
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          ${state.homeCurrency===c.code?'<span class="home-badge">結算主幣</span>':`<button class="set-home-btn" onclick="window.setHomeCurrency('${c.code}')">設為結算</button>`}
          ${state.defaultEntryCurrency===c.code?'<span class="home-badge" style="background:var(--success); box-shadow:0 4px 10px rgba(16,185,129,0.3);">預設記帳</span>':`<button class="set-home-btn" onclick="window.setDefaultEntryCurrency('${c.code}')">設為預設</button>`}
        </div>
      </td>
      <td style="text-align:right; width:40px;">
        ${c.code==='TWD' ? '' : `<div onclick="window.deleteCurrencyByCode('${c.code}')" class="delete-cur-btn">✕</div>`}
      </td>
    </tr>
  `).join('');
};

window.setHomeCurrency = (c) => { state.homeCurrency = c; saveState(); initUI(); };
window.setDefaultEntryCurrency = (c) => { state.defaultEntryCurrency = c; saveState(); initUI(); };
window.editCurrencyRate = (c) => {
  const cur = state.currencies.find(cu => cu.code === c);
  const r = prompt(`修改 ${c} 匯率 (1 TWD = ?)`, cur.rate);
  if (r && !isNaN(r)) { cur.rate = parseFloat(r); saveState(); initUI(); }
};
window.deleteCurrencyByCode = (c) => { if (confirm(`刪除 ${c}？`)) { state.currencies = state.currencies.filter(cu => cu.code !== c); saveState(); initUI(); } };
window.addCurrency = () => {
  const c = document.getElementById('new-currency-code').value.toUpperCase().trim();
  const r = parseFloat(document.getElementById('new-currency-rate').value);
  if (c && !isNaN(r)) { state.currencies.push({ code: c, rate: r, name: c }); saveState(); initUI(); }
};

window.renderCategoryList = () => {
  const el = document.getElementById('category-list');
  if (el) el.innerHTML = state.categories.map((c, i) => `<span class="glass-tag">${c} <span onclick="window.deleteCategory(${i})" style="color:var(--danger); cursor:pointer;">✕</span></span>`).join('');
};
window.addCategory = () => { const n = document.getElementById('new-category-name').value.trim(); if (n) { state.categories.push(n); saveState(); initUI(); } };
window.deleteCategory = (i) => { if (confirm('刪除類別？')) { state.categories.splice(i,1); saveState(); initUI(); } };

window.openModal = (id = null) => {
  state.editingId = id ? String(id) : null;
  const exp = id ? state.expenses.find(e => String(e.id) === String(id)) : null;
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = document.getElementById('form-template').innerHTML;
  
  const sel = document.getElementById('currency-select');
  sel.innerHTML = state.currencies.map(c => `<option value="${c.code}" ${(exp ? exp.currency : state.defaultEntryCurrency) === c.code ? 'selected' : ''}>${c.name} (${c.code})</option>`).join('');
  const grid = document.getElementById('form-category-grid');
  grid.innerHTML = state.categories.map(c => `<div class="cat-opt ${exp?.category===c?'selected':''}" data-cat="${c}">${c}</div>`).join('');
  grid.querySelectorAll('.cat-opt').forEach(o => o.onclick = () => { grid.querySelectorAll('.cat-opt').forEach(x => x.classList.remove('selected')); o.classList.add('selected'); });

  if (exp) {
    document.getElementById('modal-title').innerText = '編輯紀錄';
    document.getElementById('amount').value = exp.amount;
    document.getElementById('tag').value = exp.tag;
    document.getElementById('date').value = exp.date;
    const del = document.getElementById('delete-record-btn');
    del.style.display = 'flex';
    del.onclick = () => { if (confirm('確定刪除？')) { state.expenses = state.expenses.filter(e => String(e.id) !== String(id)); saveState(); window.closeModal(); initUI(); } };
  } else {
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    const firstCat = grid.querySelector('.cat-opt');
    if (firstCat) firstCat.classList.add('selected');
  }

  document.getElementById('expense-form').onsubmit = (e) => {
    e.preventDefault();
    const data = {
      id: exp ? exp.id : Date.now().toString(),
      currency: sel.value,
      amount: parseFloat(document.getElementById('amount').value),
      category: grid.querySelector('.cat-opt.selected').dataset.cat,
      tag: document.getElementById('tag').value,
      date: document.getElementById('date').value
    };
    if (exp) state.expenses = state.expenses.map(x => String(x.id)===String(id)?data:x); else state.expenses.push(data);
    saveState(); window.closeModal(); initUI();
  };
  overlay.style.display = 'flex';
};

window.closeModal = () => { document.getElementById('modal-overlay').style.display = 'none'; };
window.confirmClearAll = () => { if (confirm('清空所有紀錄？')) { state.expenses = []; saveState(); initUI(); } };
window.exportData = () => {
  const ws = XLSX.utils.json_to_sheet(state.expenses);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Expenses");
  XLSX.writeFile(wb, `MoneyRecord_v5.1_${new Date().toISOString().split('T')[0]}.xlsx`);
};
window.importData = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = (evt) => {
    const d = new Uint8Array(evt.target.result);
    const wb = XLSX.read(d, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const fixedRows = rows.map(r => ({
      ...r,
      currency: r.currency || 'TWD',
      id: String(r.id)
    }));
    state.expenses = [...state.expenses, ...fixedRows];
    saveState(); initUI(); alert('匯入完成');
  };
  r.readAsArrayBuffer(f);
};
