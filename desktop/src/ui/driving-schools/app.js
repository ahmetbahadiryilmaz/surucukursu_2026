// @ts-check
// Entry point — imports wire up all DOM event listeners at module load time.
import './login.js';
import './forgot.js';
import './account-modal.js';
import './accounts.js';
import './profile.js';
import './whats-new.js';
import './about.js';

import { api } from './utils.js';
import { state } from './state.js';
import { showLogin } from './views.js';
import { attemptLogin } from './login.js';
import { versionState, renderVersionBadge } from './about.js';

(async () => {
  state.devMode = await api.isDev().catch(() => false);

  const [appVer, codeVer] = await Promise.all([
    api.getAppVersion().catch(() => null),
    api.getCodeVersion().catch(() => null),
  ]);
  versionState.app  = appVer;
  versionState.code = codeVer;
  renderVersionBadge();

  const creds = await api.authGetSavedCredentials().catch(() => null);
  showLogin(creds || (await api.authGetSavedEmail().catch(() => null)));

  if (creds && creds.autoLogin && creds.email && creds.password) {
    attemptLogin(creds.email, creds.password, true);
  }
})();
