require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://localhost:8082',
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// СЕССИИ (для авторизации)
app.use(session({
    secret: 'secret-key-for-calculator',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
}));

// ПОДКЛЮЧЕНИЕ К БД
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '2441',
    database: process.env.DB_NAME || 'calculator',
});

pool.connect((err) => {
    if (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
        return;
    }
    console.log('✅ Подключено к PostgreSQL');
});

// АУТЕНТИФИКАЦИЯ

// Проверка, авторизован ли пользователь
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Не авторизован' });
    }
}

// Вход в систему
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Ищем пользователя
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        const user = result.rows[0];
        
        // Проверяем пароль (для демо: admin/admin123)
        const isValid = (password === 'admin123' && username === 'admin');
        
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        // Сохраняем сессию
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        
        res.json({ success: true, user: req.session.user });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Выход из системы
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Проверка сессии
app.get('/api/admin/check', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// АДМИН-API (CRUD для продуктов)

// Получить все продукты (с категориями)
app.get('/api/admin/products', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT s.*, c.name as category_name FROM services s JOIN categories c ON s.category_id = c.id ORDER BY c.name, s.name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения продуктов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить все категории
app.get('/api/admin/categories', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM categories ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения категорий:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить продукт
app.post('/api/admin/products', isAuthenticated, async (req, res) => {
    try {
        const { category_id, name, description, price, unit } = req.body;
        
        const result = await pool.query(
            `INSERT INTO services (category_id, name, description, price, unit, is_active)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING *`,
            [category_id, name, description, price, unit]
        );
        
        res.json({ success: true, product: result.rows[0] });
    } catch (error) {
        console.error('Ошибка добавления продукта:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Редактировать продукт
app.put('/api/admin/products/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { category_id, name, description, price, unit, is_active } = req.body;
        
        const result = await pool.query(
            `UPDATE services 
             SET category_id = $1, name = $2, description = $3, price = $4, unit = $5, is_active = $6
             WHERE id = $7
             RETURNING *`,
            [category_id, name, description, price, unit, is_active, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Продукт не найден' });
        }
        
        res.json({ success: true, product: result.rows[0] });
    } catch (error) {
        console.error('Ошибка редактирования продукта:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить продукт
app.delete('/api/admin/products/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM services WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Продукт не найден' });
        }
        
        res.json({ success: true, product: result.rows[0] });
    } catch (error) {
        console.error('Ошибка удаления продукта:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API ДЛЯ КАЛЬКУЛЯТОРА 

app.get('/api/categories', async (req, res) => {
    try {
        const categoriesResult = await pool.query(
            'SELECT * FROM categories WHERE is_active = true ORDER BY display_order'
        );
        const categories = categoriesResult.rows;

        for (let category of categories) {
            const servicesResult = await pool.query(
                'SELECT * FROM services WHERE category_id = $1 AND is_active = true',
                [category.id]
            );
            category.services = servicesResult.rows;
        }

        res.json(categories);
    } catch (error) {
        console.error('Ошибка получения категорий:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/cloud-tariffs', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM cloud_tariffs WHERE is_active = true ORDER BY price_per_rm'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения тарифов Фреш:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/its-tariffs', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM its_tariffs WHERE is_active = true ORDER BY name, period_months'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения тарифов ИТС:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/portal-services', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM portal_services WHERE is_active = true ORDER BY price'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения сервисов портала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// РАСЧЁТ
app.post('/api/calculate', async (req, res) => {
    try {
        const {
            serviceIds,
            licenses,
            implementationMap,
            implementationDetails,
            cloudTariffId,
            cloudRmCount,
            itsTariffId,
            itsDiscount,
            portalServiceIds
        } = req.body;

        let breakdown = [];
        let totalSum = 0;

        if (serviceIds && serviceIds.length > 0) {
            const placeholders = serviceIds.map((_, i) => `$${i + 1}`).join(',');
            const query = `SELECT id, name, description, price, unit FROM services WHERE id IN (${placeholders}) AND is_active = true`;
            const result = await pool.query(query, serviceIds);

            for (let service of result.rows) {
                let quantity = 1;
                if (licenses && licenses[service.id]) {
                    quantity = parseInt(licenses[service.id]) || 1;
                }
                const totalPrice = parseFloat(service.price) * quantity;
                totalSum += totalPrice;
                breakdown.push({
                    name: service.name,
                    price: parseFloat(service.price),
                    quantity: quantity,
                    unit: service.unit || 'шт',
                    total: totalPrice,
                    type: 'product'
                });

                if (implementationMap && implementationMap[service.id]) {
                    const details = implementationDetails ? implementationDetails[service.id] : null;
                    const rate = details?.rate || 3500;
                    const hours = details?.hours || 40;
                    const implTotal = hours * rate * quantity;
                    totalSum += implTotal;
                    breakdown.push({
                        name: `Внедрение "${service.name}" (${hours} ч × ${rate.toLocaleString('ru-RU')} ₽/ч × ${quantity})`,
                        price: rate,
                        quantity: hours * quantity,
                        unit: 'час',
                        total: implTotal,
                        type: 'implementation'
                    });
                }
            }
        }

        if (cloudTariffId && cloudRmCount && cloudRmCount > 0) {
            const result = await pool.query(
                'SELECT * FROM cloud_tariffs WHERE id = $1 AND is_active = true',
                [cloudTariffId]
            );
            if (result.rows.length > 0) {
                const tariff = result.rows[0];
                const rmCount = Math.max(cloudRmCount, tariff.min_rm);
                const yearlyTotal = parseFloat(tariff.price_per_rm) * rmCount * 12;
                totalSum += yearlyTotal;
                breakdown.push({
                    name: `Облачный тариф "${tariff.name}" (${rmCount} РМ × ${parseFloat(tariff.price_per_rm).toLocaleString('ru-RU')} ₽/мес × 12 мес.)`,
                    price: parseFloat(tariff.price_per_rm),
                    quantity: rmCount * 12,
                    unit: 'РМ/мес',
                    total: yearlyTotal,
                    type: 'cloud'
                });
            }
        }

        if (itsTariffId) {
            const result = await pool.query(
                'SELECT * FROM its_tariffs WHERE id = $1 AND is_active = true',
                [itsTariffId]
            );
            if (result.rows.length > 0) {
                const tariff = result.rows[0];
                const price = itsDiscount && tariff.discount_price ? parseFloat(tariff.discount_price) : parseFloat(tariff.recommended_price);
                totalSum += price;
                breakdown.push({
                    name: `${tariff.name} (${tariff.period_months} мес.)${itsDiscount && tariff.discount_price ? ' — льготная цена' : ''}`,
                    price: price,
                    quantity: 1,
                    unit: 'пакет',
                    total: price,
                    type: 'its'
                });
            }
        }

        if (portalServiceIds && portalServiceIds.length > 0) {
            const placeholders = portalServiceIds.map((_, i) => `$${i + 1}`).join(',');
            const query = `SELECT id, name, description, price, unit FROM portal_services WHERE id IN (${placeholders}) AND is_active = true`;
            const result = await pool.query(query, portalServiceIds);

            for (let service of result.rows) {
                const price = parseFloat(service.price) || 0;
                totalSum += price;
                breakdown.push({
                    name: service.name,
                    price: price,
                    quantity: 1,
                    unit: service.unit || 'год',
                    total: price,
                    type: 'portal'
                });
            }
        }

        res.json({
            success: true,
            totalSum: totalSum,
            breakdown: breakdown,
            message: 'Расчёт выполнен успешно'
        });

    } catch (error) {
        console.error('Ошибка расчёта:', error);
        res.status(500).json({ error: 'Ошибка расчёта стоимости' });
    }
});

// СОХРАНЕНИЕ В БД
app.post('/api/proposals', async (req, res) => {
    try {
        const { clientName, clientPhone, clientEmail, selectedData, totalSum } = req.body;

        console.log('📥 Получен запрос на сохранение:', { clientName, clientPhone, clientEmail, totalSum });

        const result = await pool.query(
            `INSERT INTO proposals (client_name, client_phone, client_email, selected_data, total_sum)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [clientName || '', clientPhone || '', clientEmail || '', JSON.stringify(selectedData), totalSum]
        );

        console.log('✅ Сохранено в БД, ID:', result.rows[0].id);

        res.json({
            success: true,
            proposalId: result.rows[0].id,
            message: 'Предложение сохранено'
        });
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        res.status(500).json({ error: 'Ошибка сохранения: ' + error.message });
    }
});

// ГЕНЕРАЦИЯ HTML
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { clientName, clientPhone, clientEmail, breakdown, totalSum } = req.body;

        let rowsHtml = '';
        for (let item of breakdown) {
            const price = Number(item.price).toLocaleString('ru-RU');
            const total = Number(item.total).toLocaleString('ru-RU');
            rowsHtml += `
                <tr>
                    <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${item.name}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:center;">${item.quantity} ${item.unit || ''}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;">${price} ₽</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;">${total} ₽</td>
                </tr>
            `;
        }

        const totalFormatted = Number(totalSum).toLocaleString('ru-RU');

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Коммерческое предложение</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { color: #D34646; font-size: 24px; font-weight: bold; }
        .subheader { color: #666; font-size: 12px; }
        .doc-title { font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; }
        .date { text-align: right; font-size: 12px; color: #666; }
        .section-title { font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; }
        .client-data { font-size: 14px; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #F2BA02; color: #000; padding: 10px; text-align: left; }
        td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
        .total-row td { font-weight: bold; font-size: 16px; color: #D34646; border-top: 2px solid #D34646; }
        .footer { text-align: center; margin-top: 40px; font-size: 14px; }
        .print-btn { 
            display: block; 
            margin: 20px auto; 
            padding: 12px 30px; 
            background: #F2BA02; 
            color: #000; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            font-weight: bold; 
            cursor: pointer; 
        }
        .print-btn:hover { background: #dba802; }
        @media print { .print-btn { display: none; } }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Распечатать</button>
    
    <div class="header">Лаборатория С</div>
    <div class="subheader">г. Иркутск, ул. Горького, 36Б, 6 эт., оф. 1-14</div>
    <div class="subheader">www.940000.ru</div>

    <div class="doc-title">КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</div>
    <div class="date">Дата: ${new Date().toLocaleDateString('ru-RU')}</div>

    <div class="section-title">Клиент:</div>
    <div class="client-data">Наименование: ${clientName || '__________'}</div>
    <div class="client-data">Телефон: ${clientPhone || '__________'}</div>
    <div class="client-data">Email: ${clientEmail || '__________'}</div>

    <div class="section-title">Детализация стоимости:</div>
    <table>
        <tr>
            <th style="padding:10px;text-align:left;">Наименование</th>
            <th style="padding:10px;text-align:center;">Кол-во</th>
            <th style="padding:10px;text-align:right;">Цена</th>
            <th style="padding:10px;text-align:right;">Сумма</th>
        </tr>
        ${rowsHtml}
        <tr class="total-row">
            <td colspan="3" style="padding:10px;text-align:right;">ИТОГО:</td>
            <td style="padding:10px;text-align:right;">${totalFormatted} ₽</td>
        </tr>
    </table>

    <div class="footer">С уважением, команда Лаборатория С</div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="kommercheskoe_predlozhenie.html"');
        res.send(html);

    } catch (error) {
        console.error('❌ Ошибка генерации:', error);
        res.status(500).json({ error: 'Ошибка генерации: ' + error.message });
    }
});

// ============================
//  АДМИН-API: ОБЛАЧНЫЕ ТАРИФЫ
// ============================
app.get('/api/admin/cloud-tariffs', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cloud_tariffs ORDER BY price_per_rm');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения облачных тарифов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/cloud-tariffs', isAuthenticated, async (req, res) => {
    try {
        const { name, price_per_rm, min_rm, apps, is_active } = req.body;
        const result = await pool.query(
            `INSERT INTO cloud_tariffs (name, price_per_rm, min_rm, apps, is_active)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, price_per_rm, min_rm, apps, is_active]
        );
        res.json({ success: true, tariff: result.rows[0] });
    } catch (error) {
        console.error('Ошибка добавления облачного тарифа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/cloud-tariffs/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price_per_rm, min_rm, apps, is_active } = req.body;
        const result = await pool.query(
            `UPDATE cloud_tariffs 
             SET name = $1, price_per_rm = $2, min_rm = $3, apps = $4, is_active = $5
             WHERE id = $6 RETURNING *`,
            [name, price_per_rm, min_rm, apps, is_active, id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Тариф не найден' });
        res.json({ success: true, tariff: result.rows[0] });
    } catch (error) {
        console.error('Ошибка редактирования облачного тарифа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/cloud-tariffs/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM cloud_tariffs WHERE id = $1 RETURNING *', [id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Тариф не найден' });
        res.json({ success: true, tariff: result.rows[0] });
    } catch (error) {
        console.error('Ошибка удаления облачного тарифа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================
//  АДМИН-API: ТАРИФЫ ИТС
// ============================
app.get('/api/admin/its-tariffs', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM its_tariffs ORDER BY name, period_months');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения тарифов ИТС:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/its-tariffs', isAuthenticated, async (req, res) => {
    try {
        const { name, type, period_months, recommended_price, discount_price, is_active } = req.body;
        const result = await pool.query(
            `INSERT INTO its_tariffs (name, type, period_months, recommended_price, discount_price, is_active)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, type, period_months, recommended_price, discount_price, is_active]
        );
        res.json({ success: true, tariff: result.rows[0] });
    } catch (error) {
        console.error('Ошибка добавления тарифа ИТС:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/its-tariffs/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, period_months, recommended_price, discount_price, is_active } = req.body;
        const result = await pool.query(
            `UPDATE its_tariffs 
             SET name = $1, type = $2, period_months = $3, recommended_price = $4, discount_price = $5, is_active = $6
             WHERE id = $7 RETURNING *`,
            [name, type, period_months, recommended_price, discount_price, is_active, id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Тариф не найден' });
        res.json({ success: true, tariff: result.rows[0] });
    } catch (error) {
        console.error('Ошибка редактирования тарифа ИТС:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/its-tariffs/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM its_tariffs WHERE id = $1 RETURNING *', [id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Тариф не найден' });
        res.json({ success: true, tariff: result.rows[0] });
    } catch (error) {
        console.error('Ошибка удаления тарифа ИТС:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================
//  АДМИН-API: СЕРВИСЫ ПОРТАЛА
// ============================
app.get('/api/admin/portal-services', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM portal_services ORDER BY price');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения сервисов портала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/portal-services', isAuthenticated, async (req, res) => {
    try {
        const { name, description, price, unit, is_active } = req.body;
        const result = await pool.query(
            `INSERT INTO portal_services (name, description, price, unit, is_active)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, description, price, unit, is_active]
        );
        res.json({ success: true, service: result.rows[0] });
    } catch (error) {
        console.error('Ошибка добавления сервиса портала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/portal-services/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, unit, is_active } = req.body;
        const result = await pool.query(
            `UPDATE portal_services 
             SET name = $1, description = $2, price = $3, unit = $4, is_active = $5
             WHERE id = $6 RETURNING *`,
            [name, description, price, unit, is_active, id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Сервис не найден' });
        res.json({ success: true, service: result.rows[0] });
    } catch (error) {
        console.error('Ошибка редактирования сервиса портала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/portal-services/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM portal_services WHERE id = $1 RETURNING *', [id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Сервис не найден' });
        res.json({ success: true, service: result.rows[0] });
    } catch (error) {
        console.error('Ошибка удаления сервиса портала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});