function toggleFilters() {
    const sidebar = document.getElementById("filterSidebar");
    sidebar.classList.toggle("show");
}

$(document).ready(function () {
    let currentPage = 1;
    const urlParams = new URLSearchParams(window.location.search);

    const keyword = urlParams.get("keyword");

    const path = window.location.pathname;
    let currentCategorySlug = null;
    if (path.includes("/category/")) {
        currentCategorySlug = path.split("/category/")[1];
    }
    // -------------------------------------------

    let priceDebounceTimer;

    let filters = {
        keyword: keyword || null,
        category: null,
        minPrice: null,
        maxPrice: null,
        size: null,
        color: null,
        sort: "createdAt",
        order: "desc",
    };

    if (keyword) {
        $("#pageTitle").text(`Kết quả tìm kiếm: "${keyword}"`);
        $("#breadcrumbText").text(`Tìm kiếm: ${keyword}`);
    }

    loadCategories();
    loadFilterOptions();

    function loadCategories() {
        $.ajax({
            url: "/categories",
            method: "GET",
            success: function (response) {
                if (response.success) {
                    renderCategories(response.data);

                    loadProducts();
                }
            },
            error: function (err) {
                console.error("Lỗi load categories:", err);
                loadProducts();
            },
        });
    }

    function loadFilterOptions() {
        $.ajax({
            url: "/products/filter-options",
            method: "GET",
            success: function (response) {
                if (response.success) {
                    renderSizes(response.data.sizes);
                    renderColors(response.data.colors);
                }
            },
            error: function (err) {
                console.error("Lỗi load filter options:", err);
            },
        });
    }

    function loadProducts() {
        $("#productsGrid").html(
            '<div class="col-12 text-center py-5"><div class="spinner-border" role="status"><span class="visually-hidden">Đang tải...</span></div></div>'
        );

        const params = {
            page: currentPage,
            limit: 12,
        };

        if (filters.keyword) params.keyword = filters.keyword;
        if (filters.category) params.category = filters.category;
        if (filters.minPrice) params.minPrice = filters.minPrice;
        if (filters.maxPrice) params.maxPrice = filters.maxPrice;
        if (filters.size) params.size = filters.size;
        if (filters.color) params.color = filters.color;
        if (filters.sort) params.sort = filters.sort;
        if (filters.order) params.order = filters.order;

        $.ajax({
            url: "/products",
            method: "GET",
            data: params,
            success: function (response) {
                if (response.success) {
                    renderProducts(response.data);
                    renderPagination(response.pagination);
                    updateProductCount(response.pagination);
                }
            },
            error: function (err) {
                console.error("Lỗi load products:", err);
                $("#productsGrid").html(
                    '<div class="col-12 text-center py-5"><p class="text-danger">Đã xảy ra lỗi khi tải sản phẩm</p></div>'
                );
            },
        });
    }

    function renderCategories(categories) {
        const container = $("#categoryList");
        container.empty();

        categories.forEach((cat, index) => {
            let isChecked = "";
            if (currentCategorySlug && cat.slug === currentCategorySlug) {
                isChecked = "checked";
                filters.category = cat._id;

                $("#pageTitle").text(cat.name);
            }

            const inputId = `cat_${cat._id}`;

            const html = `
                  <div class="form-check">
                    <input class="form-check-input category-filter" type="checkbox" 
                           id="${inputId}" value="${cat._id}" ${isChecked} />
                    <label class="form-check-label" for="${inputId}">
                      ${cat.name} (${cat.productCount || 0})
                    </label>
                  </div>
                `;
            container.append(html);
        });
    }

    function renderSizes(sizes) {
        const container = $("#sizeList");
        container.empty();
        sizes.forEach((size, index) => {
            const html = `
                  <div class="form-check">
                    <input class="form-check-input size-filter" type="checkbox" 
                           id="size${index}" value="${size}" />
                    <label class="form-check-label" for="size${index}">${size}</label>
                  </div>
                `;
            container.append(html);
        });
    }

    function renderColors(colors) {
        const container = $("#colorList");
        container.empty();
        colors.forEach((color, index) => {
            const html = `
                  <div class="form-check">
                    <input class="form-check-input color-filter" type="checkbox" 
                           id="color${index}" value="${color.name}" />
                    <label class="form-check-label" for="color${index}">${color.name}</label>
                  </div>
                `;
            container.append(html);
        });
    }

    function renderProducts(products) {
        const grid = $("#productsGrid");
        grid.empty();

        if (!products || products.length === 0) {
            grid.html(
                '<div class="col-12 text-center py-5"><p class="text-muted">Không tìm thấy sản phẩm nào</p></div>'
            );
            return;
        }

        products.forEach((product) => {
            let imgUrl = "images/default-product.jpg";
            if (product.has_variants && product.variants?.length > 0) {
                if (product.variants[0].images?.length > 0) {
                    imgUrl = product.variants[0].images[0];
                }
            } else if (product.thumbnail) {
                imgUrl = product.thumbnail;
            } else if (product.images?.length > 0) {
                imgUrl = product.images[0];
            }

            let priceHtml = "";
            if (product.has_variants && product.variants?.length > 0) {
                const sizes = product.variants[0].sizes;
                if (sizes?.length > 0) {
                    const prices = sizes.map((s) => s.price);
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    if (minPrice === maxPrice) {
                        priceHtml = formatCurrency(minPrice);
                    } else {
                        priceHtml = `${formatCurrency(minPrice)} - ${formatCurrency(
                            maxPrice
                        )}`;
                    }
                }
            } else {
                priceHtml = formatCurrency(product.price || 0);
            }

            const html = `
                  <div class="col-md-4 col-sm-6 mb-4">
                    <div class="product-item image-zoom-effect link-effect">
                      <div class="image-holder position-relative">
                        <a href="/product-detail?id=${product._id}">
                          <img src="${imgUrl}" alt="${product.name}" 
                               class="product-image img-fluid" 
                               onerror="this.src='images/default-product.jpg'" />
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
                          <a href="javascript:void(0)" class="text-decoration-none add-to-cart" 
                             data-id="${product._id}" data-after="Add to cart">
                            <span>${priceHtml}</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
            grid.append(html);
        });
    }

    function renderPagination(pagination) {
        const container = $("#paginationList");
        container.empty();
        if (!pagination || pagination.totalPages <= 1) return;

        const prevDisabled = pagination.page === 1 ? "disabled" : "";
        container.append(`
                <li class="page-item ${prevDisabled}">
                  <a class="page-link" href="#" data-page="${pagination.page - 1
            }">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <use xlink:href="#arrow-left"></use>
                    </svg>
                  </a>
                </li>
            `);

        for (let i = 1; i <= pagination.totalPages; i++) {
            const active = i === pagination.page ? "active" : "";
            container.append(`
                  <li class="page-item ${active}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                  </li>
                `);
        }

        const nextDisabled =
            pagination.page === pagination.totalPages ? "disabled" : "";
        container.append(`
                <li class="page-item ${nextDisabled}">
                  <a class="page-link" href="#" data-page="${pagination.page + 1
            }">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <use xlink:href="#arrow-right"></use>
                    </svg>
                  </a>
                </li>
            `);
    }

    function updateProductCount(pagination) {
        if (!pagination) return;
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(
            pagination.page * pagination.limit,
            pagination.total
        );
        $("#productCount").html(
            `Hiển thị <strong>${start}-${end}</strong> trong <strong>${pagination.total}</strong> sản phẩm`
        );
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    }

    function updateFiltersAndReload() {
        const selectedCategories = $(".category-filter:checked")
            .map(function () {
                return $(this).val();
            })
            .get();

        filters.category =
            selectedCategories.length > 0 ? selectedCategories[0] : null;

        window.history.pushState({}, "", "/containers");

        const selectedSizes = $(".size-filter:checked")
            .map(function () {
                return $(this).val();
            })
            .get();
        filters.size = selectedSizes.length > 0 ? selectedSizes[0] : null;

        const selectedColors = $(".color-filter:checked")
            .map(function () {
                return $(this).val();
            })
            .get();
        filters.color = selectedColors.length > 0 ? selectedColors[0] : null;

        const selectedRadio = $(".price-range:checked");
        if (selectedRadio.length > 0) {
            filters.minPrice = selectedRadio.data("min");
            filters.maxPrice = selectedRadio.data("max");
        } else {
            filters.minPrice = $("#minPrice").val();
            filters.maxPrice = $("#maxPrice").val();
        }

        currentPage = 1;
        loadProducts();
    }

    $(document).on(
        "change",
        ".category-filter, .size-filter, .color-filter",
        function () {
            const type = $(this).attr("class").split(" ")[1];
            if ($(this).is(":checked")) {
                $(`.${type}`).not(this).prop("checked", false);
            }
            updateFiltersAndReload();
        }
    );

    $(".price-range").on("change", function () {
        $("#minPrice").val("");
        $("#maxPrice").val("");
        updateFiltersAndReload();
    });

    $("#minPrice, #maxPrice").on("input", function () {
        $(".price-range").prop("checked", false);

        clearTimeout(priceDebounceTimer);
        priceDebounceTimer = setTimeout(() => {
            updateFiltersAndReload();
        }, 800);
    });

    $(".sort-select").on("change", function () {
        const value = $(this).val();
        switch (value) {
            case "price_asc":
                filters.sort = "price";
                filters.order = "asc";
                break;
            case "price_desc":
                filters.sort = "price";
                filters.order = "desc";
                break;
            case "name_asc":
                filters.sort = "name";
                filters.order = "asc";
                break;
            case "name_desc":
                filters.sort = "name";
                filters.order = "desc";
                break;
            case "newest":
                filters.sort = "createdAt";
                filters.order = "desc";
                break;
            default:
                filters.sort = "createdAt";
                filters.order = "desc";
        }
        currentPage = 1;
        loadProducts();
    });

    $(document).on("click", ".page-link", function (e) {
        e.preventDefault();
        if ($(this).parent().hasClass("disabled")) return;
        const page = $(this).data("page");
        if (page) {
            currentPage = page;
            loadProducts();
            $("html, body").animate(
                {
                    scrollTop: 0,
                },
                300
            );
        }
    });

    $(".btn-clear-all").on("click", function () {
        $('input[type="checkbox"], input[type="radio"]').prop(
            "checked",
            false
        );
        $("#minPrice, #maxPrice").val("");
        $(".sort-select").val("default");

        filters.category = null;
        filters.minPrice = null;
        filters.maxPrice = null;
        filters.size = null;
        filters.color = null;
        filters.sort = "createdAt";
        filters.order = "desc";

        window.history.pushState({}, "", "/containers");

        currentPage = 1;
        loadProducts();
    });
});