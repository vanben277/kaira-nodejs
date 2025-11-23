const CART_KEY = "kaira_cart";

function getCart() {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartCount() {
    const cart = getCart();
    let total = 0;

    cart.forEach(item => total += item.quantity);

    const el = document.getElementById("cart-count");
    if (el) el.innerText = `(${total})`;

    const badges = document.querySelectorAll(".cart-count, .cart-badge");
    badges.forEach(badge => {
        if (total > 0) {
            badge.textContent = total;
            badge.style.display = "inline-block";
        } else {
            badge.textContent = "0";
            badge.style.display = "none";
        }
    });
}

function addToCart(productId, variantId = null, quantity = 1, variantColor = null, size = null) {
    let cart = getCart();

    // Normalize null values
    const normalizedVariantId = variantId || null;
    const normalizedVariantColor = variantColor || null;
    const normalizedSize = size || null;

    let exist = cart.find(
        (item) =>
            item.productId === productId &&
            item.variantId === normalizedVariantId &&
            item.variantColor === normalizedVariantColor &&
            item.size === normalizedSize
    );

    if (exist) {
        exist.quantity += quantity;
    } else {
        cart.push({
            productId: productId,
            variantId: normalizedVariantId,
            variantColor: normalizedVariantColor,
            size: normalizedSize,
            quantity: quantity,
            addedAt: new Date().toISOString()
        });
    }

    saveCart(cart);
    updateCartCount();
    showToast("Đã thêm vào giỏ hàng!");
}

function changeCartQuantity(productId, variantId = null, newQuantity = 1, variantColor = null, size = null) {
    let cart = getCart();

    if (newQuantity < 1) {
        removeFromCart(productId, variantId, variantColor, size);
        return;
    }

    // Normalize null/empty values
    const normalizedVariantId = (variantId && variantId !== "") ? variantId : null;
    const normalizedVariantColor = (variantColor && variantColor !== "") ? variantColor : null;
    const normalizedSize = (size && size !== "") ? size : null;

    let item = cart.find(
        i =>
            i.productId === productId &&
            i.variantId === normalizedVariantId &&
            i.variantColor === normalizedVariantColor &&
            i.size === normalizedSize
    );

    if (item) {
        item.quantity = newQuantity;
        saveCart(cart);
        updateCartCount();
        location.reload();
    }
}

function removeFromCart(productId, variantId = null, variantColor = null, size = null) {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
        return;
    }

    let cart = getCart();

    // Normalize null/empty values
    const normalizedVariantId = (variantId && variantId !== "") ? variantId : null;
    const normalizedVariantColor = (variantColor && variantColor !== "") ? variantColor : null;
    const normalizedSize = (size && size !== "") ? size : null;

    cart = cart.filter(
        i =>
            !(i.productId === productId &&
                i.variantId === normalizedVariantId &&
                i.variantColor === normalizedVariantColor &&
                i.size === normalizedSize)
    );

    saveCart(cart);
    updateCartCount();
    showToast("Đã xóa khỏi giỏ hàng!");
    location.reload();
}

function clearCart() {
    if (!confirm("Bạn có chắc muốn xóa toàn bộ giỏ hàng?")) {
        return;
    }

    localStorage.removeItem(CART_KEY);
    updateCartCount();
    showToast("Đã xóa toàn bộ giỏ hàng!");
    location.reload();
}

function isInCart(productId, variantId = null, variantColor = null, size = null) {
    const cart = getCart();

    const normalizedVariantId = variantId || null;
    const normalizedVariantColor = variantColor || null;
    const normalizedSize = size || null;

    return cart.some(
        (item) =>
            item.productId === productId &&
            item.variantId === normalizedVariantId &&
            item.variantColor === normalizedVariantColor &&
            item.size === normalizedSize
    );
}

function getCartCount() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function showToast(msg, type = "success") {
    let toast = document.createElement("div");

    const bgColor = type === "success" ? "bg-green-600" :
        type === "error" ? "bg-red-600" : "bg-blue-600";

    toast.className = `fixed top-5 right-5 ${bgColor} text-white px-4 py-2 rounded shadow-lg z-50 flex items-center gap-2`;
    toast.style.zIndex = "9999";

    toast.innerHTML = `
        <span class="flex-1">${msg}</span>
        <button onclick="this.parentElement.remove()"
            style="background:none; border:none; color:white; font-size:16px; cursor:pointer;">
            ✖
        </button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentElement) toast.remove();
    }, 3000);
}

document.addEventListener("DOMContentLoaded", updateCartCount);

$(document).on("click", ".add-to-cart", function (e) {
    e.preventDefault();
    const productId = $(this).data("id");
    addToCart(productId, null, 1);
});

window.getCart = getCart;
window.addToCart = addToCart;
window.changeCartQuantity = changeCartQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.getCartCount = getCartCount;
window.isInCart = isInCart;
window.updateCartCount = updateCartCount;
window.showToast = showToast;