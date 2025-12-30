/**
 * SeanceAI - Talk to History
 * Frontend JavaScript Application
 */

// State management
const state = {
    figures: [],
    currentFigure: null,
    conversationHistory: [],
    isLoading: false,
    models: [],
    selectedModel: null,
    // Streaming state for smooth rendering
    streamBuffer: '',
    streamElement: null,
    streamAnimationFrame: null,
    lastRenderTime: 0,
    // Tab state
    currentTab: 'seance',
    // Dinner party state
    selectedGuests: [],
    partyConversationHistory: [],
    curatedCombos: {},
    // Save/Resume state
    savedConversations: [],
    currentConversationId: null
};

// DOM Elements
const elements = {
    selectionView: document.getElementById('selection-view'),
    conversationView: document.getElementById('conversation-view'),
    figuresGrid: document.getElementById('figures-grid'),
    currentFigureInfo: document.getElementById('current-figure-info'),
    messages: document.getElementById('messages'),
    typingIndicator: document.getElementById('typing-indicator'),
    starterQuestions: document.getElementById('starter-questions'),
    questionButtons: document.getElementById('question-buttons'),
    chatForm: document.getElementById('chat-form'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    backBtn: document.getElementById('back-btn'),
    copyBtn: document.getElementById('copy-btn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    searchInput: document.getElementById('search-input'),
    eraFilter: document.getElementById('era-filter'),
    downloadBtn: document.getElementById('download-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    modelSelector: document.getElementById('model-selector'),
    // Tab navigation
    tabNavigation: document.getElementById('tab-navigation'),
    // Dinner party elements
    dinnerPartyView: document.getElementById('dinner-party-view'),
    dinnerPartyConversationView: document.getElementById('dinner-party-conversation-view'),
    guestGrid: document.getElementById('guest-grid'),
    guestCount: document.getElementById('guest-count'),
    clearGuestsBtn: document.getElementById('clear-guests-btn'),
    startPartyBtn: document.getElementById('start-party-btn'),
    partyGuestsInfo: document.getElementById('party-guests-info'),
    partyMessages: document.getElementById('party-messages'),
    partyTypingIndicator: document.getElementById('party-typing-indicator'),
    partyChatForm: document.getElementById('party-chat-form'),
    partyMessageInput: document.getElementById('party-message-input'),
    partySendBtn: document.getElementById('party-send-btn'),
    partyBackBtn: document.getElementById('party-back-btn'),
    partyCopyBtn: document.getElementById('party-copy-btn'),
    partyDownloadBtn: document.getElementById('party-download-btn'),
    partyModelSelector: document.getElementById('party-model-selector'),
    partySuggestions: document.getElementById('party-suggestions'),
    partySuggestionPills: document.getElementById('party-suggestion-pills'),
    // Saved conversations panel
    savedConversationsBtn: document.getElementById('saved-conversations-btn'),
    savedPanel: document.getElementById('saved-panel'),
    savedOverlay: document.getElementById('saved-overlay'),
    savedList: document.getElementById('saved-list'),
    closeSavedPanel: document.getElementById('close-saved-panel')
};

// Initialize app
document.addEventListener('DOMContentLoaded', init);

async function init() {
    initTheme();
    loadSavedConversations();
    await Promise.all([loadFigures(), loadModels(), loadCuratedCombos()]);
    setupEventListeners();
    renderGuestGrid();
    renderPartyModelSelector();
}

// Initialize theme from localStorage
function initTheme() {
    const savedTheme = localStorage.getItem('seanceai-theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
}

// Toggle between light and dark mode
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('seanceai-theme', isLight ? 'light' : 'dark');
}

// Load all historical figures
async function loadFigures() {
    try {
        const response = await fetch('/api/figures');
        const data = await response.json();
        state.figures = data.figures;
        renderFiguresGrid();
    } catch (error) {
        console.error('Failed to load figures:', error);
        showError('Failed to summon the spirits. Please refresh the page.');
    }
}

// Load available AI models
async function loadModels() {
    try {
        const response = await fetch('/api/models');
        const data = await response.json();
        state.models = data.models;
        state.selectedModel = localStorage.getItem('seanceai-model') || data.default;
        renderModelSelector();
    } catch (error) {
        console.error('Failed to load models:', error);
    }
}

// Render the model selector dropdown
function renderModelSelector() {
    const selector = elements.modelSelector;
    selector.innerHTML = '';
    
    // Group models by tier
    const freeModels = state.models.filter(m => m.tier === 'free');
    const cheapModels = state.models.filter(m => m.tier === 'cheap');
    const premiumModels = state.models.filter(m => m.tier === 'premium');
    
    if (freeModels.length > 0) {
        const freeGroup = document.createElement('optgroup');
        freeGroup.label = '✨ Free Models';
        freeModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.selected = model.id === state.selectedModel;
            freeGroup.appendChild(option);
        });
        selector.appendChild(freeGroup);
    }
    
    if (cheapModels.length > 0) {
        const cheapGroup = document.createElement('optgroup');
        cheapGroup.label = '💰 Affordable';
        cheapModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.selected = model.id === state.selectedModel;
            cheapGroup.appendChild(option);
        });
        selector.appendChild(cheapGroup);
    }
    
    if (premiumModels.length > 0) {
        const premiumGroup = document.createElement('optgroup');
        premiumGroup.label = '👑 Premium';
        premiumModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.selected = model.id === state.selectedModel;
            premiumGroup.appendChild(option);
        });
        selector.appendChild(premiumGroup);
    }
}

// Handle model selection change
function handleModelChange() {
    state.selectedModel = elements.modelSelector.value;
    localStorage.setItem('seanceai-model', state.selectedModel);
    showToast(`Switched to ${elements.modelSelector.options[elements.modelSelector.selectedIndex].text}`);
}

// Render the figures selection grid
function renderFiguresGrid() {
    const grid = elements.figuresGrid;
    grid.innerHTML = '';

    state.figures.forEach(figure => {
        const card = createFigureCard(figure);
        grid.appendChild(card);
    });
}

// Filter and render figures based on search and era filter
function filterFigures() {
    const searchTerm = elements.searchInput.value.toLowerCase().trim();
    const selectedEra = elements.eraFilter.value;
    
    const filteredFigures = state.figures.filter(figure => {
        const matchesSearch = searchTerm === '' || 
            figure.name.toLowerCase().includes(searchTerm) ||
            figure.tagline.toLowerCase().includes(searchTerm) ||
            figure.title.toLowerCase().includes(searchTerm);
        
        const matchesEra = selectedEra === 'all' || figure.era === selectedEra;
        
        return matchesSearch && matchesEra;
    });
    
    const grid = elements.figuresGrid;
    grid.innerHTML = '';
    
    if (filteredFigures.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <p>No spirits found matching your search</p>
                <span>Try adjusting your filters</span>
            </div>
        `;
        return;
    }
    
    filteredFigures.forEach(figure => {
        const card = createFigureCard(figure);
        grid.appendChild(card);
    });
}

// Create a figure card element
function createFigureCard(figure) {
    const card = document.createElement('article');
    card.className = 'figure-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Start conversation with ${figure.name}`);
    card.dataset.figureId = figure.id;

    card.innerHTML = `
        <div class="figure-portrait">
            <img src="/static/images/figures/${figure.id}.svg" alt="${figure.name}" onerror="this.src='/static/images/figures/default.svg'">
        </div>
        <div class="figure-info">
            <h3 class="figure-name">${figure.name}</h3>
            <p class="figure-dates">${figure.dates}</p>
            <p class="figure-tagline">${figure.tagline}</p>
            <span class="figure-era">${figure.era}</span>
        </div>
    `;

    card.addEventListener('click', () => selectFigure(figure));
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectFigure(figure);
        }
    });

    return card;
}

// Select a figure and start conversation
async function selectFigure(figure) {
    state.currentFigure = figure;
    state.conversationHistory = [];
    state.currentConversationId = null;
    
    // Update UI
    renderCurrentFigure();
    renderStarterQuestions();
    clearMessages();
    showConversationView();
    
    // Add welcome message (no suggestions - starter questions are shown separately)
    addMessage('figure', `*The spirit of ${figure.name} materializes before you*\n\nGreetings, traveler through time. I am ${figure.name}, ${figure.title}. What wisdom do you seek from my era?`, false);
    
    elements.messageInput.focus();
}

// Render current figure info in conversation header
function renderCurrentFigure() {
    const figure = state.currentFigure;
    elements.currentFigureInfo.innerHTML = `
        <div class="header-portrait">
            <img src="/static/images/figures/${figure.id}.svg" alt="${figure.name}" onerror="this.src='/static/images/figures/default.svg'">
        </div>
        <div class="header-text">
            <h2>${figure.name}</h2>
            <p>${figure.dates}</p>
        </div>
    `;
}

// Render starter questions
function renderStarterQuestions() {
    const figure = state.currentFigure;
    elements.questionButtons.innerHTML = '';
    
    figure.starter_questions.forEach(question => {
        const btn = document.createElement('button');
        btn.className = 'starter-btn';
        btn.textContent = question;
        btn.addEventListener('click', () => {
            elements.messageInput.value = question;
            sendMessage();
            hideStarterQuestions();
        });
        elements.questionButtons.appendChild(btn);
    });
}

// Add a message to the chat
function addMessage(role, content, showSuggestions = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    if (role === 'figure') {
        const figure = state.currentFigure;
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        messageContent.innerHTML = `
            <span class="message-author">${figure.name}</span>
            <p>${formatMessage(content)}</p>
        `;
        
        messageDiv.innerHTML = `
            <div class="message-portrait">
                <img src="/static/images/figures/${figure.id}.svg" alt="${figure.name}" onerror="this.src='/static/images/figures/default.svg'">
            </div>
        `;
        
        messageDiv.appendChild(messageContent);
        
        // Add suggestions container if this is a figure message
        if (showSuggestions) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'message-suggestions';
            suggestionsContainer.dataset.messageId = Date.now();
            messageContent.appendChild(suggestionsContainer);
        }
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-author">You</span>
                <p>${escapeHtml(content)}</p>
            </div>
        `;
    }
    
    elements.messages.appendChild(messageDiv);
    scrollToBottom();
    
    // Fetch suggestions if this is a figure message and we should show them
    if (role === 'figure' && showSuggestions) {
        fetchSuggestions(content, messageDiv);
    }
    
    return messageDiv;
}

// Format message text (handle line breaks and italics)
function formatMessage(text) {
    return escapeHtml(text)
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Clear all messages
function clearMessages() {
    elements.messages.innerHTML = '';
}

// Scroll chat to bottom
function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
}

// Send a message to the AI with streaming response (with fallback)
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || state.isLoading) return;
    
    // Hide starter questions after first message
    hideStarterQuestions();
    
    // Add user message to UI
    addMessage('user', message);
    elements.messageInput.value = '';
    updateSendButtonState();
    
    // Add to history
    state.conversationHistory.push({ role: 'user', content: message });
    
    // Show loading state
    state.isLoading = true;
    showTypingIndicator();
    
    const requestBody = {
        figure_id: state.currentFigure.id,
        message: message,
        history: state.conversationHistory.slice(-20),
        model: state.selectedModel
    };
    
    try {
        // Try streaming first
        const streamingSuccessful = await tryStreamingResponse(requestBody);
        
        // If streaming didn't produce content, fall back to regular API
        if (!streamingSuccessful) {
            console.log('Streaming returned no content, falling back to regular API');
            await fallbackToRegularChat(requestBody);
        }
        
    } catch (error) {
        console.error('Chat error:', error);
        hideTypingIndicator();
        const errorMessage = error.message || 'Connection lost. Please try again.';
        showToast(errorMessage);
        
        // Show a more helpful error message based on error type
        if (errorMessage.toLowerCase().includes('api key') || errorMessage.toLowerCase().includes('not configured')) {
            addMessage('figure', '*The connection to the spirit realm is blocked*\n\nI apologize, but the API key is not configured. Please check your Railway environment variables and ensure OPENROUTER_API_KEY is set correctly.');
        } else if (errorMessage.toLowerCase().includes('overwhelmed') || errorMessage.toLowerCase().includes('rate') || errorMessage.toLowerCase().includes('visitors')) {
            addMessage('figure', '*The spirit realm is experiencing heavy traffic*\n\nThe ethereal pathways are crowded at the moment. Please wait a few seconds and try again, or try selecting a different AI model from the dropdown menu above.');
        } else {
            addMessage('figure', '*The spirit\'s voice fades momentarily*\n\nI apologize, something disrupted our connection. Please try again.');
        }
    } finally {
        state.isLoading = false;
        elements.messageInput.focus();
    }
}

// Try streaming response - returns true if successful, false if no content
async function tryStreamingResponse(requestBody) {
    try {
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            return false;
        }
        
        // Hide typing indicator and create streaming message
        hideTypingIndicator();
        const messageElement = createStreamingMessage();
        let fullResponse = '';
        let hasReceivedContent = false;
        
        // Initialize smooth streaming state
        state.streamBuffer = '';
        state.streamElement = messageElement;
        state.lastRenderTime = performance.now();
        
        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.error) {
                            // Cancel any pending animation frame
                            cancelStreamAnimation();
                            // Remove the streaming message if no content yet
                            if (!hasReceivedContent) {
                                messageElement.remove();
                                // Check if it's a rate limit error
                                if (data.rate_limited || data.error.toLowerCase().includes('overwhelmed') || data.error.toLowerCase().includes('visitors')) {
                                    throw new Error('The spirits are overwhelmed with visitors. Please wait a moment and try again.');
                                }
                                return false;
                            }
                            showToast(data.error);
                            break;
                        }
                        
                        if (data.content) {
                            hasReceivedContent = true;
                            fullResponse += data.content;
                            // Use smooth buffered update instead of direct DOM manipulation
                            scheduleStreamUpdate(fullResponse);
                        }
                        
                        if (data.done) {
                            break;
                        }
                    } catch (e) {
                        // Skip malformed JSON
                        continue;
                    }
                }
            }
        }
        
        // If we received content, finalize and return success
        if (hasReceivedContent && fullResponse.trim()) {
            // Ensure final render is complete
            cancelStreamAnimation();
            flushStreamBuffer(fullResponse);
            finalizeStreamingMessage(messageElement, fullResponse);
            state.conversationHistory.push({ role: 'assistant', content: fullResponse });
            autoSaveConversation();
            return true;
        }
        
        // No content received - remove the empty message element
        cancelStreamAnimation();
        messageElement.remove();
        return false;
        
    } catch (error) {
        console.error('Streaming error:', error);
        cancelStreamAnimation();
        return false;
    }
}

// Schedule a batched stream update using requestAnimationFrame
function scheduleStreamUpdate(content) {
    state.streamBuffer = content;
    
    // Only schedule a new frame if one isn't already pending
    if (!state.streamAnimationFrame) {
        state.streamAnimationFrame = requestAnimationFrame(() => {
            renderStreamContent();
        });
    }
}

// Render buffered stream content - called via requestAnimationFrame
function renderStreamContent() {
    state.streamAnimationFrame = null;
    
    if (state.streamElement && state.streamBuffer) {
        const textElement = state.streamElement.querySelector('.streaming-text');
        if (textElement) {
            // Use a more efficient update strategy
            const formattedContent = formatMessage(state.streamBuffer);
            textElement.innerHTML = formattedContent + '<span class="cursor"></span>';
        }
        scrollToBottom();
    }
}

// Immediately render any buffered content
function flushStreamBuffer(content) {
    if (state.streamElement) {
        const textElement = state.streamElement.querySelector('.streaming-text');
        if (textElement) {
            textElement.innerHTML = formatMessage(content) + '<span class="cursor"></span>';
        }
        scrollToBottom();
    }
}

// Cancel any pending stream animation frame
function cancelStreamAnimation() {
    if (state.streamAnimationFrame) {
        cancelAnimationFrame(state.streamAnimationFrame);
        state.streamAnimationFrame = null;
    }
    state.streamBuffer = '';
    state.streamElement = null;
}

// Fallback to regular (non-streaming) chat API
async function fallbackToRegularChat(requestBody) {
    showTypingIndicator();
    
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    hideTypingIndicator();
    
    const data = await response.json();
    
    if (response.ok && data.response) {
        // Show suggestions for all AI responses
        addMessage('figure', data.response, true);
        state.conversationHistory.push({ role: 'assistant', content: data.response });
        autoSaveConversation();
    } else {
        // Handle error response
        const errorMessage = data.error || 'Failed to receive response';
        console.error('Chat API error:', errorMessage);
        throw new Error(errorMessage);
    }
}

// Create a streaming message element
function createStreamingMessage() {
    const figure = state.currentFigure;
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message figure-message streaming';
    
    messageDiv.innerHTML = `
        <div class="message-portrait">
            <img src="/static/images/figures/${figure.id}.svg" alt="${figure.name}" onerror="this.src='/static/images/figures/default.svg'">
        </div>
        <div class="message-content">
            <span class="message-author">${figure.name}</span>
            <p class="streaming-text"><span class="cursor"></span></p>
        </div>
    `;
    
    elements.messages.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

// Fetch and display contextual suggestions
async function fetchSuggestions(lastResponse, messageElement) {
    if (!state.currentFigure || !lastResponse) return;
    
    try {
        const response = await fetch('/api/suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                figure_id: state.currentFigure.id,
                history: state.conversationHistory,
                last_response: lastResponse,
                model: state.selectedModel
            })
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.suggestions && data.suggestions.length > 0) {
            displaySuggestions(data.suggestions, messageElement);
        }
    } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        // Silently fail - suggestions are optional
    }
}

// Display suggestions below a message (styled like starter questions for uniformity)
function displaySuggestions(suggestions, messageElement) {
    const suggestionsContainer = messageElement.querySelector('.message-suggestions');
    if (!suggestionsContainer) return;
    
    suggestionsContainer.innerHTML = `
        <div class="suggestions-buttons question-buttons"></div>
    `;
    
    const buttonsContainer = suggestionsContainer.querySelector('.suggestions-buttons');
    
    suggestions.forEach(suggestion => {
        const btn = document.createElement('button');
        btn.className = 'starter-btn';
        btn.textContent = suggestion;
        btn.addEventListener('click', () => {
            elements.messageInput.value = suggestion;
            sendMessage();
        });
        buttonsContainer.appendChild(btn);
    });
    
    scrollToBottom();
}

// Update streaming message with new content (legacy - used by non-buffered updates)
function updateStreamingMessage(messageElement, content) {
    const textElement = messageElement.querySelector('.streaming-text');
    if (textElement) {
        textElement.innerHTML = formatMessage(content) + '<span class="cursor"></span>';
    }
}

// Smooth scroll to bottom with requestAnimationFrame batching
let scrollPending = false;
const scrollToBottomSmooth = () => {
    if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(() => {
            elements.messages.scrollTop = elements.messages.scrollHeight;
            scrollPending = false;
        });
    }
};

// Finalize the streaming message (remove cursor, clean up)
function finalizeStreamingMessage(messageElement, content) {
    messageElement.classList.remove('streaming');
    const textElement = messageElement.querySelector('.streaming-text');
    const messageContent = messageElement.querySelector('.message-content');
    
    if (textElement) {
        textElement.innerHTML = formatMessage(content);
        textElement.classList.remove('streaming-text');
    }
    
    // Show suggestions for all AI responses (welcome message is handled separately)
    if (messageContent) {
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'message-suggestions';
        suggestionsContainer.dataset.messageId = Date.now();
        messageContent.appendChild(suggestionsContainer);
        fetchSuggestions(content, messageElement);
    }
}

// Show/hide typing indicator
function showTypingIndicator() {
    elements.typingIndicator.classList.remove('hidden');
    scrollToBottom();
}

function hideTypingIndicator() {
    elements.typingIndicator.classList.add('hidden');
}

// Show/hide starter questions
function hideStarterQuestions() {
    elements.starterQuestions.classList.add('hidden');
}

function showStarterQuestions() {
    elements.starterQuestions.classList.remove('hidden');
}

// View switching with summoning effect
function showConversationView() {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    elements.selectionView.classList.remove('active');
    
    if (!prefersReducedMotion) {
        // Add summoning class for enhanced animation
        elements.conversationView.classList.add('summoning');
        
        // Create the summoning circle effect
        createSummoningEffect();
        
        // Remove summoning class after animation completes
        setTimeout(() => {
            elements.conversationView.classList.remove('summoning');
        }, 1000);
    }
    
    elements.conversationView.classList.add('active');
    document.body.classList.add('in-conversation');
}

// Create the mystical summoning circle effect
function createSummoningEffect() {
    const effect = document.createElement('div');
    effect.className = 'summoning-effect';
    document.body.appendChild(effect);
    
    // Remove the effect after animation completes
    setTimeout(() => {
        effect.remove();
    }, 1000);
}

function showSelectionView() {
    elements.conversationView.classList.remove('active');
    elements.selectionView.classList.add('active');
    document.body.classList.remove('in-conversation');
    state.currentFigure = null;
    state.conversationHistory = [];
    showStarterQuestions();
}

// Copy conversation to clipboard
function copyConversation() {
    if (!state.currentFigure || state.conversationHistory.length === 0) {
        showToast('No conversation to copy');
        return;
    }
    
    let text = `Conversation with ${state.currentFigure.name}\n`;
    text += `${'='.repeat(40)}\n\n`;
    
    state.conversationHistory.forEach(msg => {
        const author = msg.role === 'user' ? 'You' : state.currentFigure.name;
        text += `${author}:\n${msg.content}\n\n`;
    });
    
    text += `---\nGenerated by SeanceAI - Talk to History`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Conversation copied to clipboard');
    }).catch(() => {
        showToast('Failed to copy conversation');
    });
}

// Download conversation as a file
function downloadConversation() {
    if (!state.currentFigure || state.conversationHistory.length === 0) {
        showToast('No conversation to download');
        return;
    }
    
    const date = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let content = `# Conversation with ${state.currentFigure.name}\n`;
    content += `**${state.currentFigure.title}** | ${state.currentFigure.dates}\n`;
    content += `*Date: ${date}*\n\n`;
    content += `---\n\n`;
    
    state.conversationHistory.forEach(msg => {
        const author = msg.role === 'user' ? '**You**' : `**${state.currentFigure.name}**`;
        content += `${author}:\n\n${msg.content}\n\n---\n\n`;
    });
    
    content += `\n*Generated by SeanceAI - Talk to History*`;
    
    // Create and download the file
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seance-${state.currentFigure.id}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Conversation downloaded');
}

// Toast notifications
function showToast(message, duration = 3000) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, duration);
}

// Show error in grid
function showError(message) {
    elements.figuresGrid.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button onclick="location.reload()">Try Again</button>
        </div>
    `;
}

// Update send button state
function updateSendButtonState() {
    const hasText = elements.messageInput.value.trim().length > 0;
    elements.sendBtn.disabled = !hasText || state.isLoading;
}

// ===== TAB NAVIGATION =====

function switchTab(tabName) {
    state.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Show/hide views
    if (tabName === 'seance') {
        elements.selectionView.classList.add('active');
        elements.dinnerPartyView.classList.remove('active');
    } else if (tabName === 'dinner-party') {
        elements.selectionView.classList.remove('active');
        elements.dinnerPartyView.classList.add('active');
        renderGuestGrid();
    }
}

// ===== CURATED COMBOS =====

async function loadCuratedCombos() {
    try {
        const response = await fetch('/api/dinner-party/combos');
        const data = await response.json();
        state.curatedCombos = data.combos;
    } catch (error) {
        console.error('Failed to load curated combos:', error);
    }
}

function selectCombo(comboId) {
    const combo = state.curatedCombos[comboId];
    if (!combo) return;
    
    state.selectedGuests = [...combo.guests];
    updateGuestSelection();
    showToast(`Selected: ${combo.name}`);
}

// ===== GUEST SELECTION =====

function renderGuestGrid() {
    if (!elements.guestGrid) return;
    
    elements.guestGrid.innerHTML = '';
    
    state.figures.forEach(figure => {
        const card = createGuestCard(figure);
        elements.guestGrid.appendChild(card);
    });
    
    updateGuestSelection();
}

function createGuestCard(figure) {
    const card = document.createElement('article');
    card.className = 'figure-card guest-card';
    card.setAttribute('role', 'checkbox');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-checked', 'false');
    card.setAttribute('aria-label', `Invite ${figure.name}`);
    card.dataset.figureId = figure.id;

    card.innerHTML = `
        <div class="guest-check">
            <span class="check-icon">✓</span>
        </div>
        <div class="figure-portrait">
            <img src="/static/images/figures/${figure.id}.svg" alt="${figure.name}" onerror="this.src='/static/images/figures/default.svg'">
        </div>
        <div class="figure-info">
            <h3 class="figure-name">${figure.name}</h3>
            <p class="figure-dates">${figure.dates}</p>
            <p class="figure-tagline">${figure.tagline}</p>
            <span class="figure-era">${figure.era}</span>
        </div>
    `;

    card.addEventListener('click', () => toggleGuest(figure.id));
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleGuest(figure.id);
        }
    });

    return card;
}

function toggleGuest(figureId) {
    const index = state.selectedGuests.indexOf(figureId);
    
    if (index > -1) {
        state.selectedGuests.splice(index, 1);
    } else if (state.selectedGuests.length < 5) {
        state.selectedGuests.push(figureId);
    } else {
        showToast('Maximum 5 guests allowed');
        return;
    }
    
    updateGuestSelection();
}

function updateGuestSelection() {
    // Update card states
    document.querySelectorAll('.guest-card').forEach(card => {
        const isSelected = state.selectedGuests.includes(card.dataset.figureId);
        card.classList.toggle('selected', isSelected);
        card.setAttribute('aria-checked', isSelected.toString());
    });
    
    // Update count display
    const count = state.selectedGuests.length;
    if (elements.guestCount) {
        elements.guestCount.textContent = `${count} guest${count !== 1 ? 's' : ''} selected`;
    }
    
    // Update button states
    if (elements.clearGuestsBtn) {
        elements.clearGuestsBtn.disabled = count === 0;
    }
    if (elements.startPartyBtn) {
        elements.startPartyBtn.disabled = count < 2;
    }
}

function clearGuests() {
    state.selectedGuests = [];
    updateGuestSelection();
}

// ===== DINNER PARTY CONVERSATION =====

function startDinnerParty() {
    if (state.selectedGuests.length < 2) {
        showToast('Please select at least 2 guests');
        return;
    }
    
    state.partyConversationHistory = [];
    state.currentConversationId = null;
    
    renderPartyGuestsInfo();
    clearPartyMessages();
    showDinnerPartyConversation();
    
    // Add welcome message
    addPartyMessage('host', getPartyWelcomeMessage());
    
    // Show starter suggestions
    showStarterSuggestions();
    
    if (elements.partyMessageInput) {
        elements.partyMessageInput.focus();
    }
}

function getStarterSuggestions() {
    const suggestions = [];
    const guestIds = state.selectedGuests;
    
    // Base questions that work for any group
    const baseQuestions = [
        "What's the most important lesson you've learned?",
        "What would you change about your era?",
        "What advice would you give leaders today?"
    ];
    
    // Guest-category specific questions
    const hasScientists = guestIds.some(id => ['einstein', 'curie', 'tesla', 'ada'].includes(id));
    const hasLeaders = guestIds.some(id => ['caesar', 'cleopatra', 'napoleon', 'elizabeth', 'genghis', 'lincoln'].includes(id));
    const hasPhilosophers = guestIds.some(id => ['socrates', 'aurelius', 'gandhi'].includes(id));
    const hasArtists = guestIds.some(id => ['davinci', 'shakespeare', 'frida'].includes(id));
    
    if (hasScientists) {
        suggestions.push("How will science change humanity's future?");
    }
    if (hasLeaders) {
        suggestions.push("What makes a truly great leader?");
    }
    if (hasPhilosophers) {
        suggestions.push("What is the meaning of a good life?");
    }
    if (hasArtists) {
        suggestions.push("How does art reflect the human soul?");
    }
    
    // Add base questions
    suggestions.push(...baseQuestions);
    
    // Return first 3 unique suggestions
    return [...new Set(suggestions)].slice(0, 3);
}

function getFollowUpSuggestions(lastResponse) {
    const suggestions = [];
    const response = lastResponse.toLowerCase();
    
    // Context-aware suggestions based on keywords
    if (response.includes('disagree') || response.includes('however') || response.includes('but i')) {
        suggestions.push("What's the root of your disagreement?");
    }
    if (response.includes('science') || response.includes('discovery') || response.includes('experiment')) {
        suggestions.push("What discovery do you wish you'd seen?");
    }
    if (response.includes('war') || response.includes('battle') || response.includes('conflict')) {
        suggestions.push("Is war ever truly justified?");
    }
    if (response.includes('love') || response.includes('family') || response.includes('heart')) {
        suggestions.push("How did love shape your life's work?");
    }
    if (response.includes('death') || response.includes('legacy') || response.includes('remember')) {
        suggestions.push("What do you want to be remembered for?");
    }
    if (response.includes('mistake') || response.includes('regret') || response.includes('wrong')) {
        suggestions.push("What would you do differently?");
    }
    
    // General follow-ups
    const generalFollowups = [
        "Do you all agree on this?",
        "Ask each other a question!",
        "What would surprise you about today?",
        "Tell us a secret from your life.",
        "What common ground do you share?",
        "Debate this point further!"
    ];
    
    // Add random general follow-ups to fill remaining slots
    const shuffled = generalFollowups.sort(() => Math.random() - 0.5);
    for (const q of shuffled) {
        if (suggestions.length >= 3) break;
        if (!suggestions.includes(q)) suggestions.push(q);
    }
    
    return suggestions.slice(0, 3);
}

function showStarterSuggestions() {
    const suggestions = getStarterSuggestions();
    renderSuggestionPills(suggestions);
}

function showFollowUpSuggestions(lastResponse) {
    const suggestions = getFollowUpSuggestions(lastResponse);
    renderSuggestionPills(suggestions);
}

function renderSuggestionPills(suggestions) {
    if (!elements.partySuggestionPills) return;
    
    elements.partySuggestionPills.innerHTML = suggestions.map(s => 
        `<button class="suggestion-pill" type="button">${s}</button>`
    ).join('');
    
    // Add click handlers
    elements.partySuggestionPills.querySelectorAll('.suggestion-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            if (elements.partyMessageInput) {
                elements.partyMessageInput.value = btn.textContent;
                sendPartyMessage();
            }
        });
    });
}

function hideSuggestionPills() {
    if (elements.partySuggestionPills) {
        elements.partySuggestionPills.innerHTML = '';
    }
}

function getPartyWelcomeMessage() {
    const guestNames = state.selectedGuests.map(id => {
        const figure = state.figures.find(f => f.id === id);
        return figure ? figure.name : id;
    });
    
    const lastGuest = guestNames.pop();
    const guestList = guestNames.length > 0 
        ? `${guestNames.join(', ')} and ${lastGuest}` 
        : lastGuest;
    
    return `*The candles flicker as ${guestList} take their seats at the table*\n\nWelcome to this extraordinary gathering across time. Your distinguished guests await your first question or topic of discussion.`;
}

function renderPartyGuestsInfo() {
    if (!elements.partyGuestsInfo) return;
    
    elements.partyGuestsInfo.innerHTML = state.selectedGuests.map(id => {
        const figure = state.figures.find(f => f.id === id);
        if (!figure) return '';
        return `
            <div class="party-guest-portrait" title="${figure.name}">
                <img src="/static/images/figures/${id}.svg" alt="${figure.name}" onerror="this.src='/static/images/figures/default.svg'">
            </div>
        `;
    }).join('');
}

function renderPartyModelSelector() {
    if (!elements.partyModelSelector) return;
    
    elements.partyModelSelector.innerHTML = '';
    
    // Group models by tier
    const freeModels = state.models.filter(m => m.tier === 'free');
    const cheapModels = state.models.filter(m => m.tier === 'cheap');
    const premiumModels = state.models.filter(m => m.tier === 'premium');
    
    if (freeModels.length > 0) {
        const freeGroup = document.createElement('optgroup');
        freeGroup.label = '✨ Free Models';
        freeModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.selected = model.id === state.selectedModel;
            freeGroup.appendChild(option);
        });
        elements.partyModelSelector.appendChild(freeGroup);
    }
    
    if (cheapModels.length > 0) {
        const cheapGroup = document.createElement('optgroup');
        cheapGroup.label = '💰 Affordable';
        cheapModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.selected = model.id === state.selectedModel;
            cheapGroup.appendChild(option);
        });
        elements.partyModelSelector.appendChild(cheapGroup);
    }
    
    if (premiumModels.length > 0) {
        const premiumGroup = document.createElement('optgroup');
        premiumGroup.label = '👑 Premium';
        premiumModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            option.selected = model.id === state.selectedModel;
            premiumGroup.appendChild(option);
        });
        elements.partyModelSelector.appendChild(premiumGroup);
    }
}

function showDinnerPartyConversation() {
    // Hide all other views
    elements.selectionView.classList.remove('active');
    elements.conversationView.classList.remove('active');
    elements.dinnerPartyView.classList.remove('active');
    // Show dinner party conversation
    elements.dinnerPartyConversationView.classList.add('active');
    document.body.classList.add('in-conversation');
}

function showDinnerPartySelection() {
    elements.dinnerPartyConversationView.classList.remove('active');
    elements.dinnerPartyView.classList.add('active');
    document.body.classList.remove('in-conversation');
}

function clearPartyMessages() {
    if (elements.partyMessages) {
        elements.partyMessages.innerHTML = '';
    }
}

function addPartyMessage(role, content, figureId = null) {
    const messageDiv = document.createElement('div');
    
    if (role === 'host') {
        messageDiv.className = 'message host-message';
        messageDiv.innerHTML = `
            <div class="message-content host-content">
                <span class="message-author">The Table</span>
                <p>${formatMessage(content)}</p>
            </div>
        `;
    } else if (role === 'user') {
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-author">You (The Host)</span>
                <p>${escapeHtml(content)}</p>
            </div>
        `;
    } else if (role === 'figure' && figureId) {
        const figure = state.figures.find(f => f.id === figureId);
        if (!figure) return;
        
        messageDiv.className = `message figure-message party-figure-message`;
        messageDiv.dataset.figureId = figureId;
        messageDiv.innerHTML = `
            <div class="message-portrait">
                <img src="/static/images/figures/${figureId}.svg" alt="${figure.name}" onerror="this.src='/static/images/figures/default.svg'">
            </div>
            <div class="message-content">
                <span class="message-author">${figure.name}</span>
                <p>${formatMessage(content)}</p>
            </div>
        `;
    }
    
    if (elements.partyMessages) {
        elements.partyMessages.appendChild(messageDiv);
        elements.partyMessages.scrollTop = elements.partyMessages.scrollHeight;
    }
    
    return messageDiv;
}

async function sendPartyMessage() {
    const message = elements.partyMessageInput.value.trim();
    if (!message || state.isLoading) return;
    
    // Hide suggestions while processing
    hideSuggestionPills();
    
    // Add user message
    addPartyMessage('user', message);
    elements.partyMessageInput.value = '';
    updatePartySendButtonState();
    
    // Add to history
    state.partyConversationHistory.push({ role: 'user', content: message });
    
    // Show loading
    state.isLoading = true;
    showPartyTypingIndicator();
    
    try {
        const response = await fetch('/api/dinner-party/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guests: state.selectedGuests,
                message: message,
                history: state.partyConversationHistory.slice(-20),
                model: state.selectedModel
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get response');
        }
        
        hidePartyTypingIndicator();
        
        // Create streaming message container
        const streamContainer = document.createElement('div');
        streamContainer.className = 'party-stream-container streaming';
        if (elements.partyMessages) {
            elements.partyMessages.appendChild(streamContainer);
        }
        
        let fullResponse = '';
        
        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.error) {
                            showToast(data.error);
                            break;
                        }
                        
                        if (data.content) {
                            fullResponse += data.content;
                            updatePartyStreamContent(streamContainer, fullResponse);
                        }
                        
                        if (data.done) {
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        }
        
        // Finalize - parse and display individual figure responses
        streamContainer.remove();
        parseAndDisplayPartyResponses(fullResponse);
        
        // Save to history
        state.partyConversationHistory.push({ role: 'assistant', content: fullResponse });
        
        // Show follow-up suggestions instantly
        showFollowUpSuggestions(fullResponse);
        
        // Auto-save
        autoSaveConversation();
        
    } catch (error) {
        console.error('Dinner party chat error:', error);
        hidePartyTypingIndicator();
        addPartyMessage('host', '*The candles flicker uncertainly*\n\nApologies, something disrupted our gathering. Please try again.');
    } finally {
        state.isLoading = false;
        if (elements.partyMessageInput) {
            elements.partyMessageInput.focus();
        }
    }
}

function updatePartyStreamContent(container, content) {
    // Show raw streaming content with formatting
    container.innerHTML = `<div class="streaming-content">${formatMessage(content)}<span class="cursor"></span></div>`;
    if (elements.partyMessages) {
        elements.partyMessages.scrollTop = elements.partyMessages.scrollHeight;
    }
}

function parseAndDisplayPartyResponses(response) {
    // Parse [FIGURE_ID]: format responses
    const lines = response.split('\n');
    let currentFigureId = null;
    let currentContent = [];
    
    const displayResponse = (figureId, content) => {
        if (figureId && content.length > 0) {
            const text = content.join('\n').trim();
            if (text) {
                addPartyMessage('figure', text, figureId);
            }
        }
    };
    
    for (const line of lines) {
        // Check for figure markers
        let foundFigure = false;
        for (const guestId of state.selectedGuests) {
            const figure = state.figures.find(f => f.id === guestId);
            if (!figure) continue;
            
            const markers = [
                `[${guestId}]:`,
                `[${guestId.toUpperCase()}]:`,
                `**${figure.name}:**`,
                `${figure.name}:`
            ];
            
            for (const marker of markers) {
                if (line.trim().toLowerCase().startsWith(marker.toLowerCase())) {
                    // Save previous figure's response
                    displayResponse(currentFigureId, currentContent);
                    
                    currentFigureId = guestId;
                    // Get content after marker
                    const remaining = line.substring(line.indexOf(':') + 1).trim();
                    currentContent = remaining ? [remaining] : [];
                    foundFigure = true;
                    break;
                }
            }
            if (foundFigure) break;
        }
        
        if (!foundFigure && currentFigureId) {
            currentContent.push(line);
        }
    }
    
    // Don't forget last figure
    displayResponse(currentFigureId, currentContent);
    
    // If no figures were parsed, show raw response
    if (!currentFigureId && response.trim()) {
        addPartyMessage('host', response);
    }
}

function showPartyTypingIndicator() {
    if (elements.partyTypingIndicator) {
        elements.partyTypingIndicator.classList.remove('hidden');
        if (elements.partyMessages) {
            elements.partyMessages.scrollTop = elements.partyMessages.scrollHeight;
        }
    }
}

function hidePartyTypingIndicator() {
    if (elements.partyTypingIndicator) {
        elements.partyTypingIndicator.classList.add('hidden');
    }
}

function updatePartySendButtonState() {
    if (elements.partySendBtn && elements.partyMessageInput) {
        const hasText = elements.partyMessageInput.value.trim().length > 0;
        elements.partySendBtn.disabled = !hasText || state.isLoading;
    }
}

function copyPartyConversation() {
    if (state.partyConversationHistory.length === 0) {
        showToast('No conversation to copy');
        return;
    }
    
    const guestNames = state.selectedGuests.map(id => {
        const figure = state.figures.find(f => f.id === id);
        return figure ? figure.name : id;
    }).join(', ');
    
    let text = `Dinner Party Conversation\nGuests: ${guestNames}\n`;
    text += `${'='.repeat(40)}\n\n`;
    
    state.partyConversationHistory.forEach(msg => {
        const author = msg.role === 'user' ? 'You (Host)' : 'Guests';
        text += `${author}:\n${msg.content}\n\n`;
    });
    
    text += `---\nGenerated by SeanceAI - Dinner Party`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Conversation copied to clipboard');
    }).catch(() => {
        showToast('Failed to copy conversation');
    });
}

function downloadPartyConversation() {
    if (state.partyConversationHistory.length === 0) {
        showToast('No conversation to download');
        return;
    }
    
    const guestNames = state.selectedGuests.map(id => {
        const figure = state.figures.find(f => f.id === id);
        return figure ? figure.name : id;
    }).join(', ');
    
    const date = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let content = `# Dinner Party Conversation\n`;
    content += `**Guests:** ${guestNames}\n`;
    content += `*Date: ${date}*\n\n`;
    content += `---\n\n`;
    
    state.partyConversationHistory.forEach(msg => {
        const author = msg.role === 'user' ? '**You (Host)**' : '**The Guests**';
        content += `${author}:\n\n${msg.content}\n\n---\n\n`;
    });
    
    content += `\n*Generated by SeanceAI - Dinner Party*`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dinner-party-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Conversation downloaded');
}

// ===== SAVE/RESUME CONVERSATIONS =====

function generateConversationId() {
    return 'conv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function loadSavedConversations() {
    try {
        const saved = localStorage.getItem('seanceai-conversations');
        state.savedConversations = saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Failed to load saved conversations:', error);
        state.savedConversations = [];
    }
}

function saveConversationsToStorage() {
    try {
        localStorage.setItem('seanceai-conversations', JSON.stringify(state.savedConversations));
    } catch (error) {
        console.error('Failed to save conversations:', error);
    }
}

function autoSaveConversation() {
    const isParty = elements.dinnerPartyConversationView?.classList.contains('active');
    const history = isParty ? state.partyConversationHistory : state.conversationHistory;
    
    if (history.length === 0) return;
    
    const now = new Date().toISOString();
    
    if (state.currentConversationId) {
        // Update existing conversation
        const index = state.savedConversations.findIndex(c => c.id === state.currentConversationId);
        if (index > -1) {
            state.savedConversations[index].history = [...history];
            state.savedConversations[index].updated_at = now;
        }
    } else {
        // Create new conversation
        const id = generateConversationId();
        state.currentConversationId = id;
        
        // Generate title from first user message
        const firstUserMsg = history.find(m => m.role === 'user');
        const title = firstUserMsg 
            ? firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
            : 'New Conversation';
        
        const conversation = {
            id: id,
            type: isParty ? 'dinner-party' : 'seance',
            figure_id: isParty ? null : state.currentFigure?.id,
            guests: isParty ? [...state.selectedGuests] : null,
            history: [...history],
            created_at: now,
            updated_at: now,
            title: title
        };
        
        state.savedConversations.unshift(conversation);
        
        // Limit to 50 saved conversations
        if (state.savedConversations.length > 50) {
            state.savedConversations = state.savedConversations.slice(0, 50);
        }
    }
    
    saveConversationsToStorage();
}

function getSavedConversations() {
    return state.savedConversations;
}

function deleteConversation(id) {
    state.savedConversations = state.savedConversations.filter(c => c.id !== id);
    saveConversationsToStorage();
    
    if (state.currentConversationId === id) {
        state.currentConversationId = null;
    }
    
    showToast('Conversation deleted');
}

function resumeConversation(id) {
    const conversation = state.savedConversations.find(c => c.id === id);
    if (!conversation) {
        showToast('Conversation not found');
        return;
    }
    
    state.currentConversationId = id;
    closeSavedPanel();
    
    if (conversation.type === 'dinner-party') {
        // Resume dinner party
        state.selectedGuests = [...conversation.guests];
        state.partyConversationHistory = [...conversation.history];
        
        renderPartyGuestsInfo();
        clearPartyMessages();
        
        // Replay messages
        conversation.history.forEach(msg => {
            if (msg.role === 'user') {
                addPartyMessage('user', msg.content);
            } else {
                parseAndDisplayPartyResponses(msg.content);
            }
        });
        
        switchTab('dinner-party');
        showDinnerPartyConversation();
    } else {
        // Resume seance
        const figure = state.figures.find(f => f.id === conversation.figure_id);
        if (!figure) {
            showToast('Figure not found');
            return;
        }
        
        state.currentFigure = figure;
        state.conversationHistory = [...conversation.history];
        
        renderCurrentFigure();
        clearMessages();
        hideStarterQuestions();
        
        // Replay messages
        conversation.history.forEach(msg => {
            addMessage(msg.role === 'user' ? 'user' : 'figure', msg.content, false);
        });
        
        switchTab('seance');
        showConversationView();
    }
}

// ===== SAVED CONVERSATIONS PANEL =====

function openSavedPanel() {
    renderSavedList();
    if (elements.savedPanel) {
        elements.savedPanel.classList.remove('hidden');
    }
    if (elements.savedOverlay) {
        elements.savedOverlay.classList.remove('hidden');
    }
}

function closeSavedPanel() {
    if (elements.savedPanel) {
        elements.savedPanel.classList.add('hidden');
    }
    if (elements.savedOverlay) {
        elements.savedOverlay.classList.add('hidden');
    }
}

function renderSavedList() {
    if (!elements.savedList) return;
    
    if (state.savedConversations.length === 0) {
        elements.savedList.innerHTML = `
            <div class="saved-empty">
                <p>No saved conversations yet</p>
                <span>Your conversations will appear here</span>
            </div>
        `;
        return;
    }
    
    elements.savedList.innerHTML = state.savedConversations.map(conv => {
        const date = new Date(conv.updated_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        let portraitHtml = '';
        if (conv.type === 'dinner-party' && conv.guests) {
            portraitHtml = `<div class="saved-portraits">` + 
                conv.guests.slice(0, 3).map(id => 
                    `<img src="/static/images/figures/${id}.svg" alt="" onerror="this.src='/static/images/figures/default.svg'">`
                ).join('') + 
                (conv.guests.length > 3 ? `<span class="more-guests">+${conv.guests.length - 3}</span>` : '') +
                `</div>`;
        } else if (conv.figure_id) {
            const figure = state.figures.find(f => f.id === conv.figure_id);
            portraitHtml = `
                <div class="saved-portrait">
                    <img src="/static/images/figures/${conv.figure_id}.svg" alt="${figure?.name || ''}" onerror="this.src='/static/images/figures/default.svg'">
                </div>
            `;
        }
        
        const typeLabel = conv.type === 'dinner-party' ? '🍷 Dinner Party' : '☽ Seance';
        
        return `
            <div class="saved-item" data-id="${conv.id}">
                ${portraitHtml}
                <div class="saved-info">
                    <span class="saved-type">${typeLabel}</span>
                    <h4 class="saved-title">${escapeHtml(conv.title)}</h4>
                    <span class="saved-date">${date}</span>
                </div>
                <div class="saved-actions">
                    <button class="saved-resume-btn" data-id="${conv.id}" title="Resume">
                        <span>▶</span>
                    </button>
                    <button class="saved-delete-btn" data-id="${conv.id}" title="Delete">
                        <span>×</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    elements.savedList.querySelectorAll('.saved-resume-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            resumeConversation(btn.dataset.id);
        });
    });
    
    elements.savedList.querySelectorAll('.saved-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConversation(btn.dataset.id);
            renderSavedList();
        });
    });
    
    elements.savedList.querySelectorAll('.saved-item').forEach(item => {
        item.addEventListener('click', () => {
            resumeConversation(item.dataset.id);
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Chat form submission
    elements.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });
    
    // Input changes
    elements.messageInput.addEventListener('input', updateSendButtonState);
    
    // Back button
    elements.backBtn.addEventListener('click', showSelectionView);
    
    // Copy button
    elements.copyBtn.addEventListener('click', copyConversation);
    
    // Download button
    elements.downloadBtn.addEventListener('click', downloadConversation);
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Model selector
    elements.modelSelector.addEventListener('change', handleModelChange);
    
    // Search and filter
    elements.searchInput.addEventListener('input', filterFigures);
    elements.eraFilter.addEventListener('change', filterFigures);
    
    // Tab navigation
    if (elements.tabNavigation) {
        elements.tabNavigation.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                switchTab(tabBtn.dataset.tab);
            }
        });
    }
    
    // Curated combos
    document.querySelectorAll('.combo-btn').forEach(btn => {
        btn.addEventListener('click', () => selectCombo(btn.dataset.combo));
    });
    
    // Guest selection
    if (elements.clearGuestsBtn) {
        elements.clearGuestsBtn.addEventListener('click', clearGuests);
    }
    if (elements.startPartyBtn) {
        elements.startPartyBtn.addEventListener('click', startDinnerParty);
    }
    
    // Dinner party conversation
    if (elements.partyChatForm) {
        elements.partyChatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendPartyMessage();
        });
    }
    if (elements.partyMessageInput) {
        elements.partyMessageInput.addEventListener('input', updatePartySendButtonState);
    }
    if (elements.partyBackBtn) {
        elements.partyBackBtn.addEventListener('click', showDinnerPartySelection);
    }
    if (elements.partyCopyBtn) {
        elements.partyCopyBtn.addEventListener('click', copyPartyConversation);
    }
    if (elements.partyDownloadBtn) {
        elements.partyDownloadBtn.addEventListener('click', downloadPartyConversation);
    }
    if (elements.partyModelSelector) {
        elements.partyModelSelector.addEventListener('change', () => {
            state.selectedModel = elements.partyModelSelector.value;
            localStorage.setItem('seanceai-model', state.selectedModel);
            showToast(`Switched to ${elements.partyModelSelector.options[elements.partyModelSelector.selectedIndex].text}`);
        });
    }
    
    // Saved conversations panel
    if (elements.savedConversationsBtn) {
        elements.savedConversationsBtn.addEventListener('click', openSavedPanel);
    }
    if (elements.closeSavedPanel) {
        elements.closeSavedPanel.addEventListener('click', closeSavedPanel);
    }
    if (elements.savedOverlay) {
        elements.savedOverlay.addEventListener('click', closeSavedPanel);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to go back
        if (e.key === 'Escape') {
            if (!elements.savedPanel?.classList.contains('hidden')) {
                closeSavedPanel();
            } else if (elements.conversationView.classList.contains('active')) {
                showSelectionView();
            } else if (elements.dinnerPartyConversationView?.classList.contains('active')) {
                showDinnerPartySelection();
            }
        }
    });
}

