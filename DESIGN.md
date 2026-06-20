# URL Backup — Design System

Inspired by the **Supabase** design system. Light-mode, card-based layout with a vibrant emerald green primary accent.

---

## Color Palette

### Brand & Accent
| Token | Hex | Usage |
|---|---|---|
| Emerald | `#3ecf8e` | Primary CTA, active states, logo background, search focus ring |
| Emerald Deep | `#24b47e` | Button hover, Drive badge text |
| Emerald Soft | `rgba(62,207,142,0.15)` | Selected row background, empty state icon bg |
| Emerald Focus Ring | `rgba(62,207,142,0.15)` | Input focus box-shadow |

### Window Accent Colors (cycled per window group)
| Class | Background | Text |
|---|---|---|
| `c0` | `rgba(62,207,142,0.15)` | `#24b47e` — Green |
| `c1` | `rgba(107,1,194,0.12)` | `#6b01c2` — Purple |
| `c2` | `rgba(255,219,19,0.2)` | `#b38a00` — Yellow |
| `c3` | `rgba(5,76,255,0.1)` | `#054cff` — Blue |
| `c4` | `rgba(226,0,90,0.1)` | `#c7007e` — Pink |

### Surfaces
| Token | Hex | Usage |
|---|---|---|
| Canvas | `#fafafa` | Page background |
| Surface | `#ffffff` | Cards, nav, toolbar, tab list |
| Surface Hover | `#fafafa` | Row/header hover state |
| Surface Selected | `#f0fdf8` | Selected row background |
| Surface Selected Hover | `#e6faf3` | Selected row hover |
| Selection Bar | `#fffbeb` | Multi-select action bar background |

### Text
| Token | Hex | Usage |
|---|---|---|
| Ink | `#171717` | Primary headings, labels |
| Ink Secondary | `#212121` | URL text in rows |
| Ink Muted | `#707070` | Secondary labels, tab counts |
| Ink Subtle | `#9a9a9a` | Meta text, descriptions, placeholders |
| Ink Faint | `#b2b2b2` | Timestamps, chevrons, delete icon |
| Ink Disabled | `#9a9a9a` | Disabled button text |

### Borders
| Token | Hex | Usage |
|---|---|---|
| Hairline | `#dfdfdf` | Card borders, toolbar borders, input borders |
| Hairline Soft | `#ededed` | Row dividers, inner section borders |
| Hairline Strong | `#c7c7c7` | Outline button border |

### Semantic
| Token | Hex | Usage |
|---|---|---|
| Danger BG | `#fff0f0` | Delete button background |
| Danger Text | `#e53e3e` | Delete button text |
| Danger Border | `#fca5a5` | Delete button border |
| Warning BG | `#fffbeb` | Selection bar background |
| Warning Text | `#92400e` | Selection count text |
| Warning Border | `#fde68a` | Selection bar border |
| Success | `#3ecf8e` | Save status, toast success icon |
| Error | `#ff2201` | Toast error icon |

---

## Typography

**Font family**: `Inter`, `system-ui`, `sans-serif`

| Element | Size | Weight | Color |
|---|---|---|---|
| Nav title | 15px | 600 | `#171717` |
| Nav tab | 13px | 500 | `#707070` / `#171717` active |
| Window label | 14px | 500 | `#171717` |
| Window count badge | 12px | 500 | `#707070` |
| Settings section title | 13px | 500 | `#9a9a9a` (uppercase) |
| Settings row label | 14px | 500 | `#171717` |
| Settings row desc | 13px | 400 | `#9a9a9a` |
| Tab URL link | 13px | 400 | `#212121` |
| Tab title | 12px | 400 | `#9a9a9a` |
| Tab timestamp | 11px | 400 | `#b2b2b2` |
| Tab number badge | 11px | 500 | `#9a9a9a` |
| Button | 14px | 500 | varies |
| Toolbar meta | 13px | 400 | `#9a9a9a` |
| Search input | 14px | 400 | `#171717` |
| Toast | 13px | 400 | `#ffffff` |

---

## Spacing

Base unit: `8px`

| Token | Value | Usage |
|---|---|---|
| xs | 4px | Gap between tight inline elements |
| sm | 8px | Button internal gaps, small margins |
| md | 12px | Window header padding (vertical), grid gaps |
| lg | 16px | Toolbar padding (vertical), row padding |
| xl | 20px | Row padding (horizontal), card body padding |
| 2xl | 24px | Records body padding (vertical), settings padding |
| 3xl | 32px | Records body/toolbar padding (horizontal), settings body |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| xs | `4px` | Tab number badge, favicon |
| sm | `6px` | Buttons, inputs, option pills, open-all button |
| md | `8px` | Toast, delete row button, logo |
| lg | `12px` | Window group cards, settings card |
| full | `9999px` | Nav tab switcher, window count badge, drive badge |

---

## Components

### Navigation Bar
- Height: `60px`
- Background: `#ffffff`
- Border-bottom: `1px solid #dfdfdf`
- Sticky, `z-index: 10`
- Contains: logo (28×28px green rounded square), title, pill tab switcher, Export button

### Pill Tab Switcher
- Container: `background #f5f5f5`, `padding 3px`, `border-radius 9999px`
- Inactive tab: `color #707070`, transparent background
- Active tab: `background #ffffff`, `color #171717`, `box-shadow 0 1px 3px rgba(0,0,0,0.08)`

### Window Group Card
- `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`
- Header: `background #ffffff`, `border 1px solid #dfdfdf`, `padding 11px 20px`
- Tab list: `background #ffffff`, `border 1px solid #dfdfdf` (no top border)
- Collapsed: header gets full `border-radius 12px`

### Tab Row
- Grid: `20px 20px 16px 1fr 180px 100px 32px` (checkbox, number, favicon, url, title, time, delete)
- Gap: `14px`, Padding: `10px 20px`
- Hover: `background #fafafa`
- Selected: `background #f0fdf8`

### Buttons

**Primary (green)**
```css
background: #3ecf8e; color: #171717;
height: 36px; padding: 0 16px; border-radius: 6px;
```

**Outline**
```css
background: #ffffff; color: #171717; border: 1px solid #c7c7c7;
height: 36px; padding: 0 16px; border-radius: 6px;
```

**Danger**
```css
background: #fff0f0; color: #e53e3e; border: 1px solid #fca5a5;
height: 36px; padding: 0 16px; border-radius: 6px;
```

**Open All (window header)**
```css
background: #ffffff; color: #707070; border: 1px solid #dfdfdf;
height: 28px; padding: 0 10px; border-radius: 6px; font-size: 12px;
hover: border-color #3ecf8e; color #059669; background #f0fdf8;
```

**Delete Row (single record)**
```css
background: transparent; color: #b2b2b2;
width: 28px; height: 28px; border-radius: 6px;
hover: background #fff0f0; color #e53e3e;
```

### Search Input
```css
background: #fafafa; border: 1px solid #dfdfdf; border-radius: 6px;
height: 36px; padding: 0 12px 0 32px; width: 300px;
focus: border-color #3ecf8e; box-shadow 0 0 0 3px rgba(62,207,142,0.15); background #fff;
```

### Selection Bar (multi-select active)
```css
background: #fffbeb; border-bottom: 1px solid #fde68a;
padding: 10px 32px;
```

### Settings Card
```css
background: #ffffff; border: 1px solid #dfdfdf; border-radius: 12px;
box-shadow: 0 1px 3px rgba(0,0,0,0.06);
```

### Toast
```css
background: #171717; color: #ffffff; border-radius: 8px;
padding: 12px 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
success prefix: ✓ in #3ecf8e; error prefix: ✕ in #ff2201;
```

### Drive Badge
```css
background: rgba(62,207,142,0.1); border: 1px solid rgba(62,207,142,0.3);
color: #24b47e; border-radius: 9999px; padding: 4px 10px; font-size: 13px;
```

---

## Shadows

| Level | Value | Usage |
|---|---|---|
| Card | `0 1px 3px rgba(0,0,0,0.06)` | Window groups, settings card |
| Nav tab active | `0 1px 3px rgba(0,0,0,0.08)` | Active pill tab |
| Toast | `0 8px 24px rgba(0,0,0,0.2)` | Toast notification |
