$(document).ready(function () {
    let currentUserId = null;

    loadUserInfo();

    function loadUserInfo() {
        $.ajax({
            url: "/accounts/me",
            method: "GET",
            success: function (response) {
                if (response.success) {
                    const user = response.data;
                    currentUserId = user._id;

                    $("#userName").text(`${user.first_name} ${user.last_name}`);
                    $("#userEmail").text(user.email);
                    $("#avatarPreview").attr(
                        "src",
                        user.avatar || "/images/default-avatar.jpg"
                    );

                    $("#firstName").val(user.first_name);
                    $("#lastName").val(user.last_name);
                    $("#email").val(user.email);
                    $("#phone").val(user.phone || "");
                    $("#address").val(user.address || "");
                    $("#gender").val(user.gender || "");

                    if (user.date_of_birth) {
                        $("#dateOfBirth").val(user.date_of_birth.split("T")[0]);
                    }

                    loadOrders();
                }
            },
            error: function (xhr) {
                console.error("Error loading user info:", xhr);
                alert("Không thể tải thông tin tài khoản");
            },
        });
    }

    $("#avatarInput").on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            $("#avatarPreview").attr("src", e.target.result);
        };
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append("avatar", file);

        $.ajax({
            url: "/accounts/update-profile",
            method: "PUT",
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    showToast("Cập nhật avatar thành công!", "success");
                }
            },
            error: function (xhr) {
                showToast("Lỗi khi upload avatar", "error");
            },
        });
    });

    $("#profileForm").on("submit", function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        $.ajax({
            url: "/accounts/update-profile",
            method: "PUT",
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    showToast("Cập nhật thông tin thành công!", "success");
                    loadUserInfo();
                }
            },
            error: function (xhr) {
                showToast(xhr.responseJSON?.message || "Có lỗi xảy ra", "error");
            },
        });
    });

    $(".toggle-password").on("click", function () {
        const inputId = $(this).data("target");
        const $input = $(inputId);
        const $icon = $(this).find("i");

        if ($input.attr("type") === "password") {
            $input.attr("type", "text");
            $icon.removeClass("fa-eye-slash").addClass("fa-eye");
        } else {
            $input.attr("type", "password");
            $icon.removeClass("fa-eye").addClass("fa-eye-slash");
        }
    });

    $("#passwordForm").on("submit", function (e) {
        e.preventDefault();

        const currentPassword = $("#currentPassword").val();
        const newPassword = $("#newPassword").val();
        const confirmPassword = $("#confirmPassword").val();

        if (newPassword !== confirmPassword) {
            showToast("Mật khẩu xác nhận không khớp!", "error");
            return;
        }

        $.ajax({
            url: "/accounts/change-password",
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            }),

            success: function (response) {
                if (response.success) {
                    showToast(
                        "Đổi mật khẩu thành công! Đang đăng xuất...",
                        "success"
                    );

                    setTimeout(() => {
                        fetch("/auth/logout", { method: "POST" })
                            .then((res) => res.json())
                            .then((json) => {
                                window.location.href = json.redirect || "/auth/signin";
                            })
                            .catch(() => {
                                showToast(
                                    "Lỗi khi đăng xuất. Vui lòng thử lại.",
                                    "error"
                                );
                            });
                    }, 1200);

                    $("#passwordForm")[0].reset();
                } else {
                    showToast(response.message || "Đổi mật khẩu thất bại", "error");
                }
            },

            error: function (xhr) {
                showToast(xhr.responseJSON?.message || "Có lỗi xảy ra", "error");
            },
        });
    });

    // Load orders
    function loadOrders(page = 1, status = "") {
        if (!currentUserId) return;

        let url = `/orders/by-user/${currentUserId}?page=${page}&limit=5`;
        if (status) url += `&status=${status}`;

        $.ajax({
            url: url,
            method: "GET",
            success: function (response) {
                if (response.success) {
                    renderOrders(response.data);
                    renderPagination(response.pagination);
                }
            },
            error: function (xhr) {
                console.error("Error loading orders:", xhr);
                $("#ordersContainer").html(
                    '<p class="text-center">Không thể tải đơn hàng</p>'
                );
            },
        });
    }

    function renderOrders(orders) {
        const $container = $("#ordersContainer");
        $container.empty();

        if (!orders || orders.length === 0) {
            $container.html(`
                        <div class="empty-orders">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <use xlink:href="#shopping-bag"></use>
                            </svg>
                            <h5>Chưa Có Đơn Hàng</h5>
                            <p class="text-muted">Bạn chưa có đơn hàng nào</p>
                            <a href="/" class="btn-save" style="text-decoration: none;">Mua Sắm Ngay</a>
                        </div>
                    `);
            return;
        }

        orders.forEach((order) => {
            const statusClass = `status-${order.status}`;
            const statusText = getStatusText(order.status);
            const orderDate = new Date(order.ordered_at).toLocaleDateString(
                "vi-VN"
            );

            const html = `
                        <div class="order-card">
                            <div class="order-header">
                                <div>
                                    <div class="order-number">${order.order_number
                }</div>
                                    <small class="text-muted">${orderDate}</small>
                                </div>
                                <span class="order-status ${statusClass}">${statusText}</span>
                            </div>
                            <div class="order-info">
                                <div>
                                    <strong>${order.items.length
                }</strong> sản phẩm
                                </div>
                                <div class="order-total">${formatCurrency(
                    order.total
                )}</div>
                            </div>
                            <a href="javascript:void(0)" class="btn-view-detail" onclick="openOrderModal('${order._id
                }'); return false;">
                                Xem Chi Tiết
                            </a>
                        </div>
                    `;
            $container.append(html);
        });
    }

    function renderPagination(pagination) {
        if (!pagination || pagination.total_pages <= 1) {
            $("#ordersPagination").empty();
            return;
        }

        let html = '<nav><ul class="pagination justify-content-center">';

        for (let i = 1; i <= pagination.total_pages; i++) {
            const active = i === pagination.current_page ? "active" : "";
            html += `<li class="page-item ${active}">
                        <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                    </li>`;
        }

        html += "</ul></nav>";
        $("#ordersPagination").html(html);
    }

    function getStatusText(status) {
        const statusMap = {
            pending: "Chờ xác nhận",
            confirmed: "Đã xác nhận",
            processing: "Đang xử lý",
            shipping: "Đang giao",
            delivered: "Đã giao",
            cancelled: "Đã hủy",
        };
        return statusMap[status] || status;
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    $("#orderStatusFilter").on("change", function () {
        const status = $(this).val();
        loadOrders(1, status);
    });

    window.changePage = function (page) {
        const status = $("#orderStatusFilter").val();
        loadOrders(page, status);
    };

    window.showToast = function (message, type = "success") {
        let toast = document.createElement("div");
        const bgColor =
            type === "success"
                ? "bg-green-600"
                : type === "error"
                    ? "bg-red-600"
                    : "bg-blue-600";

        toast.className = `fixed top-5 right-5 ${bgColor} text-white px-4 py-2 rounded shadow-lg z-50 flex items-center gap-2`;
        toast.style.zIndex = "9999";

        toast.innerHTML = `
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.remove()"
                    style="background:none; border:none; color:white; font-size:16px; cursor:pointer;">
                    ✖
                </button>
            `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    window.openOrderModal = function (orderId) {
        $("#orderDetailModal").addClass("show");
        $("#modalOrderNumber").text("#Đang tải...");
        $("#modalOrderContent").html(`
                <div class="text-center py-5">
                    <div class="spinner-border text-dark" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `);

        $.ajax({
            url: `/orders/detail/${orderId}`,
            method: "GET",
            success: function (response) {
                if (response) {
                    renderModalContent(response);
                } else {
                    $("#modalOrderContent").html(
                        '<div class="alert alert-danger">Không tìm thấy đơn hàng</div>'
                    );
                }
            },
            error: function () {
                $("#modalOrderContent").html(
                    '<div class="alert alert-danger">Lỗi kết nối đến server</div>'
                );
            },
        });
    };

    window.closeOrderModal = function () {
        $("#orderDetailModal").removeClass("show");
    };

    $(window).on("click", function (e) {
        if ($(e.target).is("#orderDetailModal")) {
            closeOrderModal();
        }
    });

    function renderModalContent(order) {
        $("#modalOrderNumber").text(
            `Chi tiết đơn hàng #${order.order_number}`
        );

        const statusMap = {
            pending: { text: "Chờ xác nhận", class: "status-pending" },
            confirmed: { text: "Đã xác nhận", class: "status-confirmed" },
            processing: { text: "Đang xử lý", class: "status-processing" },
            shipping: { text: "Đang giao hàng", class: "status-shipping" },
            delivered: { text: "Đã giao hàng", class: "status-delivered" },
            cancelled: { text: "Đã hủy", class: "status-cancelled" },
        };

        const statusInfo = statusMap[order.status] || {
            text: order.status,
            class: "",
        };

        let itemsHtml = "";
        order.items.forEach((item) => {
            let imgUrl = item.product_image || "/images/default-product.jpg";
            let variantText = "";
            if (item.size || item.variant_color) {
                variantText = `<div class="item-meta">
                        ${item.size ? "Size: " + item.size : ""} 
                        ${item.size && item.variant_color ? "|" : ""} 
                        ${item.variant_color ? "Màu: " + item.variant_color : ""
                    }
                    </div>`;
            }

            itemsHtml += `
                            <li class="item-row">
                                <img src="${imgUrl}" alt="${item.product_name
                }" class="item-img" onerror="this.src='/images/default-product.jpg'">
                                <div class="item-details">
                                    <h6>${item.product_name}</h6>
                                    ${variantText}
                                    <div class="item-meta">x ${item.quantity}</div>
                                </div>
                                <div class="item-price">${formatCurrency(
                    item.total
                )}</div>
                            </li>
                        `;
        });

        const html = `
                <div class="row">
                    <div class="col-md-6 info-group">
                        <span class="info-label">Trạng thái</span>
                        <span class="status-badge ${statusInfo.class}">${statusInfo.text
            }</span>
                        <div style="margin-top: 8px;">
                            <span class="info-label">Ngày đặt</span>
                            <span class="info-value">${new Date(
                order.ordered_at
            ).toLocaleString("vi-VN")}</span>
                        </div>
                    </div>
                    <div class="col-md-6 info-group">
                         <span class="info-label">Thanh toán</span>
                         <span class="info-value">
                            ${order.payment_method === "cod"
                ? "Thanh toán khi nhận hàng"
                : "Chuyển khoản / Online"
            }
                         </span>
                    </div>
                    
                    <div class="col-12 info-group">
                        <span class="info-label">Địa chỉ nhận hàng</span>
                        <div class="info-value">${order.customer_info.full_name
            }</div>
                        <div style="color: #666; font-size: 0.9rem;">${order.customer_info.phone
            }</div>
                        <div style="color: #666; font-size: 0.9rem;">${order.customer_info.address
            }</div>
                    </div>
                    
                    <div class="col-12">
                        <span class="info-label">Sản phẩm</span>
                        <ul class="item-list">
                            ${itemsHtml}
                        </ul>
                        
                        <div style="margin-top: 15px;">
                            <div class="summary-row">
                                <span>Tạm tính</span>
                                <span>${formatCurrency(order.subtotal)}</span>
                            </div>
                            <div class="summary-row">
                                <span>Phí vận chuyển</span>
                                <span>${formatCurrency(
                order.shipping_fee
            )}</span>
                            </div>
                            ${order.discount > 0
                ? `
                            <div class="summary-row text-success">
                                <span>Giảm giá</span>
                                <span>-${formatCurrency(order.discount)}</span>
                            </div>`
                : ""
            }
                            <div class="summary-row total">
                                <span>Tổng cộng</span>
                                <span>${formatCurrency(order.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        $("#modalOrderContent").html(html);
    }
});