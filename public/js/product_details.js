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
                window.location.href = "/";
            },
        });
    }

    function renderProduct(product) {
        $("#product-name").text(product.name);
        $("#product-description").text(product.description || "Đang cập nhật mô tả...");
        $("#product-category").text(product.category_id?.name || "Uncategorized");
        $("#input-product-id").val(product._id);

        const defaultImg = product.thumbnail || (product.images?.[0]) || "/images/default.jpg";
        $("#main-image").attr("src", defaultImg);

        if (!product.has_variants) {
            $("#product-price").text(formatCurrency(product.price));
            $("#variants-section").addClass("hidden");
            renderGallery(product.images);
        } else {
            $("#variants-section").removeClass("hidden");
            $("#product-price").text("Vui lòng chọn phân loại hàng");
            renderColors(product.variants);

            if (product.variants.length > 0) {
                selectColor(0);
            }
        }
    }

    function renderColors(variants) {
        const $container = $("#color-options");
        $container.empty();

        variants.forEach((variant, index) => {
            const btn = $(`
                <button class="color-btn w-10 h-10 rounded-full border-2 border-gray-300 focus:outline-none shadow-sm transition-all"
                    style="background-color: ${variant.color_code || '#ccc'};"
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

    function selectColor(index) {
        selectedColor = currentProduct.variants[index];
        selectedSize = null;

        $("#input-variant-id").val(selectedColor._id);

        $("#btn-add-to-cart")
            .prop("disabled", true)
            .addClass("opacity-50 cursor-not-allowed");

        $(".color-btn").removeClass("ring-4 ring-gray-800 ring-offset-2");
        $(`.color-btn[data-index="${index}"]`).addClass("ring-4 ring-gray-800 ring-offset-2");

        if (selectedColor.images && selectedColor.images.length > 0) {
            $("#main-image").attr("src", selectedColor.images[0]);
            renderGallery(selectedColor.images);
        } else {
            $("#main-image").attr("src", currentProduct.thumbnail || "/images/default.jpg");
            renderGallery(currentProduct.images);
        }

        renderSizes(selectedColor.sizes);
    }

    function renderSizes(sizes) {
        const $container = $("#size-options");
        $container.empty();

        if (!sizes || sizes.length === 0) {
            $container.html('<span class="text-red-500 text-sm">Hết hàng</span>');
            return;
        }

        sizes.forEach((sizeItem, index) => {
            const isOutOfStock = sizeItem.stock <= 0;
            const btn = $(`
                <button class="variant-btn px-5 py-3 border rounded-lg text-sm font-medium transition-all
                    ${isOutOfStock
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                    : "border-gray-400 hover:border-gray-900 hover:bg-gray-50"
                }"
                    data-index="${index}"
                    ${isOutOfStock ? "disabled" : ""}>
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

    function selectSize(index, $btn) {
        selectedSize = selectedColor.sizes[index];

        $(".variant-btn")
            .removeClass("bg-gray-900 text-white border-gray-900")
            .addClass("border-gray-400 hover:border-gray-900 hover:bg-gray-50");

        $btn
            .addClass("bg-gray-900 text-white border-gray-900")
            .removeClass("border-gray-400 hover:border-gray-900 hover:bg-gray-50");

        $("#product-price").text(formatCurrency(selectedSize.price));
        $("#stock-status").text(`Kho: ${selectedSize.stock} sản phẩm`);

        $("#btn-add-to-cart")
            .prop("disabled", false)
            .removeClass("opacity-50 cursor-not-allowed");
    }

    function renderGallery(images) {
        const $gallery = $("#image-gallery");
        $gallery.empty();

        if (!images || images.length === 0) return;

        images.forEach((img) => {
            const thumb = $(`
                <img src="${img}" 
                     class="w-20 h-20 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-gray-900 transition-all" 
                     alt="thumbnail">
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
            currency: "VND"
        }).format(amount);
    }

    $(".qty-minus").on("click", function () {
        let val = parseInt($("#input-quantity").val()) || 1;
        if (val > 1) $("#input-quantity").val(val - 1);
    });

    $(".qty-plus").on("click", function () {
        let val = parseInt($("#input-quantity").val()) || 1;
        const maxStock = selectedSize ? selectedSize.stock : (currentProduct?.stock || 999);
        if (val < maxStock) $("#input-quantity").val(val + 1);
    });

    $("#add-to-cart-form").on("submit", function (e) {
        e.preventDefault();

        if (currentProduct.has_variants && !selectedColor) {
            alert("Vui lòng chọn màu sắc!");
            return;
        }
        if (currentProduct.has_variants && !selectedSize) {
            alert("Vui lòng chọn kích thước!");
            return;
        }

        const productId = $("#input-product-id").val();
        const variantId = selectedColor ? selectedColor._id : null;
        const quantity = parseInt($("#input-quantity").val()) || 1;
        const variantColor = selectedColor ? selectedColor.color : null;
        const size = selectedSize ? selectedSize.size : null;

        console.log("Thêm vào giỏ hàng:", {
            productId,
            variantId,
            variantColor,
            size,
            quantity
        });

        addToCart(productId, variantId, quantity, variantColor, size);
    });
});