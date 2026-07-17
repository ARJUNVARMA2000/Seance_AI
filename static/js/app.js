/**
 * SeanceAI archival salon interface.
 * Keeps the existing Flask/OpenRouter endpoints and localStorage contracts while
 * presenting generated dialogue as an interpretive transcript with visible limits.
 */

const state = {
    figures: [],
    models: [],
    curatedCombos: {},
    currentTab: 'dinner-party',
    currentFigure: null,
    activeComboId: 'right-to-rule',
    selectedGuests: [],
    selectedModel: null,
    conversationHistory: [],
    partyConversationHistory: [],
    isLoading: false,
    savedConversations: [],
    currentConversationId: null,
    conversationBranches: {},
    currentBranchId: 'main',
    lastFocusedElement: null
};

const elements = {
    selectionView: document.getElementById('selection-view'),
    dinnerPartyView: document.getElementById('dinner-party-view'),
    conversationView: document.getElementById('conversation-view'),
    dinnerPartyConversationView: document.getElementById('dinner-party-conversation-view'),
    tabNavigation: document.getElementById('tab-navigation'),
    figuresGrid: document.getElementById('figures-grid'),
    featuredGrid: document.getElementById('featured-grid'),
    guestGrid: document.getElementById('guest-grid'),
    comboButtons: document.getElementById('combo-buttons'),
    heroParticipants: document.getElementById('hero-participants'),
    heroEnterBtn: document.getElementById('hero-enter-btn'),
    searchInput: document.getElementById('search-input'),
    eraFilter: document.getElementById('era-filter'),
    guestCount: document.getElementById('guest-count'),
    clearGuestsBtn: document.getElementById('clear-guests-btn'),
    startPartyBtn: document.getElementById('start-party-btn'),
    partyGuestsInfo: document.getElementById('party-guests-info'),
    partyContextRail: document.getElementById('party-context-rail'),
    partyProvenancePanel: document.getElementById('party-provenance-panel'),
    partyMessages: document.getElementById('party-messages'),
    partyTypingIndicator: document.getElementById('party-typing-indicator'),
    partyChatForm: document.getElementById('party-chat-form'),
    partyMessageInput: document.getElementById('party-message-input'),
    partySendBtn: document.getElementById('party-send-btn'),
    partyBackBtn: document.getElementById('party-back-btn'),
    partyShareBtn: document.getElementById('party-share-btn'),
    partyCopyBtn: document.getElementById('party-copy-btn'),
    partyDownloadBtn: document.getElementById('party-download-btn'),
    partyModelSelector: document.getElementById('party-model-selector'),
    partySuggestionPills: document.getElementById('party-suggestion-pills'),
    currentFigureInfo: document.getElementById('current-figure-info'),
    figureContextRail: document.getElementById('figure-context-rail'),
    figureProvenancePanel: document.getElementById('figure-provenance-panel'),
    messages: document.getElementById('messages'),
    typingIndicator: document.getElementById('typing-indicator'),
    starterQuestions: document.getElementById('starter-questions'),
    questionButtons: document.getElementById('question-buttons'),
    chatForm: document.getElementById('chat-form'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    backBtn: document.getElementById('back-btn'),
    shareBtn: document.getElementById('share-btn'),
    copyBtn: document.getElementById('copy-btn'),
    downloadBtn: document.getElementById('download-btn'),
    modelSelector: document.getElementById('model-selector'),
    branchSelector: document.getElementById('branch-selector'),
    branchSelectorWrapper: document.querySelector('.branch-selector-wrapper'),
    createBranchBtn: document.getElementById('create-branch-btn'),
    savedConversationsBtn: document.getElementById('saved-conversations-btn'),
    savedPanel: document.getElementById('saved-panel'),
    savedOverlay: document.getElementById('saved-overlay'),
    savedList: document.getElementById('saved-list'),
    closeSavedPanel: document.getElementById('close-saved-panel'),
    themeToggle: document.getElementById('theme-toggle'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    initTheme();
    loadSavedConversations();
    setupEventListeners();

    try {
        await Promise.all([loadFigures(), loadModels(), loadCuratedCombos()]);
        renderAllCollections();
        renderModelSelectors();
        handleShareLink();
    } catch (error) {
        console.error('Initialization failed:', error);
        showToast('The catalog could not be opened. Please refresh the page.');
    }
}

async function loadFigures() {
    const response = await fetch('/api/figures');
    if (!response.ok) throw new Error('Failed to load figures');
    const data = await response.json();
    state.figures = data.figures || [];
}

async function loadModels() {
    const response = await fetch('/api/models');
    if (!response.ok) throw new Error('Failed to load models');
    const data = await response.json();
    state.models = data.models || [];
    state.selectedModel = localStorage.getItem('seanceai-model') || data.default;
}

async function loadCuratedCombos() {
    const response = await fetch('/api/dinner-party/combos');
    if (!response.ok) throw new Error('Failed to load salons');
    const data = await response.json();
    state.curatedCombos = data.combos || {};
}

function renderAllCollections() {
    renderHeroParticipants();
    renderComboButtons();
    renderFeaturedFigures();
    renderGuestGrid();
    renderFiguresGrid();
}

function imageUrl(figure) {
    return `/static/images/figures/${encodeURIComponent(figure.id)}.svg`;
}

function findFigure(id) {
    return state.figures.find(figure => figure.id === id);
}

function renderHeroParticipants() {
    const combo = state.curatedCombos['right-to-rule'];
    if (!combo) return;
    elements.heroParticipants.innerHTML = combo.guests.map(id => {
        const figure = findFigure(id);
        if (!figure) return '';
        return `
            <figure class="hero-portrait">
                <img src="${imageUrl(figure)}" alt="Interpretive portrait of ${escapeHtml(figure.name)}">
                <figcaption>${escapeHtml(figure.name)}<span>${escapeHtml(figure.dates)}</span></figcaption>
            </figure>`;
    }).join('');
}

function renderComboButtons() {
    const combos = Object.entries(state.curatedCombos);
    elements.comboButtons.innerHTML = '';
    combos.forEach(([id, combo], index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `combo-card${state.activeComboId === id ? ' selected' : ''}`;
        button.dataset.combo = id;
        button.setAttribute('aria-label', `Enter salon: ${combo.name}`);
        button.innerHTML = `
            <span class="combo-number">0${index + 1}</span>
            <span class="combo-title">${escapeHtml(combo.name)}</span>
            <span class="combo-copy">${escapeHtml(combo.description)}</span>
            <span class="combo-meta">${combo.guests.length} participants<br>${escapeHtml(combo.period || '')}</span>`;
        button.addEventListener('click', () => openCuratedSalon(id));
        elements.comboButtons.appendChild(button);
    });
}

function renderFeaturedFigures() {
    const featured = state.figures.filter(figure => figure.featured);
    elements.featuredGrid.innerHTML = '';
    featured.forEach(figure => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'feature-card';
        button.setAttribute('aria-label', `Open catalog record for ${figure.name}`);
        button.innerHTML = `
            <span class="portrait-frame">
                <img src="${imageUrl(figure)}" loading="lazy" alt="Interpretive portrait of ${escapeHtml(figure.name)}">
            </span>
            <span class="record-id">${escapeHtml(figure.catalog_id)}</span>
            <h3>${escapeHtml(figure.name)}</h3>
            <p>${escapeHtml(figure.dates)} · Knowledge ends ${escapeHtml(figure.knowledge_cutoff)}</p>`;
        button.addEventListener('click', () => selectFigure(figure));
        elements.featuredGrid.appendChild(button);
    });
}

function renderGuestGrid() {
    elements.guestGrid.innerHTML = '';
    state.figures.forEach(figure => {
        const isSelected = state.selectedGuests.includes(figure.id);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `guest-card${isSelected ? ' selected' : ''}`;
        button.dataset.figureId = figure.id;
        button.setAttribute('aria-pressed', String(isSelected));
        button.setAttribute('aria-label', `${isSelected ? 'Remove' : 'Add'} ${figure.name} ${isSelected ? 'from' : 'to'} the salon`);
        button.innerHTML = `
            <span class="guest-thumb"><img src="${imageUrl(figure)}" loading="lazy" alt=""></span>
            <span><strong>${escapeHtml(figure.name)}</strong><small>${escapeHtml(figure.dates)}<br>Cutoff ${escapeHtml(figure.knowledge_cutoff)}</small></span>`;
        button.addEventListener('click', () => toggleGuest(figure.id));
        elements.guestGrid.appendChild(button);
    });
    updateGuestSelection();
}

function renderFiguresGrid() {
    const query = (elements.searchInput.value || '').trim().toLowerCase();
    const era = elements.eraFilter.value;
    const figures = state.figures.filter(figure => {
        const haystack = `${figure.name} ${figure.title} ${figure.tagline} ${figure.era}`.toLowerCase();
        return (!query || haystack.includes(query)) && (era === 'all' || figure.era === era);
    });

    elements.figuresGrid.innerHTML = '';
    if (!figures.length) {
        elements.figuresGrid.innerHTML = '<p class="empty-state">No catalog records match those filters.</p>';
        return;
    }

    figures.forEach((figure, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'archive-record';
        button.setAttribute('aria-label', `Open ${figure.name}`);
        button.innerHTML = `
            <span class="archive-index">${String(index + 1).padStart(3, '0')}</span>
            <span class="archive-thumb"><img src="${imageUrl(figure)}" loading="lazy" alt=""></span>
            <span class="archive-name"><strong>${escapeHtml(figure.name)}</strong><small>${escapeHtml(figure.dates)} · ${escapeHtml(figure.era)}</small></span>
            <span class="archive-discipline">${escapeHtml(figure.title)}</span>
            <span class="archive-cutoff">Knowledge ends<br>${escapeHtml(figure.knowledge_cutoff)}</span>
            <span class="archive-arrow" aria-hidden="true">→</span>`;
        button.addEventListener('click', () => selectFigure(figure));
        elements.figuresGrid.appendChild(button);
    });
}

function renderModelSelectors() {
    [elements.modelSelector, elements.partyModelSelector].forEach(selector => {
        selector.innerHTML = '';
        const tiers = [
            ['swift', 'Swift'],
            ['balanced', 'Balanced'],
            ['advanced', 'Advanced']
        ];
        tiers.forEach(([tier, label]) => {
            const models = state.models.filter(model => model.tier === tier);
            if (!models.length) return;
            const group = document.createElement('optgroup');
            group.label = label;
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                option.selected = model.id === state.selectedModel;
                group.appendChild(option);
            });
            selector.appendChild(group);
        });
    });
}

function switchTab(tabName) {
    state.currentTab = tabName;
    hideAllViews();
    const target = tabName === 'dinner-party' ? elements.dinnerPartyView : elements.selectionView;
    target.classList.add('active');
    document.querySelectorAll('[data-tab]').forEach(button => {
        const active = button.dataset.tab === tabName;
        button.classList.toggle('active', active);
        if (button.classList.contains('tab-btn')) {
            if (active) button.setAttribute('aria-current', 'page');
            else button.removeAttribute('aria-current');
        }
    });
    focusView(target);
}

function hideAllViews() {
    [elements.selectionView, elements.dinnerPartyView, elements.conversationView, elements.dinnerPartyConversationView]
        .forEach(view => view.classList.remove('active'));
}

function focusView(view) {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    requestAnimationFrame(() => {
        const heading = view.querySelector('h1, h2');
        if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
        } else {
            view.focus({ preventScroll: true });
        }
    });
}

function toggleGuest(figureId) {
    const index = state.selectedGuests.indexOf(figureId);
    if (index >= 0) {
        state.selectedGuests.splice(index, 1);
    } else if (state.selectedGuests.length < 5) {
        state.selectedGuests.push(figureId);
    } else {
        showToast('A salon may include no more than five participants.');
        return;
    }
    state.activeComboId = null;
    renderGuestGrid();
    renderComboButtons();
}

function updateGuestSelection() {
    const count = state.selectedGuests.length;
    elements.guestCount.textContent = `${count} participant${count === 1 ? '' : 's'} selected`;
    elements.clearGuestsBtn.disabled = count === 0;
    elements.startPartyBtn.disabled = count < 2 || count > 5;
}

function clearGuests() {
    state.selectedGuests = [];
    state.activeComboId = null;
    renderGuestGrid();
    renderComboButtons();
}

function openCuratedSalon(comboId) {
    const combo = state.curatedCombos[comboId];
    if (!combo) return;
    state.activeComboId = comboId;
    state.selectedGuests = combo.guests.slice(0, 5);
    renderGuestGrid();
    renderComboButtons();
    startDinnerParty();
}

function startDinnerParty() {
    if (state.selectedGuests.length < 2 || state.selectedGuests.length > 5) return;
    state.partyConversationHistory = [];
    state.currentConversationId = generateConversationId();
    renderPartySession();
    elements.partyMessages.innerHTML = '';
    addPartyWelcome();
    showDinnerPartyConversation();
}

function renderPartySession() {
    const guests = state.selectedGuests.map(findFigure).filter(Boolean);
    const combo = state.activeComboId ? state.curatedCombos[state.activeComboId] : null;
    elements.partyGuestsInfo.innerHTML = `
        <strong>${escapeHtml(combo?.name || 'Open-table salon')}</strong>
        <span>${guests.length} participants · generated interpretation</span>`;

    elements.partyContextRail.innerHTML = `
        <section class="rail-section">
            <p class="catalog-label">Curatorial frame</p>
            <h2>${escapeHtml(combo?.name || 'Open-table salon')}</h2>
            <p>${escapeHtml(combo?.description || 'A custom cross-temporal encounter assembled from the persona archive.')}</p>
        </section>
        <section class="rail-section">
            <p class="catalog-label">Central question</p>
            <p>${escapeHtml(combo?.central_question || 'What changes when these historical positions are placed in conversation?')}</p>
        </section>
        <section class="rail-section">
            <p class="catalog-label">Knowledge rail</p>
            ${guests.map(figure => `
                <p class="knowledge-boundary"><strong>${escapeHtml(figure.name)}</strong><span>${escapeHtml(figure.dates)} · cutoff ${escapeHtml(figure.knowledge_cutoff)}</span></p>`).join('')}
        </section>`;

    elements.partyProvenancePanel.innerHTML = `
        <section class="rail-section">
            <p class="catalog-label">Interpretive status</p>
            <span class="source-status">AI-generated · not quotation</span>
            <p>This is a counterfactual encounter. The participants are not represented as having met or heard one another's actual words.</p>
        </section>
        <section class="rail-section">
            <p class="catalog-label">Persona provenance</p>
            <span class="source-status">Sources pending verification</span>
            <p>No verified bibliography is stored in this repository. Existing persona notes are interpretive scaffolding, not citations.</p>
        </section>
        <section class="rail-section">
            <p class="catalog-label">Portrait record</p>
            <p>Interpretive likenesses. Source and license records are pending verification.</p>
        </section>`;

    const questions = combo?.starter_questions || [
        'Where do your assumptions most sharply conflict?',
        'Which part of this question lies beyond your lifetime?',
        'What evidence would have mattered in your own period?'
    ];
    renderSuggestionPills(questions);
}

function addPartyWelcome() {
    const combo = state.activeComboId ? state.curatedCombos[state.activeComboId] : null;
    const content = combo
        ? `This salon has been assembled around the question: “${combo.central_question}” Each participant is bound by the end of their lifetime; disagreement across periods is interpretive, not a record of an actual meeting.`
        : 'This open-table salon is ready. Each participant is bound by the end of their lifetime; disagreement across periods is interpretive, not a record of an actual meeting.';
    addPartyMessage('system', content);
}

function showDinnerPartyConversation() {
    hideAllViews();
    elements.dinnerPartyConversationView.classList.add('active');
    renderPartySession();
    focusView(elements.dinnerPartyConversationView);
}

function showDinnerPartySelection() {
    switchTab('dinner-party');
}

async function selectFigure(figure) {
    state.currentFigure = figure;
    state.conversationHistory = [];
    state.currentConversationId = generateConversationId();
    state.currentBranchId = 'main';
    state.conversationBranches = {
        main: { id: 'main', name: 'Main', history: [], createdAt: new Date().toISOString() }
    };
    renderFigureSession();
    elements.messages.innerHTML = '';
    addFigureWelcome();
    renderStarterQuestions();
    renderBranchSelector();
    hideAllViews();
    elements.conversationView.classList.add('active');
    focusView(elements.conversationView);
}

function renderFigureSession() {
    const figure = state.currentFigure;
    if (!figure) return;
    elements.currentFigureInfo.innerHTML = `
        <strong>${escapeHtml(figure.name)}</strong>
        <span>${escapeHtml(figure.dates)} · ${escapeHtml(figure.catalog_id)}</span>`;
    elements.figureContextRail.innerHTML = `
        <section class="rail-section">
            <p class="catalog-label">Catalog record</p>
            <h2>${escapeHtml(figure.name)}</h2>
            <p>${escapeHtml(figure.curatorial_introduction)}</p>
        </section>
        <section class="rail-section">
            <p class="catalog-label">Period &amp; place</p>
            <p>${escapeHtml(figure.dates)}<br>${escapeHtml(figure.locations)}</p>
        </section>
        <section class="rail-section knowledge-boundary">
            <strong>Knowledge ends ${escapeHtml(figure.knowledge_cutoff)}</strong>
            <span>Earlier dates do not guarantee firsthand knowledge.</span>
        </section>`;
    elements.figureProvenancePanel.innerHTML = `
        <section class="rail-section">
            <p class="catalog-label">Persona provenance</p>
            <span class="source-status">${escapeHtml(figure.source_status)}</span>
            <p>No verified primary or secondary source list is stored for this record.</p>
        </section>
        <section class="rail-section">
            <p class="catalog-label">Bias &amp; uncertainty</p>
            <p>${escapeHtml(figure.limitations)}</p>
        </section>
        <section class="rail-section">
            <p class="catalog-label">Portrait provenance</p>
            <p>${escapeHtml(figure.portrait_status)}</p>
        </section>`;
}

function addFigureWelcome() {
    const figure = state.currentFigure;
    addMessage('system', `Catalog note: this generated interpretation is limited to ${figure.name}’s lifetime (${figure.dates}). Questions requiring later knowledge should receive an explicit boundary rather than an invented answer.`);
}

function renderStarterQuestions() {
    const label = elements.starterQuestions.querySelector('.catalog-label');
    if (label) label.textContent = 'Questions from the catalog';
    elements.questionButtons.innerHTML = '';
    const questions = state.currentFigure?.starter_questions || [];
    questions.slice(0, 4).forEach(question => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'question-btn';
        button.textContent = question;
        button.addEventListener('click', () => {
            elements.messageInput.value = question;
            updateSendButtonState();
            elements.messageInput.focus();
        });
        elements.questionButtons.appendChild(button);
    });
    elements.starterQuestions.classList.toggle('hidden', questions.length === 0);
}

function addMessage(role, content, showSuggestions = false, messageIndex = null) {
    const article = document.createElement('article');
    article.className = `message ${role}`;
    const figure = state.currentFigure;
    const isUser = role === 'user';
    const isSystem = role === 'system';
    article.innerHTML = `
        <div class="message-meta">
            ${!isUser && !isSystem && figure ? `<img src="${imageUrl(figure)}" alt="">` : ''}
            ${isUser ? 'Moderator’s question' : isSystem ? 'Curatorial note' : escapeHtml(figure?.name || 'Interpretation')}
        </div>
        <div class="message-content">${formatMessage(content)}</div>
        ${!isUser && !isSystem ? plausibilityMarkup(figure) : ''}`;
    if (messageIndex !== null && !isSystem) article.dataset.messageIndex = String(messageIndex);
    elements.messages.appendChild(article);
    scrollTranscript(elements.messages);
    return article;
}

function addPartyMessage(role, content, figureId = null) {
    const figure = figureId ? findFigure(figureId) : null;
    const article = document.createElement('article');
    article.className = `message ${role}`;
    const label = role === 'user' ? 'Moderator’s question' : role === 'system' ? 'Curatorial note' : figure?.name || 'Interpretation';
    article.innerHTML = `
        <div class="message-meta">
            ${figure ? `<img src="${imageUrl(figure)}" alt="">` : ''}
            ${escapeHtml(label)}
        </div>
        <div class="message-content">${formatMessage(content)}</div>
        ${figure ? plausibilityMarkup(figure) : ''}`;
    elements.partyMessages.appendChild(article);
    scrollTranscript(elements.partyMessages);
    return article;
}

function plausibilityMarkup(figure) {
    if (!figure) return '';
    return `<details class="plausibility-note">
        <summary>Why this may be historically plausible</summary>
        <p>Interpretive basis: the stored persona description, the lifetime boundary ending ${escapeHtml(figure.knowledge_cutoff)}, and the limitation note shown in this catalog. ${escapeHtml(figure.source_status)}; this is not chain-of-thought or a verified citation.</p>
    </details>`;
}

function createStreamingMessage(container, label, figure = null) {
    const article = document.createElement('article');
    article.className = 'message figure streaming-message';
    article.innerHTML = `
        <div class="message-meta">${figure ? `<img src="${imageUrl(figure)}" alt="">` : ''}${escapeHtml(label)}</div>
        <div class="message-content"><span class="streaming-text"></span><span class="cursor" aria-hidden="true"></span></div>`;
    container.appendChild(article);
    return article;
}

function updateStreamingMessage(article, content) {
    const text = article.querySelector('.streaming-text');
    text.innerHTML = formatMessage(content);
    scrollTranscript(article.parentElement);
}

function finalizeStreamingMessage(article, content, figure = null) {
    article.classList.remove('streaming-message');
    article.querySelector('.message-content').innerHTML = formatMessage(content);
    if (figure) article.insertAdjacentHTML('beforeend', plausibilityMarkup(figure));
}

async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || state.isLoading || !state.currentFigure) return;

    const requestHistory = state.conversationHistory.slice();
    state.conversationHistory.push({ role: 'user', content: message });
    addMessage('user', message, false, state.conversationHistory.length - 1);
    elements.messageInput.value = '';
    updateSendButtonState();
    elements.starterQuestions.classList.add('hidden');
    setLoading(true, 'figure');

    const article = createStreamingMessage(elements.messages, state.currentFigure.name, state.currentFigure);
    const requestBody = {
        figure_id: state.currentFigure.id,
        message,
        history: requestHistory,
        model: state.selectedModel
    };

    try {
        const content = await streamRequest('/api/chat/stream', requestBody, partial => updateStreamingMessage(article, partial));
        if (!content.trim()) throw new Error('Empty streaming response');
        finalizeStreamingMessage(article, content, state.currentFigure);
        state.conversationHistory.push({ role: 'assistant', content });
        fetchFigureSuggestions(content);
    } catch (streamError) {
        console.warn('Streaming unavailable, using standard response:', streamError);
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Request failed');
            finalizeStreamingMessage(article, data.response, state.currentFigure);
            state.conversationHistory.push({ role: 'assistant', content: data.response });
            fetchFigureSuggestions(data.response);
        } catch (error) {
            article.remove();
            addMessage('system', error.message || 'The response could not be completed.');
        }
    } finally {
        setLoading(false, 'figure');
        saveCurrentBranchHistory();
        autoSaveConversation();
    }
}

async function sendPartyMessage() {
    const message = elements.partyMessageInput.value.trim();
    if (!message || state.isLoading || state.selectedGuests.length < 2) return;

    const requestHistory = state.partyConversationHistory.slice();
    state.partyConversationHistory.push({ role: 'user', content: message });
    addPartyMessage('user', message);
    elements.partyMessageInput.value = '';
    updatePartySendButtonState();
    setLoading(true, 'party');

    const article = createStreamingMessage(elements.partyMessages, 'Salon response');
    const requestBody = {
        guests: state.selectedGuests,
        message,
        history: requestHistory,
        model: state.selectedModel
    };

    try {
        const content = await streamRequest('/api/dinner-party/chat/stream', requestBody, partial => updateStreamingMessage(article, partial));
        if (!content.trim()) throw new Error('Empty streaming response');
        article.remove();
        parseAndDisplayPartyResponses(content);
        state.partyConversationHistory.push({ role: 'assistant', content });
        fetchPartySuggestions(content);
    } catch (streamError) {
        console.warn('Party stream unavailable, using standard response:', streamError);
        try {
            const response = await fetch('/api/dinner-party/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Request failed');
            article.remove();
            (data.responses || []).forEach(item => addPartyMessage('figure', item.response, item.figure_id));
            state.partyConversationHistory.push({ role: 'assistant', content: data.raw_response });
            fetchPartySuggestions(data.raw_response);
        } catch (error) {
            article.remove();
            addPartyMessage('system', error.message || 'The salon response could not be completed.');
        }
    } finally {
        setLoading(false, 'party');
        autoSaveConversation();
    }
}

async function streamRequest(url, body, onUpdate) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify(body)
    });
    if (!response.ok || !response.body) {
        let message = `Request failed (${response.status})`;
        try { message = (await response.json()).error || message; } catch (_) { /* no JSON body */ }
        throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

    const processLine = line => {
        if (!line.startsWith('data:')) return;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') return;
        const data = JSON.parse(payload);
        if (data.error) throw new Error(data.error);
        if (data.content) {
            content += data.content;
            onUpdate(content);
        }
    };

    while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) processLine(line);
        if (done) break;
    }
    if (buffer.trim()) processLine(buffer);
    return content;
}

function parseAndDisplayPartyResponses(raw) {
    const markers = state.selectedGuests.map(id => `\\[${escapeRegExp(id)}\\]:`).join('|');
    if (!markers) return;
    const regex = new RegExp(`(${markers})`, 'gi');
    const pieces = raw.split(regex).filter(Boolean);
    let currentId = null;
    let rendered = 0;

    pieces.forEach(piece => {
        const match = piece.match(/^\[([^\]]+)\]:$/i);
        if (match) {
            currentId = match[1].toLowerCase();
        } else if (currentId && piece.trim()) {
            addPartyMessage('figure', piece.trim(), currentId);
            rendered += 1;
            currentId = null;
        }
    });

    if (!rendered) addPartyMessage('figure', raw.trim(), state.selectedGuests[0]);
}

function renderSuggestionPills(suggestions) {
    elements.partySuggestionPills.innerHTML = '';
    suggestions.slice(0, 3).forEach(question => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'suggestion-btn';
        button.textContent = question;
        button.addEventListener('click', () => {
            elements.partyMessageInput.value = question;
            updatePartySendButtonState();
            elements.partyMessageInput.focus();
        });
        elements.partySuggestionPills.appendChild(button);
    });
}

async function fetchPartySuggestions(lastResponse) {
    try {
        const response = await fetch('/api/dinner-party/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guests: state.selectedGuests,
                history: state.partyConversationHistory,
                last_response: lastResponse
            })
        });
        const data = await response.json();
        if (Array.isArray(data.suggestions)) renderSuggestionPills(data.suggestions);
    } catch (error) {
        console.warn('Suggestion request failed:', error);
    }
}

async function fetchFigureSuggestions(lastResponse) {
    if (!state.currentFigure) return;
    try {
        const response = await fetch('/api/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                figure_id: state.currentFigure.id,
                history: state.conversationHistory,
                last_response: lastResponse
            })
        });
        const data = await response.json();
        if (!Array.isArray(data.suggestions) || !data.suggestions.length) return;
        const label = elements.starterQuestions.querySelector('.catalog-label');
        if (label) label.textContent = 'Generated follow-up prompts';
        elements.questionButtons.innerHTML = '';
        data.suggestions.slice(0, 3).forEach(question => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'question-btn';
            button.textContent = question;
            button.addEventListener('click', () => {
                elements.messageInput.value = question;
                updateSendButtonState();
                elements.messageInput.focus();
            });
            elements.questionButtons.appendChild(button);
        });
        elements.starterQuestions.classList.remove('hidden');
    } catch (error) {
        console.warn('Figure suggestion request failed:', error);
    }
}

function setLoading(loading, mode) {
    state.isLoading = loading;
    if (mode === 'party') {
        elements.partyTypingIndicator.classList.toggle('hidden', !loading);
        elements.partyMessageInput.disabled = loading;
        elements.partySendBtn.disabled = loading || !elements.partyMessageInput.value.trim();
    } else {
        elements.typingIndicator.classList.toggle('hidden', !loading);
        elements.messageInput.disabled = loading;
        elements.sendBtn.disabled = loading || !elements.messageInput.value.trim();
    }
}

function updateSendButtonState() {
    elements.sendBtn.disabled = state.isLoading || !elements.messageInput.value.trim();
}

function updatePartySendButtonState() {
    elements.partySendBtn.disabled = state.isLoading || !elements.partyMessageInput.value.trim();
}

function scrollTranscript(container) {
    requestAnimationFrame(() => container.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }));
}

function formatMessage(text) {
    const safe = escapeHtml(text || '');
    return safe
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .split(/\n{2,}/)
        .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initTheme() {
    if (localStorage.getItem('seanceai-theme') === 'dark') document.body.classList.add('dark-mode');
}

function toggleTheme() {
    const dark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('seanceai-theme', dark ? 'dark' : 'light');
}

function handleModelChange(value) {
    state.selectedModel = value;
    localStorage.setItem('seanceai-model', value);
    elements.modelSelector.value = value;
    elements.partyModelSelector.value = value;
}

function copyText(text, successMessage) {
    navigator.clipboard.writeText(text)
        .then(() => showToast(successMessage))
        .catch(() => showToast('Copying is not available in this browser.'));
}

function figureTranscriptText() {
    const figure = state.currentFigure;
    const lines = [
        `SeanceAI — Generated interpretive conversation with ${figure?.name || 'historical figure'}`,
        `Knowledge cutoff: ${figure?.knowledge_cutoff || 'unknown'}`,
        'Sources: pending verification',
        'This dialogue is AI-generated and is not an authentic quotation.',''
    ];
    state.conversationHistory.forEach(message => lines.push(`${message.role === 'user' ? 'Moderator' : figure.name}: ${message.content}`, ''));
    return lines.join('\n');
}

function partyTranscriptText() {
    const combo = state.activeComboId ? state.curatedCombos[state.activeComboId] : null;
    const names = state.selectedGuests.map(id => findFigure(id)?.name).filter(Boolean).join(', ');
    const lines = [
        `SeanceAI — ${combo?.name || 'Open-table salon'}`,
        `Participants: ${names}`,
        'Counterfactual AI-generated interpretation; not a record of an actual meeting.',
        'Sources: pending verification',''
    ];
    state.partyConversationHistory.forEach(message => lines.push(`${message.role === 'user' ? 'Moderator' : 'Salon'}: ${message.content}`, ''));
    return lines.join('\n');
}

function downloadText(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Transcript exported.');
}

function generateConversationId() {
    return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateShareId() {
    return Math.random().toString(36).slice(2, 10);
}

function shareConversation(type) {
    const shareId = generateShareId();
    const key = `seanceai-share-${shareId}`;
    const payload = type === 'dinner-party' ? {
        type,
        guests: state.selectedGuests,
        history: state.partyConversationHistory,
        combo_id: state.activeComboId,
        guestNames: state.selectedGuests.map(id => findFigure(id)?.name).filter(Boolean).join(', ')
    } : {
        type: 'seance',
        figure_id: state.currentFigure.id,
        figure_name: state.currentFigure.name,
        history: state.conversationHistory,
        branches: state.conversationBranches,
        branch_id: state.currentBranchId
    };
    localStorage.setItem(key, JSON.stringify(payload));
    const url = `${window.location.origin}${window.location.pathname}#share=${shareId}`;
    copyText(url, 'A same-browser session link was copied.');
}

function handleShareLink() {
    if (!window.location.hash.startsWith('#share=')) return;
    const key = `seanceai-share-${window.location.hash.slice(7)}`;
    try {
        const payload = JSON.parse(localStorage.getItem(key));
        if (!payload) throw new Error('Not found');
        if (payload.type === 'dinner-party') {
            state.selectedGuests = payload.guests.filter(id => findFigure(id)).slice(0, 5);
            state.partyConversationHistory = payload.history || [];
            state.activeComboId = payload.combo_id || null;
            elements.partyMessages.innerHTML = '';
            renderPartySession();
            replayPartyHistory();
            showDinnerPartyConversation();
        } else {
            const figure = findFigure(payload.figure_id);
            if (!figure) throw new Error('Figure not found');
            state.currentFigure = figure;
            state.conversationHistory = payload.history || [];
            state.conversationBranches = payload.branches || {};
            state.currentBranchId = payload.branch_id || 'main';
            renderFigureSession();
            elements.messages.innerHTML = '';
            replayFigureHistory();
            renderStarterQuestions();
            renderBranchSelector();
            hideAllViews();
            elements.conversationView.classList.add('active');
            focusView(elements.conversationView);
        }
        history.replaceState(null, '', window.location.pathname);
        showToast('Saved local session opened.');
    } catch (error) {
        history.replaceState(null, '', window.location.pathname);
        showToast('That local session link is unavailable in this browser.');
    }
}

function loadSavedConversations() {
    try {
        state.savedConversations = JSON.parse(localStorage.getItem('seanceai-conversations')) || [];
    } catch (_) {
        state.savedConversations = [];
    }
}

function saveConversationsToStorage() {
    localStorage.setItem('seanceai-conversations', JSON.stringify(state.savedConversations.slice(0, 30)));
}

function autoSaveConversation() {
    if (!state.currentConversationId) return;
    const isParty = elements.dinnerPartyConversationView.classList.contains('active');
    const existing = state.savedConversations.findIndex(item => item.id === state.currentConversationId);
    const now = new Date().toISOString();
    const record = isParty ? {
        id: state.currentConversationId,
        type: 'dinner-party',
        title: state.activeComboId ? state.curatedCombos[state.activeComboId]?.name : 'Open-table salon',
        guests: state.selectedGuests,
        history: state.partyConversationHistory,
        combo_id: state.activeComboId,
        updatedAt: now
    } : {
        id: state.currentConversationId,
        type: 'seance',
        title: `Conversation with ${state.currentFigure?.name}`,
        figure_id: state.currentFigure?.id,
        history: state.conversationHistory,
        branches: state.conversationBranches,
        currentBranchId: state.currentBranchId,
        updatedAt: now
    };
    if (existing >= 0) state.savedConversations[existing] = record;
    else state.savedConversations.unshift(record);
    saveConversationsToStorage();
}

function openSavedPanel() {
    state.lastFocusedElement = document.activeElement;
    renderSavedList();
    elements.savedPanel.classList.remove('hidden');
    elements.savedOverlay.classList.remove('hidden');
    elements.savedOverlay.setAttribute('aria-hidden', 'false');
    document.querySelector('.app-shell').setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    elements.savedPanel.focus();
}

function closeSavedPanel() {
    elements.savedPanel.classList.add('hidden');
    elements.savedOverlay.classList.add('hidden');
    elements.savedOverlay.setAttribute('aria-hidden', 'true');
    document.querySelector('.app-shell').removeAttribute('inert');
    document.body.style.overflow = '';
    state.lastFocusedElement?.focus?.();
}

function renderSavedList() {
    elements.savedList.innerHTML = '';
    if (!state.savedConversations.length) {
        elements.savedList.innerHTML = '<p class="empty-state">No locally saved sessions yet.</p>';
        return;
    }
    state.savedConversations.forEach(record => {
        const item = document.createElement('article');
        item.className = 'saved-conversation-item';
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Resume ${record.title || 'saved session'}`);
        item.innerHTML = `
            <h4>${escapeHtml(record.title || 'Untitled session')}</h4>
            <p>${escapeHtml(new Date(record.updatedAt || Date.now()).toLocaleString())} · ${record.type === 'dinner-party' ? 'Salon' : 'Figure record'}</p>
            <button type="button" aria-label="Delete ${escapeHtml(record.title || 'saved session')}">Delete</button>`;
        const resume = () => resumeConversation(record.id);
        item.addEventListener('click', event => { if (event.target.tagName !== 'BUTTON') resume(); });
        item.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target === item) { event.preventDefault(); resume(); } });
        item.querySelector('button').addEventListener('click', event => {
            event.stopPropagation();
            deleteConversation(record.id);
        });
        elements.savedList.appendChild(item);
    });
}

function deleteConversation(id) {
    state.savedConversations = state.savedConversations.filter(item => item.id !== id);
    saveConversationsToStorage();
    renderSavedList();
    showToast('Saved session removed.');
}

function resumeConversation(id) {
    const record = state.savedConversations.find(item => item.id === id);
    if (!record) return;
    state.currentConversationId = record.id;
    closeSavedPanel();
    if (record.type === 'dinner-party') {
        state.selectedGuests = (record.guests || []).filter(guestId => findFigure(guestId)).slice(0, 5);
        state.partyConversationHistory = record.history || [];
        state.activeComboId = record.combo_id || null;
        elements.partyMessages.innerHTML = '';
        renderPartySession();
        replayPartyHistory();
        showDinnerPartyConversation();
    } else {
        const figure = findFigure(record.figure_id);
        if (!figure) return showToast('The saved figure is no longer available.');
        state.currentFigure = figure;
        state.conversationHistory = record.history || [];
        state.conversationBranches = record.branches || { main: { id: 'main', name: 'Main', history: record.history || [] } };
        state.currentBranchId = record.currentBranchId || 'main';
        elements.messages.innerHTML = '';
        renderFigureSession();
        replayFigureHistory();
        renderStarterQuestions();
        renderBranchSelector();
        hideAllViews();
        elements.conversationView.classList.add('active');
        focusView(elements.conversationView);
    }
}

function replayFigureHistory() {
    addFigureWelcome();
    state.conversationHistory.forEach((message, index) => addMessage(message.role === 'user' ? 'user' : 'figure', message.content, false, index));
    if (state.conversationHistory.length) elements.starterQuestions.classList.add('hidden');
}

function replayPartyHistory() {
    addPartyWelcome();
    state.partyConversationHistory.forEach(message => {
        if (message.role === 'user') addPartyMessage('user', message.content);
        else parseAndDisplayPartyResponses(message.content);
    });
}

function saveCurrentBranchHistory() {
    if (!state.conversationBranches[state.currentBranchId]) return;
    state.conversationBranches[state.currentBranchId].history = state.conversationHistory.slice();
}

function renderBranchSelector() {
    const branches = Object.values(state.conversationBranches || {});
    elements.branchSelector.innerHTML = '';
    branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name || branch.id;
        option.selected = branch.id === state.currentBranchId;
        elements.branchSelector.appendChild(option);
    });
    elements.branchSelectorWrapper.hidden = branches.length <= 1;
}

function createBranch() {
    if (!state.currentFigure) return;
    saveCurrentBranchHistory();
    const id = `branch-${Date.now()}`;
    const number = Object.keys(state.conversationBranches).length + 1;
    state.conversationBranches[id] = {
        id,
        name: `Branch ${number}`,
        history: state.conversationHistory.slice(),
        createdAt: new Date().toISOString()
    };
    state.currentBranchId = id;
    renderBranchSelector();
    autoSaveConversation();
    showToast(`Branch ${number} created from the current transcript.`);
}

function switchBranch(id) {
    saveCurrentBranchHistory();
    const branch = state.conversationBranches[id];
    if (!branch) return;
    state.currentBranchId = id;
    state.conversationHistory = (branch.history || []).slice();
    elements.messages.innerHTML = '';
    replayFigureHistory();
    renderBranchSelector();
}

let toastTimer = null;
function showToast(message) {
    clearTimeout(toastTimer);
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => elements.toast.classList.add('hidden'), 3500);
}

function trapSavedPanelFocus(event) {
    if (event.key !== 'Tab' || elements.savedPanel.classList.contains('hidden')) return;
    const focusable = [...elements.savedPanel.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')].filter(node => !node.disabled);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function setupEventListeners() {
    elements.tabNavigation.addEventListener('click', event => {
        const button = event.target.closest('[data-tab]');
        if (button) switchTab(button.dataset.tab);
    });
    document.querySelector('.wordmark').addEventListener('click', () => switchTab('dinner-party'));
    elements.heroEnterBtn.addEventListener('click', () => openCuratedSalon(elements.heroEnterBtn.dataset.combo));
    elements.searchInput.addEventListener('input', renderFiguresGrid);
    elements.eraFilter.addEventListener('change', renderFiguresGrid);
    elements.clearGuestsBtn.addEventListener('click', clearGuests);
    elements.startPartyBtn.addEventListener('click', startDinnerParty);
    elements.backBtn.addEventListener('click', () => switchTab('seance'));
    elements.partyBackBtn.addEventListener('click', showDinnerPartySelection);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.modelSelector.addEventListener('change', event => handleModelChange(event.target.value));
    elements.partyModelSelector.addEventListener('change', event => handleModelChange(event.target.value));

    elements.chatForm.addEventListener('submit', event => { event.preventDefault(); sendMessage(); });
    elements.partyChatForm.addEventListener('submit', event => { event.preventDefault(); sendPartyMessage(); });
    elements.messageInput.addEventListener('input', updateSendButtonState);
    elements.partyMessageInput.addEventListener('input', updatePartySendButtonState);
    [elements.messageInput, elements.partyMessageInput].forEach(input => input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            input.form.requestSubmit();
        }
    }));

    elements.copyBtn.addEventListener('click', () => copyText(figureTranscriptText(), 'Transcript copied.'));
    elements.partyCopyBtn.addEventListener('click', () => copyText(partyTranscriptText(), 'Transcript copied.'));
    elements.downloadBtn.addEventListener('click', () => downloadText(`seanceai-${state.currentFigure?.id || 'figure'}.txt`, figureTranscriptText()));
    elements.partyDownloadBtn.addEventListener('click', () => downloadText(`seanceai-${state.activeComboId || 'salon'}.txt`, partyTranscriptText()));
    elements.shareBtn.addEventListener('click', () => shareConversation('seance'));
    elements.partyShareBtn.addEventListener('click', () => shareConversation('dinner-party'));

    elements.savedConversationsBtn.addEventListener('click', openSavedPanel);
    elements.closeSavedPanel.addEventListener('click', closeSavedPanel);
    elements.savedOverlay.addEventListener('click', closeSavedPanel);
    elements.savedPanel.addEventListener('keydown', trapSavedPanelFocus);
    elements.createBranchBtn.addEventListener('click', createBranch);
    elements.branchSelector.addEventListener('change', event => switchBranch(event.target.value));

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !elements.savedPanel.classList.contains('hidden')) closeSavedPanel();
    });
}
