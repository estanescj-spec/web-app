$(document).ready(function () {
    const url = API_BASE_URL;
    let allItems = [];

    const token = getAuthToken();
    const userRole = getUserRole();

    if (token) {
        $('#authNavBtn').text('Sign Out').attr('href', '#');
        $('#registerNav').hide();
        $('#dashboardNavLink').toggleClass('hidden', userRole !== 'admin').toggle(userRole === 'admin');
        $('#profile-btn').attr('href', 'profile.html');
        $('#authNavBtn').off('click').on('click', function (e) {
            e.preventDefault();
            sessionStorage.clear();
            localStorage.removeItem('cart');
            window.location.href = 'login.html';
        });
    } else {
        $('#profile-btn').attr('href', 'login.html');
    }

    const getCart = () => {
        const cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    };

    const saveCart = cart => localStorage.setItem('cart', JSON.stringify(cart));

    const updateCartBadge = () => {
        const cart = getCart();
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        $('#cart-btn span').text(count);
    };

    const addToCart = (product, quantity = 1) => {
        const cart = getCart();
        const existing = cart.find(item => item.item_id == product.id);

        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({
                item_id: product.id,
                description: product.title || product.description || 'Product',
                price: parseFloat(product.sell_price || 0),
                image: productImageUrl(product.img_path),
                stock: product.stock_quantity ?? product.quantity ?? 0,
                quantity
            });
        }

        saveCart(cart);
        updateCartBadge();
        Swal.fire({ icon: 'success', text: 'Added to cart', timer: 1200, showConfirmButton: false, position: 'bottom-end' });
    };
    updateCartBadge();

    function renderItems(items) {
        $('#items').empty();
        $('#productCountText').text(`Showing ${items.length} product(s)`);

        if (items.length === 0) {
            $('#items').html('<p class="text-gray-500 col-span-full">No products found.</p>');
            return;
        }

        items.forEach(function (value) {
            const title = value.title || value.description || 'Product';
            const price = parseFloat(value.sell_price || 0);
            const stock = value.stock_quantity ?? value.quantity ?? 0;
            const id = value.id ?? value.item_id;
            const img = productImageUrl(value.img_path);

            const card = `
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                    <img src="${img}" class="w-full h-48 object-cover" alt="${title}">
                    <div class="p-4">
                        <h5 class="font-semibold text-gray-900 mb-1">${title}</h5>
                        <p class="text-blue-600 font-medium mb-1">₱ ${price.toLocaleString()}</p>
                        <p class="text-sm text-gray-500 mb-3">Stock: ${stock}</p>
                        <div class="grid grid-cols-2 gap-2">
                            <button type="button" class="show-details w-full bg-[#1e5aff] text-white py-2 rounded-lg text-sm font-medium"
                                data-id="${id}" data-title="${title}" data-price="${price}" data-image="${img}" data-stock="${stock}">
                                View Details
                            </button>
                            <button type="button" class="add-to-cart-btn w-full border border-gray-200 text-gray-900 py-2 rounded-lg text-sm font-medium"
                                data-id="${id}" data-title="${title}" data-price="${price}" data-image="${img}" data-stock="${stock}">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>`;
            $('#items').append(card);
        });

        if ($('#productDetailsModal').length === 0) {
            $('body').append(`
                <div class="modal fade" id="productDetailsModal" tabindex="-1" role="dialog" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="productDetailsModalLabel"></h5>
                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div class="modal-body text-center" id="productDetailsModalBody"></div>
                        </div>
                    </div>
                </div>`);
        }
    }

    function applyFilters() {
        const q = $('#searchInput').val().trim().toLowerCase();
        const category = $('#categoryFilter').val();
        const minPrice = parseFloat($('#minPrice').val()) || null;
        const maxPrice = parseFloat($('#maxPrice').val()) || null;
        const storage = $('#storageFilter').val();

        let filtered = allItems.filter(item => {
            const title = (item.title || item.description || '').toLowerCase();
            const catName = item.Category?.name || '';
            const itemStorage = item.storage || '';

            if (q && !title.includes(q)) return false;
            if (category && catName !== category) return false;
            if (minPrice !== null && parseFloat(item.sell_price) < minPrice) return false;
            if (maxPrice !== null && parseFloat(item.sell_price) > maxPrice) return false;
            if (storage && !itemStorage.includes(storage)) return false;
            return true;
        });

        renderItems(filtered);
    }

    function loadProducts(params = {}) {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/products`,
            data: params,
            dataType: 'json',
            success: function (data) {
                allItems = data.rows || [];
                applyFilters();
            },
            error: function (error) {
                console.error(error);
                $('#items').html('<p class="text-red-500">Failed to load products. Is the backend running?</p>');
            }
        });
    }

    loadProducts();

    $('#shop-now, #browse-catalog').on('click', function () {
        const target = document.getElementById('catalogSection');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    $(document).on('click', '.show-details', function () {
        const id = $(this).data('id');
        const title = $(this).data('title');
        const price = $(this).data('price');
        const image = $(this).data('image');
        const stock = $(this).data('stock');

        $('#productDetailsModalLabel').text(title);
        $('#productDetailsModalBody').html(`
            <img src="${image}" class="img-fluid mb-3 rounded" style="max-height:200px;">
            <p>Price: ₱<strong>${price}</strong></p>
            <p>Stock: ${stock}</p>
            <input type="number" class="form-control mb-3" id="detailsQty" min="1" max="${stock}" value="1">
            <input type="hidden" id="detailsItemId" value="${id}">
            <button type="button" class="btn btn-primary" id="detailsAddToCart">Add to Cart</button>
        `);
        $('#productDetailsModal').modal('show');
    });

    $(document).on('click', '.add-to-cart-btn', function () {
        const product = {
            id: $(this).data('id'),
            title: $(this).data('title'),
            sell_price: $(this).data('price'),
            img_path: $(this).data('image'),
            stock_quantity: $(this).data('stock')
        };
        addToCart(product, 1);
    });

    $(document).on('click', '#detailsAddToCart', function () {
        const qty = parseInt($('#detailsQty').val(), 10) || 1;
        const product = {
            id: parseInt($('#detailsItemId').val(), 10),
            title: $('#productDetailsModalLabel').text(),
            sell_price: parseFloat($('#productDetailsModalBody strong').text().replace(/[^\d.]/g, '')),
            img_path: $('#productDetailsModalBody img').attr('src'),
            stock_quantity: parseInt($('#productDetailsModalBody p:contains("Stock")').text().replace(/[^\d]/g, ''), 10)
        };
        addToCart(product, qty);
        $('#productDetailsModal').modal('hide');
    });

    $('#applyFiltersBtn').on('click', applyFilters);
    $('#resetFiltersBtn').on('click', function () {
        $('#searchInput, #minPrice, #maxPrice').val('');
        $('#categoryFilter, #storageFilter').val('');
        applyFilters();
    });

    $(document).on('input', '#searchInput', applyFilters);

    $(document).on('globalSearch', function (e, val) {
        $('#searchInput').val(val || '');
        applyFilters();
    });

    $(document).on('click', '#search-btn', function (e) {
        e.preventDefault();
        const $inp = $('#headerSearch');
        if ($inp.is(':visible')) {
            $inp.hide().val('');
            $(document).trigger('globalSearch', ['']);
        } else {
            $inp.show().focus();
        }
    });

    $(document).on('input', '#headerSearch', function () {
        const val = $(this).val();
        $(document).trigger('globalSearch', [val]);
    });

    $('.nav-link[data-target]').on('click', function (e) {
        e.preventDefault();
        const target = $(this).data('target');
        if (target === 'home') {
            loadProducts();
            return;
        }
        const map = { mac: 'MacBook', ipad: 'iPad', iphone: 'iPhone' };
        $('#categoryFilter').val(map[target] || '');
        applyFilters();
    });
});
