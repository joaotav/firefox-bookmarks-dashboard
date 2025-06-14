class BookmarksDashboard {
    constructor() {
        this.bookmarksContainer = document.getElementById('bookmarks-container');
        this.folders = new Map();
        this.uncategorizedBookmarks = [];
        
        this.initializeEventListeners();
        this.loadBookmarks();
        this.initializeTheme();
    }

    initializeTheme() {
        // Get saved theme or default to dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Add theme toggle listener
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    initializeEventListeners() {
        // Bookmark container event delegation
        this.bookmarksContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.btn');
            if (!target) return;

            if (target.classList.contains('remove-bookmark')) {
                const bookmarkId = target.closest('.bookmark-card').dataset.id;
                this.removeBookmark(bookmarkId);
            }
        });

        // Listen for bookmark changes
        browser.bookmarks.onCreated.addListener(() => this.loadBookmarks());
        browser.bookmarks.onRemoved.addListener(() => this.loadBookmarks());
        browser.bookmarks.onChanged.addListener(() => this.loadBookmarks());
        browser.bookmarks.onMoved.addListener(() => this.loadBookmarks());
    }

    async init() {
        await this.loadBookmarks();
        this.setupEventListeners();
    }

    async loadBookmarks() {
        try {
            // Clear existing state
            this.folders.clear();
            this.uncategorizedBookmarks = [];
            
            const bookmarks = await browser.bookmarks.getTree();
            console.log('Loading bookmarks tree:', bookmarks[0]);
            
            // Process only Bookmarks Menu and Bookmarks Toolbar
            if (bookmarks[0] && bookmarks[0].children) {
                bookmarks[0].children.forEach(child => {
                    // Only process Bookmarks Menu and Bookmarks Toolbar
                    if (child.id === 'menu________' || child.id === 'toolbar_____') {
                        this.processBookmarks(child);
                    }
                });
            }
            
            console.log('Processed folders:', Array.from(this.folders.keys()));
            console.log('Uncategorized bookmarks:', this.uncategorizedBookmarks);
            
            await this.renderBookmarks();
        } catch (error) {
            console.error('Error loading bookmarks:', error);
        }
    }

    processBookmarks(node, parentId = null) {
        if (!node) return;

        if (node.type === 'bookmark') {
            if (parentId) {
                if (!this.folders.has(parentId)) {
                    this.folders.set(parentId, []);
                }
                this.folders.get(parentId).push({
                    id: node.id,
                    title: node.title,
                    url: node.url
                });
            } else {
                // Only add to uncategorized if it's directly under Bookmarks Menu or Toolbar
                if (node.parentId === 'menu________' || node.parentId === 'toolbar_____') {
                    this.uncategorizedBookmarks.push({
                        id: node.id,
                        title: node.title,
                        url: node.url
                    });
                }
            }
        } else if (node.type === 'folder' && node.id !== 'root________') {
            // Only process non-root folders
            this.folders.set(node.id, []);
            if (node.children) {
                node.children.forEach(child => this.processBookmarks(child, node.id));
            }
        } else if (node.children) {
            // For root and other folders, process children without setting parentId
            node.children.forEach(child => this.processBookmarks(child, parentId));
        }
    }

    async renderBookmarks() {
        this.bookmarksContainer.innerHTML = '';
        
        // Add New Folder button
        const newFolderButton = document.createElement('button');
        newFolderButton.className = 'btn btn-add new-folder';
        newFolderButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg> New Folder';
        newFolderButton.addEventListener('click', () => this.createFolder());
        this.bookmarksContainer.appendChild(newFolderButton);
        
        // Render uncategorized bookmarks if any exist
        if (this.uncategorizedBookmarks.length > 0) {
            const uncategorizedFolder = document.createElement('div');
            uncategorizedFolder.className = 'bookmark-folder';
            uncategorizedFolder.innerHTML = `
                <div class="folder-header">
                    <h2 class="folder-title">Uncategorized Bookmarks</h2>
                </div>
                <div class="bookmarks-grid"></div>
            `;
            
            const bookmarksGrid = uncategorizedFolder.querySelector('.bookmarks-grid');
            this.uncategorizedBookmarks.forEach(bookmark => {
                bookmarksGrid.appendChild(this.createBookmarkElement(bookmark));
            });
            
            this.bookmarksContainer.appendChild(uncategorizedFolder);
        }

        // Render folders
        for (const [folderId, bookmarks] of this.folders) {
            const folder = document.createElement('div');
            folder.className = 'bookmark-folder';
            folder.draggable = true;
            folder.dataset.id = folderId;

            const header = document.createElement('div');
            header.className = 'folder-header';

            const title = document.createElement('h2');
            title.className = 'folder-title';
            title.contentEditable = true;
            title.textContent = await this.getFolderName(folderId);

            const controls = document.createElement('div');
            controls.className = 'folder-controls';

            const removeButton = document.createElement('button');
            removeButton.className = 'btn remove-folder';
            removeButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>';

            const collapseButton = document.createElement('button');
            collapseButton.className = 'btn collapse-folder';
            collapseButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';

            controls.appendChild(removeButton);
            controls.appendChild(collapseButton);

            header.appendChild(title);
            header.appendChild(controls);
            folder.appendChild(header);

            const bookmarksGrid = document.createElement('div');
            bookmarksGrid.className = 'bookmarks-grid';
            
            bookmarks.forEach(bookmark => {
                bookmarksGrid.appendChild(this.createBookmarkElement(bookmark));
            });

            folder.appendChild(bookmarksGrid);
            this.bookmarksContainer.appendChild(folder);

            // Event Listeners
            title.addEventListener('blur', () => this.renameFolder(folderId, title.textContent));
            removeButton.addEventListener('click', () => this.removeFolder(folderId));
            collapseButton.addEventListener('click', () => this.toggleFolder(bookmarksGrid, collapseButton));

            // Drag and Drop
            folder.addEventListener('dragstart', (e) => this.handleDragStart(e, folder));
            folder.addEventListener('dragover', (e) => this.handleDragOver(e));
            folder.addEventListener('drop', (e) => this.handleDrop(e, folder));
        }
    }

    createBookmarkElement(bookmark) {
        const bookmarkElement = document.createElement('div');
        bookmarkElement.className = 'bookmark-card';
        bookmarkElement.draggable = true;
        bookmarkElement.dataset.id = bookmark.id;

        const removeButton = document.createElement('button');
        removeButton.className = 'btn btn-remove';
        removeButton.innerHTML = '✖';
        removeButton.title = 'Remove Bookmark';

        const title = document.createElement('div');
        title.className = 'bookmark-title';
        title.textContent = bookmark.title;

        const url = document.createElement('div');
        url.className = 'bookmark-url';
        url.textContent = bookmark.url;

        bookmarkElement.appendChild(removeButton);
        bookmarkElement.appendChild(title);
        bookmarkElement.appendChild(url);

        // Event Listeners
        bookmarkElement.addEventListener('click', () => window.open(bookmark.url, '_blank'));
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeBookmark(bookmark.id);
        });

        // Drag and Drop
        bookmarkElement.addEventListener('dragstart', (e) => this.handleDragStart(e, bookmarkElement));
        bookmarkElement.addEventListener('dragover', (e) => this.handleDragOver(e));
        bookmarkElement.addEventListener('drop', (e) => this.handleDrop(e, bookmarkElement));

        return bookmarkElement;
    }

    async renameFolder(folderId, newTitle) {
        try {
            await browser.bookmarks.update(folderId, { title: newTitle });
        } catch (error) {
            console.error('Error renaming folder:', error);
        }
    }

    async createFolder() {
        const title = prompt('Enter folder name:');
        if (title) {
            try {
                const folder = await browser.bookmarks.create({
                    title: title,
                    type: 'folder',
                    parentId: 'toolbar_____'  // Firefox's Bookmarks Toolbar ID
                });
                console.log('Folder created:', folder);
                window.location.reload();
            } catch (error) {
                console.error('Error creating folder:', error);
                alert('Failed to create folder: ' + error.message);
            }
        }
    }

    async removeFolder(folderId) {
        try {
            if (confirm('Are you sure you want to remove this folder and all its bookmarks?')) {
                await browser.bookmarks.removeTree(folderId);
                // Reload the entire dashboard
                window.location.reload();
            }
        } catch (error) {
            console.error('Error removing folder:', error);
        }
    }

    async removeBookmark(bookmarkId) {
        try {
            if (confirm('Are you sure you want to remove this bookmark?')) {
                await browser.bookmarks.remove(bookmarkId);
                window.location.reload();
            }
        } catch (error) {
            console.error('Error removing bookmark:', error);
        }
    }

    toggleFolder(bookmarksGrid, collapseButton) {
        const isCollapsed = bookmarksGrid.style.display === 'none';
        bookmarksGrid.style.display = isCollapsed ? 'grid' : 'none';
        collapseButton.classList.toggle('collapsed');
    }

    handleDragStart(e, element) {
        e.dataTransfer.setData('text/plain', element.dataset.id);
        element.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    async handleDrop(e, targetElement) {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('text/plain');
        const targetId = targetElement.dataset.id;
        
        try {
            if (targetElement.classList.contains('bookmark-folder')) {
                await browser.bookmarks.move(sourceId, { parentId: targetId });
            }
            await this.loadBookmarks();
        } catch (error) {
            console.error('Error moving bookmark:', error);
        }

        e.currentTarget.classList.remove('drag-over');
        document.querySelector('.dragging')?.classList.remove('dragging');
    }

    setupEventListeners() {
        browser.bookmarks.onCreated.addListener(() => this.loadBookmarks());
        browser.bookmarks.onRemoved.addListener(() => this.loadBookmarks());
        browser.bookmarks.onChanged.addListener(() => this.loadBookmarks());
        browser.bookmarks.onMoved.addListener(() => this.loadBookmarks());
    }

    async getFolderName(folderId) {
        const folder = await browser.bookmarks.get(folderId);
        return folder[0].title;
    }
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    new BookmarksDashboard();
}); 