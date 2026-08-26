# Картинки превью

| Папка | Где видно | Что класть |
| --- | --- | --- |
| `assets/roles/model/` | предпросмотр слева | 3D-модель |
| `assets/roles/art/` | список выбора роли | арт / рисунок |
| `assets/items/` | слоты ванильных предметов | иконка ItemType |
| `assets/items/custom/exiled.png` | все Exiled-предметы | общий плейсхолдер |
| `assets/items/custom/capi.png` | все CAPI-предметы | общий плейсхолдер |
| `assets/items/custom/exiled/` | конкретный Exiled | например `700.png` |
| `assets/items/custom/capi/` | конкретный CAPI | например `Taser.png` |
| `assets/ammo/` | блок патронов | иконка Nato9 и т.д. |
| `assets/Background.png` | фон страницы | уже используется |

## Модели и броня

NTF и Chaos делят одну модель на все подклассы:

- `NTF.png`, `NTF_LightArmor.png`, `NTF_CombatArmor.png`, `NTF_HeavyArmor.png`
- `Chaos.png`, `Chaos_LightArmor.png`, `Chaos_CombatArmor.png`, `Chaos_HeavyArmor.png`

Отдельно:

- `ClassD.png` / `ClassD_LightArmor.png` / `ClassD_CombatArmor.png` / `ClassD_HeavyArmor.png`
- то же для `Scientist`, `FacilityGuard` и `Tutorial`

PNG важнее SVG. Список кастомных предметов: `templates/custom-items.json`.
