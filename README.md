# Blacklist 💀$

> Aplicación móvil para registrar quién te debe dinero, con clasificación de deudas urgentes vs. rutinarias.
> Construida con **Expo SDK 52 + React Native 0.76 + Expo Router v4 + TypeScript**.

---

## Arranque rápido

```bash
# 1. Instala dependencias
npm install

# 2. Inicia el servidor de desarrollo
npm run start

# Luego escanea el QR con la app Expo Go (Android / iOS),
# o pulsa `a` para abrir en emulador Android, `i` para iOS, `w` para web.
```

## Scripts disponibles

| Script              | Acción                                              |
| ------------------- | --------------------------------------------------- |
| `npm run start`     | Inicia Metro bundler con DevTools                   |
| `npm run android`   | Abre en emulador / dispositivo Android              |
| `npm run ios`       | Abre en simulador iOS (solo macOS)                  |
| `npm run web`       | Abre en navegador                                   |
| `npm run typecheck` | Verifica tipos sin emitir output                    |

---

## Arquitectura

```
Blacklist/
├── app.json              # Config Expo (icon, splash, dark UI por defecto)
├── babel.config.js       # Preset Expo + reanimated/plugin
├── metro.config.js       # Alias `@/*` -> `src/*`
├── tsconfig.json         # strict: true, paths configurados
├── assets/
│   └── icon.jpeg         # Ícono de la app
└── src/
    ├── app/              # Rutas de Expo Router (filesystem-based)
    │   ├── _layout.tsx   # Stack root + StatusBar + SafeAreaProvider
    │   └── index.tsx     # Pantalla Home (ruta `/`)
    ├── components/       # Componentes reutilizables y accesibles
    │   ├── ScreenContainer.tsx
    │   └── Title.tsx
    ├── theme/            # Sistema de diseño (colores, spacing, tipografía)
    │   ├── colors.ts
    │   ├── spacing.ts
    │   ├── typography.ts
    │   └── index.ts      # Barrel
    └── types/
        └── debt.ts       # Modelo de dominio: Debt, DebtPriority, NewDebtInput
```

### Decisiones clave

- **Expo Router v4** sobre `src/app/` — convención filesystem-based. Detección automática desde SDK 50.
- **Dark Mode forzado** (`userInterfaceStyle: "dark"` en `app.json`) — coherente con el branding "lista negra".
- **Money en centavos** (`amount: number` en cents) — evita errores de coma flotante.
- **Path alias `@/`** — apunta a `src/`. Habilitado en `tsconfig.json` y `metro.config.js`.
- **Strict TypeScript** — `strict: true`, sin `any` implícito.

---

## Accesibilidad (WCAG 2.1 AA)

Esta app fue diseñada con accesibilidad como requisito **no negociable**:

| Aspecto              | Cómo se cumple                                                                |
| -------------------- | ----------------------------------------------------------------------------- |
| **Contraste**        | Texto principal `#FFFFFF` sobre `#121212` = 18.7:1 (AAA). Secundario 9.7:1.   |
| **Roles semánticos** | `accessibilityRole="header"` en títulos, `summary` en tarjetas resumen.       |
| **Etiquetas**        | Toda interacción tiene `accessibilityLabel` y `accessibilityHint` cuando aplica. |
| **Touch targets**    | `a11y.minTouchTarget = 48dp` (cumple Apple HIG y Material).                   |
| **Font scaling**     | `allowFontScaling: true` con `maxFontSizeMultiplier: 1.6` para no romper layout. |
| **Focus visible**    | Color `colors.focusRing` reservado para anillos de foco con teclado.          |
| **Lector de pantalla** | Pantallas anuncian su propósito al entrar (`accessibilityLabel` en SafeArea). |
| **Reduce motion**    | Animación `fade` (sutil, no marea). Próximamente: respeto a `AccessibilityInfo.isReduceMotionEnabled()`. |

---

## Roadmap del producto

- [x] Scaffolding inicial con tema dark accesible
- [ ] Pantalla "Agregar deuda" con formulario validado
- [ ] Lista de deudas con tabs *Urgentes* / *Rutinarias*
- [ ] Persistencia local (AsyncStorage o expo-sqlite)
- [ ] Marcar deuda como pagada con haptic feedback
- [ ] Notificaciones push para deudas con `dueDate` próximo
- [ ] Exportar a CSV / compartir vía Share API
