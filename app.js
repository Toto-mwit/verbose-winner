const STORAGE_KEY = 'readingList';

const PREDEFINED_TAGS = [
    { id: 'genre', label: 'I like the genre', detailPlaceholder: 'e.g. Fantasy, Sci-fi, Romance' },
    { id: 'premise', label: 'The premise is good', detailPlaceholder: '' },
    { id: 'art', label: 'The art style appeals to me', detailPlaceholder: '' },
    { id: 'characters', label: 'The characters look interesting', detailPlaceholder: '' },
    { id: 'recommended', label: 'Recommended by someone', detailPlaceholder: 'By whom?' },
    { id: 'adapted', label: 'Adapted from something I like', detailPlaceholder: 'What is it adapted from?' },
    { id: 'popular', label: 'Popular / highly rated', detailPlaceholder: '' }
];

let entries = [];
let currentFilter = 'all';
let currentSort = 'dateAdded-desc';

const entriesList = document.getElementById('entriesList');
const addEntryBtn = document.getElementById('addEntryBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const clearBtn = document.getElementById('clearBtn');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('closeModalBtn');
const entryForm = document.getElementById('entryForm');
const entryTitleInput = document.getElementById('entryTitle');
const editingIdInput = document.getElementById('editingId');
const modalTitle = document.getElementById('modalTitle');
const modalSubmitBtn = document.getElementById('modalSubmitBtn');
const sortSelect = document.getElementById('sortSelect');
const filterTabs = document.querySelectorAll('.filter-tab');

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function createEntry(title, type) {
    return {
        id: generateId(),
        title: title,
        type: type,
        status: 'not_started',
        dateAdded: new Date().toISOString(),
        dateFinished: null,
        interestTags: [],
        currentPage: null,
        totalPages: null,
        currentChapter: null,
        totalChapters: null,
        like: null,
        readingNotes: '',
        afterthought: '',
        finalRating: null
    };
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        showToast('List saved successfully!');
    } catch (e) {
        showToast('Failed to save: ' + e.message, true);
    }
}

function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            entries = JSON.parse(data);
            renderEntries();
            showToast('List loaded successfully!');
        } else {
            showToast('No saved data found.');
        }
    } catch (e) {
        showToast('Failed to load: ' + e.message, true);
    }
}

function clearStorage() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        entries = [];
        renderEntries();
        showToast('Data cleared.');
    }
}

function showToast(message, isError) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        color: white;
        background-color: ${isError ? '#dc2626' : '#22c55e'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2000;
        animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function getFilteredAndSorted() {
    let filtered = currentFilter === 'all'
        ? [...entries]
        : entries.filter(e => e.status === currentFilter);

    const [sortKey, sortDir] = currentSort.split('-');
    filtered.sort((a, b) => {
        let valA, valB;
        if (sortKey === 'dateAdded') {
            valA = a.dateAdded;
            valB = b.dateAdded;
        } else {
            valA = a.title.toLowerCase();
            valB = b.title.toLowerCase();
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
}

function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderRecommendations() {
    const container = document.getElementById('recommendations');
    const messages = [];

    const notStarted = entries.filter(e => e.status === 'not_started');
    const reading = entries.filter(e => e.status === 'reading');
    const finished = entries.filter(e => e.status === 'finished');
    const noTags = notStarted.filter(e => e.interestTags.length === 0);
    const noProgress = reading.filter(e => e.currentPage === null && e.currentChapter === null);
    const noNotes = reading.filter(e => !e.readingNotes);
    const noAfterthought = finished.filter(e => !e.afterthought);
    const noRating = finished.filter(e => e.finalRating === null);

    if (entries.length === 0) {
        messages.push({ type: 'info', text: 'Your reading list is empty. Add your first entry to get started!' });
    } else {
        if (notStarted.length >= 5) {
            messages.push({ type: 'warning', text: 'You have ' + notStarted.length + ' unread entries in your backlog. Time to pick one up!' });
        }

        if (noTags.length > 0) {
            messages.push({ type: 'warning', text: noTags.length + ' unread ' + (noTags.length === 1 ? 'entry has' : 'entries have') + ' no interest tags. Add some so you remember why you picked them!' });
        }

        if (noProgress.length > 0) {
            messages.push({ type: 'warning', text: noProgress.length + ' ' + (noProgress.length === 1 ? 'entry' : 'entries') + ' in progress have no page or chapter data. Update your progress!' });
        }

        if (noNotes.length > 0) {
            messages.push({ type: 'info', text: 'You\'re reading ' + noNotes.length + ' ' + (noNotes.length === 1 ? 'title' : 'titles') + ' without notes. Jot down some thoughts!' });
        }

        if (noAfterthought.length > 0) {
            messages.push({ type: 'info', text: noAfterthought.length + ' finished ' + (noAfterthought.length === 1 ? 'title' : 'titles') + ' have no afterthought. Share your final thoughts!' });
        }

        if (noRating.length > 0) {
            messages.push({ type: 'info', text: noRating.length + ' finished ' + (noRating.length === 1 ? 'title' : 'titles') + ' has no rating. Give it a star rating!' });
        }
    }

    if (messages.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = messages.map(function (msg) {
        return '<div class="recommendation recommendation-' + msg.type + '">' + escapeHTML(msg.text) + '</div>';
    }).join('');
}

function renderEntries() {
    const filtered = getFilteredAndSorted();

    renderRecommendations();

    if (filtered.length === 0) {
        entriesList.innerHTML = `<p class="empty-state">${entries.length === 0
            ? 'No entries yet. Click "+ Add New Entry" to start your reading list!'
            : 'No entries match the current filter.'
        }</p>`;
        return;
    }

    entriesList.innerHTML = filtered.map(entry => renderCard(entry)).join('');
    attachCardListeners();
}

function renderCard(entry) {
    const statusLabel = {
        not_started: 'Not Started',
        reading: 'Reading',
        finished: 'Finished'
    };

    let sectionHTML = '';

    if (entry.status === 'not_started') {
        sectionHTML = renderNotStartedSection(entry);
    } else if (entry.status === 'reading') {
        sectionHTML = renderReadingSection(entry);
    } else if (entry.status === 'finished') {
        sectionHTML = renderFinishedSection(entry);
    }

    return `
        <div class="entry-card status-${entry.status}" data-id="${entry.id}">
            <div class="card-header">
                <div class="card-title-section">
                    <div class="card-title">${escapeHTML(entry.title)}</div>
                    <div class="card-meta">
                        <span class="badge badge-${entry.type}">${entry.type}</span>
                        <span class="badge badge-${entry.status}">${statusLabel[entry.status]}</span>
                        <span class="card-date">Added ${formatDate(entry.dateAdded)}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-edit" title="Edit title" data-id="${entry.id}">&#9998;</button>
                    <button class="btn-icon btn-delete" title="Delete" data-id="${entry.id}">&#10005;</button>
                </div>
            </div>
            ${sectionHTML}
            <div class="status-selector">
                <label>Status:</label>
                <select data-id="${entry.id}" class="status-select">
                    <option value="not_started" ${entry.status === 'not_started' ? 'selected' : ''}>Not Started</option>
                    <option value="reading" ${entry.status === 'reading' ? 'selected' : ''}>Reading</option>
                    <option value="finished" ${entry.status === 'finished' ? 'selected' : ''}>Finished</option>
                </select>
            </div>
        </div>
    `;
}

function renderNotStartedSection(entry) {
    const chipsHTML = entry.interestTags.map((tag, idx) => {
        const display = tag.detail ? `${tag.text}: ${tag.detail}` : tag.text;
        return `<span class="tag-chip active" data-idx="${idx}">
            ${escapeHTML(display)}
            <span class="remove-tag" data-idx="${idx}">&times;</span>
        </span>`;
    }).join('');

    const addedIds = entry.interestTags.map(t => t.id);
    const remaining = PREDEFINED_TAGS.filter(t => !addedIds.includes(t.id));
    const predefinedOptionsHTML = remaining.map(tag => {
        return tag.detailPlaceholder
            ? `<div class="tag-option" data-tag-id="${tag.id}" data-needs-detail="true" data-placeholder="${escapeHTML(tag.detailPlaceholder)}">${escapeHTML(tag.label)}</div>`
            : `<div class="tag-option" data-tag-id="${tag.id}" data-needs-detail="false">${escapeHTML(tag.label)}</div>`;
    }).join('');

    return `
        <div class="card-section">
            <div class="tags-container" data-id="${entry.id}">
                ${chipsHTML}
                <div class="add-tag-wrapper">
                    <button class="btn-add-tag" data-id="${entry.id}">+ Add Tag</button>
                    <div class="tag-dropdown hidden" data-id="${entry.id}">
                        ${predefinedOptionsHTML}
                        <div class="tag-dropdown-divider"></div>
                        <div class="tag-option tag-option-custom" data-needs-detail="true" data-placeholder="Enter your tag...">Custom tag...</div>
                    </div>
                </div>
            </div>
            <div class="tag-detail-panel hidden" data-id="${entry.id}">
                <input type="text" class="tag-detail-input" placeholder="" data-id="${entry.id}">
                <button class="btn-confirm-tag" data-id="${entry.id}">Add</button>
            </div>
        </div>
    `;
}

function renderReadingSection(entry) {
    let percent = 0;
    if (entry.currentChapter && entry.totalChapters) {
        percent = Math.min((entry.currentChapter / entry.totalChapters) * 100, 100);
    } else if (entry.currentPage && entry.totalPages) {
        percent = Math.min((entry.currentPage / entry.totalPages) * 100, 100);
    }
    const percentText = percent > 0 ? Math.round(percent) + '%' : '';

    return `
        <div class="card-section">
            <div class="progress-bar-container">
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${percent}%"></div>
                </div>
                <span class="progress-bar-label">${percentText}</span>
            </div>
            <div class="progress-section">
                <div class="progress-group">
                    <label>Pages</label>
                    <div class="progress-inputs">
                        <input type="number" min="0" value="${entry.currentPage || ''}" data-field="currentPage" data-id="${entry.id}" placeholder="0">
                        <span>/</span>
                        <input type="number" min="1" value="${entry.totalPages || ''}" data-field="totalPages" data-id="${entry.id}" placeholder="--">
                    </div>
                </div>
                <div class="progress-group">
                    <label>Chapters</label>
                    <div class="progress-inputs">
                        <input type="number" min="0" value="${entry.currentChapter || ''}" data-field="currentChapter" data-id="${entry.id}" placeholder="0">
                        <span>/</span>
                        <input type="number" min="1" value="${entry.totalChapters || ''}" data-field="totalChapters" data-id="${entry.id}" placeholder="--">
                    </div>
                </div>
                <div class="like-dislike">
                    <button class="btn-like ${entry.like === true ? 'active' : ''}" data-id="${entry.id}" title="Like">&#128077;</button>
                    <button class="btn-dislike ${entry.like === false ? 'active' : ''}" data-id="${entry.id}" title="Dislike">&#128078;</button>
                </div>
            </div>
            <div class="reading-notes">
                <label>Notes</label>
                <textarea data-field="readingNotes" data-id="${entry.id}" placeholder="Any thoughts while reading...">${escapeHTML(entry.readingNotes)}</textarea>
            </div>
        </div>
    `;
}

function renderFinishedSection(entry) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        const filled = entry.finalRating && i <= entry.finalRating ? 'filled' : '';
        starsHTML += `<button class="star ${filled}" data-rating="${i}" data-id="${entry.id}">&#9733;</button>`;
    }

    return `
        <div class="card-section">
            <div class="afterthought-section">
                <label>Rating</label>
                <div class="star-rating" data-id="${entry.id}">
                    ${starsHTML}
                </div>
                ${entry.dateFinished ? `<span class="card-date">Finished ${formatDate(entry.dateFinished)}</span>` : ''}
                <label>Afterthought</label>
                <textarea data-field="afterthought" data-id="${entry.id}" placeholder="Your final thoughts...">${escapeHTML(entry.afterthought)}</textarea>
            </div>
        </div>
    `;
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function attachCardListeners() {
    document.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const card = this.closest('.entry-card');
            const id = card.dataset.id;
            const idx = Number(this.dataset.idx);
            const entry = entries.find(e => e.id === id);
            if (!entry) return;
            entry.interestTags.splice(idx, 1);
            renderEntries();
        });
    });

    document.querySelectorAll('.btn-add-tag').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const dropdown = this.parentElement.querySelector('.tag-dropdown');
            dropdown.classList.toggle('hidden');
        });
    });

    document.querySelectorAll('.tag-option').forEach(opt => {
        opt.addEventListener('click', function (e) {
            e.stopPropagation();
            const card = this.closest('.entry-card');
            const id = card.dataset.id;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;

            const needsDetail = this.dataset.needsDetail === 'true';
            const tagId = this.dataset.tagId || 'custom';
            const label = this.textContent.trim();
            const placeholder = this.dataset.placeholder || '';

            if (needsDetail) {
                const detailPanel = card.querySelector('.tag-detail-panel');
                const detailInput = detailPanel.querySelector('.tag-detail-input');
                const confirmBtn = detailPanel.querySelector('.btn-confirm-tag');
                detailInput.placeholder = placeholder;
                detailInput.value = '';
                detailInput.dataset.tagId = tagId;
                detailInput.dataset.tagLabel = label;
                confirmBtn.dataset.entryId = id;
                detailPanel.classList.remove('hidden');
                detailInput.focus();
            } else {
                entry.interestTags.push({ id: tagId, text: label, detail: '' });
                renderEntries();
            }
        });
    });

    document.querySelectorAll('.btn-confirm-tag').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.dataset.entryId;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;

            const panel = this.closest('.tag-detail-panel');
            const input = panel.querySelector('.tag-detail-input');
            const tagId = input.dataset.tagId;
            const tagLabel = input.dataset.tagLabel;
            const detail = input.value.trim();

            if (tagId === 'custom') {
                if (!detail) return;
                entry.interestTags.push({ id: 'custom_' + generateId(), text: detail, detail: '' });
            } else {
                entry.interestTags.push({ id: tagId, text: tagLabel, detail: detail });
            }
            renderEntries();
        });
    });

    document.querySelectorAll('.tag-detail-input').forEach(input => {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const panel = this.closest('.tag-detail-panel');
                panel.querySelector('.btn-confirm-tag').click();
            }
        });
    });

    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', function () {
            const id = this.dataset.id;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;

            const newStatus = this.value;
            const oldStatus = entry.status;
            entry.status = newStatus;

            if (newStatus === 'finished' && oldStatus !== 'finished') {
                entry.dateFinished = new Date().toISOString();
            }
            if (newStatus !== 'finished') {
                entry.dateFinished = null;
            }

            renderEntries();
        });
    });

    document.querySelectorAll('.progress-section input[type="number"]').forEach(input => {
        input.addEventListener('change', function () {
            const id = this.dataset.id;
            const field = this.dataset.field;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;

            entry[field] = this.value ? parseFloat(this.value) : null;
        });
    });

    document.querySelectorAll('.reading-notes textarea').forEach(textarea => {
        textarea.addEventListener('input', function () {
            const id = this.dataset.id;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;
            entry.readingNotes = this.value;
        });
    });

    document.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.dataset.id;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;
            entry.like = entry.like === true ? null : true;
            renderEntries();
        });
    });

    document.querySelectorAll('.btn-dislike').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.dataset.id;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;
            entry.like = entry.like === false ? null : false;
            renderEntries();
        });
    });

    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function () {
            const id = this.dataset.id;
            const rating = Number(this.dataset.rating);
            const entry = entries.find(e => e.id === id);
            if (!entry) return;
            entry.finalRating = entry.finalRating === rating ? null : rating;
            renderEntries();
        });
    });

    document.querySelectorAll('.afterthought-section textarea').forEach(textarea => {
        textarea.addEventListener('input', function () {
            const id = this.dataset.id;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;
            entry.afterthought = this.value;
        });
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.dataset.id;
            const entry = entries.find(e => e.id === id);
            if (!entry) return;
            openModal(entry);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.dataset.id;
            if (confirm('Delete this entry?')) {
                entries = entries.filter(e => e.id !== id);
                renderEntries();
            }
        });
    });
}

function openModal(entry) {
    modal.classList.remove('hidden');
    if (entry) {
        modalTitle.textContent = 'Edit Entry';
        modalSubmitBtn.textContent = 'Save Changes';
        entryTitleInput.value = entry.title;
        editingIdInput.value = entry.id;
        const radio = document.querySelector(`input[name="entryType"][value="${entry.type}"]`);
        if (radio) radio.checked = true;
    } else {
        modalTitle.textContent = 'Add New Entry';
        modalSubmitBtn.textContent = 'Add Entry';
        entryForm.reset();
        editingIdInput.value = '';
    }
    entryTitleInput.focus();
}

function closeModal() {
    modal.classList.add('hidden');
    entryForm.reset();
    editingIdInput.value = '';
}

function handleSubmit(e) {
    e.preventDefault();
    const title = entryTitleInput.value.trim();
    const type = document.querySelector('input[name="entryType"]:checked').value;
    const editingId = editingIdInput.value;

    if (!title) return;

    if (editingId) {
        const entry = entries.find(e => e.id === editingId);
        if (entry) {
            entry.title = title;
            entry.type = type;
        }
    } else {
        entries.push(createEntry(title, type));
    }

    closeModal();
    renderEntries();
}

addEntryBtn.addEventListener('click', () => openModal(null));
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
});
entryForm.addEventListener('submit', handleSubmit);
saveBtn.addEventListener('click', saveToStorage);
loadBtn.addEventListener('click', loadFromStorage);
clearBtn.addEventListener('click', clearStorage);

sortSelect.addEventListener('change', function () {
    currentSort = this.value;
    renderEntries();
});

filterTabs.forEach(tab => {
    tab.addEventListener('click', function () {
        filterTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderEntries();
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    document.addEventListener('click', function () {
        document.querySelectorAll('.tag-dropdown:not(.hidden)').forEach(d => d.classList.add('hidden'));
    });

    loadFromStorage();
});
