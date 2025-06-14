class BookmarksDashboard {
    constructor() {
        this.container = document.getElementById('bookmarks-container');
        this.init();
    }

    async init() {
        await this.loadBookmarks();
        this.setupEventListeners();
    }

    async loadBookmarks() {
        const bookmarks = await browser.bookmarks.getTree();
        this.renderBookmarks(bookmarks[0].children);
    }

    renderBookmarks(bookmarks) {
        this.container.innerHTML = '';
        bookmarks.forEach(bookmark => {
            if (bookmark.type === 'folder') {
                this.createFolderElement(bookmark);
            }
        });
    }

    createFolderElement(folder) {
        const folderElement = document.createElement('div');
        folderElement.className = 'bookmark-folder';
        folderElement.draggable = true;
        folderElement.dataset.id = folder.id;

        const header = document.createElement('div');
        header.className = 'folder-header';

        const title = document.createElement('div');
        title.className = 'folder-title';
        title.contentEditable = true;
        title.textContent = folder.title;

        const controls = document.createElement('div');
        controls.className = 'folder-controls';

        const addButton = document.createElement('button');
        addButton.className = 'btn btn-add';
        addButton.innerHTML = '➕';
        addButton.title = 'Add Bookmark';

        const removeButton = document.createElement('button');
        removeButton.className = 'btn btn-remove';
        removeButton.innerHTML = '✖';
        removeButton.title = 'Remove Folder';

        const collapseButton = document.createElement('button');
        collapseButton.className = 'btn';
        collapseButton.innerHTML = '▼';
        collapseButton.title = 'Collapse/Expand';

        controls.appendChild(addButton);
        controls.appendChild(removeButton);
        controls.appendChild(collapseButton);
        header.appendChild(title);
        header.appendChild(controls);
        folderElement.appendChild(header);

        const bookmarksGrid = document.createElement('div');
        bookmarksGrid.className = 'bookmarks-grid';
        folder.children.forEach(bookmark => {
            if (bookmark.type === 'bookmark') {
                bookmarksGrid.appendChild(this.createBookmarkElement(bookmark));
            }
        });

        folderElement.appendChild(bookmarksGrid);
        this.container.appendChild(folderElement);

        // Event Listeners
        title.addEventListener('blur', () => this.renameFolder(folder.id, title.textContent));
        addButton.addEventListener('click', () => this.addBookmark(folder.id));
        removeButton.addEventListener('click', () => this.removeFolder(folder.id));
        collapseButton.addEventListener('click', () => this.toggleFolder(bookmarksGrid, collapseButton));

        // Drag and Drop
        folderElement.addEventListener('dragstart', (e) => this.handleDragStart(e, folderElement));
        folderElement.addEventListener('dragover', (e) => this.handleDragOver(e));
        folderElement.addEventListener('drop', (e) => this.handleDrop(e, folderElement));
    }

    createBookmarkElement(bookmark) {
        const bookmarkElement = document.createElement('div');
        bookmarkElement.className = 'bookmark-card';
        bookmarkElement.draggable = true;
        bookmarkElement.dataset.id = bookmark.id;

        const title = document.createElement('div');
        title.className = 'bookmark-title';
        title.textContent = bookmark.title;

        const url = document.createElement('div');
        url.className = 'bookmark-url';
        url.textContent = bookmark.url;

        const removeButton = document.createElement('button');
        removeButton.className = 'btn btn-remove';
        removeButton.innerHTML = '✖';
        removeButton.title = 'Remove Bookmark';

        bookmarkElement.appendChild(title);
        bookmarkElement.appendChild(url);
        bookmarkElement.appendChild(removeButton);

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

    async addBookmark(folderId) {
        const url = prompt('Enter bookmark URL:');
        if (url) {
            const title = prompt('Enter bookmark title:');
            try {
                await browser.bookmarks.create({
                    parentId: folderId,
                    title: title || url,
                    url: url
                });
                await this.loadBookmarks();
            } catch (error) {
                console.error('Error adding bookmark:', error);
            }
        }
    }

    async removeFolder(folderId) {
        if (confirm('Are you sure you want to remove this folder and all its bookmarks?')) {
            try {
                await browser.bookmarks.removeTree(folderId);
                await this.loadBookmarks();
            } catch (error) {
                console.error('Error removing folder:', error);
            }
        }
    }

    async removeBookmark(bookmarkId) {
        if (confirm('Are you sure you want to remove this bookmark?')) {
            try {
                await browser.bookmarks.remove(bookmarkId);
                await this.loadBookmarks();
            } catch (error) {
                console.error('Error removing bookmark:', error);
            }
        }
    }

    toggleFolder(bookmarksGrid, collapseButton) {
        const isCollapsed = bookmarksGrid.style.display === 'none';
        bookmarksGrid.style.display = isCollapsed ? 'grid' : 'none';
        collapseButton.innerHTML = isCollapsed ? '▼' : '▶';
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
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    new BookmarksDashboard();
}); 