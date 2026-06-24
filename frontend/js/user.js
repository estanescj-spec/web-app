$(document).ready(function () {
    const url = API_BASE_URL;

    const handleRegister = function (e) {
        e.preventDefault();
        const name = $('#name').val();
        const email = $('#email').val();
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();
        const role = 'user';

        if (!name || !email || !password) {
            Swal.fire({ icon: 'error', text: 'All fields are required', position: 'bottom-right' });
            return;
        }

        if (password !== confirmPassword) {
            Swal.fire({ icon: 'error', text: 'Passwords do not match', position: 'bottom-right' });
            return;
        }

        $.ajax({
            method: 'POST',
            url: `${url}api/v1/register`,
            data: JSON.stringify({ name, email, password, role }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function () {
                Swal.fire({
                    icon: 'success',
                    text: 'Registration successful! You can now login.',
                    position: 'bottom-right'
                }).then(() => {
                    window.location.href = 'login.html';
                });
            },
            error: function (error) {
                Swal.fire({
                    icon: 'error',
                    text: error.responseJSON?.error || 'Registration failed',
                    position: 'bottom-right'
                });
            }
        });
    };

    $('#registerForm').on('submit', handleRegister);
    $('#register').on('click', function (e) {
        e.preventDefault();
        $(this).closest('form').trigger('submit');
    });

    const syncAuthNav = () => {
        const token = getAuthToken();
        const role = getUserRole();

        if (token) {
            $('#registerNav').hide();
            $('#dashboardNavLink').toggle(role === 'admin');
            $('#authNavBtn')
                .text('Sign Out')
                .removeClass('btn-apple bg-[#1e5aff] text-white')
                .addClass('btn-apple-secondary border border-gray-200')
                .attr('href', '#')
                .off('click')
                .on('click', function (e) {
                    e.preventDefault();
                    sessionStorage.clear();
                    localStorage.removeItem('cart');
                    window.location.href = 'login.html';
                });
            $('#profile-btn').attr('href', 'profile.html');
        } else {
            $('#registerNav').show();
            $('#dashboardNavLink').hide();
            $('#authNavBtn')
                .text('Sign In')
                .removeClass('btn-apple-secondary border border-gray-200')
                .addClass('btn-apple bg-[#1e5aff] text-white')
                .attr('href', 'login.html')
                .off('click');
            $('#profile-btn').attr('href', 'login.html');
        }
    };

    $('#avatar').on('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                $('#avatarPreview, #profileAvatar').attr('src', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    const handleLogin = function (e) {
        e.preventDefault();
        const email = $('#email').val();
        const password = $('#password').val();

        if (!email || !password) {
            Swal.fire({ icon: 'error', text: 'Please fill in all fields', position: 'bottom-right' });
            return;
        }

        $.ajax({
            method: 'POST',
            url: `${url}api/v1/login`,
            data: JSON.stringify({ email, password }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function (data) {
                Swal.fire({
                    icon: 'success',
                    text: 'Logged in successfully',
                    showConfirmButton: false,
                    position: 'bottom-right',
                    timer: 1000,
                    timerProgressBar: true
                });

                sessionStorage.setItem('token', JSON.stringify(data.token));
                sessionStorage.setItem('userId', JSON.stringify(data.user.id));
                sessionStorage.setItem('role', JSON.stringify(data.user.role));
                sessionStorage.setItem('user', JSON.stringify(data.user));

                const role = (data.user.role || 'user').toLowerCase();
                window.location.href = role === 'admin' ? 'dashboard.html' : 'profile.html';
            },
            error: function (error) {
                Swal.fire({
                    icon: 'error',
                    text: error.responseJSON?.message || error.responseJSON?.error || 'Login failed',
                    position: 'bottom-right'
                });
            }
        });
    };

    $('#loginForm').on('submit', handleLogin);
    $('#login').on('click', function (e) {
        e.preventDefault();
        $(this).closest('form').trigger('submit');
    });

    $('#updateBtn').on('click', function (event) {
        event.preventDefault();
        const token = getAuthToken();
        if (!token) return;

        const formData = new FormData($('#profileForm')[0]);

        $.ajax({
            method: 'PUT',
            url: `${url}api/v1/profile`,
            data: formData,
            contentType: false,
            processData: false,
            dataType: 'json',
            headers: authHeaders(),
            success: function () {
                Swal.fire({
                    icon: 'success',
                    text: 'Profile updated successfully',
                    position: 'bottom-right',
                    timer: 1500
                }).then(() => loadProfile());
            },
            error: function () {
                Swal.fire({ icon: 'error', text: 'Error updating profile' });
            }
        });
    });

    function loadProfile() {
        const token = getAuthToken();
        if (!token) return;

        $.ajax({
            method: 'GET',
            url: `${url}api/v1/profile`,
            dataType: 'json',
            headers: authHeaders(),
            success: function (data) {
                const user = data.user;
                $('#profileName').text(user.name || 'User');
                $('#profileEmail').text(user.email || '');
                $('#profileBadge').html(
                    `<span class="badge badge-${user.role === 'admin' ? 'primary' : 'secondary'}">${user.role}</span>`
                );

                const profile = user.CustomerProfile || {};
                $('#firstName').val(profile.fname || '');
                $('#lastName').val(profile.lname || '');
                $('#phone').val(profile.phone || '');

                if (profile.image_path) {
                    $('#profileAvatar').attr('src', productImageUrl(profile.image_path));
                }

                renderAddresses(user.Addresses || []);
            },
            error: function () {
                $('#profileName').text('Error loading profile');
            }
        });
    }

    function renderAddresses(addresses) {
        const $list = $('#addressesList');
        if (!$list.length) return;
        $list.empty();

        if (!addresses.length) {
            $list.html('<p class="text-muted">No addresses saved yet.</p>');
            return;
        }

        addresses.forEach(addr => {
            $list.append(`
                <div class="col-md-6 mb-3">
                    <div class="border rounded p-3">
                        <p class="mb-1">${addr.address_line}</p>
                        <p class="text-muted small mb-0">${addr.city}, ${addr.zipcode}</p>
                        ${addr.is_default ? '<span class="badge badge-primary mt-2">Default</span>' : ''}
                    </div>
                </div>`);
        });
    }

    window.switchTab = function (tab) {
        $('.tab-content-block').hide();
        $('#' + tab + '-tab-content').show();
        $('.list-group-item').removeClass('active-tab');
        $('a[onclick="switchTab(\'' + tab + '\')"]').addClass('active-tab');
    };

    if ($('#profileName').length) {
        const token = requireAuth();
        if (token) loadProfile();
    }

    syncAuthNav();
});
