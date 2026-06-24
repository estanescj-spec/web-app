$(document).ready(function () {
    const url = API_BASE_URL;
    const token = requireAdmin();
    if (!token) return;

    function loadSummary() {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/reports/sales`,
            dataType: 'json',
            headers: authHeaders(),
            success: function (data) {
                $('#totalRevenue').text('₱ ' + (data.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }));
                $('#totalOrders').text(data.totalOrders || 0);
            }
        });

        $.ajax({
            method: 'GET',
            url: `${url}api/v1/reports/inventory`,
            dataType: 'json',
            headers: authHeaders(),
            success: function (data) {
                $('#totalProducts').text(data.totalItems || 0);
            }
        });

        $.ajax({
            method: 'GET',
            url: `${url}api/v1/admin/users`,
            dataType: 'json',
            headers: authHeaders(),
            success: function (data) {
                $('#totalUsers').text((data.users || []).length);
            }
        });
    }

    function randomColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let x = 0; x < 6; x++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            colors.push(color);
        }
        return colors;
    }

    $.ajax({
        method: 'GET',
        url: `${url}api/v1/address-chart`,
        dataType: 'json',
        headers: authHeaders(),
        success: function (data) {
            const rows = data.rows || [];
            new Chart($('#addressChart'), {
                type: 'bar',
                data: {
                    labels: rows.map(item => item.addressline),
                    datasets: [{
                        label: 'Customers per City',
                        data: rows.map(item => item.total),
                        backgroundColor: randomColors(rows.length)
                    }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });
        },
        error: function (error) {
            console.error('address-chart', error);
        }
    });

    $.ajax({
        method: 'GET',
        url: `${url}api/v1/sales-chart`,
        dataType: 'json',
        headers: authHeaders(),
        success: function (data) {
            const rows = data.rows || [];
            new Chart($('#salesChart'), {
                type: 'line',
                data: {
                    labels: rows.map(item => item.month),
                    datasets: [{
                        label: 'Monthly Sales (₱)',
                        data: rows.map(item => item.total),
                        borderColor: '#1e5aff',
                        backgroundColor: 'rgba(30, 90, 255, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });
        },
        error: function (error) {
            console.error('sales-chart', error);
        }
    });

    $.ajax({
        method: 'GET',
        url: `${url}api/v1/items-chart`,
        dataType: 'json',
        headers: authHeaders(),
        success: function (data) {
            const rows = data.rows || [];
            new Chart($('#itemsChart'), {
                type: 'pie',
                data: {
                    labels: rows.map(item => item.items),
                    datasets: [{
                        label: 'Units Sold',
                        data: rows.map(item => item.total),
                        backgroundColor: randomColors(rows.length)
                    }]
                },
                options: {
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        },
        error: function (error) {
            console.error('items-chart', error);
        }
    });

    function loadPendingProducts() {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/admin/products/pending`,
            dataType: 'json',
            headers: authHeaders(),
            success: function (data) {
                const rows = data.rows || [];
                const $tbody = $('#pendingProductsBody');
                $tbody.empty();

                if (!rows.length) {
                    $tbody.html('<tr><td colspan="5" class="text-center text-muted">No pending products</td></tr>');
                    return;
                }

                rows.forEach(p => {
                    $tbody.append(`
                        <tr>
                            <td>${p.title}</td>
                            <td>${p.Seller?.name || '—'}</td>
                            <td>₱ ${parseFloat(p.sell_price).toLocaleString()}</td>
                            <td>${p.stock_quantity}</td>
                            <td>
                                <button class="btn btn-sm btn-success moderate-btn" data-id="${p.id}" data-status="approved">Approve</button>
                                <button class="btn btn-sm btn-danger moderate-btn" data-id="${p.id}" data-status="rejected">Reject</button>
                            </td>
                        </tr>`);
                });
            }
        });
    }

    function loadUsers() {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/admin/users`,
            dataType: 'json',
            headers: authHeaders(),
            success: function (data) {
                const users = data.users || [];
                const $tbody = $('#usersBody');
                $tbody.empty();

                users.forEach(u => {
                    $tbody.append(`
                        <tr>
                            <td>${u.name}</td>
                            <td>${u.email}</td>
                            <td><span class="badge badge-${u.role === 'admin' ? 'primary' : 'secondary'}">${u.role}</span></td>
                            <td>
                                <select class="form-control form-control-sm role-select" data-id="${u.id}">
                                    <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
                                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                                </select>
                            </td>
                        </tr>`);
                });
            }
        });
    }

    $(document).on('click', '.moderate-btn', function () {
        const id = $(this).data('id');
        const status = $(this).data('status');

        $.ajax({
            method: 'PUT',
            url: `${url}api/v1/admin/products/${id}/moderate`,
            contentType: 'application/json',
            data: JSON.stringify({ status }),
            headers: authHeaders(),
            success: function () {
                Swal.fire({ icon: 'success', text: 'Product updated', timer: 1200, showConfirmButton: false });
                loadPendingProducts();
            },
            error: function (error) {
                Swal.fire({ icon: 'error', text: error.responseJSON?.error || 'Failed to moderate product' });
            }
        });
    });

    $(document).on('change', '.role-select', function () {
        const id = $(this).data('id');
        const role = $(this).val();

        $.ajax({
            method: 'PUT',
            url: `${url}api/v1/admin/users/${id}/role`,
            contentType: 'application/json',
            data: JSON.stringify({ role }),
            headers: authHeaders(),
            success: function () {
                Swal.fire({ icon: 'success', text: 'Role updated', timer: 1200, showConfirmButton: false });
            },
            error: function (error) {
                Swal.fire({ icon: 'error', text: error.responseJSON?.error || 'Failed to update role' });
            }
        });
    });

  $('#adminNav a').on('click', function (e) {
        e.preventDefault();
        const section = $(this).data('section');
        $('.admin-section').hide();
        $('#' + section).show();
        $('#adminNav a').removeClass('active');
        $(this).addClass('active');
    });

    loadSummary();
    loadPendingProducts();
    loadUsers();
});
