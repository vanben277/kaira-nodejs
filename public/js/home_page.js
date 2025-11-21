$(document).ready(function () {
    // categories
    const $childrenCategoriesSlider = $("#childrenCategoriesSlider");

    function fetchAllChildrenCategories() {
        $.ajax({
            url: "/categories/all-children",
            method: "GET",
            dataType: "json",
            success: function (data) {
                if (data.success) {
                    renderChildrenCategories(
                        data.categories,
                        $childrenCategoriesSlider
                    );

                    const numberOfCategories = data.categories.length;
                    let swiperConfig = {
                        loop: true,
                        navigation: {
                            nextEl: ".icon-arrow-right",
                            prevEl: ".icon-arrow-left",
                        },
                        pagination: {
                            el: ".swiper-pagination",
                            clickable: true,
                        },
                        breakpoints: {
                            0: { slidesPerView: 1, spaceBetween: 10 },
                            768: { slidesPerView: 2, spaceBetween: 20 },
                            992: { slidesPerView: 3, spaceBetween: 30 },
                        },
                    };

                    if (numberOfCategories < 4) {
                        swiperConfig.loop = false;
                        swiperConfig.navigation = false;
                        swiperConfig.pagination = false;

                        $("#billboard .icon-arrow-left").hide();
                        $("#billboard .icon-arrow-right").hide();
                        $("#billboard .swiper-pagination").hide();

                        if (numberOfCategories > 0) {
                            swiperConfig.breakpoints["992"].slidesPerView =
                                numberOfCategories;
                            swiperConfig.breakpoints["768"].slidesPerView =
                                numberOfCategories >= 2 ? 2 : numberOfCategories;
                        }
                    } else {
                        $("#billboard .icon-arrow-left").show();
                        $("#billboard .icon-arrow-right").show();
                        $("#billboard .swiper-pagination").show();
                    }

                    if (window.mainSwiperInstance) {
                        window.mainSwiperInstance.destroy(true, true);
                    }

                    if (typeof Swiper !== "undefined") {
                        window.mainSwiperInstance = new Swiper(
                            ".main-swiper",
                            swiperConfig
                        );
                    }
                } else {
                    console.error("API trả lỗi:", data.message);
                }
            },
            error: function (xhr) {
                console.error("Fetch failed:", xhr);
            },
        });
    }

    function renderChildrenCategories(categories, $parent) {
        $parent.empty();
        if (categories.length === 0) {
            $parent.html(
                '<p class="text-center w-100">Không có danh mục con nào để hiển thị.</p>'
            );
            return;
        }
        categories.forEach((category) => {
            const parentName = category.parent_id
                ? `Từ: ${category.parent_id.name}`
                : "";
            const description =
                category.description ||
                parentName ||
                "Mô tả ngắn gọn về danh mục.";
            const slide = `
    <div class="swiper-slide">
        <div class="banner-item image-zoom-effect">
            <div class="image-holder">
                <a href="/category/${category.slug}">
                    <img
                        src="${category.banner_url || " /images/placeholder.jpg"}"
                    alt="${category.name}"
                    class="img-fluid"
              />
                </a>
            </div>
            <div class="banner-content py-4">
                <h5 class="element-title text-uppercase">
                    <a class="item-anchor" href="/category/${category.slug}">
                        ${category.name}
                    </a>
                </h5>
                <p>${description}</p>
                <div class="btn-left">
                    <a
                        href="/category/${category.slug}"
                        class="btn-link fs-6 text-uppercase item-anchor text-decoration-none"
                    >
                        Khám Phá Ngay
                    </a>
                </div>
            </div>
        </div>
    </div>
    `;
            $parent.append(slide);
        });
    }

    fetchAllChildrenCategories();

    // latest products
    let productSwipers = [];

    loadLatestProducts();

    function loadLatestProducts() {
        $.ajax({
            url: "/products/latest",
            method: "GET",
            dataType: "json",
            success: function (response) {
                if (response.success) {
                    displayProducts(response.products, "#new-arrival-wrapper");
                }
            },
            error: function (xhr, status, error) {
                console.error("Lỗi khi tải sản phẩm mới:", error);
                $("#new-arrival-wrapper").html(
                    '<p class="text-center w-100">Không thể tải sản phẩm</p>'
                );
            },
        });
    }

    function displayProducts(products, containerSelector) {
        const $swiperWrapper = $(containerSelector);
        $swiperWrapper.empty();

        if (!products || products.length === 0) {
            $swiperWrapper.html(
                '<p class="text-center w-100">Chưa có sản phẩm nào.</p>'
            );
            return;
        }

        $.each(products, function (index, product) {
            let imageUrl = "images/default-product.jpg";
            if (product.thumbnail) {
                imageUrl = product.thumbnail;
            } else if (product.images && product.images.length > 0) {
                imageUrl = product.images[0];
            }

            let displayPrice = 0;
            if (product.price !== undefined && product.price !== null) {
                displayPrice = product.price;
            } else if (
                product.has_variants &&
                product.variants &&
                product.variants.length > 0
            ) {
                let minPrice = Infinity;
                product.variants.forEach((variant) => {
                    if (variant.sizes && variant.sizes.length > 0) {
                        variant.sizes.forEach((size) => {
                            if (size.price < minPrice) minPrice = size.price;
                        });
                    }
                });
                displayPrice = minPrice === Infinity ? 0 : minPrice;
            }

            const formattedPrice = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
            }).format(displayPrice);

            const productHTML = `
    <div class="swiper-slide">
        <div class="product-item image-zoom-effect link-effect">
            <div class="image-holder position-relative">
                <a href="/product-detail?id=${product._id}">
                    <img
                        src="${imageUrl}"
                        alt="${product.name}"
                        class="product-image img-fluid"
                        onerror="this.src='images/default-product.jpg'"
                    />
                </a>
                <a href="javascript:void(0)" class="btn-icon btn-wishlist" data-id="${product._id}">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <use xlink:href="#heart"></use>
                    </svg>
                </a>
                <div class="product-content">
                    <h5 class="element-title text-uppercase fs-5 mt-3">
                        <a href="product-detail.html?id=${product._id}">${product.name}</a>
                    </h5>
                    <a href="javascript:void(0)"
                        class="text-decoration-none add-to-cart"
                        data-id="${product._id}"
                        data-after="Add to cart">
                        <span>${formattedPrice}</span>
                    </a>
                </div>
            </div>
        </div>
    </div>
    `;

            $swiperWrapper.append(productHTML);
        });

        initSwiper();
    }

    function initSwiper() {
        if (typeof Swiper !== "undefined") {
            const newSwiper = new Swiper(".product-swiper", {
                slidesPerView: 4,
                spaceBetween: 30,
                breakpoints: {
                    320: { slidesPerView: 1, spaceBetween: 10 },
                    640: { slidesPerView: 2, spaceBetween: 20 },
                    1024: { slidesPerView: 4, spaceBetween: 30 },
                },
            });

            if (Array.isArray(newSwiper)) {
                productSwipers.push(...newSwiper);
            } else {
                productSwipers.push(newSwiper);
            }
        }
    }

    // random
    loadRandomProducts();

    function loadRandomProducts() {
        $.ajax({
            url: "/products/random?limit=8",
            method: "GET",
            dataType: "json",
            success: function (response) {
                if (response.success && response.data.length > 0) {
                    displayRandomProducts(response.data, "#related-products-wrapper");
                } else {
                    $("#related-products-wrapper").html(
                        '<p class="text-center w-100">Chưa có sản phẩm nào.</p>'
                    );
                }
            },
            error: function (xhr, status, error) {
                console.error("Lỗi khi tải sản phẩm ngẫu nhiên:", error);
                $("#related-products-wrapper").html(
                    '<p class="text-center w-100">Không thể tải sản phẩm</p>'
                );
            },
        });
    }

    function displayRandomProducts(products, containerSelector) {
        const $swiperWrapper = $(containerSelector);
        $swiperWrapper.empty();

        if (!products || products.length === 0) {
            $swiperWrapper.html(
                '<p class="text-center w-100">Chưa có sản phẩm nào.</p>'
            );
            return;
        }

        $.each(products, function (index, product) {
            let imageUrl = "images/default-product.jpg";
            if (product.thumbnail) {
                imageUrl = product.thumbnail;
            } else if (product.images && product.images.length > 0) {
                imageUrl = product.images[0];
            }

            let displayPrice = 0;
            if (product.price !== undefined && product.price !== null) {
                displayPrice = product.price;
            } else if (
                product.has_variants &&
                product.variants &&
                product.variants.length > 0
            ) {
                let minPrice = Infinity;
                product.variants.forEach((variant) => {
                    if (variant.sizes && variant.sizes.length > 0) {
                        variant.sizes.forEach((size) => {
                            if (size.price < minPrice) minPrice = size.price;
                        });
                    }
                });
                displayPrice = minPrice === Infinity ? 0 : minPrice;
            }

            const formattedPrice = new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
            }).format(displayPrice);

            const productHTML = `
    <div class="swiper-slide">
        <div class="product-item image-zoom-effect link-effect">
            <div class="image-holder position-relative">
                <a href="/product-detail?id=${product._id}">
                    <img
                        src="${imageUrl}"
                        alt="${product.name}"
                        class="product-image img-fluid"
                        onerror="this.src='images/default-product.jpg'"
                    />
                </a>
                <a href="javascript:void(0)" class="btn-icon btn-wishlist" data-id="${product._id}">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <use xlink:href="#heart"></use>
                    </svg>
                </a>
                <div class="product-content">
                    <h5 class="element-title text-uppercase fs-5 mt-3">
                        <a href="/product-detail?id=${product._id}">${product.name}</a>
                    </h5>
                    <a href="javascript:void(0)"
                        class="text-decoration-none add-to-cart"
                        data-id="${product._id}"
                        data-after="Add to cart">
                        <span>${formattedPrice}</span>
                    </a>
                </div>
            </div>
        </div>
    </div>
    `;

            $swiperWrapper.append(productHTML);
        });

        initRelatedProductsSwiper();
    }


    function initRelatedProductsSwiper() {
        if (typeof Swiper !== "undefined") {
            const newSwiper = new Swiper(".product-swiper", {
                slidesPerView: 4,
                spaceBetween: 30,
                breakpoints: {
                    320: { slidesPerView: 1, spaceBetween: 10 },
                    640: { slidesPerView: 2, spaceBetween: 20 },
                    1024: { slidesPerView: 4, spaceBetween: 30 },
                },
            });

            if (Array.isArray(newSwiper)) {
                productSwipers.push(...newSwiper);
            } else {
                productSwipers.push(newSwiper);
            }
        }
    }

    // ===================== EVENT HANDLERS =====================
    $(document).on("click", ".add-to-cart", function (e) {
        e.preventDefault();
        const productId = $(this).data("id");
        addToCart(productId);
    });

    $(document).on("click", ".btn-wishlist", function (e) {
        e.preventDefault();
        const productId = $(this).data("id");
        addToWishlist(productId);
    });

    function addToCart(productId) {
        console.log("Thêm sản phẩm vào giỏ:", productId);
        // Code gọi API add to cart ở đây
    }

    function addToWishlist(productId) {
        console.log("Thêm vào wishlist:", productId);
        // Code gọi API add wishlist ở đây
    }
});