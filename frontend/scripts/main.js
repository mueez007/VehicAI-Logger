import ApiService from "../services/apiService.js";

const logList = document.getElementById("logList");
const addLogBtn = document.getElementById("addLogBtn");
const logModal = document.getElementById("logModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const logForm = document.getElementById("logForm");
const modalTitle = document.getElementById("modalTitle");
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const themeToggle = document.getElementById("themeToggle");

let logToDeleteId = null;
let editLogId = "";
let recognition = null;

// Theme functionality
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  
  themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = themeToggle.querySelector('i');
  if (theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
  } else {
    icon.className = 'fa-solid fa-moon';
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
      const activeVoiceBtn = document.querySelector('.voice-btn.listening');
      if (activeVoiceBtn) {
        const targetId = activeVoiceBtn.dataset.target;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          if (targetElement.tagName === 'TEXTAREA') {
            targetElement.value += transcript + ' ';
          } else {
            targetElement.value = transcript;
          }
        }
        activeVoiceBtn.classList.remove('listening');
      }
    };

    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      const activeVoiceBtn = document.querySelector('.voice-btn.listening');
      if (activeVoiceBtn) {
        activeVoiceBtn.classList.remove('listening');
        showNotification('Voice recognition failed. Please try again.', 'error');
      }
    };

    recognition.onend = function() {
      const activeVoiceBtn = document.querySelector('.voice-btn.listening');
      if (activeVoiceBtn) {
        activeVoiceBtn.classList.remove('listening');
      }
    };
  } else {
    console.warn('Speech recognition not supported in this browser');
    // Disable voice buttons
    document.querySelectorAll('.voice-btn').forEach(btn => {
      btn.style.display = 'none';
    });
  }
}

function setupVoiceButtons() {
  document.querySelectorAll('.voice-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (!recognition) return;
      
      const targetId = this.dataset.target;
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        this.classList.add('listening');
        recognition.start();
        
        // Show listening notification
        showNotification('Listening... Speak now', 'info');
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initVoiceRecognition();
  loadLogs();
});

async function loadLogs() {
  try {
    const logs = await ApiService.get("/vehicle_service_logs/");
    renderLogs(logs);
  } catch (error) {
    console.error("Error fetching vehicle service logs:", error);
    logList.innerHTML = `<p class="error-text">Failed to load vehicle service logs.</p>`;
  }
}

// CHALLENGE 5: Load mechanics for dropdown
async function loadMechanics() {
  try {
    console.log('🔧 Loading mechanics from API...');
    const mechanics = await ApiService.getMechanics();
    console.log('✅ Mechanics loaded successfully:', mechanics);
    
    if (mechanics && mechanics.length > 0) {
      console.log(`📋 Found ${mechanics.length} mechanics`);
      populateMechanicDropdown(mechanics);
    } else {
      console.log('❌ No mechanics found or empty array');
      populateMechanicDropdown([]);
    }
  } catch (error) {
    console.error("❌ Error fetching mechanics:", error);
    console.error("Error details:", error.message);
    populateMechanicDropdown([]);
  }
}

function populateMechanicDropdown(mechanics = []) {
  console.log('🔄 Populating mechanic dropdown with:', mechanics);
  const mechanicSelect = document.getElementById('mechanic_id');
  
  if (!mechanicSelect) {
    console.error('❌ Mechanic dropdown element not found!');
    return;
  }
  
  mechanicSelect.innerHTML = '<option value="">Select Mechanic</option>';
  console.log(`📝 Adding ${mechanics.length} mechanics to dropdown`);
  
  mechanics.forEach(mechanic => {
    const option = document.createElement('option');
    option.value = mechanic.id;
    option.textContent = `${mechanic.name} - ${mechanic.specialization} (${mechanic.experience_years} years)`;
    console.log(`➕ Adding mechanic: ${option.textContent}`);
    mechanicSelect.appendChild(option);
  });
  
  console.log('✅ Mechanic dropdown populated');
}

function renderLogs(logs = []) {
  if (!logs || !logs.length) {
    logList.innerHTML = `<p>No vehicle service logs found. Add a new one!</p>`;
    return;
  }

  logList.innerHTML = logs
    .map(
      (log) => `
        <div class="log-card">
          <div class="log-info">
            <h3>${escapeHtml(log.vehicle_model || "Unknown Model")}</h3>
            <p><strong>Owner:</strong> ${escapeHtml(log.owner_name || "N/A")}</p>
            <p><strong>Vehicle ID:</strong> ${escapeHtml(log.vehicle_id || "N/A")}</p>
            <p><strong>Service Date:</strong> ${escapeHtml(formatDate(log.service_date))}</p>
            <p><strong>Service Type:</strong> ${escapeHtml(log.service_type || "N/A")}</p>
            <!-- CHALLENGE 5: Show mechanic info if available -->
            ${log.mechanic_id ? `<p><strong>Mechanic ID:</strong> ${escapeHtml(log.mechanic_id)}</p>` : ''}
            <p><strong>Description:</strong> ${escapeHtml(log.description || "No description")}</p>
            <p><strong>Mileage:</strong> ${escapeHtml(log.mileage ? log.mileage + ' km' : 'N/A')}</p>
            <p><strong>Cost:</strong> ₹${escapeHtml(log.cost || '0')}</p>
            <p><strong>Next Service:</strong> ${
              log.next_service_date ? escapeHtml(formatDate(log.next_service_date)) : "Not scheduled"
            }</p>
          </div>
          <div class="log-actions">
            <button
              class="btn-edit"
              data-action="edit"
              data-id="${log.id}"
              data-owner_name="${escapeHtml(log.owner_name || '')}"
              data-vehicle_model="${escapeHtml(log.vehicle_model || '')}"
              data-vehicle_id="${escapeHtml(log.vehicle_id || '')}"
              data-service_date="${escapeHtml(log.service_date || '')}"
              data-service_type="${escapeHtml(log.service_type || '')}"
              data-mechanic_id="${escapeHtml(log.mechanic_id || '')}"
              data-description="${escapeHtml(log.description || '')}"
              data-mileage="${escapeHtml(log.mileage || '')}"
              data-cost="${escapeHtml(log.cost || '')}"
              data-next_service_date="${escapeHtml(log.next_service_date || '')}"
            >
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button
              class="btn-delete"
              data-action="delete"
              data-id="${log.id}"
            >
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </div>
      `
    )
    .join("");
}

// Event Listeners
addLogBtn.addEventListener("click", () => openLogModal());
closeModalBtn.addEventListener("click", () => closeLogModal());
cancelDeleteBtn.addEventListener("click", () => closeDeleteConfirmModal());
confirmDeleteBtn.addEventListener("click", () => {
  if (logToDeleteId) {
    deleteLog(logToDeleteId);
    closeDeleteConfirmModal();
  }
});

function openLogModal(log = null) {
  logModal.style.display = "flex";
  
  // CHALLENGE 5: Load mechanics when opening modal
  console.log('🎯 Opening modal, loading mechanics...');
  loadMechanics();
  
  // Setup voice buttons for this modal
  setTimeout(() => {
    setupVoiceButtons();
  }, 100);
  
  if (log) {
    modalTitle.textContent = "Edit Service Log";
    document.getElementById("owner_name").value = log.owner_name || '';
    document.getElementById("vehicle_model").value = log.vehicle_model || '';
    document.getElementById("vehicle_id").value = log.vehicle_id || '';
    document.getElementById("service_date").value = log.service_date ? log.service_date.split("T")[0] : '';
    document.getElementById("service_type").value = log.service_type || '';
    document.getElementById("mechanic_id").value = log.mechanic_id || '';
    document.getElementById("description").value = log.description || '';
    document.getElementById("mileage").value = log.mileage || '';
    document.getElementById("cost").value = log.cost || '';
    document.getElementById("next_service_date").value = log.next_service_date ? log.next_service_date.split("T")[0] : '';
    editLogId = log.id;
  } else {
    modalTitle.textContent = "Add New Service Log";
    logForm.reset();
    
    // Set default next service date to 6 months from today
    const today = new Date();
    const nextServiceDate = new Date(today);
    nextServiceDate.setMonth(today.getMonth() + 6);
    document.getElementById("next_service_date").value = nextServiceDate.toISOString().split('T')[0];
    
    editLogId = null;
  }
}

function closeLogModal() {
  logModal.style.display = "none";
  editLogId = null;
}

function openDeleteConfirmModal(logId) {
  logToDeleteId = logId;
  deleteConfirmModal.style.display = "flex";
}

function closeDeleteConfirmModal() {
  deleteConfirmModal.style.display = "none";
  logToDeleteId = null;
}

logForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Generate vehicle ID if empty
  let vehicleId = logForm.vehicle_id.value.trim();
  if (!vehicleId) {
    const vehicleModel = logForm.vehicle_model.value.trim().replace(/\s+/g, '_').toLowerCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    vehicleId = `${vehicleModel}_${randomNum}`;
    document.getElementById("vehicle_id").value = vehicleId;
  }

  const logData = {
    owner_name: logForm.owner_name.value.trim(),
    vehicle_model: logForm.vehicle_model.value.trim(),
    vehicle_id: vehicleId,
    service_date: new Date(logForm.service_date.value).toISOString(),
    service_type: logForm.service_type.value,
    // CHALLENGE 5: Include mechanic_id
    mechanic_id: logForm.mechanic_id.value || null,
    description: logForm.description.value.trim(),
    mileage: parseInt(logForm.mileage.value) || 0,
    cost: parseFloat(logForm.cost.value) || 0,
    next_service_date: logForm.next_service_date.value ? new Date(logForm.next_service_date.value).toISOString() : null,
  };

  try {
    if (editLogId) {
      // For editing, include the ID
      logData.id = editLogId;
      await ApiService.put(`/vehicle_service_logs/${editLogId}`, logData);
    } else {
      // For new entries, let the backend generate ID
      await ApiService.post("/vehicle_service_logs/", logData);
    }
    closeLogModal();
    loadLogs();
    
    // Show success message
    showNotification(`Service log ${editLogId ? 'updated' : 'added'} successfully!`, 'success');
  } catch (error) {
    console.error("Error saving vehicle service log:", error);
    showNotification('Failed to save service log. Please try again.', 'error');
  }
});

async function deleteLog(id) {
  try {
    await ApiService.delete(`/vehicle_service_logs/${id}`);
    loadLogs();
    showNotification('Service log deleted successfully!', 'success');
  } catch (error) {
    console.error("Error deleting vehicle service log:", error);
    showNotification('Failed to delete service log. Please try again.', 'error');
  }
}

// Event delegation for dynamic buttons
logList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === "edit") {
    const data = {
      id: btn.dataset.id || "",
      owner_name: btn.dataset.owner_name || "",
      vehicle_model: btn.dataset.vehicle_model || "",
      vehicle_id: btn.dataset.vehicle_id || "",
      service_date: btn.dataset.service_date || "",
      service_type: btn.dataset.service_type || "",
      mechanic_id: btn.dataset.mechanic_id || "",
      description: btn.dataset.description || "",
      mileage: parseInt(btn.dataset.mileage) || 0,
      cost: parseFloat(btn.dataset.cost) || 0,
      next_service_date: btn.dataset.next_service_date || "",
    };
    openLogModal(data);
  } else if (action === "delete") {
    openDeleteConfirmModal(id);
  }
});

// Utility functions
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Close modals when clicking outside
window.onclick = function (event) {
  if (event.target === logModal) {
    closeLogModal();
  }
  if (event.target === deleteConfirmModal) {
    closeDeleteConfirmModal();
  }
};