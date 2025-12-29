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
    selectedModel: null
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
    modelSelector: document.getElementById('model-selector')
};

// Initialize app
document.addEventListener('DOMContentLoaded', init);

async function init() {
    initTheme();
    await Promise.all([loadFigures(), loadModels()]);
    setupEventListeners();
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
                            updateStreamingMessage(messageElement, fullResponse);
                            scrollToBottom();
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
            finalizeStreamingMessage(messageElement, fullResponse);
            state.conversationHistory.push({ role: 'assistant', content: fullResponse });
            return true;
        }
        
        // No content received - remove the empty message element
        messageElement.remove();
        return false;
        
    } catch (error) {
        console.error('Streaming error:', error);
        return false;
    }
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

// Update streaming message with new content
function updateStreamingMessage(messageElement, content) {
    const textElement = messageElement.querySelector('.streaming-text');
    if (textElement) {
        textElement.innerHTML = formatMessage(content) + '<span class="cursor"></span>';
    }
}

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
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to go back
        if (e.key === 'Escape' && elements.conversationView.classList.contains('active')) {
            showSelectionView();
        }
    });
}

