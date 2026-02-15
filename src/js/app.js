/**
 * Scholaco Main App Logic
 * Refactored from inline script
 */

import { supabase, getCurrentUser, signIn, signUp, signOut } from './supabase.js';
import { getAllApplications, createApplication, updateApplication, deleteApplication, getStats } from './applications.js';
import { sendWelcomeEmail, sendDeadlineReminder, sendApplicationSubmitted } from './brevo.js';

// Global state
let applications = [];
let currentEditApp = null;
let sidebarOpen = false;
let currentUser = null;

// Initialize app
export async function initApp() {
  // Check if user is logged in
  currentUser = await getCurrentUser();
  
  if (currentUser) {
    // Update welcome message with user's first name
    await updateWelcomeMessage();
    
    if (window.location.hash === '#dashboard') {
      showPage('dashboard-page');
      await loadApplications();
    }
  }
  
  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      currentUser = session.user;
      await updateWelcomeMessage();
      showPage('dashboard-page');
      loadApplications();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      showPage('landing-page');
    }
  });
}

// Update welcome message with user's first name
async function updateWelcomeMessage() {
  if (!currentUser) return;
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', currentUser.id)
      .single();
    
    if (profile && profile.full_name) {
      // Get first name from full name
      const firstName = profile.full_name.split(' ')[0];
      
      // Update the welcome message
      const welcomeHeader = document.querySelector('header h1');
      if (welcomeHeader) {
        welcomeHeader.innerHTML = `Welcome back, <span class="gradient-text">${firstName}</span>! 👋`;
      }
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
  }
}

// Load applications from Supabase
async function loadApplications() {
  const { data, error } = await getAllApplications();
  
  if (error) {
    console.error('Error loading applications:', error);
    showToast('Error loading applications', 'error');
    return;
  }
  
  applications = data || [];
  renderApplications();
  updateStats();
}

// Page navigation
export function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  
  if (pageId === 'dashboard-page') {
    loadApplications();
    updateWelcomeMessage(); // Update welcome message when showing dashboard
    closeSidebar();
  }
}

// Sidebar functions
export function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebarOpen) {
    sidebar.classList.remove('collapsed');
    overlay.classList.add('active');
  } else {
    sidebar.classList.add('collapsed');
    overlay.classList.remove('active');
  }
}

export function closeSidebar() {
  sidebarOpen = false;
  document.getElementById('app-sidebar').classList.add('collapsed');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// Dashboard view navigation
export function setDashboardView(view) {
  document.querySelectorAll('.dashboard-view').forEach(v => v.classList.add('hidden'));
  const viewEl = document.getElementById(`dashboard-${view}`);
  if (viewEl) {
    viewEl.classList.remove('hidden');
    viewEl.classList.add('block');
  }
  
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === view) item.classList.add('active');
  });
  
  closeSidebar();
  
  if (view === 'calendar') renderCalendar();
  if (view === 'reminders') renderReminders();
}

// Modal functions
export function openModal(type) {
  document.getElementById(`modal-${type}`).classList.remove('hidden');
}

export function closeModal(type) {
  document.getElementById(`modal-${type}`).classList.add('hidden');
  if (type === 'add-application') {
    document.getElementById('add-application-form').reset();
  }
}

// Toast notifications
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg animate-slide-in ${
    type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-maroon-600'
  } text-white`;
  
  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${type === 'success' 
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'}
    </svg>
    <span class="font-medium">${message}</span>
  `;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Helper functions
function getStatusBadge(status) {
  const configs = {
    not_started: { bg: 'bg-maroon-100', text: 'text-maroon-700', label: 'Not Started' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'In Progress' },
    awaiting: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Awaiting Response' }
  };
  const config = configs[status] || configs.not_started;
  return `<span class="px-3 py-1 ${config.bg} ${config.text} text-xs font-semibold rounded-full">${config.label}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'No deadline';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const deadline = new Date(dateStr);
  const today = new Date();
  const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  return diff;
}

// Render applications
function renderApplications() {
  const recentContainer = document.getElementById('recent-applications');
  const allContainer = document.getElementById('all-applications');
  
  if (applications.length === 0) {
    const emptyState = `
      <div class="text-center py-12 text-gray-400">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p class="text-lg font-medium">No applications yet</p>
        <p class="text-sm">Click "Add Application" to get started!</p>
      </div>
    `;
    recentContainer.innerHTML = emptyState;
    allContainer.innerHTML = emptyState;
    return;
  }
  
  const sortedApps = [...applications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const renderCard = (app) => {
    const days = daysUntil(app.deadline);
    const daysText = days !== null 
      ? (days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `Due in ${days} days`)
      : 'No deadline';
    const daysClass = days !== null && days <= 3 ? 'text-red-600' : 'text-gray-500';
    
    return `
      <div class="bg-white border border-gray-100 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-md transition-all group gap-4 sm:gap-0" data-id="${app.id}">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <h3 class="font-semibold text-gray-800 truncate">${app.name}</h3>
            ${getStatusBadge(app.status)}
          </div>
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
            <span class="text-gray-500">${app.organization || 'No organization'}</span>
            <span class="text-maroon-600 font-medium">${app.amount || 'Amount TBD'}</span>
            <span class="${daysClass}">${daysText}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-auto">
          <button onclick="window.editApplication('${app.id}')" class="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0">
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button onclick="window.confirmDelete('${app.id}')" class="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors delete-btn flex-shrink-0">
            <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  };
  
  recentContainer.innerHTML = sortedApps.slice(0, 5).map(renderCard).join('');
  allContainer.innerHTML = sortedApps.map(renderCard).join('');
}

// Update statistics
async function updateStats() {
  const stats = await getStats();
  
  if (!stats) return;
  
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-progress').textContent = stats.inProgress;
  document.getElementById('stat-awaiting').textContent = stats.awaiting;
  document.getElementById('stat-potential').textContent = `$${stats.potentialAwards.toLocaleString()}`;
}

// Render calendar view
function renderCalendar() {
  const container = document.getElementById('calendar-deadlines');
  const appsWithDeadlines = applications.filter(a => a.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  
  if (appsWithDeadlines.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p class="text-lg font-medium">No deadlines set</p>
        <p class="text-sm">Add applications with deadlines to see them here</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = appsWithDeadlines.map(app => {
    const days = daysUntil(app.deadline);
    const urgent = days !== null && days <= 7;
    
    return `
      <div class="flex items-center gap-4 p-4 rounded-xl ${urgent ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-100'}">
        <div class="w-14 h-14 rounded-xl ${urgent ? 'bg-red-100' : 'bg-maroon-100'} flex flex-col items-center justify-center flex-shrink-0">
          <span class="text-xs ${urgent ? 'text-red-600' : 'text-maroon-600'} font-medium">${new Date(app.deadline).toLocaleDateString('en-US', { month: 'short' })}</span>
          <span class="text-lg ${urgent ? 'text-red-700' : 'text-maroon-700'} font-bold">${new Date(app.deadline).getDate()}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-800 truncate">${app.name}</h3>
          <p class="text-sm text-gray-500 truncate">${app.organization || 'No organization'} • ${app.amount || 'Amount TBD'}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="text-sm font-medium ${urgent ? 'text-red-600' : 'text-gray-600'}">${days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days} days left`}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Render reminders
function renderReminders() {
  const container = document.getElementById('reminders-list');
  const appsWithReminders = applications.filter(a => a.reminder).sort((a, b) => new Date(a.reminder) - new Date(b.reminder));
  
  if (appsWithReminders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <p class="text-lg font-medium">No reminders set</p>
        <p class="text-sm">Add reminders to your applications to stay on track</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = appsWithReminders.map(app => {
    const reminderDate = new Date(app.reminder);
    const isPast = reminderDate < new Date();
    
    return `
      <div class="flex items-center gap-4 p-4 rounded-xl ${isPast ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-gray-100'}">
        <div class="w-12 h-12 rounded-xl ${isPast ? 'bg-orange-100' : 'bg-maroon-100'} flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6 ${isPast ? 'text-orange-600' : 'text-maroon-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-800 truncate">${app.name}</h3>
          <p class="text-sm text-gray-500 truncate">${reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${reminderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
        </div>
        <button onclick="window.clearReminder('${app.id}')" class="text-sm text-gray-500 hover:text-red-600 transition-colors flex-shrink-0">
          Dismiss
        </button>
      </div>
    `;
  }).join('');
}

// Add application
export async function addApplication(e) {
  e.preventDefault();
  
  const btn = document.getElementById('add-app-btn');
  btn.disabled = true;
  btn.textContent = 'Adding...';
  
  const appData = {
    name: document.getElementById('app-name').value,
    organization: document.getElementById('app-org').value,
    amount: document.getElementById('app-amount').value,
    deadline: document.getElementById('app-deadline').value,
    status: document.getElementById('app-status').value,
    reminder: document.getElementById('app-reminder').value,
    notes: document.getElementById('app-notes').value
  };
  
  const { data, error } = await createApplication(appData);
  
  if (error) {
    showToast('Failed to add application', 'error');
  } else {
    showToast('Application added successfully!');
    closeModal('add-application');
    await loadApplications();
  }
  
  btn.disabled = false;
  btn.textContent = 'Add Application';
}

// Edit application
export function editApplication(id) {
  const app = applications.find(a => a.id === id);
  if (!app) return;
  
  currentEditApp = app;
  document.getElementById('edit-app-id').value = app.id;
  document.getElementById('edit-app-name').value = app.name || '';
  document.getElementById('edit-app-org').value = app.organization || '';
  document.getElementById('edit-app-amount').value = app.amount || '';
  document.getElementById('edit-app-deadline').value = app.deadline || '';
  document.getElementById('edit-app-status').value = app.status || 'not_started';
  document.getElementById('edit-app-reminder').value = app.reminder || '';
  document.getElementById('edit-app-notes').value = app.notes || '';
  
  openModal('edit-application');
}

// Save edited application
export async function saveApplication(e) {
  e.preventDefault();
  
  const btn = document.getElementById('edit-app-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  
  const updates = {
    name: document.getElementById('edit-app-name').value,
    organization: document.getElementById('edit-app-org').value,
    amount: document.getElementById('edit-app-amount').value,
    deadline: document.getElementById('edit-app-deadline').value,
    status: document.getElementById('edit-app-status').value,
    reminder: document.getElementById('edit-app-reminder').value,
    notes: document.getElementById('edit-app-notes').value
  };
  
  const { error } = await updateApplication(currentEditApp.id, updates);
  
  if (error) {
    showToast('Failed to update application', 'error');
  } else {
    showToast('Application updated successfully!');
    closeModal('edit-application');
    await loadApplications();
    
    // Send email if status changed to awaiting
    if (updates.status === 'awaiting' && currentUser) {
      await sendApplicationSubmitted(currentUser.email, updates.name);
    }
  }
  
  btn.disabled = false;
  btn.textContent = 'Save Changes';
}

// Confirm and delete application
export function confirmDelete(id) {
  const btn = document.querySelector(`[data-id="${id}"] .delete-btn`);
  if (btn.dataset.confirming) {
    handleDelete(id);
  } else {
    btn.dataset.confirming = 'true';
    btn.innerHTML = `<span class="text-xs font-semibold text-red-600">Confirm?</span>`;
    btn.classList.add('w-20');
    setTimeout(() => {
      if (btn.dataset.confirming) {
        btn.dataset.confirming = '';
        btn.classList.remove('w-20');
        btn.innerHTML = `<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
      }
    }, 3000);
  }
}

async function handleDelete(id) {
  const { error } = await deleteApplication(id);
  
  if (error) {
    showToast('Failed to delete application', 'error');
  } else {
    showToast('Application deleted');
    await loadApplications();
  }
}

// Clear reminder
export async function clearReminder(id) {
  const { error } = await updateApplication(id, { reminder: null });
  
  if (error) {
    showToast('Failed to clear reminder', 'error');
  } else {
    showToast('Reminder dismissed');
    await loadApplications();
  }
}

// Form handlers for auth
export async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  const { error } = await signIn(email, password);
  
  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('Welcome back!');
    showPage('dashboard-page');
  }
}

export async function handleSignup(e) {
  e.preventDefault();
  
  const firstName = document.getElementById('signup-first').value;
  const lastName = document.getElementById('signup-last').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  
  const fullName = `${firstName} ${lastName}`;
  
  const { error } = await signUp(email, password, fullName);
  
  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('Account created successfully!');
    await sendWelcomeEmail(email, fullName);
    showPage('dashboard-page');
  }
}

export async function handleSignOut() {
  await signOut();
  showPage('landing-page');
  showToast('Signed out successfully');
}

// Make functions available globally for onclick handlers
window.showPage = showPage;
window.toggleSidebar = toggleSidebar;
window.setDashboardView = setDashboardView;
window.openModal = openModal;
window.closeModal = closeModal;
window.editApplication = editApplication;
window.confirmDelete = confirmDelete;
window.clearReminder = clearReminder;

// Email integration functions
window.connectGmail = connectGmail;
window.connectOutlook = connectOutlook;
window.connectYahoo = connectYahoo;
window.configureOtherEmail = configureOtherEmail;

// Email Integration Functions
export function connectGmail() {
  showToast('Gmail integration coming soon! For now, you can manually check your emails.', 'info');
  // TODO: Implement Gmail OAuth flow
  // This would require backend API to handle OAuth tokens
}

export function connectOutlook() {
  showToast('Outlook integration coming soon! For now, you can manually check your emails.', 'info');
  // TODO: Implement Microsoft OAuth flow
}

export function connectYahoo() {
  showToast('Yahoo Mail integration coming soon! For now, you can manually check your emails.', 'info');
  // TODO: Implement Yahoo OAuth flow
}

export function configureOtherEmail() {
  showToast('IMAP/SMTP configuration coming soon! For now, you can manually check your emails.', 'info');
  // TODO: Implement IMAP/SMTP configuration
}