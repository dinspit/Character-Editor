# Character Editor

Генератор команды `cc` для плагина CreateCharacter в SCP: Secret Laboratory.

Сайт: https://dinspit.github.io/Character-Editor/

Собирает строку вида:

```text
cc <цели> <роль>;<кастом-инфо>;<ник>;<hp>;<предметы>;<патроны>;<маска>
```

Имена ролей и предметов те же, что в игре (`RoleTypeId`, `ItemType`). Не выдумывай свои.

## Локально

Это обычная статическая папка. Открывать `index.html` с диска плохо: браузер часто не отдаёт `templates/*.json`. Из корня проекта:

```text
python -m http.server
```

## Шаблоны

Серверные лежат в `templates/server.json`. Сайт их только читает.

Свои живут во вкладке «Мои», в браузере. Есть экспорт и импорт JSON.

Кастомные предметы Exiled/CAPI: `templates/custom-items.json`.

## Картинки

PNG с тем же именем, что id в игре. `GunCOM15.png`, `ClassD.png`, `Nato9.png`.

- `assets/roles/model/` — модель слева
- `assets/roles/art/` — плитка в списке ролей
- `assets/items/` — иконка предмета
- `assets/ammo/` — патроны

NTF и Chaos делят модели (`NTF.png`, `Chaos.png` плюс варианты брони). Class D, учёный, охрана и туториал имеют свои четыре файла: без брони, лёгкая, боевая, тяжёлая.

Подробности: `assets/README.md`.
