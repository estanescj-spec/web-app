const API_BASE_URL = 'http://localhost:4000/';

function getAuthToken() {
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    try {
        return JSON.parse(token);
    } catch {
        return token.replace(/^"|"$/g, '');
    }
}

function getUserRole() {
    const role = sessionStorage.getItem('role');
    if (!role) return '';
    try {
        return JSON.parse(role).toLowerCase();
    } catch {
        return role.replace(/"/g, '').toLowerCase();
    }
}

function requireAuth(redirectUrl) {
    const token = getAuthToken();
    if (!token) {
        Swal.fire({
            icon: 'warning',
            text: 'You must be logged in to access this page.',
            showConfirmButton: true
        }).then(() => {
            window.location.href = redirectUrl || 'login.html';
        });
        return null;
    }
    return token;
}

function requireAdmin() {
    const token = requireAuth();
    if (!token) return null;
    if (getUserRole() !== 'admin') {
        Swal.fire({
            icon: 'error',
            text: 'Admin access required.',
            showConfirmButton: true
        }).then(() => {
            window.location.href = 'home.html';
        });
        return null;
    }
    return token;
}

function authHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
}

function productImageUrl(imgPath) {
    if (!imgPath) return 'https://placehold.co/300x200?text=No+Image';
    if (imgPath.startsWith('http')) return imgPath;
    return API_BASE_URL + imgPath.replace(/^\//, '');
}
