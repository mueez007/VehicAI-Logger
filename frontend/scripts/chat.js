import ApiService from "../services/apiService.js";
const AgentName = "agent";
let activeSessionId = "";
let recognition = null;
let currentFile = null;

// Theme functionality
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
    } else {
      icon.className = 'fa-solid fa-moon';
    }
  }
}

// Voice recognition functionality
function initVoiceRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      const messageInput = document.getElementById('message-input');
      if (messageInput) {
        messageInput.value = transcript;
      }
      const voiceBtn = document.getElementById('voice-btn');
      if (voiceBtn) {
        voiceBtn.classList.remove('listening');
      }
      showNotification('Voice input received', 'success');
    };

    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      const voiceBtn = document.getElementById('voice-btn');
      if (voiceBtn) {
        voiceBtn.classList.remove('listening');
      }
      showNotification('Voice recognition failed. Please try again.', 'error');
    };

    recognition.onend = function() {
      const voiceBtn = document.getElementById('voice-btn');
      if (voiceBtn) {
        voiceBtn.classList.remove('listening');
      }
    };
  } else {
    console.warn('Speech recognition not supported in this browser');
    // Disable voice button
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
      voiceBtn.style.display = 'none';
    }
  }
}

function setupVoiceButton() {
  const voiceBtn = document.getElementById('voice-btn');
  if (voiceBtn && recognition) {
    voiceBtn.addEventListener('click', function() {
      this.classList.add('listening');
      recognition.start();
      showNotification('Listening... Speak now', 'info');
    });
  }
}

// File processing functionality
async function processAndSendFile(file) {
    try {
        showNotification('Processing file...', 'info');
        
        const result = await ApiService.uploadFile(file);
        
        if (result.success) {
            // Send the processed text content to the agent
            const message = `I've uploaded a file: ${result.filename}\n\n${result.content}\n\nPlease analyze this service data and help me add it to the system.`;
            await sendMessage(message);
            showNotification('File processed successfully!', 'success');
        } else {
            showNotification('Failed to process file', 'error');
        }
    } catch (error) {
        console.error('File processing error:', error);
        showNotification('Error processing file: ' + error.message, 'error');
    }
}

// Notification function
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    max-width: 300px;
  `;
  
  if (type === 'success') {
    notification.style.backgroundColor = '#4CAF50';
  } else if (type === 'error') {
    notification.style.backgroundColor = '#f44336';
  } else {
    notification.style.backgroundColor = '#2196F3';
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initVoiceRecognition();
  initChat();
});

function initChat() {
  const newSessionButton = document.getElementById("new-session");
  newSessionButton.addEventListener("click", createSession);
  listSessions();
  setupVoiceButton();
}

// DOM elements
const messagesEl = document.getElementById("messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const fileInput = document.getElementById("file-input");
const uploadList = document.getElementById("upload-list");
const sessionsListWrapper = document.getElementById("sessions-list");

function listSessions() {
  ApiService.get(`/apps/${AgentName}/users/user/sessions`)
    .then((sessions) => {
      if (sessions.length) {
        activeSessionId = sessions[0].id;
        for (let i = 0; i < sessions.length; i++) {
          createSessionElement(sessions[i].id);
        }
      }
    })
    .catch((error) => console.error(error));
}

function createSessionElement(id) {
  const li = document.createElement("li");
  li.setAttribute("id", `id-${id}`);
  li.setAttribute("class", "session-item");
  const deleteIcon = document.createElement("i");
  deleteIcon.setAttribute("class", "fa fa-trash delete-session");
  deleteIcon.onclick = (event) => deleteSession(event, id);
  const spanEl = document.createElement("span");
  spanEl.innerHTML = id;
  if (activeSessionId === id) {
    const existingSessions =
      sessionsListWrapper.querySelectorAll(".session-item");
    if (existingSessions.length) {
      for (let j = 0; j < existingSessions.length; j++) {
        existingSessions[j].classList.remove("active");
      }
    }
    li.classList.add("active");
    updateActiveSession(id);
  }
  li.onclick = () => updateActiveSession(id);
  li.appendChild(spanEl);
  li.appendChild(deleteIcon);
  sessionsListWrapper.appendChild(li);
}

function createSession() {
  ApiService.post(`/apps/${AgentName}/users/user/sessions`)
    .then((session) => {
      activeSessionId = session.id;
      createSessionElement(session.id);
    })
    .catch((error) => console.error(error));
}

function deleteSession(event, id) {
  event.stopPropagation();
  ApiService.delete(`/apps/${AgentName}/users/user/sessions/${id}`)
    .then(() => {
      const session = document.getElementById(`id-${id}`);
      const wasActive = session.classList.contains("active");
      if (wasActive) {
        const firstSession = document.querySelector(".session-item");
        if (firstSession) {
          firstSession.classList.add("active");
          activeSessionId = firstSession.getAttribute("id").replace("id-", "");
          updateActiveSession(activeSessionId); // Load messages for the new active session
        } else {
          activeSessionId = ""; // No sessions left
          messagesEl.innerHTML = ""; // Clear chat if no sessions
        }
      }
      session.parentNode.removeChild(session);
    })
    .catch((error) => console.error(error));
}

function updateActiveSession(id) {
  ApiService.get(`/apps/${AgentName}/users/user/sessions/${id}`)
    .then((sessionResponse) => {
      const existingSessions =
        sessionsListWrapper.querySelectorAll(".session-item");
      if (existingSessions.length) {
        for (let j = 0; j < existingSessions.length; j++) {
          existingSessions[j].classList.remove("active");
        }
      }
      const listEl = document.getElementById(`id-${id}`);
      activeSessionId = id;
      listEl.classList.add("active");
      messagesEl.innerHTML = "";
      renderEvents(sessionResponse.events);
    })
    .catch((error) => console.error(error));
}

function renderEvents(events) {
  for (let i = 0; i < events.length; i++) {
    if (events[i].content) {
      appendMessage(events[i].content, events[i].content.role);
    }
  }
}

// Helpers
function appendMessage(content, who = "model") {
  const el = document.createElement("div");
  if (content.parts) {
    for (let i = 0; i < content.parts.length; i++) {
      const part = content.parts[i];
      if (part.functionResponse) {
        el.className = `message model function`;
        el.innerHTML = `<i class="fa fa-check"></i> ${part.functionResponse.name}`;
      } else {
        el.className = `message ${who}`;
        if (part.text) {
          el.innerHTML = marked.parse(part.text);
        }
        if (part.functionCall) {
          el.classList.add("function");
          el.innerHTML = `<i class="fa fa-bolt"></i> ${part.functionCall.name}`;
        }
        if (part.inlineData) {
          const mediaEl = createMediaElement(part.inlineData);
          if (mediaEl) {
            el.appendChild(mediaEl);
          }
        }
      }
    }
  }
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

function createMediaElement({ data, mimeType, displayName }) {
  const wrapper = document.createElement("div");
  wrapper.className = "message-media";
  const encrpytedData = data.replace(/_/g, "/").replace(/-/g, "+");
  if (mimeType.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = `data:${mimeType};base64,${encrpytedData}`;
    img.alt = displayName;
    img.loading = "lazy";
    wrapper.appendChild(img);
  } else {
    // For non-image files, show a download link
    const link = document.createElement("a");
    link.href = `data:${mimeType};base64,${encrpytedData}`;
    link.download = displayName;
    link.innerHTML = `<i class="fa fa-download"></i> ${displayName}`;
    wrapper.appendChild(link);
  }

  return wrapper;
}

function setSending(isSending) {
  sendBtn.disabled = isSending;
  input.disabled = isSending;
  const voiceBtn = document.getElementById('voice-btn');
  if (voiceBtn) {
    voiceBtn.disabled = isSending;
  }
}

// File handling
const filePreview = document.createElement("div");
filePreview.className = "file-preview";
form.insertBefore(filePreview, form.firstChild);

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Extract the base64 data from the DataURL
      const base64Data = reader.result.split(",")[1];
      resolve({
        data: base64Data,
        displayName: file.name,
        mimeType: file.type,
      });
    };
    reader.onerror = (error) => reject(error);
  });
}

function showFilePreview(file) {
  filePreview.innerHTML = "";
  if (!file) return;

  const wrapper = document.createElement("div");
  wrapper.className = "preview-wrapper";

  if (file.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.className = "message-media preview";
    const reader = new FileReader();
    reader.onload = (e) => (img.src = e.target.result);
    reader.readAsDataURL(file);
    wrapper.appendChild(img);
  } else {
    const fileInfo = document.createElement("div");
    fileInfo.className = "file-info";
    fileInfo.innerHTML = `<i class="fa fa-file"></i> ${file.name}`;
    wrapper.appendChild(fileInfo);
  }

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-preview";
  removeBtn.innerHTML = '<i class="fa fa-times"></i>';
  removeBtn.onclick = clearFilePreview;
  wrapper.appendChild(removeBtn);

  filePreview.appendChild(wrapper);
}

function clearFilePreview() {
  filePreview.innerHTML = "";
  currentFile = null;
  fileInput.value = "";
}

async function sendMessage(text, attachedFile = null) {
  if (!text && !attachedFile) return;

  // Show user's message
  setSending(true);
  const parts = [];

  if (text) {
    parts.push({ text });
  }

  if (attachedFile) {
    const base64Data = await fileToBase64(attachedFile);
    parts.push({ inlineData: base64Data });
  }

  appendMessage({ parts }, "user");
  clearFilePreview();

  const vehicleIdMatch = text.match(/(?:vehicle\s*id|id)[:\s]*([a-zA-Z0-9-]+)/i);
  const vehicleId = vehicleIdMatch ? vehicleIdMatch[1] : null;

  const payload = {
    appName: AgentName,
    newMessage: { role: "user", parts },
    sessionId: activeSessionId,
    stateDelta: vehicleId ? { vehicle_id: vehicleId } : null, // Pass vehicle_id in stateDelta
    streaming: false,
    userId: "user",
  };

  try {
    await ApiService.postWithStream("/run_sse", payload, async (chunk) => {
      if (chunk && typeof chunk === "object") {
        appendMessage(chunk.content, "model");
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });
  } catch (err) {
    console.error("Chat error:", err);
    showNotification('Failed to send message', 'error');
  } finally {
    setSending(false);
  }
}

// File input handler
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    currentFile = file;
    showFilePreview(file);
    
    // Auto-process and send Excel/CSV files
    if (file.type.includes('excel') || file.type.includes('spreadsheet') || file.type.includes('csv') || 
        file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
      await processAndSendFile(file);
      clearFilePreview();
    }
  }
});

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  input.value = "";
  await sendMessage(text, currentFile);
});

// Add CSS for animations if not already present
if (!document.querySelector('style[data-chat-animations]')) {
  const style = document.createElement('style');
  style.setAttribute('data-chat-animations', 'true');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}