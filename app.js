// --- State Management (v4.5) ---
let state = {
  expenses: JSON.parse(localStorage.getItem('mr_v4_exp')) || [],
  currencies: JSON.parse(localStorage.getItem('mr_v4_cur')) || [
    { code: 'VND', name: '越南盾', rate: 820 },
    { code: 'JPY', name: '日圓', rate: 4.7 },
    { code: 'CNY', name: '人民幣', rate: 0.22 },
    { code: 'USD', name: '美金', rate: 0.031 }
  ],
  categories: JSON.parse(localStorage.getItem('mr_v4_cat')) || ['餐飲', '交通', '雜支', '住宿', '購物'],
  exportEmail: localStorage.getItem('mr_v4_email') || '',
  currentView: 'home',
  editingId: null
};

// 自動修正 (Migration v4.5)
let needsSave = false;
state.currencies = state.currencies.map(c => {
  if (c.code === 'USD' && c.rate > 1) { c.rate = 0.031; needsSave = true; }
  if (c.code === 'CNY' && c.rate > 1) { c.rate = 0.22; needsSave = true; }
  if (c.code === 'JPY' && (c.rate < 1 || c.rate === 32)) { c.rate = 4.7; needsSave = true; }
  return c;
});
if (needsSave) saveState();

// Quick Tag Logic (v4.5)
window.renderQuickTags = () => {
  const container = document.getElementById('quick-tags-container');
  if (!container || state.expenses.length === 0) return;
  const allTags = state.expenses.slice(-50).map(e => e.tag?.trim()).filter(t => t);
  if (allTags.length === 0) return;
  const freq = {};
  allTags.forEach(t => freq[t] = (freq[t] || 0) + 1);
  const sorted = Object.keys(freq).sort((a,b) => freq[b] - freq[a]);
  const recentTag = state.expenses[state.expenses.length - 1]?.tag?.trim();
  let finalTags = [...new Set([recentTag, ...sorted])].filter(t => t).slice(0, 5);
  container.innerHTML = finalTags.map(tag => {
    const isRecent = tag === recentTag;
    return `<div class="tag-pill ${isRecent ? 'recent' : ''}" onclick="window.applyQuickTag('${tag.replace(/'/g, "\\'")}')">${isRecent ? '🕒 ' : ''}${tag}</div>`;
  }).join('');
};

window.applyQuickTag = (val) => {
  const input = document.getElementById('tag');
  if (input) { input.value = val; input.focus(); }
};

// Icons
const icons = {
  '餐飲': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
  '交通': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="13" rx="2"></rect><path d="M7 21h10"></path><line x1="12" y1="16" x2="12" y2="21"></line></svg>`,
  '雜支': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  '住宿': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>`,
  '購物': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"></circle><circle cx="17" cy="19" r="2"></circle><path d="M17 17H6.15a2 2 0 0 1-1.95-1.55L3.1 4.5A2 2 0 0 0 1.15 3H1"></path><path d="m22 5-1.5 9h-12"></path></svg>`,
  'default': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  setupNav();
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    });
  }
});

function initUI() {
  updateDashboard();
  renderCurrentPage();
  renderCurrencyList();
  renderCategoryList();
}

function saveState() {
  localStorage.setItem('mr_v4_exp', JSON.stringify(state.expenses));
  localStorage.setItem('mr_v4_cur', JSON.stringify(state.currencies));
  localStorage.setItem('mr_v4_cat', JSON.stringify(state.categories));
  localStorage.setItem('mr_v4_email', state.exportEmail);
}

function updateDashboard() {
  const totalTwd = state.expenses.reduce((s, e) => s + parseFloat(e.homeAmount), 0);
  const homeTotal = document.getElementById('total-home');
  if (homeTotal) homeTotal.innerText = Math.round(totalTwd).toLocaleString();
  
  // Dynamic Foreign Totals (v4.4)
  const dynamicInfo = document.getElementById('dynamic-exchange-info');
  if (dynamicInfo) {
    if (state.expenses.length === 0) {
      dynamicInfo.innerHTML = '<div class="info-block" style="opacity:0.3;"><span class="small-label">尚未有資料</span></div>';
    } else {
      // Get all unique foreign currencies used in expenses
      const usedCodes = [...new Set(state.expenses.map(e => e.currency))];
      
      dynamicInfo.innerHTML = usedCodes.map((code, idx) => {
        const total = state.expenses.filter(e => e.currency === code).reduce((s, e) => s + parseFloat(e.foreignAmount), 0);
        const rateObj = state.currencies.find(c => c.code === code) || { rate: 1, name: code };
        
        return `
          ${idx > 0 ? '<div class="info-divider"></div>' : ''}
          <div class="info-block">
            <span class="small-label">${rateObj.name}總額</span>
            <span class="info-value">${Math.round(total).toLocaleString()} ${code}</span>
            <small style="font-size:0.55rem; color:var(--secondary); font-weight:600; margin-top:1px; white-space:nowrap;">1 TWD : ${rateObj.rate}</small>
          </div>
        `;
      }).join('');
    }
  }
  
  const itemCount = document.getElementById('item-count');
  if (itemCount) itemCount.innerText = `${state.expenses.length} 筆紀錄`;

  const statTotal = document.getElementById('stat-total-info');
  if (statTotal) statTotal.innerText = `總支出: $${Math.round(totalTwd).toLocaleString()}`;
}

function setupNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.onclick = () => {
      state.currentView = btn.dataset.page;
      renderCurrentPage();
    };
  });
  const addBtn = document.getElementById('add-btn-main');
  if (addBtn) addBtn.onclick = () => openModal();
}

function renderCurrentPage() {
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${state.currentView}`));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === state.currentView));

  if (state.currentView === 'home') renderExpenses();
  if (state.currentView === 'stats') renderStats();
  if (state.currentView === 'settings') renderSettings();
}

function renderExpenses() {
  const list = document.getElementById('record-list');
  if (!list) return;
  if (state.expenses.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:4rem 0; color:var(--text-dim); opacity:0.5;">尚無紀錄，點擊下方「+」開始</div>`;
    return;
  }
  const sorted = [...state.expenses].sort((a,b) => new Date(b.date) - new Date(a.date));
  list.innerHTML = sorted.map(exp => `
    <div class="record-item" onclick="openModal('${exp.id}')">
      <div class="cat-icon-wrap">${icons[exp.category] || icons.default}</div>
      <div style="flex:1;">
        <div style="font-weight:700; font-size:1rem;">${exp.category}</div>
        <div style="font-size:0.75rem; color:var(--text-dim); font-weight:500;">${exp.tag || '備註...'} • ${exp.date}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:800; color:var(--text);">${parseFloat(exp.foreignAmount).toLocaleString()} ${exp.currency}</div>
        <div style="font-size:0.7rem; color:var(--secondary); font-weight:700;">≈ ${Math.round(exp.homeAmount).toLocaleString()} TWD</div>
      </div>
    </div>
  `).join('');
}

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];
const currencyDict = {
  'USD': '美金', 'CNY': '人民幣', 'VND': '越南盾', 'JPY': '日圓', 
  'EUR': '歐元', 'GBP': '英鎊', 'HKD': '港幣', 'KRW': '韓元', 
  'SGD': '新加坡幣', 'AUD': '澳幣', 'CAD': '加幣', 'THB': '泰銖',
  'MOP': '澳門幣', 'PHP': '披索', 'MYR': '馬幣', 'IDR': '印尼盾'
};

window.handleCurrencyLookup = () => {
  const code = document.getElementById('new-currency-code').value.toUpperCase().trim();
  const hint = document.getElementById('currency-name-hint');
  if (currencyDict[code]) {
    hint.innerText = `偵測到：${currencyDict[code]}`;
    hint.style.color = 'var(--success)';
  } else {
    hint.innerText = code ? '新幣別名稱 (手動)' : '名稱將自動代入...';
    hint.style.color = 'var(--secondary)';
  }
};

function renderStats() {
  const total = state.expenses.reduce((s, e) => s + parseFloat(e.homeAmount), 0);
  
  // Pie Chart
  const sums = state.expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.homeAmount);
    return acc;
  }, {});
  const sorted = Object.entries(sums).sort((a,b) => b[1] - a[1]);
  let deg = 0;
  const gradient = sorted.map(([cat, val], i) => {
    const p = total ? (val / total) * 100 : 0;
    const start = deg; deg += p;
    return `${COLORS[i % COLORS.length]} ${start}% ${deg}%`;
  });
  const pie = document.getElementById('category-pie');
  if (pie) pie.style.background = `conic-gradient(${gradient.join(',') || 'var(--glass-border) 0% 100%'})`;
  const legend = document.getElementById('category-legend');
  if (legend) {
    legend.innerHTML = sorted.map(([cat, val], i) => `
      <div class="legend-item">
        <div class="color-dot" style="background:${COLORS[i % COLORS.length]}"></div>
        <span>${cat} (${total ? Math.round((val/total)*100) : 0}%)</span>
      </div>
    `).join('');
  }

  // VERTICAL Bar Chart
  const daySums = state.expenses.reduce((acc, e) => {
    acc[e.date] = (acc[e.date] || 0) + parseFloat(e.homeAmount);
    return acc;
  }, {});

  const sortedDays = Object.entries(daySums).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  const max = Math.max(...Object.values(daySums), 1);
  const dailyBars = document.getElementById('daily-bars');
  
  if (dailyBars) {
    dailyBars.innerHTML = sortedDays.map(([date, val]) => {
      const heightPercent = (val / max) * 60; // 降低比例至 60% 以留出標籤空間
      const displayDate = date.substring(5); 
      return `
        <div class="bar-column">
          <div class="bar-value">${Math.round(val).toLocaleString()}</div>
          <div class="bar-stalk" style="height: ${heightPercent}%"></div>
          <div class="bar-date">${displayDate}</div>
        </div>
      `;
    }).join('');
    
    // Auto-scroll to the end for the latest records
    setTimeout(() => {
      const scrollBox = document.querySelector('.chart-scroll-box');
      if (scrollBox) scrollBox.scrollLeft = scrollBox.scrollWidth;
    }, 100);
  }
}

function renderSettings() {
  const emailInput = document.getElementById('export-email');
  if (emailInput) emailInput.value = state.exportEmail;
}

function renderCurrencyList() {
  const curList = document.getElementById('currency-list');
  if (curList) {
    curList.innerHTML = state.currencies.map((c, i) => `
      <div class="manage-row">
        <span style="font-weight:700;">${c.name} (${c.code})</span>
        <div style="display:flex; align-items:center; gap:1rem;">
          <span style="color:var(--secondary); font-weight:800; font-size:0.85rem;">1 : ${c.rate}</span>
          <span onclick="deleteCurrency(${i})" style="color:var(--danger); cursor:pointer; font-weight:900;">✕</span>
        </div>
      </div>
    `).join('');
  }
}

function renderCategoryList() {
  const catList = document.getElementById('category-list');
  if (catList) {
    catList.innerHTML = state.categories.map((c, i) => `
      <span class="glass-tag">${c} <span onclick="deleteCategory(${i})" style="color:var(--danger); margin-left:5px; cursor:pointer;">✕</span></span>
    `).join('');
  }
}

window.addCurrency = () => {
  const codeInput = document.getElementById('new-currency-code');
  const rateInput = document.getElementById('new-currency-rate');
  const code = codeInput.value.toUpperCase().trim();
  const rate = parseFloat(rateInput.value);
  if (code && rate) {
    const name = currencyDict[code] || code;
    state.currencies.push({ code, name, rate });
    saveState(); initUI();
    codeInput.value = ''; rateInput.value = '';
    const hint = document.getElementById('currency-name-hint');
    if (hint) {
      hint.innerText = '名稱將自動代入...';
      hint.style.color = 'var(--secondary)';
    }
  }
};
window.deleteCurrency = (idx) => { if (state.currencies.length > 1 && confirm('確定刪除？')) { state.currencies.splice(idx,1); saveState(); initUI(); } };
window.addCategory = () => {
  const nameInput = document.getElementById('new-category-name');
  const name = nameInput.value.trim();
  if (name && !state.categories.includes(name)) {
    state.categories.push(name); saveState(); initUI(); nameInput.value = '';
  }
};
window.deleteCategory = (idx) => { if (state.categories.length > 1 && confirm('確定刪除？')) { state.categories.splice(idx,1); saveState(); initUI(); } };

window.openManual = () => {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const temp = document.getElementById('manual-template').content.cloneNode(true);
  content.innerHTML = '';
  content.appendChild(temp);
  overlay.style.display = 'flex';
};

window.checkUpdate = () => {
  const btn = document.getElementById('check-update-btn');
  const status = document.getElementById('update-status');
  if (!btn || !('serviceWorker' in navigator)) return;
  
  btn.innerText = '🔍 正在搜尋更新中...';
  status.innerText = '正在對比伺服器版本，請稍候...';
  
  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) {
      status.innerText = '未偵測到離線註冊，請連結網路重開。';
      btn.innerText = '🔄 檢查系統更新';
      return;
    }
    
    reg.update().then(() => {
      // 若已有正在安裝或等待中的新版
      if (reg.installing || reg.waiting) {
        status.innerText = '✅ 發現新版本！正在同步數據與套用更新...';
        status.style.color = 'var(--success)';
        setTimeout(() => window.location.reload(), 2000);
      } else {
        // 如果伺服器檔案完全沒變（hash 一致）
        btn.innerText = '✨ 已是最新版本';
        status.innerText = '恭喜！您的 App 目前已是全球同步的最新版本。';
        status.style.color = 'var(--text-dim)';
        setTimeout(() => {
          btn.innerText = '🔄 檢查系統更新 (Manual Update)';
        }, 4000);
      }
    }).catch(err => {
      status.innerText = '⚠️ 檢查失敗 (請確認網路或 GitHub 狀態)';
      btn.innerText = '🔄 檢查系統更新';
    });
  });
};

function openModal(id = null) {
  state.editingId = id;
  const exp = id ? state.expenses.find(e => e.id === id) : null;
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  const temp = document.getElementById('form-template').content.cloneNode(true);
  content.innerHTML = '';
  content.appendChild(temp);
  
  // Render Quick Tags (v4.5)
  window.renderQuickTags();

  const curSel = document.getElementById('currency-select');
  curSel.innerHTML = state.currencies.map(c => `<option value="${c.code}" ${exp?.currency === c.code ? 'selected' : (c.code==='VND'?'selected':'')}>${c.name} (${c.code})</option>`).join('');
  const catGrid = document.getElementById('form-category-grid');
  catGrid.innerHTML = state.categories.map(c => `<div class="cat-opt ${exp?.category === c ? 'selected' : (exp? '':(state.categories[0]===c?'selected':''))}" data-cat="${c}">${c}</div>`).join('');
  catGrid.querySelectorAll('.cat-opt').forEach(opt => {
    opt.onclick = () => {
      catGrid.querySelectorAll('.cat-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    };
  });
  if (exp) {
    document.getElementById('modal-title').innerText = '編輯紀錄';
    document.getElementById('foreign-amount').value = exp.foreignAmount;
    document.getElementById('tag').value = exp.tag;
    document.getElementById('date').value = exp.date;
    const delBtn = document.getElementById('delete-record-btn');
    delBtn.style.display = 'flex';
    delBtn.onclick = () => { if (confirm('確定刪除？')) { state.expenses = state.expenses.filter(e => e.id !== id); saveState(); closeModal(); initUI(); } };
  } else {
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
  }
  document.getElementById('expense-form').onsubmit = (e) => {
    e.preventDefault();
    const curCode = curSel.value;
    const rate = state.currencies.find(c => c.code === curCode).rate;
    const foreignAmt = parseFloat(document.getElementById('foreign-amount').value);
    const data = {
      id: exp ? exp.id : Date.now().toString(),
      currency: curCode,
      foreignAmount: foreignAmt,
      homeAmount: foreignAmt / rate,
      category: catGrid.querySelector('.cat-opt.selected').dataset.cat,
      tag: document.getElementById('tag').value,
      date: document.getElementById('date').value
    };
    if (exp) state.expenses = state.expenses.map(e => e.id === id ? data : e); else state.expenses.push(data);
    saveState(); closeModal(); initUI();
  };
  overlay.style.display = 'flex';
}
window.closeModal = () => { document.getElementById('modal-overlay').style.display = 'none'; state.editingId = null; };

window.confirmClearAll = () => { if (confirm('⚠️ 警告：將刪除「所有」記帳紀錄，無法恢復！')) { if (confirm('再次確認刪除？')) { state.expenses = []; saveState(); initUI(); } } };
window.exportData = async () => {
  if (state.expenses.length === 0) return alert('數據庫為空');
  const ws = XLSX.utils.json_to_sheet(state.expenses);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Expenses");
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `出差紀錄_${new Date().toISOString().split('T')[0]}.xlsx`;
  if (navigator.share) { try { await navigator.share({ files: [new File([blob], filename, { type: blob.type })], title: '記帳備份', text: `發送至: ${state.exportEmail}` }); } catch { download(blob, filename); } } else { download(blob, filename); }
};
window.importData = (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader(); reader.onload = (evt) => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, { type: 'array', cellDates: true });
    const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (confirm(`讀取到 ${json.length} 筆，是否合併？`)) {
      const safeData = json.map(item => {
        let dateVal = item.date;
        if (dateVal instanceof Date) { dateVal = dateVal.toISOString().split('T')[0]; } 
        else if (typeof dateVal === 'number' && dateVal > 40000) { dateVal = new Date((dateVal - 25569) * 86400 * 1000).toISOString().split('T')[0]; }
        return {
          ...item,
          date: dateVal || new Date().toISOString().split('T')[0],
          id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 5)
        };
      });
      state.expenses = [...state.expenses, ...safeData];
      saveState(); initUI(); alert('匯入完成！');
    }
  };
  reader.readAsArrayBuffer(file);
};
function download(blob, name) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); }
