/**
 * Injects the MEBBIS left menu into the page.
 *
 * The menu script is built into the exe (see `left-menu-script.ts`) — it is no
 * longer fetched as a remote bundle. Previously this used
 * `runScriptOrFallback('scripts/left-menu.js', fallback)`, but the remote copy
 * and the local fallback drifted (the fallback lost "K Belgesi Oluştur"), so
 * the remote path was dropped entirely.
 */

import { app, BrowserWindow } from 'electron';
import { Account } from '../../storage/account-store';
import type { MebbisManager } from '../manager';
import { buildLeftMenuScript, LEFT_MENU_DEV_SECTION } from './left-menu-script';

export async function injectLeftMenu(m: MebbisManager, win: BrowserWindow, account: Account): Promise<void> {
    if (win.isDestroyed()) return;

    const devSection = app.isPackaged ? '' : LEFT_MENU_DEV_SECTION;
    const script = buildLeftMenuScript(devSection);

    try {
        await win.webContents.executeJavaScript(script);
    } catch (err: any) {
        console.error(`[Sidebar][${account.label}] Left menu injection failed:`, err?.message ?? err);
    }

    // After the main menu is injected, attach Öğrenciler & Araçlar sections + renderer.
    await m.injectStoreSidebarSections(win, account);
    // And immediately push current store state.
    m.pushStoreToSidebar(win, account);
}
