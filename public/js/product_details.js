$(document).ready(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    let currentProduct = null;
    let selectedColor = null;
    let selectedSize = null;

    if (productId) {
        loadProductDetail(productId);
    } else {
        alert("Không tìm thấy sản phẩm!");
        window.location.href = "/";
    }

    function loadProductDetail(id) {
        $.ajax({
            url: `/products/${id}`,
            method: "GET",
            success: function (response) {
                if (response.success) {
                    currentProduct = response.product;
                    renderProduct(currentProduct);
                    $("#loading-spinner").addClass("hidden");
                    $("#product-content").removeClass("hidden");
                }
            },
            error: function () {
                alert("Lỗi khi tải sản phẩm");
            },
        });
    }

    function renderProduct(product) {
        $("#product-name").text(product.name);
        $("#product-description").text(
            product.description || "Đang cập nhật mô tả..."
        );
        $("#product-category").text(
            product.category_id ? product.category_id.name : "Uncategorized"
        );
        $("#input-product-id").val(product._id);

        let defaultImg =
            product.thumbnail ||
            (product.images.length > 0
                ? product.images[0]
                : "/images/default.jpg");
        $("#main-image").attr("src", defaultImg);

        if (!product.has_variants) {
            // san pham thuong
            $("#product-price").text(formatCurrency(product.price));
            renderGallery(product.images);
        } else {
            // san pham co bien the
            $("#variants-section").removeClass("hidden");
            $("#product-price").text("Vui lòng chọn phân loại");

            renderColors(product.variants);

            if (product.variants.length > 0) {
                selectColor(0);
            }
        }
    }

    // nut mau
    function renderColors(variants) {
        const $container = $("#color-options");
        $container.empty();

        variants.forEach((variant, index) => {
            const btn = $(`
                    <button class="color-btn w-8 h-8 rounded-full border border-gray-300 focus:outline-none shadow-sm"
                        style="background-color: ${variant.color_code};"
                        title="${variant.color}"
                        data-index="${index}">
                    </button>
                `);

            btn.on("click", function () {
                selectColor(index);
            });
            $container.append(btn);
        });
    }

    // xu ly nut mau
    function selectColor(index) {
        selectedColor = currentProduct.variants[index];
        selectedSize = null;
        $("#input-variant-id").val("");
        $("#btn-add-to-cart")
            .prop("disabled", true)
            .addClass("opacity-50 cursor-not-allowed");

        $(".color-btn").removeClass(
            "active ring-2 ring-offset-2 ring-gray-800"
        );
        $(`.color-btn[data-index="${index}"]`).addClass(
            "active ring-2 ring-offset-2 ring-gray-800"
        );

        // cap nhat anh va mau
        if (selectedColor.images && selectedColor.images.length > 0) {
            $("#main-image").attr("src", selectedColor.images[0]);
            renderGallery(selectedColor.images);
        } else {
            renderGallery(currentProduct.images);
        }

        renderSizes(selectedColor.sizes);
    }

    function renderSizes(sizes) {
        const $container = $("#size-options");
        $container.empty();

        if (!sizes || sizes.length === 0) {
            $container.html(
                '<span class="text-red-500 text-sm">Hết hàng</span>'
            );
            return;
        }

        sizes.forEach((sizeItem, index) => {
            const isOutOfStock = sizeItem.stock <= 0;
            const btn = $(`
                    <button class="variant-btn px-4 py-2 border rounded text-sm font-medium transition-colors ${isOutOfStock
                    ? "disabled-option bg-gray-100 text-gray-400"
                    : "hover:border-gray-800 text-gray-900"
                }"
                        data-index="${index}">
                        ${sizeItem.size}
                    </button>
                `);

            if (!isOutOfStock) {
                btn.on("click", function () {
                    selectSize(index, $(this));
                });
            }
            $container.append(btn);
        });
    }

    // xu ly nut size
    function selectSize(index, $btn) {
        selectedSize = selectedColor.sizes[index];

        // UI Active
        $(".variant-btn")
            .removeClass("active bg-gray-900 text-white")
            .addClass("hover:border-gray-800 text-gray-900");
        $btn
            .addClass("active bg-gray-900 text-white")
            .removeClass("hover:border-gray-800 text-gray-900");

        // Cap nhat thong tin gia va kho
        $("#product-price").text(formatCurrency(selectedSize.price));
        $("#stock-status").text(`Kho: ${selectedSize.stock} sản phẩm`);

        $("#input-variant-id").val(selectedSize._id);
        $("#btn-add-to-cart")
            .prop("disabled", false)
            .removeClass("opacity-50 cursor-not-allowed");
    }

    // anh nho
    function renderGallery(images) {
        const $gallery = $("#image-gallery");
        $gallery.empty();
        if (!images) return;

        images.forEach((img) => {
            const thumb = $(`
                    <img src="${img}" class="w-20 h-20 object-cover rounded cursor-pointer border border-transparent hover:border-gray-900" />
                `);
            thumb.on("click", function () {
                $("#main-image").attr("src", img);
            });
            $gallery.append(thumb);
        });
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    $(".qty-minus").on("click", function () {
        let val = parseInt($("#input-quantity").val());
        if (val > 1) $("#input-quantity").val(val - 1);
    });

    $(".qty-plus").on("click", function () {
        let val = parseInt($("#input-quantity").val());
        let maxStock = selectedSize
            ? selectedSize.stock
            : currentProduct.stock || 999;
        if (val < maxStock) $("#input-quantity").val(val + 1);
    });

    $("#add-to-cart-form").on("submit", function (e) {
        e.preventDefault();

        if (currentProduct.has_variants && !$("#input-variant-id").val()) {
            alert("Vui lòng chọn Màu sắc và Kích thước!");
            return;
        }

        const productId = $("#input-product-id").val();
        const variantId = $("#input-variant-id").val() || null;
        const quantity = parseInt($("#input-quantity").val());

        const variantColor = selectedColor ? selectedColor.color : null;
        const size = selectedSize ? selectedSize.size : null;

        console.log("Thêm vào giỏ:", {
            productId,
            variantId,
            quantity,
            variantColor,
            size,
        });

        addToCart(productId, variantId, quantity, variantColor, size);
    });
});