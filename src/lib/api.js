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
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  auth: {
    login: (phone, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    getProfile: (userId) => request(`/wallet?user_id=${userId}`), // Reusing wallet for now or add profile endpoint
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
    withdraw: (userId, amount) => request('/wallet', { method: 'POST', body: JSON.stringify({ user_id: userId, amount }) }),
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
    deleteCourse: (courseId) => request(`/admin/delete-course/${courseId}`, { method: 'DELETE' }),
    getWithdrawals: () => request('/admin/withdrawals'),
    updateWithdrawal: (id, status) => request('/admin/withdrawals', { method: 'PUT', body: JSON.stringify({ id, status }) }),
    updateUser: (userId, data) => request(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateAdmission: (admissionId, data) => request(`/admin/admissions/${admissionId}`, { method: 'PUT', body: JSON.stringify(data) }),
    seed: () => request('/admin/seed', { method: 'POST' }),
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
