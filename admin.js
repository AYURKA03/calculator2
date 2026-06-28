// ============================
//  СОСТОЯНИЕ
// ============================
let currentTab = 'products';
let products = [];
let cloudTariffs = [];
let itsTariffs = [];
let portalServices = [];

let editingId = null;
let editingType = null;

// ============================
//  АУТЕНТИФИКАЦИЯ
// ============================
async function checkAuth() {
    try {
        const response = await fetch('/api/admin/check', {
            credentials: 'include'
        });
        const data = await response.json();
        if (!data.authenticated) {
            window.location.href = '/admin-login.html';
        }
    } catch (error) {
        window.location.href = '/admin-login.html';
    }
}

document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
    });
    window.location.href = '/admin-login.html';
});

// ============================
//  ВКЛАДКИ
// ============================
document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.admin-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentTab = this.dataset.tab;
        document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${currentTab}`).classList.add('active');
        loadCurrentTab();
    });
});

// ============================
//  ЗАГРУЗКА ДАННЫХ
// ============================
async function loadCurrentTab() {
    switch(currentTab) {
        case 'products': await loadProducts(); break;
        case 'cloud': await loadCloudTariffs(); break;
        case 'its': await loadItsTariffs(); break;
        case 'portal': await loadPortalServices(); break;
    }
}

async function loadProducts() {
    const response = await fetch('/api/admin/products', { credentials: 'include' });
    products = await response.json();
    renderProductsTable();
    updateStats();
}

async function loadCloudTariffs() {
    const response = await fetch('/api/admin/cloud-tariffs', { credentials: 'include' });
    cloudTariffs = await response.json();
    renderCloudTable();
    updateStats();
}

async function loadItsTariffs() {
    const response = await fetch('/api/admin/its-tariffs', { credentials: 'include' });
    itsTariffs = await response.json();
    renderItsTable();
    updateStats();
}

async function loadPortalServices() {
    const response = await fetch('/api/admin/portal-services', { credentials: 'include' });
    portalServices = await response.json();
    renderPortalTable();
    updateStats();
}

// ============================
//  СТАТИСТИКА
// ============================
function updateStats() {
    document.getElementById('total-products').textContent = products.length;
    document.getElementById('total-cloud').textContent = cloudTariffs.length;
    document.getElementById('total-its').textContent = itsTariffs.length;
    document.getElementById('total-portal').textContent = portalServices.length;
}

// ============================
//  ОТРИСОВКА ТАБЛИЦ
// ============================
function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">Нет продуктов</td></tr>';
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.category_name || '—'}</td>
            <td>${Number(p.price).toLocaleString('ru-RU')} ₽</td>
            <td>${p.unit || '—'}</td>
            <td><span class="status-badge ${p.is_active ? 'active' : 'inactive'}">${p.is_active ? 'Активен' : 'Неактивен'}</span></td>
            <td class="actions">
                <button class="edit-btn" data-type="products" data-id="${p.id}">✏️</button>
                <button class="delete-btn" data-type="products" data-id="${p.id}">🗑️</button>
            </td>
        </tr>
    `).join('');
    attachActionListeners();
}

function renderCloudTable() {
    const tbody = document.getElementById('cloud-table-body');
    if (!cloudTariffs.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">Нет облачных тарифов</td></tr>';
        return;
    }
    tbody.innerHTML = cloudTariffs.map(t => `
        <tr>
            <td>${t.id}</td>
            <td>${t.name}</td>
            <td>${Number(t.price_per_rm).toLocaleString('ru-RU')}</td>
            <td>${t.min_rm}</td>
            <td>${t.apps || '—'}</td>
            <td><span class="status-badge ${t.is_active ? 'active' : 'inactive'}">${t.is_active ? 'Активен' : 'Неактивен'}</span></td>
            <td class="actions">
                <button class="edit-btn" data-type="cloud" data-id="${t.id}">✏️</button>
                <button class="delete-btn" data-type="cloud" data-id="${t.id}">🗑️</button>
            </td>
        </tr>
    `).join('');
    attachActionListeners();
}

function renderItsTable() {
    const tbody = document.getElementById('its-table-body');
    if (!itsTariffs.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;">Нет тарифов ИТС</td></tr>';
        return;
    }
    tbody.innerHTML = itsTariffs.map(t => `
        <tr>
            <td>${t.id}</td>
            <td>${t.name}</td>
            <td>${t.type === 'professional' ? 'Профессиональный' : 'Технологический'}</td>
            <td>${t.period_months}</td>
            <td>${Number(t.recommended_price).toLocaleString('ru-RU')}</td>
            <td>${t.discount_price ? Number(t.discount_price).toLocaleString('ru-RU') : '—'}</td>
            <td><span class="status-badge ${t.is_active ? 'active' : 'inactive'}">${t.is_active ? 'Активен' : 'Неактивен'}</span></td>
            <td class="actions">
                <button class="edit-btn" data-type="its" data-id="${t.id}">✏️</button>
                <button class="delete-btn" data-type="its" data-id="${t.id}">🗑️</button>
            </td>
        </tr>
    `).join('');
    attachActionListeners();
}

function renderPortalTable() {
    const tbody = document.getElementById('portal-table-body');
    if (!portalServices.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">Нет сервисов портала</td></tr>';
        return;
    }
    tbody.innerHTML = portalServices.map(s => `
        <tr>
            <td>${s.id}</td>
            <td>${s.name}</td>
            <td>${s.description || '—'}</td>
            <td>${Number(s.price).toLocaleString('ru-RU')} ₽</td>
            <td>${s.unit || 'год'}</td>
            <td><span class="status-badge ${s.is_active ? 'active' : 'inactive'}">${s.is_active ? 'Активен' : 'Неактивен'}</span></td>
            <td class="actions">
                <button class="edit-btn" data-type="portal" data-id="${s.id}">✏️</button>
                <button class="delete-btn" data-type="portal" data-id="${s.id}">🗑️</button>
            </td>
        </tr>
    `).join('');
    attachActionListeners();
}

// ============================
//  ОБРАБОТЧИКИ КНОПОК (EDIT/DELETE)
// ============================
function attachActionListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            const id = parseInt(this.dataset.id);
            openEditModal(type, id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            const id = parseInt(this.dataset.id);
            deleteItem(type, id);
        });
    });
}

// ============================
//  МОДАЛЬНОЕ ОКНО
// ============================
const modal = document.getElementById('admin-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalSave = document.getElementById('modal-save');
const modalCancel = document.getElementById('modal-cancel');

function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    editingId = null;
    editingType = null;
}

modalCancel.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// ============================
//  ОТКРЫТИЕ МОДАЛКИ ДЛЯ ДОБАВЛЕНИЯ
// ============================
document.getElementById('add-product-btn')?.addEventListener('click', () => openAddModal('products'));
document.getElementById('add-cloud-btn')?.addEventListener('click', () => openAddModal('cloud'));
document.getElementById('add-its-btn')?.addEventListener('click', () => openAddModal('its'));
document.getElementById('add-portal-btn')?.addEventListener('click', () => openAddModal('portal'));

function openAddModal(type) {
    editingType = type;
    editingId = null;
    switch(type) {
        case 'products': openModal('Добавить продукт', getProductForm(null)); break;
        case 'cloud': openModal('Добавить облачный тариф', getCloudForm(null)); break;
        case 'its': openModal('Добавить тариф ИТС', getItsForm(null)); break;
        case 'portal': openModal('Добавить сервис портала', getPortalForm(null)); break;
    }
}

function openEditModal(type, id) {
    editingType = type;
    editingId = id;
    switch(type) {
        case 'products': {
            const item = products.find(p => p.id === id);
            if (item) openModal('Редактировать продукт', getProductForm(item));
            break;
        }
        case 'cloud': {
            const item = cloudTariffs.find(t => t.id === id);
            if (item) openModal('Редактировать облачный тариф', getCloudForm(item));
            break;
        }
        case 'its': {
            const item = itsTariffs.find(t => t.id === id);
            if (item) openModal('Редактировать тариф ИТС', getItsForm(item));
            break;
        }
        case 'portal': {
            const item = portalServices.find(s => s.id === id);
            if (item) openModal('Редактировать сервис портала', getPortalForm(item));
            break;
        }
    }
}

// ============================
//  ФОРМЫ ДЛЯ МОДАЛКИ
// ============================
function getProductForm(data) {
    return `
        <select id="f-category">
            <option value="">Выберите категорию</option>
            <option value="1" ${data?.category_id === 1 ? 'selected' : ''}>Программные продукты 1С</option>
            <option value="2" ${data?.category_id === 2 ? 'selected' : ''}>Лицензии 1С</option>
        </select>
        <input type="text" id="f-name" placeholder="Название" value="${data?.name || ''}" />
        <textarea id="f-desc" placeholder="Описание" rows="2">${data?.description || ''}</textarea>
        <input type="number" id="f-price" placeholder="Цена" step="0.01" value="${data?.price || ''}" />
        <input type="text" id="f-unit" placeholder="Единица измерения" value="${data?.unit || 'шт'}" />
        <div class="checkbox-row">
            <input type="checkbox" id="f-active" ${data?.is_active !== false ? 'checked' : ''} />
            <label for="f-active">Активен</label>
        </div>
    `;
}

function getCloudForm(data) {
    return `
        <input type="text" id="f-name" placeholder="Название тарифа" value="${data?.name || ''}" />
        <input type="number" id="f-price" placeholder="Цена за РМ в месяц" step="0.01" value="${data?.price_per_rm || ''}" />
        <input type="number" id="f-min-rm" placeholder="Минимальное количество РМ" value="${data?.min_rm || 1}" />
        <textarea id="f-apps" placeholder="Доступные приложения" rows="2">${data?.apps || ''}</textarea>
        <div class="checkbox-row">
            <input type="checkbox" id="f-active" ${data?.is_active !== false ? 'checked' : ''} />
            <label for="f-active">Активен</label>
        </div>
    `;
}

function getItsForm(data) {
    return `
        <input type="text" id="f-name" placeholder="Название тарифа" value="${data?.name || ''}" />
        <select id="f-type">
            <option value="professional" ${data?.type === 'professional' ? 'selected' : ''}>Профессиональный</option>
            <option value="technological" ${data?.type === 'technological' ? 'selected' : ''}>Технологический</option>
        </select>
        <input type="number" id="f-period" placeholder="Период (месяцы)" value="${data?.period_months || 1}" />
        <input type="number" id="f-price" placeholder="Рекомендованная цена" step="0.01" value="${data?.recommended_price || ''}" />
        <input type="number" id="f-discount" placeholder="Льготная цена (опционально)" step="0.01" value="${data?.discount_price || ''}" />
        <div class="checkbox-row">
            <input type="checkbox" id="f-active" ${data?.is_active !== false ? 'checked' : ''} />
            <label for="f-active">Активен</label>
        </div>
    `;
}

function getPortalForm(data) {
    return `
        <input type="text" id="f-name" placeholder="Название сервиса" value="${data?.name || ''}" />
        <textarea id="f-desc" placeholder="Описание" rows="2">${data?.description || ''}</textarea>
        <input type="number" id="f-price" placeholder="Цена" step="0.01" value="${data?.price || ''}" />
        <input type="text" id="f-unit" placeholder="Единица измерения" value="${data?.unit || 'год'}" />
        <div class="checkbox-row">
            <input type="checkbox" id="f-active" ${data?.is_active !== false ? 'checked' : ''} />
            <label for="f-active">Активен</label>
        </div>
    `;
}

// ============================
//  СОХРАНЕНИЕ (SAVE)
// ============================
modalSave.addEventListener('click', async function() {
    const type = editingType;
    const id = editingId;
    let data = {};
    let url = '';
    let method = 'POST';

    switch(type) {
        case 'products': {
            data = {
                category_id: parseInt(document.getElementById('f-category').value),
                name: document.getElementById('f-name').value.trim(),
                description: document.getElementById('f-desc').value.trim(),
                price: parseFloat(document.getElementById('f-price').value) || 0,
                unit: document.getElementById('f-unit').value.trim(),
                is_active: document.getElementById('f-active').checked
            };
            if (!data.name || !data.category_id) { alert('Заполните название и категорию'); return; }
            url = id ? `/api/admin/products/${id}` : '/api/admin/products';
            method = id ? 'PUT' : 'POST';
            break;
        }
        case 'cloud': {
            data = {
                name: document.getElementById('f-name').value.trim(),
                price_per_rm: parseFloat(document.getElementById('f-price').value) || 0,
                min_rm: parseInt(document.getElementById('f-min-rm').value) || 1,
                apps: document.getElementById('f-apps').value.trim(),
                is_active: document.getElementById('f-active').checked
            };
            if (!data.name) { alert('Заполните название'); return; }
            url = id ? `/api/admin/cloud-tariffs/${id}` : '/api/admin/cloud-tariffs';
            method = id ? 'PUT' : 'POST';
            break;
        }
        case 'its': {
            data = {
                name: document.getElementById('f-name').value.trim(),
                type: document.getElementById('f-type').value,
                period_months: parseInt(document.getElementById('f-period').value) || 1,
                recommended_price: parseFloat(document.getElementById('f-price').value) || 0,
                discount_price: parseFloat(document.getElementById('f-discount').value) || null,
                is_active: document.getElementById('f-active').checked
            };
            if (!data.name) { alert('Заполните название'); return; }
            url = id ? `/api/admin/its-tariffs/${id}` : '/api/admin/its-tariffs';
            method = id ? 'PUT' : 'POST';
            break;
        }
        case 'portal': {
            data = {
                name: document.getElementById('f-name').value.trim(),
                description: document.getElementById('f-desc').value.trim(),
                price: parseFloat(document.getElementById('f-price').value) || 0,
                unit: document.getElementById('f-unit').value.trim(),
                is_active: document.getElementById('f-active').checked
            };
            if (!data.name) { alert('Заполните название'); return; }
            url = id ? `/api/admin/portal-services/${id}` : '/api/admin/portal-services';
            method = id ? 'PUT' : 'POST';
            break;
        }
    }

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            closeModal();
            loadCurrentTab();
        } else {
            alert('Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        alert('Ошибка подключения к серверу');
    }
});

// ============================
//  УДАЛЕНИЕ (DELETE)
// ============================
async function deleteItem(type, id) {
    if (!confirm('Удалить эту запись?')) return;

    let url = '';
    switch(type) {
        case 'products': url = `/api/admin/products/${id}`; break;
        case 'cloud': url = `/api/admin/cloud-tariffs/${id}`; break;
        case 'its': url = `/api/admin/its-tariffs/${id}`; break;
        case 'portal': url = `/api/admin/portal-services/${id}`; break;
    }

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            loadCurrentTab();
        } else {
            alert('Ошибка: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        alert('Ошибка подключения к серверу');
    }
}

// ============================
//  ИНИЦИАЛИЗАЦИЯ
// ============================
async function init() {
    await checkAuth();
    await loadCurrentTab();
}

if (document.getElementById('products-table-body')) {
    init();
}