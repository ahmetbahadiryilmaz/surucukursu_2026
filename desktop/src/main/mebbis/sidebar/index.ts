/**
 * MEBBIS sidebar injection — split into:
 *   - left-menu.ts        — the main menu (Direksiyon/Simülasyon/K Belgesi)
 *   - left-menu-script.ts — the menu's injected IIFE source
 *   - store-sections.ts   — the Öğrenciler/Personeller/Araçlar/Kurum sections
 */

export { injectLeftMenu } from './left-menu';
export { injectStoreSidebarSections } from './store-sections';
