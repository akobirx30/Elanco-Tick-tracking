# TickWatch UK

## Запуск
Откройте папку в VS Code → правой кнопкой по `index.html` → **Open with Live Server**. (Нужен интернет для карты.)

## Данные (3 уровня, всё автоматически)
1. Живой Elanco API (`js/config.js` → `ELANCO_API`). Код: `js/api.js` → `fetchElanco()`.
2. Если браузер не может его достать (CORS) — сохранённая копия `data/tick-sightings.json`.
3. Если и копии нет — демо-данные (`js/seed.js`), сайт всё равно работает.

### Как положить копию реальных данных
Откройте https://dev-task.elancoapps.com/tick-sightings в браузере → выделите всё (Ctrl+A) → скопируйте (Ctrl+C)
→ вставьте в файл `data/tick-sightings.json` (замените `[]`) → сохраните → обновите сайт (Ctrl+F5).

## Отчёты пользователей
Сохраняются в браузере (localStorage). Если появится свой бэкенд — укажите `API_BASE_URL` в `js/config.js`
(`GET/POST {URL}/api/sightings`).
