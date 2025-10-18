// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const menuButton = document.getElementById('menuButton');
    const menu = document.getElementById('menu');
    const blocker = document.querySelector('.mm-wrapper__blocker');
    const page = document.getElementById('mm-0');
    
    if (menuButton && menu) {
        // Toggle menu when button is clicked
        menuButton.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMenu();
        });
        
        // Close menu when blocker is clicked
        if (blocker) {
            blocker.addEventListener('click', function(e) {
                e.preventDefault();
                closeMenu();
            });
        }
        
        // Handle submenu navigation
        const subMenuButtons = menu.querySelectorAll('.mm-btn_next');
        subMenuButtons.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetPanel = document.querySelector(targetId);
                const currentPanel = menu.querySelector('.mm-panel_opened');
                
                if (targetPanel && currentPanel) {
                    currentPanel.classList.remove('mm-panel_opened');
                    currentPanel.classList.add('mm-hidden');
                    targetPanel.classList.remove('mm-hidden');
                    targetPanel.classList.add('mm-panel_opened');
                }
            });
        });
        
        // Handle back buttons
        const backButtons = menu.querySelectorAll('.mm-btn_prev');
        backButtons.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetPanel = document.querySelector(targetId);
                const currentPanel = menu.querySelector('.mm-panel_opened');
                
                if (targetPanel && currentPanel) {
                    currentPanel.classList.remove('mm-panel_opened');
                    currentPanel.classList.add('mm-hidden');
                    targetPanel.classList.remove('mm-hidden');
                    targetPanel.classList.add('mm-panel_opened');
                }
            });
        });
    }
    
    function toggleMenu() {
        if (menu.classList.contains('mm-menu_opened')) {
            closeMenu();
        } else {
            openMenu();
        }
    }
    
    function openMenu() {
        menu.classList.add('mm-menu_opened');
        menu.setAttribute('aria-hidden', 'false');
        if (blocker) {
            blocker.classList.add('mm-slideout');
        }
        if (page) {
            page.classList.add('mm-slideout');
        }
    }
    
    function closeMenu() {
        menu.classList.remove('mm-menu_opened');
        menu.setAttribute('aria-hidden', 'true');
        if (blocker) {
            blocker.classList.remove('mm-slideout');
        }
        if (page) {
            page.classList.remove('mm-slideout');
        }
    }
    
    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && menu.classList.contains('mm-menu_opened')) {
            closeMenu();
        }
    });
});

// Form validation and submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form');
    const usernameInput = document.getElementById('txtKullaniciAd');
    const passwordInput = document.getElementById('txtSifre');
    const submitButton = document.getElementById('btnGiris');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            // Basic validation
            if (!usernameInput.value.trim()) {
                e.preventDefault();
                alert('Lütfen kullanıcı adınızı girin.');
                usernameInput.focus();
                return false;
            }
            
            if (!passwordInput.value.trim()) {
                e.preventDefault();
                alert('Lütfen şifrenizi girin.');
                passwordInput.focus();
                return false;
            }
            
            // Show loading state
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.value = 'Giriş yapılıyor...';
            }
        });
    }
    
    // Add input validation styling
    [usernameInput, passwordInput].forEach(function(input) {
        if (input) {
            input.addEventListener('blur', validateInput);
            input.addEventListener('input', clearValidationError);
        }
    });
    
    function validateInput(e) {
        const input = e.target;
        if (input.hasAttribute('required') && !input.value.trim()) {
            input.classList.add('is-invalid');
        } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        }
    }
    
    function clearValidationError(e) {
        const input = e.target;
        input.classList.remove('is-invalid');
        if (input.value.trim()) {
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
        }
    }
});

// Tooltip functionality
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggers = document.querySelectorAll('[data-toggle="tooltip"]');
    
    tooltipTriggers.forEach(function(trigger) {
        trigger.addEventListener('mouseenter', function() {
            showTooltip(this);
        });
        
        trigger.addEventListener('mouseleave', function() {
            hideTooltip(this);
        });
    });
    
    function showTooltip(element) {
        const title = element.getAttribute('data-original-title') || element.getAttribute('title');
        if (!title) return;
        
        // Remove existing tooltips
        const existingTooltip = document.querySelector('.custom-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = title;
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            white-space: nowrap;
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        tooltip.style.left = (rect.left + rect.width / 2 - tooltipRect.width / 2) + 'px';
        tooltip.style.top = (rect.top - tooltipRect.height - 5) + 'px';
    }
    
    function hideTooltip() {
        const tooltip = document.querySelector('.custom-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
});

// Accessibility enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Skip to content link
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Ana içeriğe geç';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
        position: absolute;
        left: -9999px;
        z-index: 999;
        padding: 8px 16px;
        background: #000;
        color: #fff;
        text-decoration: none;
    `;
    
    skipLink.addEventListener('focus', function() {
        this.style.left = '10px';
        this.style.top = '10px';
    });
    
    skipLink.addEventListener('blur', function() {
        this.style.left = '-9999px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add main content id
    const formContent = document.querySelector('.form-content');
    if (formContent) {
        formContent.id = 'main-content';
    }
});

// Default credentials handling
document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('txtKullaniciAd');
    const passwordInput = document.getElementById('txtSifre');
    
    // Add visual indication for default values
    if (usernameInput && usernameInput.value) {
        usernameInput.style.backgroundColor = '#f8f9fa';
        usernameInput.title = 'Varsayılan kullanıcı adı (değiştirilebilir)';
    }
    
    if (passwordInput && passwordInput.value) {
        passwordInput.style.backgroundColor = '#f8f9fa';
        passwordInput.title = 'Varsayılan şifre (değiştirilebilir)';
    }
    
    // Clear background color when user starts typing
    [usernameInput, passwordInput].forEach(function(input) {
        if (input) {
            input.addEventListener('input', function() {
                this.style.backgroundColor = '';
                this.removeAttribute('title');
            });
        }
    });
    
    // Add info text about default credentials
    const formButton = document.querySelector('.form-button');
    if (formButton && !document.querySelector('.default-credentials-info')) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'default-credentials-info';
        infoDiv.style.cssText = `
            margin-top: 10px;
            padding: 8px 12px;
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 4px;
            font-size: 12px;
            color: #1565c0;
        `;
        infoDiv.innerHTML = '<strong>Varsayılan Giriş:</strong> Kullanıcı: admin, Şifre: 123456';
        formButton.parentNode.insertBefore(infoDiv, formButton);
    }
});
