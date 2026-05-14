"use strict";
(() => {
  // src/ui/mebbis-auto-fill/index.js
  console.log("[MEBBIS] Auto-fill script loaded");
  (function() {
    if (__SUBMIT__ && window.__mebbisAutoFillRan) {
      console.log("[MEBBIS] Auto-fill+submit already ran on this page, skipping");
      return;
    }
    var MAX_WAIT_MS = 15e3;
    var POLL_MS = 100;
    var waited = 0;
    function fill(usernameField, passwordField) {
      if (__READONLY__ && usernameField.dataset.mebbisLocked === "1") {
        return;
      }
      if (__SUBMIT__) {
        window.__mebbisAutoFillRan = true;
      }
      usernameField.value = __USERNAME__;
      passwordField.value = __PASSWORD__;
      if (__SUBMIT__) {
        usernameField.dispatchEvent(new Event("input", { bubbles: true }));
        usernameField.dispatchEvent(new Event("change", { bubbles: true }));
        passwordField.dispatchEvent(new Event("input", { bubbles: true }));
        passwordField.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (__READONLY__) {
        usernameField.readOnly = true;
        passwordField.readOnly = true;
        usernameField.style.background = "#f3f3f3";
        passwordField.style.background = "#f3f3f3";
        usernameField.dataset.mebbisLocked = "1";
        passwordField.dataset.mebbisLocked = "1";
        var form = usernameField.closest("form");
        if (form) {
          form.onsubmit = function(e) {
            if (e && e.preventDefault)
              e.preventDefault();
            return false;
          };
          form.addEventListener("submit", function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }, true);
          form.action = "javascript:void(0);";
        }
        try {
          window.__doPostBack = function() {
            return false;
          };
        } catch (e) {
        }
        var submitBtns = document.querySelectorAll(
          '#btnGiris, button[id*="Giris"], button[id*="giris"], input[type="submit"]'
        );
        submitBtns.forEach(function(b) {
          b.disabled = true;
          b.style.opacity = "0.5";
          b.style.cursor = "not-allowed";
          b.onclick = function(e) {
            if (e && e.preventDefault)
              e.preventDefault();
            return false;
          };
        });
      }
      if (__SUBMIT__) {
        setTimeout(() => {
          const submitBtn = document.getElementById("btnGiris") || document.getElementById("dogrula") || document.querySelector('button[id*="Giris"]') || document.querySelector('button[id*="giris"]') || document.querySelector('input[type="submit"]') || Array.from(document.querySelectorAll("button")).find(
            (b) => b.textContent.includes("Giri\u015F") || b.textContent.includes("giri\u015F")
          );
          if (submitBtn) {
            submitBtn.click();
          } else {
            const f = usernameField.closest("form");
            if (f)
              f.submit();
          }
        }, 300);
      }
    }
    function poll() {
      const usernameField = document.getElementById("txtKullaniciAd");
      const passwordField = document.getElementById("txtSifre");
      if (usernameField && passwordField) {
        console.log("[MEBBIS] Login fields ready, filling");
        fill(usernameField, passwordField);
        return;
      }
      waited += POLL_MS;
      if (waited >= MAX_WAIT_MS) {
        console.warn("[MEBBIS] Login fields never appeared after " + MAX_WAIT_MS + "ms, giving up");
        return;
      }
      setTimeout(poll, POLL_MS);
    }
    poll();
  })();
})();
