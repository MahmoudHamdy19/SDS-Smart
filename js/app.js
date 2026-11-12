// app.js - المحرك البرمجي المتكامل لمنصة SDS Smart

let currentSelectedChemical = null;

// Initialize app on load
window.addEventListener('DOMContentLoaded', () => {
  enforceAuthGuard();
  initCustomStorage();
  
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

// 10. QR Code Operations
function openQrGenerator() {
  const chems = getAllChemicals();
  const chem = currentSelectedChemical || (chems.length ? chems[0] : null);
  if (chem) showQrForChemical(chem);
}

function generateQrForCurrentChem() {
  if (currentSelectedChemical) {
    showQrForChemical(currentSelectedChemical);
  }
}

function showQrForChemical(chem) {
  const modal = document.getElementById('qr-modal');
  const title = document.getElementById('qr-chem-title');
  const box = document.getElementById('qr-display-box');
  if (!modal || !title || !box) return;

  modal.style.display = 'flex';
  title.textContent = 'رمز QR لملصق: ' + chem.nameAr + ' (' + chem.nameEn + ')';
  box.innerHTML = '';

  const qrText = `SDS Smart - بطاقة أمان
المادة: ${chem.nameAr}
English: ${chem.nameEn}
الصيغة: ${chem.formula}
CAS No: ${chem.cas}
الرصيد: ${chem.quantity}
الموقع: ${chem.location}
كلمة التنبيه: ${chem.signalWord || 'تحذير'}`;

  let generated = false;

  // Method 1: qrcode-generator (Pure inline SVG, fast and 100% offline)
  if (typeof qrcode === 'function') {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(qrText);
      qr.make();
      const svgTag = qr.createSvgTag({ scalable: true });
      box.innerHTML = `<div style="width: 190px; height: 190px; margin: 0 auto; display: flex; align-items: center; justify-content: center; background: white; padding: 10px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 2px solid #e2e8f0;">${svgTag}</div>`;
      generated = true;
    } catch (e) {
      console.warn('qrcode-generator exception:', e);
    }
  }

  // Method 2: QRCode object (legacy/alternative library if present)
  if (!generated && typeof QRCode !== 'undefined') {
    try {
      new QRCode(box, {
        text: qrText,
        width: 180,
        height: 180,
        colorDark: "#0a2540",
        colorLight: "#ffffff"
      });
      generated = true;
    } catch (e) {
      console.warn('QRCode exception:', e);
    }
  }

  // Method 3: High-reliability Image API Fallback
  if (!generated) {
    const encoded = encodeURIComponent(qrText);
    box.innerHTML = `
      <div style="width: 190px; height: 190px; margin: 0 auto; display: flex; align-items: center; justify-content: center; background: white; padding: 10px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 2px solid #e2e8f0;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}&color=0a2540" alt="QR Code" width="170" height="170" style="border-radius: 6px;">
      </div>
    `;
  }
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
