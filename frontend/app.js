document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const reindexBtn = document.getElementById('reindex-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    let chatHistory = [];

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addMessage(role, content, sources = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const avatar = role === 'bot' ? '🤖' : '👤';
        const avatarClass = role === 'bot' ? 'bot-avatar' : 'user-avatar';
        
        let messageHTML = `
            <div class="avatar ${avatarClass}">${avatar}</div>
            <div class="message-content">
                <p>${content.replace(/\n/g, '<br>')}</p>
        `;

        // Render sources if available
        if (sources && sources.length > 0) {
            messageHTML += `
                <div class="sources-container">
                    <div class="sources-label">Sources Used</div>
                    <div class="sources-list">
            `;
            
            sources.forEach(source => {
                messageHTML += `
                    <a href="${source.url}" target="_blank" class="source-tag" title="${source.title}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        ${source.section || 'SECE Web'}
                    </a>
                `;
            });
            
            messageHTML += `</div></div>`;
        }
        
        messageHTML += `</div>`;
        messageDiv.innerHTML = messageHTML;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function addTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message typing-msg';
        messageDiv.id = 'typing-indicator';
        
        messageDiv.innerHTML = `
            <div class="avatar bot-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const text = userInput.value.trim();
        if (!text) return;

        // Add user message
        addMessage('user', text);
        userInput.value = '';
        
        // Add typing indicator
        addTypingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: text,
                    history: chatHistory
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add bot message
            addMessage('bot', data.answer, data.sources);
            
            // Update history
            chatHistory.push({ role: 'user', content: text });
            chatHistory.push({ role: 'assistant', content: data.answer });
            
            // Keep history manageable (last 10 messages = 5 pairs)
            if (chatHistory.length > 10) {
                chatHistory = chatHistory.slice(chatHistory.length - 10);
            }

        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessage('bot', 'Sorry, I encountered an error while processing your request. Please try again later.');
        }
    });

    reindexBtn.addEventListener('click', async () => {
        if (!confirm('This will trigger a full re-scrape and re-index of the website. It might take a while. Continue?')) {
            return;
        }

        loadingOverlay.classList.remove('hidden');

        try {
            const response = await fetch('/admin/reindex', {
                method: 'POST'
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('Success: ' + data.message);
            } else {
                alert('Error: ' + data.detail);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during re-indexing.');
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });
});
