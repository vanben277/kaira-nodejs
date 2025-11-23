(function ($) {
    "use strict";

    function getWishlist() {
        const wishlist = localStorage.getItem("wishlist");
        return wishlist ? JSON.parse(wishlist) : [];
    }

    function saveWishlist(wishlist) {
        localStorage.setItem("wishlist", JSON.stringify(wishlist));
    }

    function isInWishlist(productId) {
        const wishlist = getWishlist();
        return wishlist.some((item) => item.productId === productId);
    }

    function addToWishlist(productId) {
        let wishlist = getWishlist();

        const existingIndex = wishlist.findIndex(
            (item) => item.productId === productId
        );

        if (existingIndex !== -1) {
            wishlist.splice(existingIndex, 1);
            saveWishlist(wishlist);

            $(`.btn-wishlist[data-id="${productId}"]`).removeClass("active");
            showNotification("Đã xóa khỏi danh sách yêu thích!", "info");

            updateWishlistCount();

            return false;
        } else {
            wishlist.push({
                productId: productId,
                addedAt: new Date().toISOString(),
            });
            saveWishlist(wishlist);

            $(`.btn-wishlist[data-id="${productId}"]`).addClass("active");
            showNotification("Đã thêm vào danh sách yêu thích!", "success");

            updateWishlistCount();

            return true;
        }
    }

    function removeFromWishlist(productId) {
        let wishlist = getWishlist();
        wishlist = wishlist.filter((item) => item.productId !== productId);
        saveWishlist(wishlist);

        $(`.btn-wishlist[data-id="${productId}"]`).removeClass("active");
        updateWishlistCount();

        showNotification("Đã xóa khỏi danh sách yêu thích!", "info");
    }

    function clearWishlist() {
        localStorage.removeItem("wishlist");
        $(".btn-wishlist").removeClass("active");
        updateWishlistCount();
        showNotification("Đã xóa toàn bộ danh sách yêu thích!", "info");
    }

    function updateWishlistCount() {
        const wishlist = getWishlist();
        const count = wishlist.length;

        const $wishlistBadge = $(".wishlist-count, .wishlist-badge");
        if (count > 0) {
            $wishlistBadge.text(`( ${count} )`).show();
        } else {
            $wishlistBadge.text("0").hide();
        }
    }

    function loadWishlistState() {
        const wishlist = getWishlist();

        $(".btn-wishlist").removeClass("active");

        wishlist.forEach((item) => {
            $(`.btn-wishlist[data-id="${item.productId}"]`).addClass("active");
        });

        updateWishlistCount();
    }

    function showNotification(message, type = "success") {
        if ($(".toast-container").length === 0) {
            $("body").append(
                '<div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 9999;"></div>'
            );
        }

        const toastClass =
            type === "success"
                ? "bg-success"
                : type === "error"
                    ? "bg-danger"
                    : "bg-info";

        const toastId = "toast-" + Date.now();
        const toast = `
            <div id="${toastId}" class="toast align-items-center text-white ${toastClass} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        $(".toast-container").append(toast);
        const $toastElement = $(`#${toastId}`);
        const bsToast = new bootstrap.Toast($toastElement[0], {
            delay: 3000,
        });
        bsToast.show();

        $toastElement.on("hidden.bs.toast", function () {
            $(this).remove();
        });
    }

    function getWishlistProducts() {
        return getWishlist();
    }

    function getWishlistCount() {
        return getWishlist().length;
    }

    function exportWishlist() {
        const wishlist = getWishlist();
        return wishlist;
    }

    $(document).ready(function () {
        setTimeout(function () {
            loadWishlistState();
        }, 100);

        $(document).on("click", ".btn-wishlist", function (e) {
            e.preventDefault();
            e.stopPropagation();

            const productId = $(this).data("id");
            addToWishlist(productId);
        });

        $(document).on("click", ".remove-from-wishlist", function (e) {
            e.preventDefault();
            const productId = $(this).data("id");
            removeFromWishlist(productId);
        });

        $(document).on("click", ".clear-wishlist", function (e) {
            e.preventDefault();
            if (confirm("Bạn có chắc muốn xóa toàn bộ danh sách yêu thích?")) {
                clearWishlist();
            }
        });
    });

    $(window).on('load', function () {
        loadWishlistState();
    });

    window.WishlistManager = {
        add: addToWishlist,
        remove: removeFromWishlist,
        clear: clearWishlist,
        get: getWishlist,
        getProducts: getWishlistProducts,
        getCount: getWishlistCount,
        isInWishlist: isInWishlist,
        updateCount: updateWishlistCount,
        loadState: loadWishlistState,
        export: exportWishlist,
    };
})(jQuery);

setInterval(function () {
    if (typeof WishlistManager !== 'undefined') {
        WishlistManager.loadState();
    }
}, 500);