(function () {
  const message = __MESSAGE__;
  const color = __COLOR__;
  let statusBar = document.getElementById('mebbis-status-bar');
  if (!statusBar) {
    statusBar = document.createElement('div');
    statusBar.id = 'mebbis-status-bar';
    statusBar.style.cssText =
      'position: fixed; top: 0; left: 0; right: 0; z-index: 999999; background: ' +
      color +
      '; color: white; padding: 12px 20px; font-size: 14px; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.3); text-align: center; font-family: Arial, sans-serif;';
    document.body.appendChild(statusBar);
  }
  statusBar.textContent = message;
  statusBar.style.background = color;
})();
