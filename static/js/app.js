/**
 * SeanceAI - Talk to History
 * Frontend JavaScript Application
 */

// State management
const state = {
    figures: [],
    currentFigure: null,
    conversationHistory: [],
    isLoading: false
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
    toastMessage: document.getElementById('toast-message')
};

// Initialize app
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadFigures();
    setupEventListeners();
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

// Render the figures selection grid
function renderFiguresGrid() {
    const grid = elements.figuresGrid;
    grid.innerHTML = '';

    state.figures.forEach(figure => {
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
    
    // Add welcome message
    addMessage('figure', `*The spirit of ${figure.name} materializes before you*\n\nGreetings, traveler through time. I am ${figure.name}, ${figure.title}. What wisdom do you seek from my era?`);
    
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
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    if (role === 'figure') {
        const figure = state.currentFigure;
        messageDiv.innerHTML = `
            <div class="message-portrait">
                <img src="/static/images/figures/${figure.id}.svg" alt="${figure.name}" onerror="this.src='/static/images/figures/default.svg'">
            </div>
            <div class="message-content">
                <span class="message-author">${figure.name}</span>
                <p>${formatMessage(content)}</p>
            </div>
        `;
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

// Send a message to the AI
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
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                figure_id: state.currentFigure.id,
                message: message,
                history: state.conversationHistory.slice(-20)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Add AI response
            addMessage('figure', data.response);
            state.conversationHistory.push({ role: 'assistant', content: data.response });
        } else {
            showToast(data.error || 'Failed to receive response');
            addMessage('figure', '*The spirit\'s voice fades momentarily* I apologize, something disrupted our connection. Please try again.');
        }
    } catch (error) {
        console.error('Chat error:', error);
        showToast('Connection lost. Please try again.');
        addMessage('figure', '*The spirit\'s voice fades momentarily* I apologize, something disrupted our connection. Please try again.');
    } finally {
        state.isLoading = false;
        hideTypingIndicator();
        elements.messageInput.focus();
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

// View switching
function showConversationView() {
    elements.selectionView.classList.remove('active');
    elements.conversationView.classList.add('active');
    document.body.classList.add('in-conversation');
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
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to go back
        if (e.key === 'Escape' && elements.conversationView.classList.contains('active')) {
            showSelectionView();
        }
    });
}

