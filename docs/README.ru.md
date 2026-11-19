# OrderFlow Market — краткое пояснение

Это самостоятельный вымышленный demo-маркетплейс с ограниченным флоу: каталог → корзина → оформление → статусы. Продавцы, разделение заказа, реальные платежи и физическая доставка не реализованы.

Backend — **NestJS + TypeScript + CQRS + Prisma + PostgreSQL**. Kafka настоящий. Каталог, остатки, заказы, outbox/inbox, задания и аудит сохраняются в БД; резерв списывает реальные demo-остатки атомарно. Sandbox остаётся только у перевозчика. В рабочих сценариях нет in-memory репозиториев.

## Структура и запуск

`main.ts` содержит bootstrap. Контексты находятся в `src/modules`: domain, application, infrastructure и controllers. Интерфейсы портов — в domain; Nest-модули связывают адаптеры через DI. Unit-тесты `*.spec.ts` лежат рядом с проверяемым кодом.

Одна backend-кодовая база и один entry point, три роли:

- `worker` — HTTP API без Kafka consumers;
- `hidden` — outbox, Kafka consumer и обработка заданий;
- `integrations` — постоянное резервирование остатков и sandbox перевозчика.

```sh
# Существующий .env не перезаписывать.
cp .env.example .env
docker compose up -d --build --wait --wait-timeout 240
```

Магазин: http://localhost:3000. Swagger: http://localhost:4000/docs. Оператор: `/operator`, токен `operator-demo-local`. Дежурный: `/operations`, токен `oncall-demo-local`. Grafana: http://localhost:3001/d/orderflow, `admin` / `admin-demo-local`. При изменении `.env` используйте свои значения.

## Демонстрация

1. Найти товар через поиск/категорию, добавить в корзину и оформить заказ с вымышленными данными.
2. Проследить резерв и оформление доставки. Оператором перевести ready → dispatched → completed с причиной.
3. Дежурным выключить Delivery через **Simulate outage**, оформить новый заказ и дождаться DLQ после попыток.
4. Показать ошибку, trace ID, Grafana и firing alert: http://localhost:9090/alerts.
5. Восстановить Delivery и выполнить **Retry task** с причиной. Показать успешную задачу, статус ready и аудит.

## Проверка

```sh
npm ci
npm run check:architecture
npm run typecheck
npm test
bash scripts/test-integration.sh
npx playwright install chromium
npm run test:e2e
npm run allure
```

SQL-тесты создают отдельную БД. E2E добавляют заказы и расходуют demo-остатки. Результаты фактической проверки, известные ограничения и аудит зависимостей — в `VERIFICATION.md`.

Предыдущая история main заменена новой серией локальных коммитов. Резервные копии прежней истории и БД сохранены вне проекта. Данные при переходе на Prisma не сбрасывались. Исходники и материалы demo публикуются в [GitHub](https://github.com/vadimoarturo/order-flow); состояние удалённых проверок доступно в [Actions](https://github.com/vadimoarturo/order-flow/actions). В Upwork материалы не загружались.

Ограничения: общие локальные токены вместо полноценной аутентификации, один Kafka broker, нет HA, отмены/компенсации, реализованного шардирования и production-нагрузочных результатов. Skip переводит заказ в attention, не завершая доставку и не снимая резерв. Trace ID связывает логи; OpenTelemetry spans не реализованы.

Англоязычная презентация: `OrderFlow-Portfolio.pdf`. Все её экраны должны соответствовать проверенной работающей сборке.

Завершение 19 ноября 2026: исправлено восстановление корзины при повреждённых данных браузера, добавлена проверка повторного checkout после потери ответа, устранены замечания npm audit в инструментах сборки. Стек запускается через Compose без сброса существующих данных. Это завершённое портфолио-demo в описанных границах, не production-маркетплейс.

Первый прогон GitHub Actions выявил несовместимость закреплённого Playwright с новым `ubuntu-latest` (Ubuntu 26.04). Для CI явно выбрана Ubuntu 24.04. Исходная локальная история сохранена в ветке `local-development-2026-11-19`; `main` синхронизирована с опубликованным репозиторием.
