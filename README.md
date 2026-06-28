# calculator2

Калькулятор для расчёта стоимости продуктов и услуг 1С.

---

## Технологии

- Node.js 20
- Express
- PostgreSQL 16
- Docker
- Docker Compose

---

## Структура проекта
calculator2/
├── app.js
├── package.json
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── .env
├── init.sql
├── public/
│ ├── calculator.html
│ ├── admin-login.html
│ ├── admin-dashboard.html
│ ├── script.js
│ ├── admin.js
│ └── style.css
└── server/
└── database/
└── init.sql

text

---

## Запуск

### 1. Клонировать репозиторий
```bash
git clone https://github.com/AYURKA03/calculator2.git
cd calculator2
2. Создать файл .env
env
DB_HOST=host.docker.internal
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=2441
DB_NAME=calculator
PORT=3000
3. Запустить PostgreSQL и создать базу данных
Выполнить скрипт init.sql через pgAdmin.

4. Запустить приложение
bash
docker compose up -d --build
5. Открыть в браузере
text
http://localhost:8082
Админ-панель:

text
http://localhost:8082/admin-login.html
Логин: admin
Пароль: admin123

Что делает
Показывает список продуктов 1С

Считает стоимость с учётом внедрения

Облачные тарифы

Тарифы ИТС

Сервисы портала

Генерирует коммерческое предложение в HTML

Админ-панель для управления всеми разделами

Команда
Зелент Роман — backend, БД, документация

Дондоков Аюр — frontend, дизайн, тестирование

Для чего
Учебный проект по практике.
