# Contribuir a Reporte VE · Contributing

Gracias por ayudar. Esta es una herramienta de emergencia: la prioridad es que
funcione en la peor conexión posible y sea clara bajo estrés. _Thanks for
helping — this is an emergency tool; it must work on the worst connection and
stay clear under stress._

## Cómo empezar / Getting started

```bash
pnpm install
pnpm dev
```

No necesitas Supabase para desarrollar la mayoría de cosas: los reportes se
guardan localmente. _You don't need Supabase for most work; reports queue
locally._ See [`README.md`](./README.md) to connect a backend.

## Antes de un PR / Before a PR

```bash
pnpm lint           # debe pasar / must pass
pnpm exec tsc --noEmit
pnpm build          # debe pasar / must pass
```

## Reglas del proyecto / Project rules

Lee [`CLAUDE.md`](./CLAUDE.md) y [`DESIGN.md`](./DESIGN.md). Lo esencial:

- **Comenta cada función.** Es código abierto; el próximo contribuidor lo lee.
  Usa TSDoc en funciones, componentes y hooks exportados. _Comment every
  function — TSDoc on exports._
- **Sin web fonts.** Solo `system-ui` (ahorro de datos). _System font only._
- **El color nunca es la única señal.** Cada tipo = color + ícono + texto.
  _Color is never the only signal._
- **Accesibilidad WCAG 2.2 AA** es el mínimo: foco visible, objetivos táctiles
  ≥ 44px, `aria-*` correctos, `prefers-reduced-motion`. Prueba en escala de
  grises. _A11y is the merge bar._
- **Diseño atómico:** `atoms → molecules → organisms/<sección> → templates`.
  Nada de `index.ts` barrels. `"use client"` solo si hay estado/refs/APIs del
  navegador.
- **Offline primero.** El formulario escribe en IndexedDB, no en el servidor.
  _Offline-first: the form writes to IndexedDB._
- **i18n:** agrega claves a `src/lib/i18n/messages.ts` en `es` **y** `en`.

## Idioma / Language

Issues y PRs en español o inglés. Mensajes de UI: español primero, inglés
después. _Spanish-first for UI copy._

## Commits

Conventional Commits (`feat:`, `fix:`, `docs:`…). Diffs pequeños y enfocados.
