const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  
  let data;
  try {
    data = await response.json();
  } catch(e) {
    if (!response.ok) throw new Error('Request failed with no error body');
    return null;
  }

  if (!response.ok) {
    // Expired or deactivated session: clear it and go back to the right login page.
    if (response.status === 401 && token && !endpoint.startsWith('/auth/')) {
      const wasAdmin = localStorage.getItem('canwin_admin');
      clearSession();
      window.location.href = wasAdmin ? '/adminlogin' : '/';
    }
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('canwin_user');
  localStorage.removeItem('canwin_admin');
}

export const api = {
  auth: {
    login: (phone, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    changePassword: (current_password, new_password) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),
  },
  courses: {
    list: (params = {}) => {
      const query = params.admin ? '?admin=true' : '';
      return request(`/courses${query}`);
    },
    create: (data) => request('/courses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
  },
  admissions: {
    list: () => request('/my-admissions'),
    create: (data) => request('/admissions', { method: 'POST', body: JSON.stringify(data) }),
  },
  team: {
    get: () => request('/team'),
  },
  wallet: {
    get: (userId) => request(`/wallet?user_id=${userId}`),
    withdraw: (details) => request('/wallet', { method: 'POST', body: JSON.stringify(details) }),
  },
  bonuses: {
    list: () => request('/bonuses'),
    create: (data) => request('/bonuses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/bonuses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/bonuses/${id}`, { method: 'DELETE' }),
  },
  admin: {
    getStats: () => request('/admin/stats'),
    getPromoters: () => request('/admin/promoters'), 
    getStudents: () => request('/admin/students'),
    getReferrals: () => request('/admin/referrals'),
    approveUser: (userId) => request(`/admin/approve/${userId}`, { method: 'POST' }),
    deleteUser: (userId) => request(`/admin/delete-user/${userId}`, { method: 'DELETE' }),
    getWithdrawals: () => request('/admin/withdrawals'),
    updateWithdrawal: (id, status, extra = {}) => request('/admin/withdrawals', { method: 'PUT', body: JSON.stringify({ id, status, ...extra }) }),
    recordPayment: (user_id, amount, note) => request('/admin/payments', { method: 'POST', body: JSON.stringify({ user_id, amount, note }) }),
    updateUser: (userId, data) => request(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateAdmission: (admissionId, data) => request(`/admin/admissions/${admissionId}`, { method: 'PUT', body: JSON.stringify(data) }),
    admissions: {
        approve: (admission_id) => request(`/admin/admissions/approve`, { method: 'POST', body: JSON.stringify({ admission_id }) }),
        reject: (admission_id) => request(`/admin/admissions/reject`, { method: 'POST', body: JSON.stringify({ admission_id }) })
    },
    users: {
      create: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    },
    offers: {
      list: () => request('/admin/offers'),
      create: (data) => request('/admin/offers', { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) => request(`/admin/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id) => request(`/admin/offers/${id}`, { method: 'DELETE' }),
    }
  }
};
