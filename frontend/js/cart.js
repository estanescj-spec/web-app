$(document).ready(function () {
    const url = API_BASE_URL;

    function getCart() {
        const cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    }

    function saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    function renderCart() {
        const cart = getCart();
        let html = '';
        let total = 0;

        if (cart.length === 0) {
            html = '<p>Your cart is empty.</p>';
        } else {
            html = `<table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Subtotal</th>
                        <th>Remove</th>
                    </tr>
                </thead>
                <tbody>`;
            cart.forEach((item, idx) => {
                const subtotal = item.price * item.quantity;
                total += subtotal;
                html += `<tr>
                    <td><img src="${item.image}" width="60" alt=""></td>
                    <td>${item.description}</td>
                    <td>₱ ${item.price.toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>₱ ${subtotal.toFixed(2)}</td>
                    <td><button class="btn btn-danger btn-sm remove-item" data-idx="${idx}">&times;</button></td>
                </tr>`;
            });
            html += `</tbody></table><h4>Total: ₱ ${total.toFixed(2)}</h4>`;
        }

        $('#cartTable').html(html);
    }

    const token = requireAuth();
    if (!token) return;

    $('#cartTable').on('click', '.remove-item', function () {
        const idx = $(this).data('idx');
        const cart = getCart();
        cart.splice(idx, 1);
        saveCart(cart);
        renderCart();
    });

    $('#checkoutBtn').on('click', function () {
        const cart = getCart();
        if (!cart.length) {
            Swal.fire({ icon: 'warning', text: 'Your cart is empty.' });
            return;
        }

        const cartPayload = cart.map(item => ({
            product_id: item.item_id,
            quantity: item.quantity
        }));

        $.ajax({
            method: 'GET',
            url: `${url}api/v1/profile`,
            dataType: 'json',
            headers: authHeaders(),
            success: function (profileData) {
                const addresses = profileData.user?.Addresses || [];
                const defaultAddr = addresses.find(a => a.is_default) || addresses[0];

                if (!defaultAddr) {
                    Swal.fire({
                        icon: 'warning',
                        text: 'Please add a shipping address in your profile before checkout.',
                        confirmButtonText: 'Go to Profile'
                    }).then(r => {
                        if (r.isConfirmed) window.location.href = 'profile.html';
                    });
                    return;
                }

                $.ajax({
                    type: 'POST',
                    url: `${url}api/v1/orders`,
                    data: JSON.stringify({
                        cart: cartPayload,
                        address_id: defaultAddr.id,
                        payment_method: 'Cash on Delivery'
                    }),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    headers: authHeaders(),
                    success: function (data) {
                        Swal.fire({ icon: 'success', text: data.message || 'Order placed successfully!' });
                        localStorage.removeItem('cart');
                        renderCart();
                    },
                    error: function (error) {
                        Swal.fire({
                            icon: 'error',
                            text: error.responseJSON?.error || error.responseJSON?.message || 'Checkout failed'
                        });
                    }
                });
            },
            error: function () {
                Swal.fire({ icon: 'error', text: 'Could not load profile for checkout.' });
            }
        });
    });

    renderCart();
});
