class UserAppManager {
    constructor() {
        this.apps = [];
        this.selectedAppIndices = [];
        this.nextAppId = 1;
        this.sidebarWidth = 350;
        this.isResizing = false;
        this.settings = {
            fontSize: 'medium',
            compactMode: false
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadAppsFromStorage();
        this.loadSettings();
    }

    initializeElements() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.sidebarContent = document.querySelector('.sidebar-content');
        this.mainContent = document.getElementById('main-content');
        this.iframeContainer = document.getElementById('iframe-container');
        this.urlInput = document.getElementById('url-input');
        this.loadBtn = document.getElementById('load-btn');
        this.deleteBtn = document.getElementById('delete-btn');
        this.appList = document.getElementById('app-list');
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsPanel = document.getElementById('settings-panel');
        this.fontSizeSelect = document.getElementById('font-size-select');
        this.compactModeToggle = document.getElementById('compact-mode-toggle');
    }

    bindEvents() {
        this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        
        this.loadBtn.addEventListener('click', () => this.loadApp());
        this.deleteBtn.addEventListener('click', () => this.deleteSelectedApp());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadApp();
            }
        });
        
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        window.addEventListener('message', (event) => this.handleChildMessage(event));
        
        this.bindResizeEvents();
        this.bindSettingsEvents();
    }

    bindSettingsEvents() {
        this.settingsBtn.addEventListener('click', () => this.toggleSettingsPanel());
        
        this.fontSizeSelect.addEventListener('change', (e) => {
            this.settings.fontSize = e.target.value;
            this.applySettings();
            this.saveSettings();
        });
        
        this.compactModeToggle.addEventListener('change', (e) => {
            this.settings.compactMode = e.target.checked;
            this.applySettings();
            this.saveSettings();
        });
    }

    toggleSettingsPanel() {
        this.settingsPanel.classList.toggle('hidden');
    }

    applySettings() {
        this.sidebarContent.classList.remove('font-small', 'font-medium', 'font-large');
        this.sidebarContent.classList.add(`font-${this.settings.fontSize}`);
        
        if (this.settings.compactMode) {
            this.sidebarContent.classList.add('compact-mode');
        } else {
            this.sidebarContent.classList.remove('compact-mode');
        }
    }

    saveSettings() {
        localStorage.setItem('userAppManagerSettings', JSON.stringify(this.settings));
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('userAppManagerSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
            
            this.fontSizeSelect.value = this.settings.fontSize;
            this.compactModeToggle.checked = this.settings.compactMode;
            this.applySettings();
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }

    toggleSidebar() {
        const isOpen = this.sidebar.classList.contains('open');
        
        if (isOpen) {
            this.sidebar.classList.remove('open');
            this.mainContent.classList.add('sidebar-closed');
            this.iframeContainer.classList.add('sidebar-closed');
            this.updateMainContentMargin(); // Reset margins when closing
        } else {
            this.sidebar.classList.add('open');
            this.mainContent.classList.remove('sidebar-closed');
            this.iframeContainer.classList.remove('sidebar-closed');
            this.updateMainContentMargin(); // Apply margins when opening
        }
    }

    bindResizeEvents() {
        let startX, startWidth, isInResizeZone = false;
        
        // Track mouse position over sidebar to show resize cursor
        this.sidebar.addEventListener('mousemove', (e) => {
            if (!this.isResizing) {
                if (e.offsetX <= 4) {
                    this.sidebar.style.cursor = 'ew-resize';
                    isInResizeZone = true;
                } else {
                    this.sidebar.style.cursor = 'default';
                    isInResizeZone = false;
                }
            }
        });
        
        // Reset cursor when mouse leaves sidebar
        this.sidebar.addEventListener('mouseleave', () => {
            if (!this.isResizing) {
                this.sidebar.style.cursor = 'default';
                isInResizeZone = false;
            }
        });
        
        const handleMouseDown = (e) => {
            // Check if click is on the left edge (resize area) or if we're in resize zone
            if (isInResizeZone || e.offsetX <= 4) {
                this.isResizing = true;
                this.sidebar.classList.add('resizing');
                startX = e.clientX;
                startWidth = parseInt(document.defaultView.getComputedStyle(this.sidebar).width, 10);
                
                // Attach events to document to prevent detachment issues
                document.addEventListener('mousemove', handleMouseMove, true);
                document.addEventListener('mouseup', handleMouseUp, true);
                
                // Prevent text selection and set cursor
                document.body.style.cursor = 'ew-resize';
                document.body.style.userSelect = 'none';
                document.documentElement.style.cursor = 'ew-resize';
                
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        const handleMouseMove = (e) => {
            if (!this.isResizing) return;
            
            // Calculate the width change based on mouse movement
            // Since sidebar is on the right, moving left (negative) should increase width
            const deltaX = startX - e.clientX; // Reversed: left movement = positive delta
            const newWidth = startWidth + deltaX;
            
            const minWidth = 250;
            const maxWidth = window.innerWidth * 0.9; // 90% of viewport
            
            // Apply constraints
            this.sidebarWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            
            // Apply the new width immediately
            this.sidebar.style.width = this.sidebarWidth + 'px';
            this.updateMainContentMargin();
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        const handleMouseUp = (e) => {
            if (!this.isResizing) return;
            
            this.isResizing = false;
            this.sidebar.classList.remove('resizing');
            
            // Remove document-level event listeners
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('mouseup', handleMouseUp, true);
            
            // Reset cursors and selection
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.documentElement.style.cursor = '';
            this.sidebar.style.cursor = 'default';
            
            this.saveSidebarWidth();
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        this.sidebar.addEventListener('mousedown', handleMouseDown);
    }

    updateMainContentMargin() {
        if (this.sidebar.classList.contains('open')) {
            this.mainContent.style.marginRight = this.sidebarWidth + 'px';
            const iframeContainer = document.getElementById('iframe-container');
            if (iframeContainer) {
                iframeContainer.style.right = this.sidebarWidth + 'px';
            }
        } else {
            this.mainContent.style.marginRight = '0px';
            const iframeContainer = document.getElementById('iframe-container');
            if (iframeContainer) {
                iframeContainer.style.right = '0px';
            }
        }
    }

    saveSidebarWidth() {
        localStorage.setItem('sidebarWidth', this.sidebarWidth.toString());
    }

    loadSidebarWidth() {
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
            this.sidebarWidth = parseInt(savedWidth);
            this.sidebar.style.width = this.sidebarWidth + 'px';
        }
    }

    loadApp() {
        const url = this.urlInput.value.trim();
        
        if (!url) {
            this.showNotification('Please enter a URL', 'error');
            return;
        }
        
        if (!this.isValidUrl(url)) {
            this.showNotification('Please enter a valid URL', 'error');
            return;
        }
        
        // Check if URL already exists
        if (this.apps.some(app => app.url === url)) {
            this.showNotification('This URL is already loaded', 'warning');
            return;
        }
        
        const app = {
            id: this.nextAppId++,
            url: url,
            title: this.extractTitleFromUrl(url),
            visible: true,
            enabled: true,
            iframe: null
        };
        
        this.apps.push(app);
        this.createIframe(app);
        this.renderAppList();
        this.saveAppsToStorage();
        this.urlInput.value = '';
        
        this.showNotification(`Loaded: ${app.title}`, 'success');
    }

    deleteSelectedApp() {
        if (this.selectedAppIndices.length === 0) {
            this.showNotification('Please select app(s) to delete', 'warning');
            return;
        }
        
        // Sort indices in descending order to avoid index shifting issues
        const sortedIndices = [...this.selectedAppIndices].sort((a, b) => b - a);
        const deletedTitles = [];
        
        sortedIndices.forEach(index => {
            const app = this.apps[index];
            deletedTitles.push(app.title);
            this.removeIframe(app);
            this.apps.splice(index, 1);
        });
        
        this.selectedAppIndices = [];
        this.renderAppList();
        this.saveAppsToStorage();
        
        const message = deletedTitles.length === 1 
            ? `Deleted: ${deletedTitles[0]}` 
            : `Deleted ${deletedTitles.length} apps: ${deletedTitles.join(', ')}`;
        this.showNotification(message, 'success');
    }

    createIframe(app) {
        const iframe = document.createElement('iframe');
        iframe.src = app.url;
        iframe.className = 'app-iframe';
        iframe.id = `iframe-${app.id}`;
        // More permissive sandbox to avoid mangling JS, CSS, HTML content
        iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation';
        
        // Add error handling
        iframe.onerror = () => {
            this.showNotification(`Failed to load: ${app.title}`, 'error');
            app.enabled = false;
            this.renderAppList();
        };
        
        // Allow full access to avoid content mangling
        iframe.setAttribute('allow', 'accelerometer; autoplay; camera; encrypted-media; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; payment; picture-in-picture; usb; vr; xr-spatial-tracking');
        iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        
        // Set initial visibility based on app.visible state
        this.updateIframeVisibility(iframe, app.visible);
        
        this.iframeContainer.appendChild(iframe);
        app.iframe = iframe;
        
        // Show the first enabled iframe by default, but only if it's also visible
        if (app.enabled && !this.getActiveIframe()) {
            if (app.visible) {
                this.setActiveIframe(app);
            }
        }
    }

    removeIframe(app) {
        if (app.iframe) {
            app.iframe.remove();
            app.iframe = null;
        }
    }

    toggleApp(appIndex, property) {
        const app = this.apps[appIndex];
        app[property] = !app[property];
        
        if (property === 'enabled') {
            if (app.enabled) {
                // Always create iframe when enabled, regardless of visibility
                if (!app.iframe) {
                    this.createIframe(app);
                }
                // Only make active if also visible and no other iframe is active
                if (app.visible && !this.getActiveIframe()) {
                    this.setActiveIframe(app);
                }
            } else {
                // Remove iframe when disabled
                if (app.iframe && app.iframe.classList.contains('active')) {
                    // If this was the active iframe, activate another one
                    const nextActiveApp = this.apps.find(a => a.enabled && a.visible && a !== app);
                    if (nextActiveApp) {
                        this.setActiveIframe(nextActiveApp);
                    }
                }
                this.removeIframe(app);
            }
        } else if (property === 'visible') {
            if (app.visible) {
                // If becoming visible and enabled, show iframe and potentially activate
                if (app.enabled && app.iframe) {
                    this.updateIframeVisibility(app.iframe, true);
                    if (!this.getActiveIframe()) {
                        this.setActiveIframe(app);
                    }
                } else if (app.enabled && !app.iframe) {
                    this.createIframe(app);
                }
            } else {
                // If becoming invisible but still enabled, keep iframe but hide it
                if (app.iframe) {
                    this.updateIframeVisibility(app.iframe, false);
                    if (app.iframe.classList.contains('active')) {
                        // Find another visible and enabled app to activate
                        const nextActiveApp = this.apps.find(a => a.enabled && a.visible && a !== app);
                        if (nextActiveApp) {
                            this.setActiveIframe(nextActiveApp);
                        } else {
                            // No visible apps, just remove active state
                            app.iframe.classList.remove('active');
                        }
                    }
                }
            }
        }
        
        this.renderAppList();
        this.saveAppsToStorage();
    }

    updateIframeVisibility(iframe, visible) {
        if (visible) {
            iframe.style.visibility = 'visible';
            iframe.style.pointerEvents = 'auto';
        } else {
            iframe.style.visibility = 'hidden';
            iframe.style.pointerEvents = 'none';
        }
    }

    setActiveIframe(app) {
        // Reset z-index for all iframes
        this.apps.forEach(a => {
            if (a.iframe) {
                a.iframe.classList.remove('active');
            }
        });
        
        // Set the selected iframe as active (brings to front)
        if (app.iframe && app.enabled && app.visible) {
            app.iframe.classList.add('active');
        }
    }

    getActiveIframe() {
        return this.apps.find(app => app.iframe && app.iframe.classList.contains('active'));
    }

    selectApp(index, ctrlKey = false) {
        if (ctrlKey) {
            // Multi-select with Ctrl key
            const selectedIndex = this.selectedAppIndices.indexOf(index);
            if (selectedIndex === -1) {
                // Add to selection
                this.selectedAppIndices.push(index);
            } else {
                // Remove from selection
                this.selectedAppIndices.splice(selectedIndex, 1);
            }
        } else {
            // Single select or toggle
            if (this.selectedAppIndices.length === 1 && this.selectedAppIndices[0] === index) {
                // Deselect if only this item is selected
                this.selectedAppIndices = [];
            } else {
                // Select only this item
                this.selectedAppIndices = [index];
            }
        }
        
        this.renderAppList();
        
        // Set as active iframe if enabled and visible (use last selected)
        if (this.selectedAppIndices.length > 0) {
            const lastSelectedIndex = this.selectedAppIndices[this.selectedAppIndices.length - 1];
            const app = this.apps[lastSelectedIndex];
            if (app.enabled && app.visible && app.iframe) {
                this.setActiveIframe(app);
            }
        }
    }

    moveApp(index, direction) {
        if (direction === 'up' && index > 0) {
            [this.apps[index], this.apps[index - 1]] = [this.apps[index - 1], this.apps[index]];
            // Update selected indices
            this.selectedAppIndices = this.selectedAppIndices.map(selectedIndex => {
                if (selectedIndex === index) return index - 1;
                if (selectedIndex === index - 1) return index;
                return selectedIndex;
            });
        } else if (direction === 'down' && index < this.apps.length - 1) {
            [this.apps[index], this.apps[index + 1]] = [this.apps[index + 1], this.apps[index]];
            // Update selected indices
            this.selectedAppIndices = this.selectedAppIndices.map(selectedIndex => {
                if (selectedIndex === index) return index + 1;
                if (selectedIndex === index + 1) return index;
                return selectedIndex;
            });
        }
        
        this.renderAppList();
        this.saveAppsToStorage();
    }

    deleteApp(index) {
        const app = this.apps[index];
        this.removeIframe(app);
        this.apps.splice(index, 1);
        
        // Update selected indices after deletion
        this.selectedAppIndices = this.selectedAppIndices
            .filter(selectedIndex => selectedIndex !== index)
            .map(selectedIndex => selectedIndex > index ? selectedIndex - 1 : selectedIndex);
        
        this.renderAppList();
        this.saveAppsToStorage();
        
        this.showNotification(`Deleted: ${app.title}`, 'success');
    }

    renderAppList() {
        this.appList.innerHTML = '';
        
        this.apps.forEach((app, index) => {
            const appRow = document.createElement('div');
            const isActive = app.enabled && app.visible;
            const isSelected = this.selectedAppIndices.includes(index);
            appRow.className = `app-row ${isSelected ? 'selected' : ''} ${!isActive ? 'disabled' : ''}`;
            
            appRow.innerHTML = `
                <div class="app-row-header">
                    <div class="app-checkboxes">
                        <label class="checkbox-label">
                            <input type="checkbox" class="app-checkbox visible-checkbox" ${app.visible ? 'checked' : ''}>
                            <span class="checkbox-text">Visible</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" class="app-checkbox enabled-checkbox" ${app.enabled ? 'checked' : ''}>
                            <span class="checkbox-text">Enabled</span>
                        </label>
                    </div>
                    <div class="app-status ${isActive ? '' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</div>
                </div>
                <div class="app-title" title="${app.title}">${app.title}</div>
                <div class="app-url">${app.url}</div>
                <div class="app-controls">
                    <button class="control-btn move-up" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="control-btn move-down" ${index === this.apps.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="control-btn delete-app">🗑</button>
                </div>
            `;
            
            // Add event listeners
            const visibleCheckbox = appRow.querySelector('.visible-checkbox');
            const enabledCheckbox = appRow.querySelector('.enabled-checkbox');
            
            visibleCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleApp(index, 'visible');
            });
            
            enabledCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleApp(index, 'enabled');
            });
            
            appRow.addEventListener('click', (e) => {
                if (!e.target.closest('.app-controls') && !e.target.closest('.app-checkboxes')) {
                    this.selectApp(index, e.ctrlKey || e.metaKey);
                }
            });
            
            const moveUpBtn = appRow.querySelector('.move-up');
            const moveDownBtn = appRow.querySelector('.move-down');
            const deleteBtn = appRow.querySelector('.delete-app');
            
            moveUpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveApp(index, 'up');
            });
            
            moveDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.moveApp(index, 'down');
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteApp(index);
            });
            
            this.appList.appendChild(appRow);
        });
    }

    handleKeyboard(e) {
        // Handle escape key to pin the app (like hammy-mining) and collapse sidebar
        if (e.key === 'Escape') {
            // Collapse sidebar when pinning
            if (this.sidebar.classList.contains('open')) {
                this.toggleSidebar();
            }
            window.parent.postMessage({type: "pin"}, "*");
            return;
        }
        
        // Only handle other keyboard shortcuts when sidebar is open
        if (!this.sidebar.classList.contains('open')) return;
        
        switch(e.key) {
            case 'Delete':
                if (this.selectedAppIndices.length > 0) {
                    this.deleteSelectedApp();
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.navigateSelection(-1, e.shiftKey);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.navigateSelection(1, e.shiftKey);
                break;
                
            case 'a':
            case 'A':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.selectAllApps();
                }
                break;
        }
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    extractTitleFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            const pathParts = urlObj.pathname.split('/').filter(part => part);
            
            if (pathParts.length > 0) {
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart.includes('.')) {
                    return lastPart.split('.')[0];
                }
                return lastPart;
            }
            
            return domain;
        } catch (e) {
            return 'Web App';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transition: 'all 0.3s ease',
            transform: 'translateX(100%)',
            opacity: '0'
        });
        
        // Set color based on type
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    saveAppsToStorage() {
        const appsData = this.apps.map(app => ({
            id: app.id,
            url: app.url,
            title: app.title,
            visible: app.visible,
            enabled: app.enabled
        }));
        
        localStorage.setItem('userApps', JSON.stringify(appsData));
        localStorage.setItem('nextAppId', this.nextAppId.toString());
    }

    loadAppsFromStorage() {
        try {
            const appsData = localStorage.getItem('userApps');
            const nextAppId = localStorage.getItem('nextAppId');
            
            // Load sidebar width
            this.loadSidebarWidth();
            
            if (appsData) {
                const parsedApps = JSON.parse(appsData);
                this.apps = parsedApps.map(appData => ({
                    ...appData,
                    iframe: null
                }));
                
                // Recreate iframes for all enabled apps (regardless of visibility)
                this.apps.forEach(app => {
                    if (app.enabled) {
                        this.createIframe(app);
                        // Ensure visibility is set correctly
                        if (app.iframe) {
                            this.updateIframeVisibility(app.iframe, app.visible);
                        }
                    }
                });
                
                this.renderAppList();
            }
            
            if (nextAppId) {
                this.nextAppId = parseInt(nextAppId);
            }
        } catch (e) {
            console.error('Failed to load apps from storage:', e);
        }
    }

    handleChildMessage(event) {
        // Check if the message is from one of our child iframes
        const sourceApp = this.getAppByIframe(event.source);
        if (!sourceApp) {
            // Not from our child iframes, might be from parent - handle as response
            this.handleParentMessage(event);
            return;
        }

        // Message from child iframe - forward to parent with app identification
        const messageWithSource = {
            ...event.data,
            _sourceAppId: sourceApp.id,
            _sourceAppUrl: sourceApp.url
        };

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(messageWithSource, "*");
        }
    }

    handleParentMessage(event) {
        // Message from parent (game client) - route back to correct child iframe
        const data = event.data;
        
        // Check if this is a response that should be routed to a specific app
        if (data._sourceAppId || data._targetAppId) {
            const targetAppId = data._targetAppId || data._sourceAppId;
            const targetApp = this.apps.find(app => app.id === targetAppId);
            
            if (targetApp && targetApp.iframe) {
                // Remove our internal routing fields before forwarding
                const cleanData = { ...data };
                delete cleanData._sourceAppId;
                delete cleanData._sourceAppUrl;
                delete cleanData._targetAppId;
                
                // console.debug(`📥 Routing message to ${targetApp.title}:`, cleanData);
                
                try {
                    targetApp.iframe.contentWindow.postMessage(cleanData, "*");
                } catch (error) {
                    console.warn(`Failed to send message to ${targetApp.title}:`, error);
                }
                return;
            }
        }
        
        // Broadcast to all enabled apps if no specific target
        this.broadcastToAllApps(data);
    }

    broadcastToAllApps(data) {
        // console.debug('📻 Broadcasting to all enabled apps:', data);
        this.apps.forEach(app => {
            if (app.enabled && app.iframe) {
                try {
                    app.iframe.contentWindow.postMessage(data, "*");
                } catch (error) {
                    console.warn(`Failed to broadcast to ${app.title}:`, error);
                }
            }
        });
    }

    getAppByIframe(iframeWindow) {
        return this.apps.find(app => {
            return app.iframe && app.iframe.contentWindow === iframeWindow;
        });
    }

    navigateSelection(direction, shiftKey = false) {
        if (this.apps.length === 0) return;
        
        let currentIndex = -1;
        if (this.selectedAppIndices.length > 0) {
            currentIndex = Math.max(...this.selectedAppIndices);
        }
        
        const newIndex = Math.max(0, Math.min(this.apps.length - 1, currentIndex + direction));
        
        if (shiftKey && this.selectedAppIndices.length > 0) {
            // Range selection with Shift
            const startIndex = Math.min(...this.selectedAppIndices);
            const endIndex = newIndex;
            this.selectedAppIndices = [];
            for (let i = Math.min(startIndex, endIndex); i <= Math.max(startIndex, endIndex); i++) {
                this.selectedAppIndices.push(i);
            }
        } else {
            // Single selection
            this.selectApp(newIndex);
            return; // selectApp handles rendering
        }
        
        this.renderAppList();
    }

    selectAllApps() {
        this.selectedAppIndices = this.apps.map((_, index) => index);
        this.renderAppList();
    }
}

// Initialize the app manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.userAppManager = new UserAppManager();
});
