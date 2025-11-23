function getProductPrice(product, variantId, variantColor, size) {
    if (
        !product.has_variants ||
        !product.variants ||
        product.variants.length === 0
    ) {
        return product.price || 0;
    }

    if (variantId) {
        const variant = product.variants.find((v) => v._id === variantId);
        if (variant && variant.sizes && variant.sizes.length > 0) {
            const sizeObj = variant.sizes.find((s) => s.size === size);
            if (sizeObj) return sizeObj.price;
            return variant.sizes[0].price;
        }
    }

    if (variantColor && size) {
        const variant = product.variants.find(
            (v) => v.color === variantColor
        );
        if (variant) {
            const sizeObj = variant.sizes.find((s) => s.size === size);
            if (sizeObj) {
                return sizeObj.price;
            }
        }
    }

    let minPrice = Infinity;
    product.variants.forEach((variant) => {
        if (variant.sizes && variant.sizes.length > 0) {
            variant.sizes.forEach((sizeObj) => {
                if (sizeObj.price < minPrice) {
                    minPrice = sizeObj.price;
                }
            });
        }
    });

    return minPrice === Infinity ? 0 : minPrice;
}

function getProductImage(product, variantId, variantColor) {
    if (variantId && product.has_variants && product.variants) {
        const variant = product.variants.find((v) => v._id === variantId);
        if (variant && variant.images && variant.images.length > 0) {
            return variant.images[0];
        }
    }

    if (variantColor && product.has_variants && product.variants) {
        const variant = product.variants.find(
            (v) => v.color === variantColor
        );
        if (variant && variant.images && variant.images.length > 0) {
            return variant.images[0];
        }
    }

    if (product.thumbnail) return product.thumbnail;
    if (product.images && product.images.length > 0)
        return product.images[0];

    return "/images/default-product.jpg";
}

function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(price);
}

let cachedProducts = {};

function renderCart() {
    const cart = getCart();
    const $container = $("#cart-container");

    if (!cart.length) {
        $container.html(`
        <div class="cart-empty">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <use href="#shopping-bag"></use>
          </svg>
          <h1 style="font-size: 2.5rem; font-weight: 600; text-transform: uppercase; margin-bottom: 15px;">
            Giỏ Hàng Trống
          </h1>
          <p style="color: #6c757d; font-size: 1.1rem; margin-bottom: 30px;">
            Bạn chưa có sản phẩm nào trong giỏ hàng.
          </p>
          <a href="/" 
             style="display: inline-block; background: #212529; color: white; padding: 15px 40px; text-transform: uppercase; font-weight: 600; text-decoration: none; border-radius: 4px;">
            Bắt Đầu Mua Sắm
          </a>
        </div>
      `);
        return;
    }

    $.ajax({
        url: "/products/by-ids",
        method: "POST",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify({
            productIds: cart.map((i) => i.productId),
        }),
        success: function (data) {
            if (!data.success || !data.products) {
                $container.html(
                    '<p class="text-center">Không thể tải giỏ hàng. Vui lòng thử lại!</p>'
                );
                return;
            }

            cachedProducts = {};
            data.products.forEach((p) => {
                cachedProducts[p._id] = p;
            });

            renderCartItems(cart, data.products);
        },
        error: function (xhr, status, error) {
            console.error("Error:", error);
            $container.html(
                '<p class="text-center">Có lỗi xảy ra. Vui lòng thử lại!</p>'
            );
        },
    });
}

function renderCartItems(cart, products) {
    const $container = $("#cart-container");

    let mergedCart = cart
        .map((item) => {
            let product = products.find((p) => p._id === item.productId);

            if (!product) return null;

            const price = getProductPrice(
                product,
                item.variantId,
                item.variantColor,
                item.size
            );
            const image = getProductImage(
                product,
                item.variantId,
                item.variantColor
            );

            return {
                ...item,
                product: product,
                price: price,
                image: image,
                total: price * item.quantity,
            };
        })
        .filter((item) => item !== null);

    let subtotal = mergedCart.reduce(
        (total, item) => total + item.total,
        0
    );
    const shippingFee = 30000;
    const orderTotal = subtotal + shippingFee;

    const cartHTML = `
      <div style="background: #f8f9fa; padding: 40px 0;">
        <div class="container">
          <h1 style="font-size: 2.5rem; font-weight: 600; text-transform: uppercase; text-align: center; margin-bottom: 40px; letter-spacing: 2px;">
            Giỏ Hàng Của Bạn
          </h1>

          <div class="row">
            
            <!-- CART ITEMS -->
            <div class="col-lg-8">
              <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);" id="cart-items-list">
                ${mergedCart
            .map(
                (item) => `
                  <div class="cart-item-row" data-product-id="${item.productId
                    }" data-variant-id="${item.variantId || ""}" data-color="${item.variantColor || ""
                    }" data-size="${item.size || ""}" 
                       style="display: flex; gap: 20px; padding: 20px 0; border-bottom: 1px solid #dee2e6;">
                    
                    <!-- IMAGE -->
                    <div style="flex-shrink: 0;">
                      <img src="${item.image}" 
                           alt="${item.product.name}"
                           class="cart-item-image"
                           onerror="this.src='/images/default-product.jpg'" />
                    </div>

                    <!-- INFO -->
                    <div style="flex: 1;">
                      <h5 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 10px;">
                        <a href="/product-detail?id=${item.product._id
                    }" style="color: #212529; text-decoration: none;">
                          ${item.product.name}
                        </a>
                      </h5>
                      
                      ${item.variantColor
                        ? `
                                <p style="margin: 5px 0; font-size: 0.9rem; color: #6c757d;">
                                <strong>Màu:</strong> ${item.variantColor}
                                </p>
                            `
                        : ""
                    }
                      
                      ${item.size
                        ? `
                                <p style="margin: 5px 0; font-size: 0.9rem; color: #6c757d;">
                                <strong>Size:</strong> ${item.size}
                                </p>
                            `
                        : ""
                    }

                      <p class="item-price" style="margin: 10px 0; font-size: 1.2rem; font-weight: 600; color: #212529;">
                        ${formatPrice(item.price)}
                      </p>

                      <!-- QUANTITY CONTROLS -->
                      <div style="display: flex; align-items: center; gap: 15px; margin-top: 15px;">
                        <div style="display: flex; align-items: center; border: 1px solid #dee2e6; border-radius: 4px;">
                          <button class="btn-decrease-qty"
                                  data-product-id="${item.productId}"
                                  data-variant-id="${item.variantId || ""}"
                                  data-color="${item.variantColor || ""}"
                                  data-size="${item.size || ""}"
                                  style="padding: 8px 15px; background: white; border: none; cursor: pointer; font-weight: bold;"
                                  ${item.quantity <= 1 ? "disabled" : ""}>
                            −
                          </button>
                          <span class="item-quantity" style="padding: 8px 20px; font-weight: 600;">
                            ${item.quantity}
                          </span>
                          <button class="btn-increase-qty"
                                  data-product-id="${item.productId}"
                                  data-variant-id="${item.variantId || ""}"
                                  data-color="${item.variantColor || ""}"
                                  data-size="${item.size || ""}"
                                  style="padding: 8px 15px; background: white; border: none; cursor: pointer; font-weight: bold;">
                            +
                          </button>
                        </div>

                        <button class="btn-remove-item"
                                data-product-id="${item.productId}"
                                data-variant-id="${item.variantId || ""}"
                                data-color="${item.variantColor || ""}"
                                data-size="${item.size || ""}"
                                style="padding: 8px 20px; background: white; color: #dc3545; border: 1px solid #dc3545; border-radius: 4px; cursor: pointer; font-weight: 600;">
                          Xóa
                        </button>
                      </div>
                    </div>

                    <!-- TOTAL -->
                    <div class="item-total" style="text-align: right; font-size: 1.2rem; font-weight: 600;">
                      ${formatPrice(item.total)}
                    </div>

                  </div>
                `
            )
            .join("")}
              </div>
            </div>

            <!-- ORDER SUMMARY -->
            <div class="col-lg-4">
              <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); position: sticky; top: 20px;">
                <h2 style="font-size: 1.3rem; font-weight: 600; text-transform: uppercase; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #212529;">
                  Tổng Đơn Hàng
                </h2>
                
                <div style="margin-bottom: 15px; display: flex; justify-content: space-between;">
                  <span style="color: #6c757d;">Tạm tính:</span>
                  <span id="subtotal" style="font-weight: 600;">${formatPrice(
                subtotal
            )}</span>
                </div>
                
                <div style="margin-bottom: 15px; display: flex; justify-content: space-between;">
                  <span style="color: #6c757d;">Phí vận chuyển:</span>
                  <span style="font-weight: 600;">${formatPrice(
                shippingFee
            )}</span>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; display: flex; justify-content: space-between; font-size: 1.2rem;">
                  <span style="font-weight: 600;">Tổng cộng:</span>
                  <span id="order-total" style="font-weight: 700; color: #212529;">${formatPrice(
                orderTotal
            )}</span>
                </div>

                <a href="/checkout" 
                   style="display: block; width: 100%; margin-top: 30px; padding: 15px; background: #212529; color: white; text-align: center; text-decoration: none; text-transform: uppercase; font-weight: 600; border-radius: 4px; letter-spacing: 1px;">
                  Thanh Toán
                </a>

                <div style="text-align: center; margin-top: 20px;">
                  <a href="/" style="color: #6c757d; text-decoration: none; font-size: 0.9rem;">
                    Tiếp tục mua sắm
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    $container.html(cartHTML);
    attachCartEvents();
}

function attachCartEvents() {
    $(document).off("click", ".btn-increase-qty");
    $(document).off("click", ".btn-decrease-qty");
    $(document).off("click", ".btn-remove-item");

    $(document).on("click", ".btn-increase-qty", function () {
        const $btn = $(this);
        const productId = $btn.data("product-id");
        const variantId = $btn.data("variant-id") || null;
        const variantColor = $btn.data("color") || null;
        const size = $btn.data("size") || null;

        updateQuantity(productId, variantId, variantColor, size, 1);
    });

    $(document).on("click", ".btn-decrease-qty", function () {
        const $btn = $(this);
        const productId = $btn.data("product-id");
        const variantId = $btn.data("variant-id") || null;
        const variantColor = $btn.data("color") || null;
        const size = $btn.data("size") || null;

        updateQuantity(productId, variantId, variantColor, size, -1);
    });

    $(document).on("click", ".btn-remove-item", function () {
        const $btn = $(this);
        const productId = $btn.data("product-id");
        const variantId = $btn.data("variant-id") || null;
        const variantColor = $btn.data("color") || null;
        const size = $btn.data("size") || null;

        if (confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
            removeCartItem(productId, variantId, variantColor, size);
        }
    });
}

function updateQuantity(
    productId,
    variantId,
    variantColor,
    size,
    quantityChange
) {
    let cart = getCart();

    const normalizedVariantId = variantId || null;
    const normalizedVariantColor = variantColor || null;
    const normalizedSize = size || null;

    let item = cart.find(
        (i) =>
            i.productId === productId &&
            i.variantId === normalizedVariantId &&
            i.variantColor === normalizedVariantColor &&
            i.size === normalizedSize
    );

    if (item) {
        item.quantity += quantityChange;

        if (item.quantity < 1) {
            removeCartItem(productId, variantId, variantColor, size);
            return;
        }

        localStorage.setItem("kaira_cart", JSON.stringify(cart));
        updateCartCount();

        const product = cachedProducts[productId];
        if (product) {
            const price = getProductPrice(
                product,
                variantId,
                variantColor,
                size
            );
            const newTotal = price * item.quantity;

            const $row = $(
                `.cart-item-row[data-product-id="${productId}"][data-variant-id="${variantId || ""
                }"][data-color="${variantColor || ""}"][data-size="${size || ""
                }"]`
            );
            $row.find(".item-quantity").text(item.quantity);
            $row.find(".item-total").text(formatPrice(newTotal));

            $row.find(".btn-decrease-qty").prop("disabled", item.quantity <= 1);

            updateOrderSummary();
        }

        showToast("Đã cập nhật số lượng!", "success");
    }
}

function removeCartItem(productId, variantId, variantColor, size) {
    let cart = getCart();

    const normalizedVariantId = variantId || null;
    const normalizedVariantColor = variantColor || null;
    const normalizedSize = size || null;

    cart = cart.filter(
        (i) =>
            !(
                i.productId === productId &&
                i.variantId === normalizedVariantId &&
                i.variantColor === normalizedVariantColor &&
                i.size === normalizedSize
            )
    );

    localStorage.setItem("kaira_cart", JSON.stringify(cart));
    updateCartCount();

    const $row = $(
        `.cart-item-row[data-product-id="${productId}"][data-variant-id="${variantId || ""
        }"][data-color="${variantColor || ""}"][data-size="${size || ""}"]`
    );
    $row.fadeOut(300, function () {
        $(this).remove();

        if (cart.length === 0) {
            renderCart();
        } else {
            updateOrderSummary();
        }
    });

    showToast("Đã xóa khỏi giỏ hàng!", "info");
}

function updateOrderSummary() {
    const cart = getCart();
    let subtotal = 0;

    cart.forEach((item) => {
        const product = cachedProducts[item.productId];
        if (product) {
            const price = getProductPrice(
                product,
                item.variantId,
                item.variantColor,
                item.size
            );
            subtotal += price * item.quantity;
        }
    });

    const shippingFee = 30000;
    const orderTotal = subtotal + shippingFee;

    $("#subtotal").text(formatPrice(subtotal));
    $("#order-total").text(formatPrice(orderTotal));
}

$(document).ready(function () {
    renderCart();
});