// app.js - المحرك البرمجي المتكامل لمنصة SDS Smart

let currentSelectedChemical = null;

// Initialize app on load
window.addEventListener('DOMContentLoaded', () => {
  enforceAuthGuard();
  initCustomStorage();
  if (typeof initSolutionCalculator === 'function') {
    initSolutionCalculator();
  }
  
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  const catSelect = document.getElementById('library-category-select');
  
  if (cat && catSelect) {
    catSelect.value = cat;
    filterLibraryTable();
  } else if (typeof renderLibraryTable === 'function' && document.getElementById('library-table-body')) {
    renderLibraryTable(getAllChemicals());
  }
});

// 1. Data Store with LocalStorage fallback for adding chemicals
function initCustomStorage() {
  if (!localStorage.getItem('sds_custom_chemicals')) {
    localStorage.setItem('sds_custom_chemicals', JSON.stringify([]));
  }
}

function getAllChemicals() {
  const baseData = (typeof chemicalDatabase !== 'undefined') ? chemicalDatabase : [];
  try {
    const custom = JSON.parse(localStorage.getItem('sds_custom_chemicals')) || [];
    return [...baseData, ...custom];
  } catch (e) {
    return baseData;
  }
}

// 2. Authentication System & Route Guard
function enforceAuthGuard() {
  const isAuth = localStorage.getItem('sds_smart_logged_in');
  const userBtnText = document.getElementById('user-display-name');
  const loginModal = document.getElementById('login-modal');

  // Check if current page is inside /pages/
  const isSubPage = window.location.pathname.includes('/pages/');

  if (isAuth !== 'true') {
    if (isSubPage) {
      // Redirect to main index with message
      alert('يجب تسجيل الدخول أولاً للوصول إلى صفحات وأدوات المنصة.');
      window.location.href = '../index.html';
      return;
    } else {
      if (loginModal) loginModal.style.display = 'flex';
      if (userBtnText) userBtnText.innerHTML = '<i class="fa-solid fa-user-lock"></i> تسجيل الدخول';
    }
  } else {
    if (loginModal) loginModal.style.display = 'none';
    if (userBtnText) userBtnText.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> خروج (Admin)';
  }
}

function performLogin() {
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  const email = emailInput ? emailInput.value.trim() : '';
  const pass = passInput ? passInput.value.trim() : '';

  if (email === 'admin@sdssmart.com' && pass === 'SDS2026') {
    localStorage.setItem('sds_smart_logged_in', 'true');
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.style.display = 'none';
    const userBtnText = document.getElementById('user-display-name');
    if (userBtnText) userBtnText.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> خروج (Admin)';
  } else {
    alert('عذراً! البريد الإلكتروني أو الرقم السري غير صحيح. يرجى استخدام: admin@sdssmart.com / SDS2026');
  }
}

function toggleUserSession() {
  const isAuth = localStorage.getItem('sds_smart_logged_in');
  if (isAuth === 'true') {
    if (confirm('هل ترغب بتسجيل الخروج من المنصة؟')) {
      localStorage.removeItem('sds_smart_logged_in');
      const isSubPage = window.location.pathname.includes('/pages/');
      if (isSubPage) {
        window.location.href = '../index.html';
      } else {
        location.reload();
      }
    }
  } else {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.style.display = 'flex';
  }
}

// 3. Read URL Parameters for Automatic Filtering (e.g. ?cat=acids)
function initUrlParamsFilter() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  const catSelect = document.getElementById('library-category-select');
  if (cat && catSelect) {
    catSelect.value = cat;
    filterLibraryTable();
  }
}

// 4. Search System
function handleSearchInput(e) {
  if (e.key === 'Enter') {
    executeSearch();
  }
}

function quickSearch(query) {
  const input = document.getElementById('global-search-input');
  if (input) input.value = query;
  executeSearch();
}

function executeSearch() {
  const input = document.getElementById('global-search-input');
  const q = input ? input.value.trim().toLowerCase() : '';
  if (!q) return;

  const chems = getAllChemicals();
  const found = chems.find(c => 
    c.nameEn.toLowerCase().includes(q) ||
    c.nameAr.toLowerCase().includes(q) ||
    c.formula.toLowerCase().includes(q) ||
    c.cas.toLowerCase().includes(q)
  );

  if (found) {
    displayChemicalSDS(found);
  } else {
    const matches = chems.filter(c => 
      c.nameEn.toLowerCase().includes(q) ||
      c.nameAr.toLowerCase().includes(q) ||
      c.formula.toLowerCase().includes(q)
    );
    if (matches.length > 0) {
      displayChemicalSDS(matches[0]);
    } else {
      alert('لم يتم العثور على مادة مطابقة لبحثك. يمكنك تصفح دليل وجرد المواد الكيميائية.');
    }
  }
}

// 5. SDS Card Presentation
function displayChemicalSDS(c) {
  currentSelectedChemical = c;

  const container = document.getElementById('search-result-display');
  const renderSlot = document.getElementById('sds-card-render-slot');
  if (!container || !renderSlot) return;

  const ghsMap = {
    flammable: { sym: '<i class="fa-solid fa-fire-flame-curved" style="color: #dc2626;"></i>', label: 'قابل للاشتعال' },
    oxidizer: { sym: '<i class="fa-solid fa-circle-notch" style="color: #ea580c;"></i>', label: 'مؤكسد' },
    corrosive: { sym: '<i class="fa-solid fa-vial-virus" style="color: #475569;"></i>', label: 'مادة أكالة' },
    toxic: { sym: '<i class="fa-solid fa-skull-crossbones" style="color: #991b1b;"></i>', label: 'سام' },
    harmful: { sym: '<i class="fa-solid fa-triangle-exclamation" style="color: #d97706;"></i>', label: 'مهيج / ضار' },
    health_hazard: { sym: '<i class="fa-solid fa-lungs" style="color: #7c3aed;"></i>', label: 'خطر صحي' },
    environmental: { sym: '<i class="fa-solid fa-fish-fins" style="color: #0284c7;"></i>', label: 'خطر على البيئة المائية' }
  };

  let ghsHtml = '';
  (c.ghs || ['harmful']).forEach(g => {
    const item = ghsMap[g] || { sym: '<i class="fa-solid fa-triangle-exclamation" style="color: #dc2626;"></i>', label: 'خطر' };
    ghsHtml += `
      <div class="ghs-badge-unit">
        <div class="ghs-diamond">
          <div class="ghs-diamond-bg"></div>
          <span class="ghs-symbol">${item.sym}</span>
        </div>
        <span class="ghs-unit-name">${item.label}</span>
      </div>
    `;
  });

  let hList = '';
  (c.hazardStatements || []).forEach(h => {
    hList += `
      <div class="hp-item">
        <span class="hp-code">${h.code}</span>
        <div class="hp-text-group">
          <span class="hp-text-ar">${h.ar}</span>
          <span class="hp-text-en">${h.en}</span>
        </div>
      </div>
    `;
  });

  let pList = '';
  (c.precautionaryStatements || []).forEach(p => {
    pList += `
      <div class="hp-item">
        <span class="hp-code">${p.code}</span>
        <div class="hp-text-group">
          <span class="hp-text-ar">${p.ar}</span>
          <span class="hp-text-en">${p.en}</span>
        </div>
      </div>
    `;
  });

  renderSlot.innerHTML = `
    <div class="sds-card-container">
      <div class="sds-main-header">
        <div class="sds-title-ar">${c.nameAr}</div>
        <div class="sds-title-en">${c.nameEn}</div>
      </div>

      <div class="sds-meta-grid">
        <div class="meta-row">
          <div class="meta-label">
            <span>الاسم الكيميائي</span>
            <small>Chemical Name</small>
          </div>
          <div class="meta-value">${c.nameEn}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">
            <span>الصيغة الكيميائية</span>
            <small>Chemical Formula</small>
          </div>
          <div class="meta-value" style="direction: ltr; text-align: right;">${c.formula}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">
            <span>الكتلة الجزيئية</span>
            <small>Molecular Weight</small>
          </div>
          <div class="meta-value">${c.mw}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">
            <span>رقم CAS</span>
            <small>CAS No.</small>
          </div>
          <div class="meta-value">${c.cas}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">
            <span>درجة النقاوة</span>
            <small>Purity (Assay)</small>
          </div>
          <div class="meta-value">${c.purity || '≥ 98.0%'}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">
            <span>العبوة والرصيد</span>
            <small>Pack Size / Stock</small>
          </div>
          <div class="meta-value">${c.quantity} (${c.notice || '1 Bottle'}) - ${c.location}</div>
        </div>
      </div>

      <div class="sds-two-cols">
        <div class="sds-section-box">
          <div class="sds-sec-title">تصنيف المخاطر GHS Classification</div>
          <div class="ghs-pictograms-box">
            <div class="ghs-icons-row">${ghsHtml}</div>
            <div class="sds-signal-banner">
              <span class="signal-label">كلمة التحذير / Signal Word:</span>
              <span class="signal-text" style="color: ${c.signalColor || '#dc2626'};">${c.signalWord || 'تحذير / Warning'}</span>
            </div>
          </div>
        </div>

        <div class="sds-section-box">
          <div class="sds-sec-title">عبارات المخاطر (H) Hazard Statements</div>
          <div class="h-p-statements-list">${hList}</div>
        </div>
      </div>

      <div class="sds-two-cols">
        <div class="sds-section-box">
          <div class="sds-sec-title">عبارات الوقاية (P) Precautionary Statements</div>
          <div class="h-p-statements-list">${pList}</div>
        </div>

        <div class="sds-section-box">
          <div class="sds-sec-title">معدات الوقاية الشخصية (PPE) Personal Protective Equipment</div>
          <div class="ppe-grid">
            <div class="ppe-item">
              <div class="ppe-icon-circle"><i class="fa-solid fa-glasses"></i></div>
              <span class="ppe-name-ar">نظارات واقية</span>
              <span class="ppe-name-en">Safety Goggles</span>
            </div>
            <div class="ppe-item">
              <div class="ppe-icon-circle"><i class="fa-solid fa-mitten"></i></div>
              <span class="ppe-name-ar">قفازات معملية</span>
              <span class="ppe-name-en">Gloves</span>
            </div>
            <div class="ppe-item">
              <div class="ppe-icon-circle"><i class="fa-solid fa-vest"></i></div>
              <span class="ppe-name-ar">معطف مخبري</span>
              <span class="ppe-name-en">Lab Coat</span>
            </div>
            <div class="ppe-item">
              <div class="ppe-icon-circle"><i class="fa-solid fa-mask-face"></i></div>
              <span class="ppe-name-ar">كمامة واقية</span>
              <span class="ppe-name-en">Mask</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sds-section-box" style="border-bottom: 2px solid #005a9c;">
        <div class="sds-sec-title">الإسعافات الأولية First Aid Measures</div>
        <div class="first-aid-grid">
          <div class="fa-card">
            <span class="fa-icon-badge" style="color: #0284c7;"><i class="fa-solid fa-eye"></i></span>
            <div class="fa-desc">
              <span class="fa-type">ملامسة العين (Eye Contact)</span>
              <span class="fa-instruction">${c.firstAid ? c.firstAid.eye : 'اغسل بالماء لـ 15 دقيقة.'}</span>
            </div>
          </div>
          <div class="fa-card">
            <span class="fa-icon-badge" style="color: #10b981;"><i class="fa-solid fa-hand-dots"></i></span>
            <div class="fa-desc">
              <span class="fa-type">ملامسة الجلد (Skin Contact)</span>
              <span class="fa-instruction">${c.firstAid ? c.firstAid.skin : 'اغسل بالماء والصابون.'}</span>
            </div>
          </div>
          <div class="fa-card">
            <span class="fa-icon-badge" style="color: #f59e0b;"><i class="fa-solid fa-lungs"></i></span>
            <div class="fa-desc">
              <span class="fa-type">الاستنشاق (Inhalation)</span>
              <span class="fa-instruction">${c.firstAid ? c.firstAid.inhalation : 'انقل للهواء المنعش.'}</span>
            </div>
          </div>
          <div class="fa-card">
            <span class="fa-icon-badge" style="color: #dc2626;"><i class="fa-solid fa-head-side-cough"></i></span>
            <div class="fa-desc">
              <span class="fa-type">الابتلاع (Ingestion)</span>
              <span class="fa-instruction">${c.firstAid ? c.firstAid.ingestion : 'اشرب الماء ولا تحث على التقيؤ واطلب الإسعاف.'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sds-footer-triplet">
        <div class="sds-footer-cell">
          <div class="cell-title">التعامل والتخزين Handling & Storage</div>
          <div class="cell-body">
            <span style="font-size: 1.5rem; color: #005a9c;"><i class="fa-solid fa-box-archive"></i></span>
            <span>${c.storage || 'يحفظ في مكان بارد وجاف ومحكم الإغلاق.'}</span>
          </div>
        </div>
        <div class="sds-footer-cell">
          <div class="cell-title">مكافحة الحريق Fire Fighting</div>
          <div class="cell-body">
            <span style="font-size: 1.5rem; color: #dc2626;"><i class="fa-solid fa-fire-extinguisher"></i></span>
            <span>${c.fire || 'استخدم وسائل إطفاء مناسبة للحرائق المحيطة.'}</span>
          </div>
        </div>
        <div class="sds-footer-cell">
          <div class="cell-title">التخلص من النفايات Disposal</div>
          <div class="cell-body">
            <span style="font-size: 1.5rem; color: #475569;"><i class="fa-solid fa-trash-can"></i></span>
            <span>${c.disposal || 'تخلص من النفايات وفقاً للأنظمة المحلية المعتمدة.'}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth' });
}

function closeSdsView() {
  const container = document.getElementById('search-result-display');
  if (container) container.style.display = 'none';
  currentSelectedChemical = null;
}

// 6. Table Rendering & Filters
function renderLibraryTable(list) {
  const tbody = document.getElementById('library-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const catBadges = {
    acids: 'badge-acid',
    bases: 'badge-base',
    salts: 'badge-salt',
    solvents: 'badge-solvent',
    oxidizers: 'badge-oxidizer',
    toxic: 'badge-toxic',
    other: 'badge-other'
  };

  list.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.onclick = (e) => {
      if (!e.target.closest('button')) {
        displayChemicalSDS(c);
      }
    };
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td style="font-weight: 800; color: var(--primary);">${c.nameAr}</td>
      <td>${c.nameEn}</td>
      <td style="direction: ltr; font-family: monospace; font-weight: 700;">${c.formula}</td>
      <td>${c.cas}</td>
      <td><span class="badge-tag ${catBadges[c.category] || 'badge-other'}">${c.categoryAr}</span></td>
      <td>${c.state}</td>
      <td>${c.quantity}</td>
      <td>${c.location}</td>
      <td>
        <button onclick="displayChemicalSDS(getAllChemicals()[${getAllChemicals().findIndex(x => x.cas === c.cas)}])" style="background: var(--secondary); color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: 700; cursor: pointer;">
          <i class="fa-solid fa-file-shield" style="margin-left: 4px;"></i> عرض SDS
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterLibraryTable() {
  const qInput = document.getElementById('library-filter-input');
  const catInput = document.getElementById('library-category-select');
  const q = qInput ? qInput.value.trim().toLowerCase() : '';
  const cat = catInput ? catInput.value : 'all';

  const chems = getAllChemicals();
  const filtered = chems.filter(c => {
    const matchesQ = !q || 
      c.nameEn.toLowerCase().includes(q) ||
      c.nameAr.toLowerCase().includes(q) ||
      c.formula.toLowerCase().includes(q) ||
      c.cas.toLowerCase().includes(q);

    let matchesCat = (cat === 'all');
    if (!matchesCat) {
      if (cat === 'flammable') {
        matchesCat = (c.category === 'flammable') || ((c.ghs || []).includes('flammable'));
      } else if (cat === 'corrosive') {
        matchesCat = (c.category === 'corrosive') || ((c.ghs || []).includes('corrosive'));
      } else if (cat === 'toxic') {
        matchesCat = (c.category === 'toxic') || ((c.ghs || []).includes('toxic'));
      } else if (cat === 'oxidizers') {
        matchesCat = (c.category === 'oxidizers') || ((c.ghs || []).includes('oxidizer'));
      } else {
        matchesCat = (c.category === cat);
      }
    }

    return matchesQ && matchesCat;
  });

  renderLibraryTable(filtered);
}

// 7. Export Table to Excel/CSV
function exportChemicalsToCSV() {
  const chems = getAllChemicals();
  let csvContent = "\uFEFF"; // UTF-8 BOM for Arabic support in Excel
  csvContent += "م,الاسم بالعربي,English Name,الصيغة الكيميائية,رقم CAS,التصنيف,الحالة,الكمية والرصيد,مكان التخزين\n";

  chems.forEach((c, idx) => {
    const row = [
      idx + 1,
      `"${c.nameAr.replace(/"/g, '""')}"`,
      `"${c.nameEn.replace(/"/g, '""')}"`,
      `"${c.formula.replace(/"/g, '""')}"`,
      `"${c.cas}"`,
      `"${c.categoryAr}"`,
      `"${c.state}"`,
      `"${c.quantity}"`,
      `"${c.location}"`
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `سجل_جرد_المواد_الكيميائية_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 8. Add New Chemical Modal & Action
function openAddChemicalModal() {
  const modal = document.getElementById('add-chem-modal');
  if (modal) modal.style.display = 'flex';
}

function closeAddChemicalModal() {
  const modal = document.getElementById('add-chem-modal');
  if (modal) modal.style.display = 'none';
}

function saveNewChemical() {
  const nameAr = document.getElementById('new-chem-name-ar').value.trim();
  const nameEn = document.getElementById('new-chem-name-en').value.trim();
  const formula = document.getElementById('new-chem-formula').value.trim();
  const cas = document.getElementById('new-chem-cas').value.trim();
  const mw = document.getElementById('new-chem-mw').value.trim() || '---';
  const category = document.getElementById('new-chem-category').value;
  const state = document.getElementById('new-chem-state').value;
  const quantity = document.getElementById('new-chem-quantity').value.trim();
  const location = document.getElementById('new-chem-location').value.trim() || 'Cabinet 1';

  if (!nameAr || !nameEn || !formula || !cas) {
    alert('يرجى ملء الحقول الأساسية (الاسم بالعربي والإنجليزي، الصيغة ورقم CAS).');
    return;
  }

  const catNames = {
    acids: 'الأحماض',
    bases: 'القواعد',
    solvents: 'المذيبات العضوية',
    salts: 'الأملاح',
    oxidizers: 'المؤكسدات',
    toxic: 'المواد السامة',
    other: 'مواد أخرى'
  };

  const newChem = {
    nameAr,
    nameEn,
    formula,
    mw,
    cas,
    purity: '≥ 98.0%',
    state,
    quantity,
    notice: '1 Bottle',
    location,
    category,
    categoryAr: catNames[category] || 'مواد أخرى',
    ghs: ['harmful'],
    signalWord: 'تحذير / Warning',
    signalColor: '#f59e0b',
    hazardStatements: [
      { code: 'H319', ar: 'يسبب تهيجاً للعين.', en: 'Causes eye irritation.' }
    ],
    precautionaryStatements: [
      { code: 'P280', ar: 'ارتدِ قفازات ونظارات واقية.', en: 'Wear protective gloves/eye protection.' }
    ],
    firstAid: {
      eye: 'اشطف العين بالماء لعدة دقائق واستشر الطبيب.',
      skin: 'اغسل بالماء والصابون.',
      inhalation: 'انقل المصاب للهواء المنعش.',
      ingestion: 'اشرب الماء واطلب الرعاية الطبية.'
    },
    storage: 'يحفظ في مكان بارد وجاف ومحكم الإغلاق.',
    fire: 'استخدم وسائل إطفاء مناسبة للحرائق المحيطة.',
    disposal: 'تخلص وفقاً للأنظمة المحلية المعتمدة.'
  };

  const custom = JSON.parse(localStorage.getItem('sds_custom_chemicals')) || [];
  custom.push(newChem);
  localStorage.setItem('sds_custom_chemicals', JSON.stringify(custom));

  alert('تمت إضافة المادة الكيميائية إلى سجل المعمل بنجاح! 🎉');
  closeAddChemicalModal();
  renderLibraryTable(getAllChemicals());
}

// 9. Chemical Calculators
function calculateDilution() {
  const c1 = parseFloat(document.getElementById('c1-val').value);
  const c2 = parseFloat(document.getElementById('c2-val').value);
  const v2 = parseFloat(document.getElementById('v2-val').value);
  const resBox = document.getElementById('dilution-result');
  if (!resBox) return;

  if (!c1 || !c2 || !v2) {
    alert('يرجى إدخال C1 و C2 و V2 لحساب الحجم المجهول V1.');
    return;
  }
  const v1 = (c2 * v2) / c1;
  const water = v2 - v1;

  resBox.style.display = 'block';
  resBox.innerHTML = `
    الحجم المطلوب سحبه (V₁): <strong>${v1.toFixed(2)} mL</strong><br>
    أضف إليه ماء مقطر حتى إكمال الحجم الكلي (${v2} mL) أي حوالي: <strong>${water.toFixed(2)} mL</strong> ماء.
  `;
}

function calculateMassPrep() {
  const mw = parseFloat(document.getElementById('mw-val').value);
  const m = parseFloat(document.getElementById('target-m-val').value);
  const vol = parseFloat(document.getElementById('target-vol-val').value);
  const purity = parseFloat(document.getElementById('purity-val').value) || 100;
  const resBox = document.getElementById('prep-result');
  if (!resBox) return;

  if (!mw || !m || !vol) {
    alert('يرجى ملء جميع الخانات الخاصة بالكتلة الجزيئية والتركيز والحجم.');
    return;
  }

  const vLiter = vol / 1000;
  let mass = m * vLiter * mw;
  mass = mass / (purity / 100);

  resBox.style.display = 'block';
  resBox.innerHTML = `
    الكتلة الواجب وزنها بالميزان الحساس: <strong>${mass.toFixed(4)} جرام</strong><br>
    قم بإذابتها في قليل من الماء المقطر ثم أكمل الحجم في دورق عياري سعة ${vol} mL.
  `;
}

// New Liquid Acid Molarity from Density and Assay% Calculator
function calculateLiquidMolarity() {
  const density = parseFloat(document.getElementById('acid-density').value);
  const assay = parseFloat(document.getElementById('acid-assay').value);
  const mw = parseFloat(document.getElementById('acid-mw').value);
  const resBox = document.getElementById('acid-molarity-result');
  if (!resBox) return;

  if (!density || !assay || !mw) {
    alert('يرجى ملء الكثافة والنسبة المئوية والكتلة الجزيئية.');
    return;
  }

  // M = (Density * 10 * Assay%) / MW
  const molarity = (density * 10 * assay) / mw;

  resBox.style.display = 'block';
  resBox.innerHTML = `
    التركيز المولاري للمحلول المركز (M): <strong>${molarity.toFixed(2)} M (mol/L)</strong><br>
    يمكنك استخدام هذه القيمة كـ (C₁) في حاسبة التخفيف لتحضير محاليلك القياسية بدقة!
  `;
}

function calculateUnitConversion() {
  const val = parseFloat(document.getElementById('conv-input').value);
  const type = document.getElementById('conv-type').value;
  const resBox = document.getElementById('conv-result');
  if (!resBox) return;

  if (isNaN(val)) {
    alert('أدخل قيمة صحيحة.');
    return;
  }

  let res = 0;
  let unit = '';
  if (type === 'ml-to-l') { res = val / 1000; unit = 'L (لتر)'; }
  else if (type === 'l-to-ml') { res = val * 1000; unit = 'mL (مليلتر)'; }
  else if (type === 'mg-to-g') { res = val / 1000; unit = 'g (جرام)'; }
  else if (type === 'g-to-kg') { res = val / 1000; unit = 'kg (كيلوجرام)'; }

  resBox.style.display = 'block';
  resBox.innerHTML = `النتيجة: <strong>${res} ${unit}</strong>`;
}

// ========================================================
// 9.1 DS-16 Solution Calculator & Permanent Records Engine
// ========================================================

const STORAGE_KEY_PREPARATIONS = 'sds_solution_preparations_v1';
let currentCalculatedSolution = null;

// Permanent Storage Retrieval
function getSavedPreparations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREPARATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading saved preparations:', e);
    return [];
  }
}

function savePreparationsList(list) {
  try {
    localStorage.setItem(STORAGE_KEY_PREPARATIONS, JSON.stringify(list));
  } catch (e) {
    console.error('Error writing preparations list:', e);
  }
}

// Standard Laboratory Indicators & Reagents (الأدلة والكواشف المعملية القياسية)
const STANDARD_LAB_INDICATORS = [
  {
    id: 'std_ind_1',
    nameAr: 'دليل الفينولفثالين (Phenolphthalein)',
    nameEn: 'Phenolphthalein Indicator',
    formula: 'C20H14O4',
    mw: 318.32,
    state: 'solid',
    phRange: '8.2 - 10.0 (عديم اللون ➔ وردي/قرمزي)',
    prepMethod: 'إذابة 0.1 جرام في 50 mL إيثانول 95% ثم إكمال الحجم إلى 100 mL بماء مقطر (محلول 0.1%)',
    recommendedVol: 100,
    targetM: 0.0031
  },
  {
    id: 'std_ind_2',
    nameAr: 'دليل الميثيل البرتقالي (Methyl Orange)',
    nameEn: 'Methyl Orange Indicator',
    formula: 'C14H14N3NaO3S',
    mw: 327.33,
    state: 'solid',
    phRange: '3.1 - 4.4 (أحمر ➔ أصفر برتقالي)',
    prepMethod: 'إذابة 0.1 جرام في 100 mL ماء مقطر ساخن ثم تركه ليبرد وترشيحه (محلول 0.1%)',
    recommendedVol: 100,
    targetM: 0.003
  },
  {
    id: 'std_ind_3',
    nameAr: 'دليل أزرق البروموثيمول (Bromothymol Blue)',
    nameEn: 'Bromothymol Blue Indicator',
    formula: 'C27H28Br2O5S',
    mw: 624.38,
    state: 'solid',
    phRange: '6.0 - 7.6 (أصفر ➔ أزرق)',
    prepMethod: 'إذابة 0.1 جرام في 20 mL إيثانول ثم إضافة 80 mL ماء مقطر (محلول 0.1%)',
    recommendedVol: 100,
    targetM: 0.0016
  },
  {
    id: 'std_ind_4',
    nameAr: 'دليل الميثيل الأحمر (Methyl Red)',
    nameEn: 'Methyl Red Indicator',
    formula: 'C15H15N3O2',
    mw: 269.30,
    state: 'solid',
    phRange: '4.4 - 6.2 (أحمر ➔ أصفر)',
    prepMethod: 'إذابة 0.1 جرام في 60 mL إيثانول ثم إكمال الحجم إلى 100 mL بماء مقطر',
    recommendedVol: 100,
    targetM: 0.0037
  },
  {
    id: 'std_ind_5',
    nameAr: 'دليل الكروم الأسود T لمعايرة العسرة (EBT)',
    nameEn: 'Eriochrome Black T (EBT)',
    formula: 'C20H12N3NaO7S',
    mw: 461.38,
    state: 'solid',
    phRange: 'معايرات الكالسيوم والماغنسيوم والـ EDTA (نبيذي ➔ أزرق)',
    prepMethod: 'إذابة 0.5 جرام في 100 mL ثلاثي إيثانول أمين أو خلط 0.5 جرام مع 100 جرام ملح طعام نقي',
    recommendedVol: 100,
    targetM: 0.01
  },
  {
    id: 'std_ind_6',
    nameAr: 'دليل النشا للمعايرات اليودية (Starch Indicator)',
    nameEn: 'Starch Indicator Solution',
    formula: '(C6H10O5)n',
    mw: 162.14,
    state: 'solid',
    phRange: 'كاشف لليود الحر (يعطي لون أزرق داكن)',
    prepMethod: 'خلط 1 جرام نشا مع قليل من الماء البارد وسكبه في 100 mL ماء مغلي مع التحريك لدقيقتين',
    recommendedVol: 100,
    targetM: 0.06
  },
  {
    id: 'std_ind_7',
    nameAr: 'كاشف لوجول لليود (Lugol Iodine Reagent)',
    nameEn: 'Lugol Iodine Solution',
    formula: 'I2 + KI',
    mw: 253.8,
    state: 'solid',
    phRange: 'كشف نوعي للنشا والجليكوجين والمعايرات التأكسدية',
    prepMethod: 'إذابة 10 جرام يوديد بوتاسيوم KI في 100 mL ماء ثم إذابة 5 جرام يود نقي بلوري I2',
    recommendedVol: 100,
    targetM: 0.197
  },
  {
    id: 'std_ind_8',
    nameAr: 'كاشف بندكت للسكريات (Benedict Reagent)',
    nameEn: 'Benedict Quantitative Reagent',
    formula: 'CuSO4 + Na-Citrate',
    mw: 159.6,
    state: 'liquid',
    phRange: 'كاشف لوني للسكريات المختزلة (راسب أحمر طوبي)',
    prepMethod: 'إذابة 173g سترات صوديوم + 100g كربونات صوديوم في 800mL ماء ثم إضافة محلول 17.3g كبريتات نحاس في 100mL ماء وتكملة الحجم لـ 1L',
    recommendedVol: 1000,
    targetM: 0.1
  }
];

// Populate Chemical Selector in Solution Calculator
function initSolutionCalculator() {
  const select = document.getElementById('ds16-chem-select');
  if (!select) return;
  const chems = getAllChemicals();
  
  select.innerHTML = '<option value="">-- اختر مادة أو دليلاً من القائمة --</option>';

  // Group 1: Standard Laboratory Indicators (كواشف وأدلة المعمل)
  const indOptGroup = document.createElement('optgroup');
  indOptGroup.label = '🧪 كواشف وأدلة المعمل القياسية (Indicators & Reagents)';
  STANDARD_LAB_INDICATORS.forEach(ind => {
    const opt = document.createElement('option');
    opt.value = ind.id;
    opt.textContent = `${ind.nameAr} - ${ind.formula}`;
    indOptGroup.appendChild(opt);
  });
  select.appendChild(indOptGroup);

  // Group 2: Custom Added Chemicals & Indicators
  const customChems = (JSON.parse(localStorage.getItem('sds_custom_chemicals')) || []);
  if (customChems.length > 0) {
    const customGroup = document.createElement('optgroup');
    customGroup.label = '✨ أدلة ومواد مضافة حديثاً للمعمل';
    customChems.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `★ ${c.nameAr} (${c.nameEn}) - ${c.formula}`;
      customGroup.appendChild(opt);
    });
    select.appendChild(customGroup);
  }

  // Group 3: General Laboratory Inventory (المخزون الرئيسي)
  const mainGroup = document.createElement('optgroup');
  mainGroup.label = '🔬 مواد معمل الكيمياء (المخزون الرئيسي)';
  chems.filter(c => !c.id.toString().startsWith('ind_')).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.nameAr} (${c.nameEn}) - ${c.formula}`;
    mainGroup.appendChild(opt);
  });
  select.appendChild(mainGroup);

  // Set today's date
  const dateInp = document.getElementById('ds16-prep-date');
  if (dateInp && !dateInp.value) {
    dateInp.value = new Date().toISOString().split('T')[0];
  }

  // Render initial saved records
  renderSavedPreparationsTable();
}

function onSolutionChemSelect(chemId) {
  if (!chemId) return;

  // Check if it's one of the standard indicators
  const stdInd = STANDARD_LAB_INDICATORS.find(x => x.id === chemId);
  if (stdInd) {
    useIndicatorInCalculator(chemId);
    return;
  }

  const chems = getAllChemicals();
  const chem = chems.find(c => c.id == chemId);
  if (!chem) return;

  const nameInp = document.getElementById('ds16-chem-name');
  const mwInp = document.getElementById('ds16-mw-val');

  if (nameInp) nameInp.value = `${chem.nameAr} (${chem.formula})`;
  if (mwInp && chem.molecularWeight) {
    const num = parseFloat(chem.molecularWeight);
    if (!isNaN(num)) mwInp.value = num;
  }

  if (chem.preparationMethod) {
    const notesInp = document.getElementById('ds16-notes');
    if (notesInp) notesInp.value = chem.preparationMethod;
  }

  // Switch state if it's liquid
  const isLiquid = (chem.physicalState || '').includes('Liquid') || (chem.physicalState || '').includes('سائل');
  setDs16State(isLiquid ? 'liquid' : 'solid');
}

function useIndicatorInCalculator(indId) {
  let ind = STANDARD_LAB_INDICATORS.find(x => x.id === indId);
  if (!ind) {
    const customChems = JSON.parse(localStorage.getItem('sds_custom_chemicals')) || [];
    const custom = customChems.find(x => x.id === indId);
    if (custom) {
      ind = {
        id: custom.id,
        nameAr: custom.nameAr,
        nameEn: custom.nameEn,
        formula: custom.formula,
        mw: parseFloat(custom.molecularWeight) || 0,
        state: custom.physicalState || 'solid',
        prepMethod: custom.preparationMethod || '',
        recommendedVol: 100,
        targetM: 0.1
      };
    }
  }
  if (!ind) return;

  switchCalcTab('solution');
  setDs16State(ind.state);

  const nameInp = document.getElementById('ds16-chem-name');
  const mwInp = document.getElementById('ds16-mw-val');
  const volInp = document.getElementById('ds16-target-vol');
  const mInp = document.getElementById('ds16-target-m');
  const notesInp = document.getElementById('ds16-notes');
  const prepByInp = document.getElementById('ds16-prep-by');

  if (nameInp) nameInp.value = ind.nameAr;
  if (mwInp && ind.mw) mwInp.value = ind.mw;
  if (volInp && ind.recommendedVol) volInp.value = ind.recommendedVol;
  if (mInp && ind.targetM) mInp.value = ind.targetM;
  if (notesInp && ind.prepMethod) notesInp.value = ind.prepMethod;
  if (prepByInp && !prepByInp.value) prepByInp.value = 'محضّرة المعمل';

  calculateDs16Solution();
}

// Modal for Adding New Indicator or Chemical
function openAddIndicatorModal() {
  const modal = document.getElementById('add-indicator-modal');
  if (modal) modal.style.display = 'flex';
}

function closeAddIndicatorModal() {
  const modal = document.getElementById('add-indicator-modal');
  if (modal) modal.style.display = 'none';
}

function saveNewLabIndicator() {
  const nameAr = document.getElementById('new-ind-name-ar').value.trim();
  const nameEn = document.getElementById('new-ind-name-en').value.trim() || nameAr;
  const formula = document.getElementById('new-ind-formula').value.trim() || '---';
  const mw = parseFloat(document.getElementById('new-ind-mw').value) || 0;
  const type = document.getElementById('new-ind-type').value;
  const prepMethod = document.getElementById('new-ind-method').value.trim();

  if (!nameAr) {
    alert('يرجى كتابة اسم الدليل أو المادة.');
    return;
  }

  const customChems = JSON.parse(localStorage.getItem('sds_custom_chemicals')) || [];
  const newInd = {
    id: 'ind_' + Date.now(),
    nameAr: nameAr,
    nameEn: nameEn,
    formula: formula,
    cas: document.getElementById('new-ind-cas').value.trim() || 'N/A',
    molecularWeight: mw ? mw.toString() : '---',
    category: type === 'indicator' ? 'indicators' : 'other',
    physicalState: document.getElementById('new-ind-state').value,
    quantity: '100 mL',
    location: 'Cabinet 1 - كواشف وأدلة',
    preparationMethod: prepMethod,
    isCustomIndicator: true
  };

  customChems.push(newInd);
  localStorage.setItem('sds_custom_chemicals', JSON.stringify(customChems));

  // Re-populate select and choose this new item
  initSolutionCalculator();
  const select = document.getElementById('ds16-chem-select');
  if (select) select.value = newInd.id;
  onSolutionChemSelect(newInd.id);

  if (prepMethod) {
    const notesInp = document.getElementById('ds16-notes');
    if (notesInp && !notesInp.value) notesInp.value = prepMethod;
  }

  closeAddIndicatorModal();
  renderLabIndicatorsGuide();
  alert(`✅ تم حفظ وإضافة [${nameAr}] بنجاح إلى قائمة الأدلة والمواد المعتمدة في المعمل!`);
}

// Render Standard and Custom Laboratory Indicators Guide
function renderLabIndicatorsGuide() {
  const container = document.getElementById('indicators-guide-grid');
  if (!container) return;

  const customChems = JSON.parse(localStorage.getItem('sds_custom_chemicals')) || [];
  const customIndicators = customChems.filter(c => c.category === 'indicators' || c.isCustomIndicator);

  const allIndicators = [
    ...STANDARD_LAB_INDICATORS.map(ind => ({ ...ind, isCustom: false })),
    ...customIndicators.map(c => ({
      id: c.id,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      formula: c.formula,
      mw: c.molecularWeight,
      state: c.physicalState,
      phRange: c.cas && c.cas !== 'N/A' ? `رقم CAS: ${c.cas}` : 'مضاف بواسطة المعمل',
      prepMethod: c.preparationMethod || 'تحضير حسب بروتوكول المعمل',
      isCustom: true
    }))
  ];

  container.innerHTML = allIndicators.map(ind => `
    <div class="indicator-card" style="background: #ffffff; border: 1.5px solid ${ind.isCustom ? '#f59e0b' : '#bce3fb'}; border-radius: 12px; padding: 1.2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.5rem;">
          <h4 style="font-weight: 800; color: #005a9c; margin: 0; font-size: 1.05rem;">
            ${ind.isCustom ? '<span style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; margin-left: 5px;">مضاف يدوياً</span>' : ''}
            ${ind.nameAr}
          </h4>
          <span style="font-size: 0.8rem; font-weight: 700; color: #64748b; direction: ltr;">${ind.formula}</span>
        </div>
        <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.7rem; font-weight: 600;">${ind.nameEn}</p>

        <div style="background: #f8fafc; border-radius: 8px; padding: 0.6rem 0.8rem; margin-bottom: 0.8rem; font-size: 0.85rem;">
          <div style="margin-bottom: 0.3rem;">
            <strong style="color: #0f172a;">المدى اللوني / الوظيفة:</strong>
            <span style="color: #0284c7; font-weight: 700;"> ${ind.phRange}</span>
          </div>
          <div>
            <strong style="color: #0f172a;">الكتلة المولية MW:</strong>
            <span style="color: #475569; font-weight: 700;"> ${ind.mw} g/mol</span>
          </div>
        </div>

        <div style="background: #eff6ff; border-right: 3px solid #0284c7; padding: 0.6rem 0.8rem; border-radius: 6px; font-size: 0.82rem; color: #1e3a8a; line-height: 1.5; margin-bottom: 1rem;">
          <strong>بروتوكول التحضير المعملي:</strong><br>
          ${ind.prepMethod}
        </div>
      </div>

      <button class="calc-btn-gold" onclick="useIndicatorInCalculator('${ind.id}')" style="width: 100%; padding: 0.6rem; font-size: 0.9rem; margin-top: auto;">
        <i class="fa-solid fa-calculator"></i> استخدام في الحاسبة DS-16
      </button>
    </div>
  `).join('');
}

let ds16CurrentState = 'solid';

function setDs16State(state) {
  ds16CurrentState = state;
  const btnSolid = document.getElementById('ds16-btn-solid');
  const btnLiquid = document.getElementById('ds16-btn-liquid');
  const liquidRef = document.getElementById('ds16-liquid-ref-box');
  const liquidFields = document.getElementById('ds16-liquid-fields');

  if (state === 'liquid') {
    if (btnSolid) btnSolid.classList.remove('active');
    if (btnLiquid) btnLiquid.classList.add('active');
    if (liquidRef) liquidRef.style.display = 'flex';
    if (liquidFields) liquidFields.style.display = 'flex';
  } else {
    if (btnLiquid) btnLiquid.classList.remove('active');
    if (btnSolid) btnSolid.classList.add('active');
    if (liquidRef) liquidRef.style.display = 'none';
    if (liquidFields) liquidFields.style.display = 'none';
  }
}

// Calculate Function
function calculateDs16Solution() {
  const name = document.getElementById('ds16-chem-name').value.trim() || 'محلول كيميائي';
  const mw = parseFloat(document.getElementById('ds16-mw-val').value);
  const targetM = parseFloat(document.getElementById('ds16-target-m').value);
  const targetVol = parseFloat(document.getElementById('ds16-target-vol').value);
  const notes = document.getElementById('ds16-notes').value.trim();
  const prepBy = document.getElementById('ds16-prep-by').value.trim();
  const date = document.getElementById('ds16-prep-date').value || new Date().toISOString().split('T')[0];

  const resBox = document.getElementById('ds16-result-box');
  if (!resBox) return;

  if (isNaN(targetM) || isNaN(targetVol) || targetM <= 0 || targetVol <= 0) {
    alert('يرجى إدخال التركيز المطلوب (mol/L) والحجم النهائي (mL) بأرقام موجبة صحيحة.');
    return;
  }
  if (isNaN(mw) || mw <= 0) {
    alert('يرجى إدخال الكتلة المولية / الوزن الجزيئي MW (g/mol).');
    return;
  }

  let calculatedAmount = 0;
  let unit = 'g';
  let derivationHtml = '';

  const vLiter = targetVol / 1000;

  if (ds16CurrentState === 'solid') {
    // Solid: Mass = M * V(L) * MW
    calculatedAmount = targetM * vLiter * mw;
    unit = 'g';
    derivationHtml = `m = ${targetM} × (${targetVol} / 1000) × ${mw} = <strong>${calculatedAmount.toFixed(6)} g</strong>`;
  } else {
    // Liquid: Stock M = (Density * 10 * Assay%) / MW
    // V1 (mL) = (Target M * Target Vol) / Stock M
    const density = parseFloat(document.getElementById('ds16-density-val').value) || 1.19;
    const assay = parseFloat(document.getElementById('ds16-assay-val').value) || 37;
    const stockM = (density * 10 * assay) / mw;
    calculatedAmount = (targetM * targetVol) / stockM;
    unit = 'mL';
    derivationHtml = `
      مولارية السائل المركز M₁ = (${density} × 10 × ${assay}) / ${mw} = ${stockM.toFixed(2)} M<br>
      الحجم المطلوب سحبه V₁ = (${targetM} × ${targetVol}) / ${stockM.toFixed(2)} = <strong>${calculatedAmount.toFixed(3)} mL</strong>
    `;
  }

  currentCalculatedSolution = {
    chemName: name,
    mw: mw,
    state: ds16CurrentState,
    targetM: targetM,
    targetVol: targetVol,
    calculatedAmount: calculatedAmount.toFixed(unit === 'g' ? 4 : 2),
    unit: unit,
    derivationHtml: derivationHtml,
    notes: notes,
    prepBy: prepBy,
    date: date
  };

  resBox.style.display = 'block';
  resBox.innerHTML = `
    <div style="font-size: 0.88rem; color: #166534; font-weight: 800; margin-bottom: 0.3rem;">نتيجة الحساب المعملي</div>
    <div class="calc-breakdown-quantity">${calculatedAmount.toFixed(unit === 'g' ? 4 : 2)} ${unit}</div>
    <div class="calc-breakdown-formula">${name}</div>
    <div class="calc-breakdown-derivation">${derivationHtml}</div>
    <div style="font-size: 0.85rem; color: #15803d; font-weight: 700; margin-top: 0.5rem;">
      <i class="fa-solid fa-circle-check"></i> تم الحساب بنجاح. يمكنك الضغط على "حفظ التحضير" لتسجيله بشكل دائم في السجلات.
    </div>
  `;
}

// Preset Test Function (NaOH 0.1 M in 250 mL)
function loadDs16Preset() {
  const nameInp = document.getElementById('ds16-chem-name');
  const mwInp = document.getElementById('ds16-mw-val');
  const targetMInp = document.getElementById('ds16-target-m');
  const targetVolInp = document.getElementById('ds16-target-vol');
  const notesInp = document.getElementById('ds16-notes');
  const prepByInp = document.getElementById('ds16-prep-by');

  setDs16State('solid');
  if (nameInp) nameInp.value = 'هيدروكسيد الصوديوم (NaOH)';
  if (mwInp) mwInp.value = '39.997';
  if (targetMInp) targetMInp.value = '0.1';
  if (targetVolInp) targetVolInp.value = '250';
  if (notesInp) notesInp.value = 'تجربة قياسية - معمل 1';
  if (prepByInp) prepByInp.value = 'محضّرة المعمل';

  calculateDs16Solution();
}

function clearDs16Fields() {
  document.getElementById('ds16-chem-select').value = '';
  document.getElementById('ds16-chem-name').value = '';
  document.getElementById('ds16-mw-val').value = '';
  document.getElementById('ds16-target-m').value = '';
  document.getElementById('ds16-target-vol').value = '';
  document.getElementById('ds16-notes').value = '';
  document.getElementById('ds16-prep-by').value = '';
  const resBox = document.getElementById('ds16-result-box');
  if (resBox) resBox.style.display = 'none';
  currentCalculatedSolution = null;
}

// Save Preparation to Permanent Storage
function saveDs16Preparation() {
  if (!currentCalculatedSolution) {
    calculateDs16Solution();
  }
  if (!currentCalculatedSolution) {
    alert('يرجى حساب المحلول أولاً قبل الحفظ.');
    return;
  }

  const list = getSavedPreparations();
  const newRecord = {
    id: 'prep_' + Date.now(),
    chemName: currentCalculatedSolution.chemName,
    mw: currentCalculatedSolution.mw,
    state: currentCalculatedSolution.state,
    targetM: currentCalculatedSolution.targetM,
    targetVol: currentCalculatedSolution.targetVol,
    calculatedAmount: currentCalculatedSolution.calculatedAmount,
    unit: currentCalculatedSolution.unit,
    notes: document.getElementById('ds16-notes').value.trim() || currentCalculatedSolution.notes || '-',
    prepBy: document.getElementById('ds16-prep-by').value.trim() || currentCalculatedSolution.prepBy || 'غير محدد',
    date: document.getElementById('ds16-prep-date').value || currentCalculatedSolution.date,
    createdAt: new Date().toISOString()
  };

  list.unshift(newRecord);
  savePreparationsList(list);

  renderSavedPreparationsTable();
  alert(`✅ تم حفظ تحضير [${newRecord.chemName}] بنجاح في السجلات الدائمة!`);
  switchCalcTab('records');
}

// Render Table
function renderSavedPreparationsTable() {
  const tbody = document.getElementById('preparations-table-body');
  const countBadge = document.getElementById('records-count-badge');
  const totalStat = document.getElementById('stat-total-preps');
  const matchedStat = document.getElementById('stat-matched-preps');
  if (!tbody) return;

  const list = getSavedPreparations();
  if (countBadge) countBadge.textContent = list.length;
  if (totalStat) totalStat.textContent = list.length;

  const query = (document.getElementById('prep-search-filter') ? document.getElementById('prep-search-filter').value : '').toLowerCase().trim();
  const typeFilter = document.getElementById('prep-type-filter') ? document.getElementById('prep-type-filter').value : 'all';

  const filtered = list.filter(item => {
    // Check type
    if (typeFilter !== 'all') {
      if (typeFilter === 'solid' && item.state !== 'solid') return false;
      if (typeFilter === 'liquid' && item.state !== 'liquid') return false;
    }
    // Check search query
    if (query) {
      const matchName = (item.chemName || '').toLowerCase().includes(query);
      const matchPrepBy = (item.prepBy || '').toLowerCase().includes(query);
      const matchNotes = (item.notes || '').toLowerCase().includes(query);
      const matchDate = (item.date || '').toLowerCase().includes(query);
      if (!matchName && !matchPrepBy && !matchNotes && !matchDate) return false;
    }
    return true;
  });

  if (matchedStat) matchedStat.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-records-notice">
            <i class="fa-solid fa-clipboard-list"></i>
            <h4 style="font-weight: 800; color: #475569; margin-bottom: 0.3rem;">لا توجد سجلات مطابقة</h4>
            <p style="font-size: 0.88rem;">لم يتم العثور على أي تحضيرات مسجلة أو مطابقة للبحث الحالي.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isLiquid = item.state === 'liquid';
    const typeBadge = isLiquid 
      ? '<span style="background: #e0f2fe; color: #0369a1; padding: 0.25rem 0.65rem; border-radius: 6px; font-weight: 800; font-size: 0.82rem;">سائل مركز — مولارية</span>'
      : '<span style="background: #f1f5f9; color: #334155; padding: 0.25rem 0.65rem; border-radius: 6px; font-weight: 800; font-size: 0.82rem;">مادة صلبة — كتلة</span>';

    return `
      <tr>
        <td style="font-family: monospace; font-weight: 700; color: #334155;">${item.date}</td>
        <td><strong style="color: #0f172a;">${item.prepBy || '-'}</strong></td>
        <td>${typeBadge}</td>
        <td>
          <strong style="color: #005a9c; font-size: 0.95rem;">${item.chemName}</strong>
          ${item.notes && item.notes !== '-' ? `<small style="display: block; color: #64748b;">${item.notes}</small>` : ''}
        </td>
        <td>
          <strong style="color: #166534; font-size: 1.05rem;">${item.calculatedAmount} ${item.unit}</strong>
          <small style="display: block; color: #64748b; font-weight: 700;">${item.targetM} M في ${item.targetVol} mL</small>
        </td>
        <td>
          <button class="record-action-btn rec-btn-edit" onclick="openEditPreparationModal('${item.id}')" title="تعديل التحضير">
            <i class="fa-solid fa-pen-to-square"></i> تعديل
          </button>
          <button class="record-action-btn rec-btn-print" onclick="printPreparedSolutionLabel('${item.id}')" title="طباعة ملصق للعبوة">
            <i class="fa-solid fa-print"></i> ملصق
          </button>
          <button class="record-action-btn rec-btn-delete" onclick="deletePreparation('${item.id}')" title="حذف">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Backup & Restore System
function exportPreparationsJSON() {
  const list = getSavedPreparations();
  if (list.length === 0) {
    alert('لا توجد سجلات محفوظة لعمل نسخة احتياطية منها.');
    return;
  }
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(list, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute('href', dataStr);
  dlAnchorElem.setAttribute('download', `نسخة_احتياطية_سجلات_المحاليل_${new Date().toISOString().split('T')[0]}.json`);
  dlAnchorElem.click();
}

function triggerImportJSON() {
  const fileInput = document.getElementById('json-backup-input');
  if (fileInput) fileInput.click();
}

function handleImportJSON(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) {
        alert('ملف النسخة الاحتياطية غير صالح.');
        return;
      }
      const existing = getSavedPreparations();
      // Merge unique by id
      const map = new Map();
      existing.forEach(x => map.set(x.id, x));
      imported.forEach(x => {
        if (!x.id) x.id = 'prep_' + Date.now() + Math.random().toString(36).substr(2, 4);
        map.set(x.id, x);
      });
      const merged = Array.from(map.values());
      savePreparationsList(merged);
      renderSavedPreparationsTable();
      alert(`✅ تم استعادة ودمج ${imported.length} سجل بنجاح في السجلات الدائمة!`);
    } catch(err) {
      alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function printAllPreparationsLog() {
  const list = getSavedPreparations();
  if (list.length === 0) {
    alert('لا توجد سجلات لطباعتها.');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>طباعة سجل التحضيرات المعملية</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Cairo', sans-serif; padding: 25px; margin: 0; background: #fff; }
        .hdr { text-align: center; border-bottom: 3px solid #005a9c; padding-bottom: 15px; margin-bottom: 20px; }
        .hdr h2 { color: #005a9c; margin: 0 0 5px 0; font-size: 22px; }
        .hdr p { color: #64748b; margin: 0; font-size: 13px; font-weight: 700; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
        th { background: #005a9c; color: white; padding: 8px 10px; border: 1px solid #005a9c; text-align: right; }
        td { padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; }
        tr:nth-child(even) { background: #f8fafc; }
        .ftr { text-align: center; font-size: 11px; color: #64748b; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="hdr">
        <h2>📋 سجل التحضيرات المخبري المتكامل - DS-16</h2>
        <p>مبادرة معمل كيمياء آمن وذكي — تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>تاريخ التحضير</th>
            <th>اسم المحضّرة</th>
            <th>المادة والصيغة</th>
            <th>المواصفات المطلوبة</th>
            <th>الكمية المحسوبة</th>
            <th>الملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((it, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${it.date}</td>
              <td>${it.prepBy || '-'}</td>
              <td><strong>${it.chemName}</strong></td>
              <td>${it.targetM} M في ${it.targetVol} mL</td>
              <td><strong>${it.calculatedAmount} ${it.unit}</strong></td>
              <td>${it.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="ftr">الدليل الرقمي لمعمل الكيمياء DS-16 — تم الحفظ والاستخراج عبر منصة SDS Smart</div>
      <script>window.onload = function() { window.print(); };<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function openManualPrepModal() {
  const modal = document.getElementById('edit-prep-modal');
  if (!modal) return;
  currentEditingId = null; // null means new record
  document.getElementById('edit-prep-name').value = '';
  document.getElementById('edit-prep-m').value = '';
  document.getElementById('edit-prep-vol').value = '';
  document.getElementById('edit-prep-amount').value = '';
  document.getElementById('edit-prep-by').value = '';
  document.getElementById('edit-prep-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('edit-prep-notes').value = '';
  modal.style.display = 'flex';
}

// Edit Record Modal
let currentEditingId = null;

function openEditPreparationModal(id) {
  const list = getSavedPreparations();
  const item = list.find(x => x.id === id);
  if (!item) return;

  currentEditingId = id;
  const modal = document.getElementById('edit-prep-modal');
  if (!modal) return;

  document.getElementById('edit-prep-name').value = item.chemName;
  document.getElementById('edit-prep-m').value = item.targetM;
  document.getElementById('edit-prep-vol').value = item.targetVol;
  document.getElementById('edit-prep-amount').value = item.calculatedAmount;
  document.getElementById('edit-prep-unit').value = item.unit;
  document.getElementById('edit-prep-by').value = item.prepBy || '';
  document.getElementById('edit-prep-date').value = item.date;
  document.getElementById('edit-prep-notes').value = item.notes || '';

  modal.style.display = 'flex';
}

function closeEditPreparationModal() {
  const modal = document.getElementById('edit-prep-modal');
  if (modal) modal.style.display = 'none';
  currentEditingId = null;
}

function saveEditedPreparation() {
  const list = getSavedPreparations();
  const name = document.getElementById('edit-prep-name').value.trim();
  if (!name) {
    alert('يرجى كتابة اسم المادة الكيميائية.');
    return;
  }

  if (!currentEditingId) {
    // New Manual Record
    const newRecord = {
      id: 'prep_' + Date.now(),
      chemName: name,
      targetM: parseFloat(document.getElementById('edit-prep-m').value) || 0.1,
      targetVol: parseFloat(document.getElementById('edit-prep-vol').value) || 250,
      calculatedAmount: document.getElementById('edit-prep-amount').value.trim() || '1.00',
      unit: document.getElementById('edit-prep-unit').value,
      prepBy: document.getElementById('edit-prep-by').value.trim() || 'محضّرة المعمل',
      date: document.getElementById('edit-prep-date').value || new Date().toISOString().split('T')[0],
      notes: document.getElementById('edit-prep-notes').value.trim() || '-',
      state: document.getElementById('edit-prep-unit').value === 'mL' ? 'liquid' : 'solid',
      createdAt: new Date().toISOString()
    };
    list.unshift(newRecord);
    savePreparationsList(list);
    renderSavedPreparationsTable();
    closeEditPreparationModal();
    alert('✅ تم إضافة التحضير اليدوي بنجاح إلى السجلات!');
    return;
  }

  const idx = list.findIndex(x => x.id === currentEditingId);
  if (idx === -1) return;

  list[idx].chemName = name;
  list[idx].targetM = parseFloat(document.getElementById('edit-prep-m').value) || list[idx].targetM;
  list[idx].targetVol = parseFloat(document.getElementById('edit-prep-vol').value) || list[idx].targetVol;
  list[idx].calculatedAmount = document.getElementById('edit-prep-amount').value.trim();
  list[idx].unit = document.getElementById('edit-prep-unit').value;
  list[idx].prepBy = document.getElementById('edit-prep-by').value.trim();
  list[idx].date = document.getElementById('edit-prep-date').value;
  list[idx].notes = document.getElementById('edit-prep-notes').value.trim();

  savePreparationsList(list);
  renderSavedPreparationsTable();
  closeEditPreparationModal();
  alert('✅ تم حفظ التعديلات بنجاح في السجلات!');
}

function deletePreparation(id) {
  if (!confirm('هل أنت متأكد من حذف هذا التحضير من السجلات؟')) return;
  let list = getSavedPreparations();
  list = list.filter(x => x.id !== id);
  savePreparationsList(list);
  renderSavedPreparationsTable();
}

function clearAllPreparations() {
  if (!confirm('تحذير: هل أنت متأكد من مسح جميع سجلات التحضيرات؟ لا يمكن التراجع عن هذا الإجراء.')) return;
  savePreparationsList([]);
  renderSavedPreparationsTable();
}

function exportPreparationsCSV() {
  const list = getSavedPreparations();
  if (list.length === 0) {
    alert('لا توجد سجلات لتصديرها.');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += 'المادة,التركيز (M),الحجم النهائي (mL),الكمية المحسوبة,الوحدة,تاريخ التحضير,المحضرة,الملاحظات\n';
  list.forEach(i => {
    csvContent += `"${i.chemName}","${i.targetM}","${i.targetVol}","${i.calculatedAmount}","${i.unit}","${i.date}","${i.prepBy}","${i.notes}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `سجلات_المحاليل_الكيميائية_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// Print Solution Label
function printPreparedSolutionLabel(id) {
  const list = getSavedPreparations();
  const item = list.find(x => x.id === id);
  if (!item) return;

  const printWindow = window.open('', '_blank', 'width=650,height=550');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>ملصق محلول محضر: ${item.chemName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Cairo', sans-serif; padding: 20px; margin: 0; background: #fff; }
        .solution-sticker {
          max-width: 380px;
          margin: 0 auto;
          border: 3.5px solid #005a9c;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          background: #f8fafc;
        }
        .hdr { background: #005a9c; color: white; padding: 8px; border-radius: 6px; font-weight: 900; font-size: 16px; margin-bottom: 10px; }
        .chem-title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 4px; }
        .conc-badge { background: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 20px; font-size: 16px; font-weight: 900; display: inline-block; margin-bottom: 12px; }
        .row-info { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding: 6px 0; font-size: 13px; font-weight: 700; }
        .ftr { font-size: 10px; color: #64748b; margin-top: 12px; font-weight: 700; }
        @media print { body { padding: 0; } .solution-sticker { border-width: 2px; } }
      </style>
    </head>
    <body>
      <div class="solution-sticker">
        <div class="hdr">🧪 محلول محضر - PREPARED SOLUTION</div>
        <div class="chem-title">${item.chemName}</div>
        <div class="conc-badge">${item.targetM} M (${item.targetVol} mL)</div>
        <div class="row-info"><span>الوزن / الحجم الفعلي:</span><strong>${item.calculatedAmount} ${item.unit}</strong></div>
        <div class="row-info"><span>تاريخ التحضير:</span><strong>${item.date}</strong></div>
        <div class="row-info"><span>اسم المحضّرة:</span><strong>${item.prepBy || '-'}</strong></div>
        <div class="row-info"><span>ملاحظات:</span><strong>${item.notes || '-'}</strong></div>
        <div class="ftr">الدليل الرقمي لمعمل الكيمياء DS-16 - منصة SDS Smart</div>
      </div>
      <script>window.onload = function() { window.print(); };<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// Tab Switching
function switchCalcTab(tab) {
  const tabSolution = document.getElementById('tab-pane-solution');
  const tabRecords = document.getElementById('tab-pane-records');
  const tabQuick = document.getElementById('tab-pane-quick');
  const tabIndicators = document.getElementById('tab-pane-indicators');

  const btnSolution = document.getElementById('tab-btn-solution');
  const btnRecords = document.getElementById('tab-btn-records');
  const btnQuick = document.getElementById('tab-btn-quick');
  const btnIndicators = document.getElementById('tab-btn-indicators');

  [btnSolution, btnRecords, btnQuick, btnIndicators].forEach(b => b && b.classList.remove('active'));
  [tabSolution, tabRecords, tabQuick, tabIndicators].forEach(p => p && (p.style.display = 'none'));

  if (tab === 'records') {
    if (tabRecords) tabRecords.style.display = 'block';
    if (btnRecords) btnRecords.classList.add('active');
    renderSavedPreparationsTable();
  } else if (tab === 'quick') {
    if (tabQuick) tabQuick.style.display = 'block';
    if (btnQuick) btnQuick.classList.add('active');
  } else if (tab === 'indicators') {
    if (tabIndicators) tabIndicators.style.display = 'block';
    if (btnIndicators) btnIndicators.classList.add('active');
    renderLabIndicatorsGuide();
  } else {
    if (tabSolution) tabSolution.style.display = 'block';
    if (btnSolution) btnSolution.classList.add('active');
  }
}

// ============================================
// 10. QR Code Studio & Label Printing System
// ============================================
let currentQrChemical = null;

// Initialize UTF-8 for qrcode library immediately
if (typeof qrcode !== 'undefined' && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
}

function openQrGenerator(chem) {
  const chems = getAllChemicals();
  const targetChem = chem || currentSelectedChemical || (chems.length ? chems[0] : null);
  populateQrChemicalSelector(targetChem ? targetChem.id : null);
  if (targetChem) {
    showQrForChemical(targetChem);
  }
}

function generateQrForCurrentChem() {
  if (currentSelectedChemical) {
    openQrGenerator(currentSelectedChemical);
  } else {
    openQrGenerator();
  }
}

function populateQrChemicalSelector(selectedId) {
  const select = document.getElementById('qr-chem-select');
  if (!select) return;
  const chems = getAllChemicals();
  select.innerHTML = '';
  chems.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.nameAr} (${c.nameEn}) - ${c.formula}`;
    if (selectedId && c.id == selectedId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function onQrChemicalSelectChange(chemId) {
  const chems = getAllChemicals();
  const chem = chems.find(c => c.id == chemId);
  if (chem) {
    showQrForChemical(chem);
  }
}

function showQrForChemical(chem) {
  if (!chem) return;
  currentQrChemical = chem;

  const modal = document.getElementById('qr-modal');
  const title = document.getElementById('qr-chem-title');
  const box = document.getElementById('qr-display-box');
  if (!modal) return;

  modal.style.display = 'flex';
  if (title) title.textContent = 'ملصق QR الذكي: ' + chem.nameAr;

  // Populate chemical selector if needed
  const select = document.getElementById('qr-chem-select');
  if (select && select.children.length === 0) {
    populateQrChemicalSelector(chem.id);
  } else if (select && select.value != chem.id) {
    select.value = chem.id;
  }

  // Update Preview Elements
  const previewSignal = document.getElementById('qr-preview-signal');
  const previewLoc = document.getElementById('qr-preview-loc');
  const previewNameAr = document.getElementById('qr-preview-name-ar');
  const previewNameEn = document.getElementById('qr-preview-name-en');
  const previewCas = document.getElementById('qr-preview-cas');
  const previewFormula = document.getElementById('qr-preview-formula');

  const isDanger = (chem.signalWord || '').includes('خطر') || (chem.signalWord || '').toLowerCase().includes('danger');
  if (previewSignal) {
    previewSignal.textContent = chem.signalWord || (isDanger ? 'خطر DANGER' : 'تحذير WARNING');
    previewSignal.style.background = isDanger ? '#fee2e2' : '#fef3c7';
    previewSignal.style.color = isDanger ? '#dc2626' : '#d97706';
  }
  if (previewLoc) previewLoc.textContent = chem.location || 'Cabinet 1';
  if (previewNameAr) previewNameAr.textContent = chem.nameAr;
  if (previewNameEn) previewNameEn.textContent = chem.nameEn;
  if (previewCas) previewCas.textContent = chem.cas || 'N/A';
  if (previewFormula) previewFormula.textContent = chem.formula || '';

  // Prepare standard QR payload text
  const qrText = `SDS Smart - معمل الكيمياء
المادة: ${chem.nameAr}
English: ${chem.nameEn}
الصيغة: ${chem.formula}
CAS: ${chem.cas}
الرصيد: ${chem.quantity}
الموقع: ${chem.location}
التنبيه: ${chem.signalWord || 'تحذير'}`;

  // Find or create canvas
  let canvas = document.getElementById('qr-code-canvas');
  if (!canvas && box) {
    box.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.id = 'qr-code-canvas';
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.display = 'block';
    canvas.style.width = '190px';
    canvas.style.height = '190px';
    canvas.style.borderRadius = '8px';
    canvas.style.border = '1px solid #e2e8f0';
    box.appendChild(canvas);
  }

  if (canvas) {
    renderQrCodeToCanvas(canvas, qrText);
  }
}

function renderQrCodeToCanvas(canvas, text) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width || 200;

  // Clear & background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Method 1: qrcode-generator
  if (typeof qrcode === 'function') {
    try {
      if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
        qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      }
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      
      const count = qr.getModuleCount();
      const padding = 10;
      const cellSize = (size - padding * 2) / count;

      ctx.fillStyle = '#0a2540';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            const x = Math.round(padding + c * cellSize);
            const y = Math.round(padding + r * cellSize);
            const w = Math.ceil(cellSize);
            const h = Math.ceil(cellSize);
            ctx.fillRect(x, y, w, h);
          }
        }
      }
      return;
    } catch (e) {
      console.warn('qrcode render error:', e);
    }
  }

  // Method 2: QRCode object fallback
  if (typeof QRCode !== 'undefined') {
    try {
      const parent = canvas.parentElement;
      if (parent) {
        parent.innerHTML = '';
        new QRCode(parent, {
          text: text,
          width: 190,
          height: 190,
          colorDark: "#0a2540",
          colorLight: "#ffffff"
        });
        return;
      }
    } catch (e) {
      console.warn('QRCode fallback error:', e);
    }
  }

  // Method 3: Visual fallback icon with label
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(10, 10, size - 20, size - 20);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  ctx.fillStyle = '#005a9c';
  ctx.font = 'bold 15px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SDS Smart QR', size / 2, size / 2 - 8);
  ctx.font = '11px Cairo, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('معمل الكيمياء الذكي', size / 2, size / 2 + 16);
}

function downloadQrImage() {
  const chem = currentQrChemical || currentSelectedChemical;
  const chemName = chem ? (chem.nameEn || chem.nameAr).replace(/[^a-zA-Z0-9_-]/g, '_') : 'Chemical';

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 420;
  labelCanvas.height = 520;
  const ctx = labelCanvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 420, 520);

  // Outer border
  ctx.strokeStyle = '#005a9c';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 412, 512);

  // Top header banner
  ctx.fillStyle = '#005a9c';
  ctx.fillRect(4, 4, 412, 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Cairo, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SDS Smart - معمل الكيمياء', 210, 40);

  // Signal badge
  const isDanger = chem && ((chem.signalWord || '').includes('خطر') || (chem.signalWord || '').toLowerCase().includes('danger'));
  ctx.fillStyle = isDanger ? '#fee2e2' : '#fef3c7';
  ctx.fillRect(25, 78, 370, 36);
  ctx.fillStyle = isDanger ? '#dc2626' : '#d97706';
  ctx.font = 'bold 16px Cairo, sans-serif';
  ctx.fillText(chem ? (chem.signalWord || 'تحذير WARNING') : 'تحذير WARNING', 210, 102);

  // Chemical Name (Arabic)
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px Cairo, sans-serif';
  ctx.fillText(chem ? chem.nameAr : '', 210, 148);

  // Chemical Name (English)
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 16px Cairo, sans-serif';
  ctx.fillText(chem ? chem.nameEn : '', 210, 175);

  // CAS & Formula
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px Cairo, sans-serif';
  ctx.fillText(`CAS: ${chem ? chem.cas : 'N/A'}  |  Formula: ${chem ? chem.formula : ''}`, 210, 202);
  ctx.fillText(`الموقع: ${chem ? chem.location : 'Cabinet 1'}  |  الرصيد: ${chem ? chem.quantity : ''}`, 210, 224);

  // Draw QR code canvas into label
  const qrCanvas = document.getElementById('qr-code-canvas');
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, 110, 245, 200, 200);
  }

  // Footer instruction
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Cairo, sans-serif';
  ctx.fillText('امسح الرمز بواسطة الهاتف للانتقال الفوري إلى بطاقة السلامة SDS الكاملة', 210, 480);

  const link = document.createElement('a');
  link.download = `SDS_Label_${chemName}.png`;
  link.href = labelCanvas.toDataURL('image/png');
  link.click();
}

function printChemicalLabel() {
  const chem = currentQrChemical || currentSelectedChemical;
  const qrCanvas = document.getElementById('qr-code-canvas');
  const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : '';

  const printWindow = window.open('', '_blank', 'width=650,height=620');
  if (!printWindow) {
    window.print();
    return;
  }

  const isDanger = chem && ((chem.signalWord || '').includes('خطر') || (chem.signalWord || '').toLowerCase().includes('danger'));

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>طباعة ملصق: ${chem ? chem.nameAr : 'Chemical Label'}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Cairo', sans-serif; margin: 0; padding: 25px; background: #fff; text-align: center; }
        .label-container {
          max-width: 380px;
          margin: 0 auto;
          border: 3px solid #005a9c;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .header { background: #005a9c; color: white; padding: 8px; border-radius: 6px; font-weight: 800; font-size: 16px; margin-bottom: 10px; }
        .signal-badge { background: ${isDanger ? '#fee2e2' : '#fef3c7'}; color: ${isDanger ? '#dc2626' : '#d97706'}; font-weight: 800; font-size: 14px; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 8px; }
        .chem-ar { font-size: 20px; font-weight: 900; color: #0f172a; margin: 4px 0; }
        .chem-en { font-size: 14px; font-weight: 700; color: #0284c7; margin-bottom: 8px; }
        .meta-line { font-size: 12px; color: #334155; font-weight: 700; margin: 3px 0; }
        .qr-img { width: 180px; height: 180px; margin: 10px auto; display: block; border-radius: 6px; border: 1px solid #cbd5e1; }
        .footer { font-size: 11px; color: #64748b; margin-top: 8px; font-weight: 600; }
        @media print {
          body { padding: 0; }
          .label-container { border: 2px solid #000; box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="label-container">
        <div class="header">🛡️ SDS Smart - ملصق أمان المعمل</div>
        <div class="signal-badge">${chem ? (chem.signalWord || 'تحذير WARNING') : 'تحذير'}</div>
        <div class="chem-ar">${chem ? chem.nameAr : ''}</div>
        <div class="chem-en">${chem ? chem.nameEn : ''}</div>
        <div class="meta-line">الصيغة: <strong>${chem ? chem.formula : ''}</strong> | CAS: <strong>${chem ? chem.cas : ''}</strong></div>
        <div class="meta-line">الموقع: <strong>${chem ? chem.location : 'Cabinet 1'}</strong> | الرصيد: <strong>${chem ? chem.quantity : ''}</strong></div>
        <img class="qr-img" src="${qrDataUrl}" alt="QR Code">
        <div class="footer">امسح الرمز بكاميرا الجوال لعرض بطاقة السلامة SDS كاملة</div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function closeQrModal() {
  const modal = document.getElementById('qr-modal');
  if (modal) modal.style.display = 'none';
}

// ============================================
// Autocomplete Suggestions System (Live Search)
// ============================================
let activeSuggestionIdx = -1;

function handleSearchSuggestions(val) {
  const box = document.getElementById('search-autocomplete-box');
  if (!box) return;

  const q = (val || '').trim().toLowerCase();
  activeSuggestionIdx = -1;

  if (q.length === 0) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  const chems = getAllChemicals();
  const matches = chems.filter(c => 
    c.nameEn.toLowerCase().includes(q) ||
    c.nameAr.toLowerCase().includes(q) ||
    c.formula.toLowerCase().includes(q) ||
    c.cas.toLowerCase().includes(q)
  ).slice(0, 8); // show up to 8 top suggestions

  if (matches.length === 0) {
    box.innerHTML = '<li class="autocomplete-item" style="color: #94a3b8; cursor: default;">لا توجد مادة مطابقة لبحثك</li>';
    box.style.display = 'block';
    return;
  }

  box.innerHTML = matches.map((c, i) => `
    <li class="autocomplete-item" data-index="${i}" onclick="selectSuggestion('${c.cas.replace(/'/g, "\\'")}')">
      <div class="ac-text-group">
        <span class="ac-name-ar">${c.nameAr}</span>
        <span class="ac-name-en">${c.nameEn}</span>
      </div>
      <div class="ac-meta-group">
        <span class="ac-formula">${c.formula}</span>
        <span class="ac-cas">CAS: ${c.cas}</span>
      </div>
    </li>
  `).join('');

  box.style.display = 'block';
}

function selectSuggestion(cas) {
  const box = document.getElementById('search-autocomplete-box');
  if (box) box.style.display = 'none';

  const chems = getAllChemicals();
  const chem = chems.find(c => c.cas === cas);
  if (chem) {
    const input = document.getElementById('global-search-input');
    if (input) input.value = chem.nameAr + ' (' + chem.nameEn + ')';
    displayChemicalSDS(chem);
  }
}

function handleSearchNav(e) {
  const box = document.getElementById('search-autocomplete-box');
  if (!box || box.style.display === 'none') {
    if (e.key === 'Enter') executeSearch();
    return;
  }

  const items = box.querySelectorAll('.autocomplete-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeSuggestionIdx = (activeSuggestionIdx + 1) % items.length;
    highlightSuggestion(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeSuggestionIdx = (activeSuggestionIdx - 1 + items.length) % items.length;
    highlightSuggestion(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeSuggestionIdx >= 0 && items[activeSuggestionIdx]) {
      items[activeSuggestionIdx].click();
    } else {
      executeSearch();
      box.style.display = 'none';
    }
  } else if (e.key === 'Escape') {
    box.style.display = 'none';
  }
}

function highlightSuggestion(items) {
  items.forEach((it, idx) => {
    if (idx === activeSuggestionIdx) {
      it.classList.add('active');
      it.scrollIntoView({ block: 'nearest' });
    } else {
      it.classList.remove('active');
    }
  });
}

// Suggestions for Library page
function handleLibrarySuggestions(val) {
  const box = document.getElementById('library-autocomplete-box');
  if (!box) return;

  const q = (val || '').trim().toLowerCase();
  if (q.length === 0) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  const chems = getAllChemicals();
  const matches = chems.filter(c => 
    c.nameEn.toLowerCase().includes(q) ||
    c.nameAr.toLowerCase().includes(q) ||
    c.formula.toLowerCase().includes(q) ||
    c.cas.toLowerCase().includes(q)
  ).slice(0, 6);

  if (matches.length === 0) {
    box.style.display = 'none';
    return;
  }

  box.innerHTML = matches.map((c) => `
    <li class="autocomplete-item" onclick="selectLibrarySuggestion('${c.cas.replace(/'/g, "\\'")}')">
      <div class="ac-text-group">
        <span class="ac-name-ar">${c.nameAr}</span>
        <span class="ac-name-en">${c.nameEn}</span>
      </div>
      <div class="ac-meta-group">
        <span class="ac-formula">${c.formula}</span>
      </div>
    </li>
  `).join('');

  box.style.display = 'block';
}

function selectLibrarySuggestion(cas) {
  const box = document.getElementById('library-autocomplete-box');
  if (box) box.style.display = 'none';

  const chems = getAllChemicals();
  const chem = chems.find(c => c.cas === cas);
  if (chem) {
    const input = document.getElementById('library-filter-input');
    if (input) {
      input.value = chem.nameEn;
      filterLibraryTable();
    }
    displayChemicalSDS(chem);
  }
}

function handleLibraryNav(e) {
  if (e.key === 'Escape') {
    const box = document.getElementById('library-autocomplete-box');
    if (box) box.style.display = 'none';
  }
}

// Close suggestion box on outside click
document.addEventListener('click', (e) => {
  const searchBox = document.getElementById('search-autocomplete-box');
  const searchInput = document.getElementById('global-search-input');
  if (searchBox && !searchBox.contains(e.target) && e.target !== searchInput) {
    searchBox.style.display = 'none';
  }

  const libBox = document.getElementById('library-autocomplete-box');
  const libInput = document.getElementById('library-filter-input');
  if (libBox && !libBox.contains(e.target) && e.target !== libInput) {
    libBox.style.display = 'none';
  }
});
