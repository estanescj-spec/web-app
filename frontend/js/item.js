$(document).ready(function () {
    const url = API_BASE_URL;
    const token = requireAdmin();
    if (!token) return;

    let categories = [];

    $.ajax({
        method: 'GET',
        url: `${url}api/v1/categories`,
        dataType: 'json',
        success: function (data) {
            categories = data.rows || [];
            const $select = $('#category_id');
            $select.empty().append('<option value="">Select category</option>');
            categories.forEach(c => {
                $select.append(`<option value="${c.id}">${c.name}</option>`);
            });
        }
    });

    const table = $('#itable').DataTable({
        ajax: {
            url: `${url}api/v1/admin/products`,
            dataSrc: 'rows',
            beforeSend: function (xhr) {
                const t = getAuthToken();
                if (t) xhr.setRequestHeader('Authorization', 'Bearer ' + t);
            }
        },
        dom: 'Bfrtip',
        buttons: ['pdf', 'excel'],
        columns: [
            { data: 'id' },
            {
                data: null,
                render: function (data) {
                    return `<img src="${productImageUrl(data.img_path)}" width="50" height="60" alt="">`;
                }
            },
            { data: 'title' },
            { data: 'sell_price' },
            { data: 'cost_price' },
            { data: 'stock_quantity' },
            {
                data: 'status',
                render: function (data) {
                    const cls = data === 'approved' ? 'success' : data === 'pending' ? 'warning' : 'danger';
                    return `<span class="badge badge-${cls}">${data}</span>`;
                }
            },
            {
                data: null,
                orderable: false,
                render: function (data) {
                    return `<a href="#" class="editBtn" data-id="${data.id}"><i class="fas fa-edit"></i></a>
                            <a href="#" class="deletebtn" data-id="${data.id}"><i class="fas fa-trash-alt text-danger"></i></a>`;
                }
            }
        ]
    });

    $('#itemSearch').on('keyup', function () {
        table.search(this.value).draw();
    });

    $('#addItemBtn').on('click', function () {
        $('#iform').trigger('reset');
        $('#itemModal').modal('show');
        $('#itemUpdate').hide();
        $('#itemSubmit').show();
        $('#itemImage').remove();
        $('#productId').remove();
    });

    $('#itemSubmit').on('click', function (e) {
        e.preventDefault();
        const formData = new FormData($('#iform')[0]);

        $.ajax({
            method: 'POST',
            url: `${url}api/v1/products`,
            data: formData,
            contentType: false,
            processData: false,
            dataType: 'json',
            headers: authHeaders(),
            success: function () {
                $('#itemModal').modal('hide');
                table.ajax.reload();
                Swal.fire({ icon: 'success', text: 'Product created', timer: 1500, showConfirmButton: false });
            },
            error: function (error) {
                Swal.fire({ icon: 'error', text: error.responseJSON?.error || 'Failed to create product' });
            }
        });
    });

    $('#itable tbody').on('click', 'a.editBtn', function (e) {
        e.preventDefault();
        const id = $(this).data('id');
        $('#itemImage').remove();
        $('#productId').remove();
        $('#iform').trigger('reset');
        $('#itemModal').modal('show');
        $('<input>').attr({ type: 'hidden', id: 'productId', name: 'product_id', value: id }).appendTo('#iform');
        $('#itemSubmit').hide();
        $('#itemUpdate').show();

        $.ajax({
            method: 'GET',
            url: `${url}api/v1/products/${id}`,
            dataType: 'json',
            success: function (data) {
                const p = data.result;
                $('#title').val(p.title);
                $('#desc').val(p.description || '');
                $('#sell').val(p.sell_price);
                $('#cost').val(p.cost_price);
                $('#qty').val(p.stock_quantity);
                $('#category_id').val(p.category_id);
                if (p.img_path) {
                    $('#iform').append(`<img src="${productImageUrl(p.img_path)}" width="200" id="itemImage" class="mt-2 rounded" />`);
                }
            }
        });
    });

    $('#itemUpdate').on('click', function (e) {
        e.preventDefault();
        const id = $('#productId').val();
        const formData = new FormData($('#iform')[0]);

        $.ajax({
            method: 'PUT',
            url: `${url}api/v1/products/${id}`,
            data: formData,
            contentType: false,
            processData: false,
            dataType: 'json',
            headers: authHeaders(),
            success: function () {
                $('#itemModal').modal('hide');
                table.ajax.reload();
                Swal.fire({ icon: 'success', text: 'Product updated', timer: 1500, showConfirmButton: false });
            },
            error: function (error) {
                Swal.fire({ icon: 'error', text: error.responseJSON?.error || 'Failed to update product' });
            }
        });
    });

    $('#itable tbody').on('click', 'a.deletebtn', function (e) {
        e.preventDefault();
        const id = $(this).data('id');
        const $row = $(this).closest('tr');

        bootbox.confirm({
            message: 'Delete this product?',
            buttons: {
                confirm: { label: 'Yes', className: 'btn-success' },
                cancel: { label: 'No', className: 'btn-danger' }
            },
            callback: function (result) {
                if (!result) return;
                $.ajax({
                    method: 'DELETE',
                    url: `${url}api/v1/products/${id}`,
                    dataType: 'json',
                    headers: authHeaders(),
                    success: function (data) {
                        $row.fadeOut(400, function () {
                            table.row($row).remove().draw();
                        });
                        bootbox.alert(data.message || 'Deleted');
                    },
                    error: function (error) {
                        Swal.fire({ icon: 'error', text: error.responseJSON?.error || 'Delete failed' });
                    }
                });
            }
        });
    });
});
