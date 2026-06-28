let allData = { products: [], cloudTariffs: [], itsTariffs: [], portalServices: [] };
let selectedItems = { products: {}, cloud: {}, its: {}, portal: {} };
let currentCalculationResult = null;
let currentTab = 'products';

const tabContent = document.getElementById('tab-content');
const selectedContainer = document.getElementById('selected-container');
const resultContainer = document.getElementById('result-container');
const generateBtn = document.getElementById('generate-btn');
const proposalModal = document.getElementById('proposal-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const clientForm = document.getElementById('client-form');

async function loadAllData() {
    try {
        const [productsRes, cloudRes, itsRes, portalRes] = await Promise.all([
            fetch('/api/categories'),
            fetch('/api/cloud-tariffs'),
            fetch('/api/its-tariffs'),
            fetch('/api/portal-services')
        ]);
        allData.products = await productsRes.json();
        allData.cloudTariffs = await cloudRes.json();
        allData.itsTariffs = await itsRes.json();
        allData.portalServices = await portalRes.json();
        renderTab(currentTab);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        tabContent.innerHTML = '<p style="color:#D34646;">Ошибка загрузки данных</p>';
    }
}

function renderTab(tab) {
    currentTab = tab;
    switch(tab) {
        case 'products': renderProductsTab(); break;
        case 'cloud': renderCloudTab(); break;
        case 'its': renderItsTab(); break;
        case 'portal': renderPortalTab(); break;
        default: tabContent.innerHTML = '<p>Выберите раздел</p>';
    }
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    updateUI();
}

function renderProductsTab() {
    const allowedCategories = ['Программные продукты 1С', 'Лицензии 1С'];
    const filteredCategories = allData.products.filter(cat => 
        allowedCategories.includes(cat.name)
    );
    
    if (!filteredCategories.length) { 
        tabContent.innerHTML = '<p>Нет продуктов</p>'; 
        return; 
    }
    
    let html = '';
    for (let cat of filteredCategories) {
        html += `<div class="category-block"><div class="category-title">${cat.name}</div><div class="category-description">${cat.description||''}</div>`;
        for (let s of cat.services) {
            const sel = selectedItems.products[s.id];
            const checked = sel ? 'checked' : '';
            const selected = sel ? 'selected' : '';
            const qty = sel?.quantity || 1;
            const impl = sel?.hasImplementation || false;
            const implRate = sel?.implRate || 3500;
            const implHours = sel?.implHours || 40;
            const disabled = !sel;
            
            const isLicense = cat.name === 'Лицензии 1С';
            const showImplementation = !isLicense;
            const showQuantity = isLicense;
            
            html += `
                <div class="service-item ${selected}" data-id="${s.id}">
                    <input type="checkbox" class="product-checkbox" data-id="${s.id}" ${checked} />
                    <div class="service-info">
                         <span class="service-name">${s.name}</span>
                         <span class="service-price">${Number(s.price).toLocaleString('ru-RU')} ₽</span>
                        <span class="service-desc">${s.description||''}</span>
                    </div>
                    <div class="service-controls" style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-top:4px;">
                        ${showQuantity ? `
                        <div class="license-control" style="display:flex; align-items:center; gap:8px;">
                            <label>Кол-во:</label>
                            <input type="number" class="product-qty" data-id="${s.id}" value="${qty}" min="1" ${disabled?'disabled':''} style="width:60px; padding:4px 6px; border:1px solid #ccc; border-radius:4px;" />
                        </div>
                        ` : ''}
                        ${showImplementation ? `
                        <div class="impl-control" style="display:flex; align-items:center; gap:6px;">
                            <input type="checkbox" class="product-impl" data-id="${s.id}" ${impl?'checked':''} ${disabled?'disabled':''} />
                            <label>Внедрение</label>
                        </div>
                        ` : ''}
                    </div>
                    ${showImplementation ? `
                    <div class="impl-params" data-id="${s.id}" style="margin-left:0px; margin-top:6px; display:${impl ? 'flex' : 'none'}; gap:12px; flex-wrap:wrap; padding:8px 12px; background:#f0f1f2; border-radius:6px; border-left:3px solid #F2BA02;">
                        <div>
                            <label style="font-size:13px; font-weight:500;">Ставка (₽/час):</label>
                            <input type="number" class="impl-rate-input" data-id="${s.id}" value="${implRate}" min="0" step="100" style="width:100px; padding:4px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; margin-left:4px;" />
                        </div>
                        <div>
                            <label style="font-size:13px; font-weight:500;">Часы:</label>
                            <input type="number" class="impl-hours-input" data-id="${s.id}" value="${implHours}" min="0" step="1" style="width:80px; padding:4px 8px; border:1px solid #ccc; border-radius:4px; font-size:13px; margin-left:4px;" />
                        </div>
                        <div style="font-size:13px; color:#666; display:flex; align-items:center;">
                            = <span class="impl-total-preview" data-id="${s.id}">${(implRate * implHours).toLocaleString('ru-RU')} ₽</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }
        html += '</div>';
    }
    
    tabContent.innerHTML = html;

    document.querySelectorAll('.product-checkbox').forEach(el => {
        el.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            const qtyInp = document.querySelector(`.product-qty[data-id="${id}"]`);
            const implInp = document.querySelector(`.product-impl[data-id="${id}"]`);
            const implParams = document.querySelector(`.impl-params[data-id="${id}"]`);
            
            if (this.checked) {
                if (!selectedItems.products[id]) {
                    selectedItems.products[id] = { 
                        quantity: qtyInp ? parseInt(qtyInp.value) || 1 : 1, 
                        hasImplementation: false,
                        implRate: 3500,
                        implHours: 40
                    };
                }
                if (qtyInp) qtyInp.disabled = false;
                if (implInp) implInp.disabled = false;
                if (implParams) implParams.style.display = 'flex';
            } else {
                delete selectedItems.products[id];
                if (qtyInp) qtyInp.disabled = true;
                if (implInp) { implInp.checked = false; implInp.disabled = true; }
                if (implParams) implParams.style.display = 'none';
            }
            updateUI();
        });
    });

    document.querySelectorAll('.product-qty').forEach(el => {
        el.addEventListener('input', function() {
            const id = parseInt(this.dataset.id);
            if (selectedItems.products[id]) {
                selectedItems.products[id].quantity = parseInt(this.value) || 1;
                updateUI();
            }
        });
    });

    document.querySelectorAll('.product-impl').forEach(el => {
        el.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            const implParams = document.querySelector(`.impl-params[data-id="${id}"]`);
            if (selectedItems.products[id]) {
                selectedItems.products[id].hasImplementation = this.checked;
                if (implParams) {
                    implParams.style.display = this.checked ? 'flex' : 'none';
                }
                updateUI();
            }
        });
    });

    document.querySelectorAll('.impl-rate-input').forEach(el => {
        el.addEventListener('input', function() {
            const id = parseInt(this.dataset.id);
            const val = parseInt(this.value) || 0;
            if (selectedItems.products[id]) {
                selectedItems.products[id].implRate = val;
                const hours = selectedItems.products[id].implHours || 40;
                const preview = document.querySelector(`.impl-total-preview[data-id="${id}"]`);
                if (preview) {
                    preview.textContent = (val * hours).toLocaleString('ru-RU') + ' ₽';
                }
                updateUI();
            }
        });
    });

    document.querySelectorAll('.impl-hours-input').forEach(el => {
        el.addEventListener('input', function() {
            const id = parseInt(this.dataset.id);
            const val = parseInt(this.value) || 0;
            if (selectedItems.products[id]) {
                selectedItems.products[id].implHours = val;
                const rate = selectedItems.products[id].implRate || 3500;
                const preview = document.querySelector(`.impl-total-preview[data-id="${id}"]`);
                if (preview) {
                    preview.textContent = (rate * val).toLocaleString('ru-RU') + ' ₽';
                }
                updateUI();
            }
        });
    });
}

function renderCloudTab() {
    if (!allData.cloudTariffs?.length) { tabContent.innerHTML = '<p>Нет тарифов</p>'; return; }
    let html = '<div class="cloud-section"><p style="color:#666;margin-bottom:16px;">Выберите тариф и укажите количество РМ</p>';
    for (let t of allData.cloudTariffs) {
        const sel = selectedItems.cloud.tariffId === t.id;
        const rm = selectedItems.cloud.rmCount || t.min_rm;
        html += `
            <div class="cloud-item ${sel?'selected':''}" data-id="${t.id}">
                <div class="cloud-header">
                    <input type="radio" name="cloud-tariff" value="${t.id}" ${sel?'checked':''} />
                    <span class="cloud-name">${t.name}</span>
                    <span class="cloud-price">${Number(t.price_per_rm).toLocaleString('ru-RU')} ₽/РМ/мес</span>
                </div>
                <div class="cloud-details">
                    <span class="cloud-apps">${t.apps||''}</span>
                    <span class="cloud-min">Минимум: ${t.min_rm} РМ</span>
                </div>
                <div class="cloud-controls" style="${sel?'':'display:none;'}">
                    <label>Количество РМ:</label>
                    <input type="number" class="cloud-rm" value="${rm}" min="${t.min_rm}" />
                    <button class="clear-selection-btn" data-type="cloud" style="padding:4px 12px; background:#D34646; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px;">✕ Снять выбор</button>
                </div>
            </div>
        `;
    }
    html += '</div>';
    tabContent.innerHTML = html;

    document.querySelectorAll('input[name="cloud-tariff"]').forEach(el => {
        el.addEventListener('change', function() {
            selectedItems.cloud.tariffId = parseInt(this.value);
            const rmInp = document.querySelector('.cloud-rm');
            selectedItems.cloud.rmCount = rmInp ? parseInt(rmInp.value) || 1 : 1;
            renderCloudTab();
            updateUI();
        });
    });

    document.querySelectorAll('.cloud-rm').forEach(el => {
        el.addEventListener('input', function() {
            selectedItems.cloud.rmCount = parseInt(this.value) || 1;
            updateUI();
        });
    });
}

function renderItsTab() {
    if (!allData.itsTariffs?.length) { tabContent.innerHTML = '<p>Нет тарифов</p>'; return; }
    const grouped = {};
    for (let t of allData.itsTariffs) {
        if (!grouped[t.name]) grouped[t.name] = [];
        grouped[t.name].push(t);
    }
    let html = '<div class="its-section"><p style="color:#666;margin-bottom:16px;">Выберите тариф и период</p>';
    for (let [name, variants] of Object.entries(grouped)) {
        const sel = selectedItems.its.tariffId && variants.some(v => v.id === selectedItems.its.tariffId);
        const disc = selectedItems.its.useDiscount || false;
        html += `<div class="its-group ${sel?'selected':''}"><div class="its-header"><span class="its-name">${name}</span></div><div class="its-variants">`;
        for (let v of variants) {
            const checked = selectedItems.its.tariffId === v.id ? 'checked' : '';
            const price = disc && v.discount_price ? v.discount_price : v.recommended_price;
            const discText = v.discount_price ? `(льготная: ${Number(v.discount_price).toLocaleString('ru-RU')} ₽)` : '';
            html += `
                <label class="its-option">
                    <input type="radio" name="its-${name}" value="${v.id}" ${checked} />
                    ${v.period_months} мес. — ${Number(price).toLocaleString('ru-RU')} ₽ ${discText}
                </label>
            `;
        }
        html += `</div><div class="its-controls" style="${sel?'':'display:none;'}">
                    <label><input type="checkbox" class="its-discount" ${disc?'checked':''} /> Использовать льготную цену</label>
                    <button class="clear-selection-btn" data-type="its" style="margin-top:6px; padding:4px 12px; background:#D34646; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px;">✕ Снять выбор</button>
                </div></div>`;
    }
    html += '</div>';
    tabContent.innerHTML = html;

    document.querySelectorAll('input[type="radio"][name^="its-"]').forEach(el => {
        el.addEventListener('change', function() {
            selectedItems.its.tariffId = parseInt(this.value);
            selectedItems.its.useDiscount = document.querySelector('.its-discount')?.checked || false;
            renderItsTab();
            updateUI();
        });
    });

    document.querySelectorAll('.its-discount').forEach(el => {
        el.addEventListener('change', function() {
            selectedItems.its.useDiscount = this.checked;
            updateUI();
        });
    });
}

function renderPortalTab() {
    if (!allData.portalServices?.length) { tabContent.innerHTML = '<p>Нет сервисов</p>'; return; }
    let html = '<div class="portal-section"><p style="color:#666;margin-bottom:16px;">Выберите сервисы</p>';
    for (let s of allData.portalServices) {
        const checked = selectedItems.portal[s.id] || false;
        let unitDisplay = s.unit || 'год';
        if (unitDisplay === 'в год') unitDisplay = 'год';
        if (unitDisplay === '12 месяцев') unitDisplay = 'год';
        html += `
            <div class="portal-item">
                <input type="checkbox" class="portal-checkbox" data-id="${s.id}" ${checked?'checked':''} />
                <div class="portal-info">
                    <span class="portal-name">${s.name}</span>
                    <span class="portal-price">${Number(s.price).toLocaleString('ru-RU')} ₽</span>
                    <span class="portal-unit">за ${unitDisplay}</span>
                    <span class="portal-desc">${s.description||''}</span>
                </div>
            </div>
        `;
    }
    html += '</div>';
    tabContent.innerHTML = html;

    document.querySelectorAll('.portal-checkbox').forEach(el => {
        el.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            if (this.checked) selectedItems.portal[id] = true;
            else delete selectedItems.portal[id];
            updateUI();
        });
    });
}

function updateUI() { renderSelected(); calculate(); }

function renderSelected() {
    let items = [];
    for (let id in selectedItems.products) {
        const s = findProduct(parseInt(id));
        if (!s) continue;
        const qty = selectedItems.products[id].quantity || 1;
        const impl = selectedItems.products[id].hasImplementation ? 
            ` + внедрение (${selectedItems.products[id].implHours || 40}ч × ${selectedItems.products[id].implRate || 3500}₽/ч)` : '';
        items.push(`${s.name} × ${qty}${impl}`);
    }
    if (selectedItems.cloud.tariffId) {
        const t = allData.cloudTariffs.find(x => x.id === selectedItems.cloud.tariffId);
        if (t) {
            const rm = selectedItems.cloud.rmCount || t.min_rm;
            items.push(`Облачный тариф "${t.name}" — ${rm} РМ`);
        }
    }
    if (selectedItems.its.tariffId) {
        const t = allData.itsTariffs.find(x => x.id === selectedItems.its.tariffId);
        if (t) {
            const price = selectedItems.its.useDiscount && t.discount_price ? t.discount_price : t.recommended_price;
            items.push(`${t.name} (${t.period_months} мес.) — ${Number(price).toLocaleString('ru-RU')} ₽`);
        }
    }
    for (let id in selectedItems.portal) {
        const s = allData.portalServices.find(x => x.id === parseInt(id));
        if (s) items.push(`${s.name} — ${Number(s.price).toLocaleString('ru-RU')} ₽`);
    }
    if (!items.length) { selectedContainer.innerHTML = '<p class="empty-message">Ничего не выбрано</p>'; return; }
    let html = '';
    for (let item of items) html += `<div class="selected-item"><span>${item}</span></div>`;
    selectedContainer.innerHTML = html;
}

async function calculate() {
    document.querySelectorAll('.impl-rate-input').forEach(el => {
        const id = parseInt(el.dataset.id);
        if (selectedItems.products[id]) {
            selectedItems.products[id].implRate = parseInt(el.value) || 3500;
        }
    });
    document.querySelectorAll('.impl-hours-input').forEach(el => {
        const id = parseInt(el.dataset.id);
        if (selectedItems.products[id]) {
            selectedItems.products[id].implHours = parseInt(el.value) || 40;
        }
    });
    
    const payload = {
        serviceIds: Object.keys(selectedItems.products).map(Number),
        licenses: {},
        implementationMap: {},
        implementationDetails: {},
        cloudTariffId: selectedItems.cloud.tariffId || null,
        cloudRmCount: selectedItems.cloud.rmCount || 0,
        itsTariffId: selectedItems.its.tariffId || null,
        itsDiscount: selectedItems.its.useDiscount || false,
        portalServiceIds: Object.keys(selectedItems.portal).map(Number)
    };
    
    for (let id in selectedItems.products) {
        const product = selectedItems.products[id];
        payload.licenses[id] = product.quantity || 1;
        if (product.hasImplementation) {
            payload.implementationMap[id] = true;
            payload.implementationDetails[id] = {
                rate: product.implRate || 3500,
                hours: product.implHours || 40
            };
        }
    }
    
    const totalSelected = Object.keys(selectedItems.products).length + (payload.cloudTariffId?1:0) + (payload.itsTariffId?1:0) + Object.keys(selectedItems.portal).length;
    if (!totalSelected) {
        resultContainer.innerHTML = '<div class="result-placeholder"><p>Выберите позиции для расчёта</p></div>';
        generateBtn.disabled = true;
        currentCalculationResult = null;
        return;
    }
    try {
        const resp = await fetch('/api/calculate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        if (!resp.ok) throw new Error('Ошибка расчёта');
        const data = await resp.json();
        currentCalculationResult = data;
        let html = '<div class="result-content">';
        for (let item of data.breakdown) {
            html += `<div class="result-row"><span>${item.name}</span><span>${Number(item.total).toLocaleString('ru-RU')} ₽</span></div>`;
        }
        html += `<div class="result-row result-total"><span>ИТОГО:</span><span>${Number(data.totalSum).toLocaleString('ru-RU')} ₽</span></div></div>`;
        resultContainer.innerHTML = html;
        generateBtn.disabled = false;
    } catch (error) {
        console.error('Ошибка расчёта:', error);
        resultContainer.innerHTML = '<p style="color:#D34646;">Ошибка расчёта</p>';
        generateBtn.disabled = true;
    }
}

// Обработчики для кнопок "Снять выбор"
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('clear-selection-btn')) {
        const type = e.target.dataset.type;
        if (type === 'cloud') {
            selectedItems.cloud = {};
            renderCloudTab();
            updateUI();
        } else if (type === 'its') {
            selectedItems.its = {};
            renderItsTab();
            updateUI();
        }
    }
});

generateBtn.addEventListener('click', () => { if (currentCalculationResult) proposalModal.classList.remove('hidden'); });
closeModalBtn.addEventListener('click', () => proposalModal.classList.add('hidden'));
proposalModal.addEventListener('click', (e) => { if (e.target === proposalModal) proposalModal.classList.add('hidden'); });

clientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientName = document.getElementById('client-name').value.trim() || 'Клиент';
    const clientPhone = document.getElementById('client-phone').value.trim() || '';
    const clientEmail = document.getElementById('client-email').value.trim() || '';
    const data = { clientName, clientPhone, clientEmail, breakdown: currentCalculationResult.breakdown, totalSum: currentCalculationResult.totalSum };
    try {
        console.log('📤 Отправка данных в БД:', { clientName, clientPhone, clientEmail, totalSum: data.totalSum });
        const saveResp = await fetch('/api/proposals', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ clientName, clientPhone, clientEmail, selectedData: currentCalculationResult.breakdown, totalSum: currentCalculationResult.totalSum }) });
        if (!saveResp.ok) { console.error('❌ Ошибка сохранения:', await saveResp.text()); alert('Ошибка сохранения данных.'); }
        else { const result = await saveResp.json(); console.log('✅ Сохранено в БД:', result); }
        const pdfResp = await fetch('/api/generate-pdf', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
        if (!pdfResp.ok) throw new Error('Ошибка генерации');
        const blob = await pdfResp.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'kommercheskoe_predlozhenie.html';
        link.click();
        proposalModal.classList.add('hidden');
        document.getElementById('client-name').value = '';
        document.getElementById('client-phone').value = '';
        document.getElementById('client-email').value = '';
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка генерации документа. Попробуйте ещё раз.');
    }
});

function findProduct(id) {
    for (let cat of allData.products) {
        for (let s of cat.services) {
            if (s.id === id) return s;
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() { renderTab(this.dataset.tab); });
    });
    loadAllData();
});