$(document).ready(function () {
    const $searchInput = $('#search-form');
    const $searchResultsContainer = $('#search-results-container');
    const $resultsList = $('.search-results-list');
    const $loadingSpinner = $('.loading-spinner');
    const $defaultCategories = $('#default-categories');
    const $catListUl = $('.cat-list');

    let typingTimer;
    const doneTypingInterval = 500;

    loadSearchCategories();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    $searchInput.on('keyup', function (e) {
        if (e.key === 'Enter') {
            const keyword = $(this).val().trim();
            if (keyword.length > 0) {
                window.location.href = `/containers?keyword=${encodeURIComponent(keyword)}`;
            }
            return;
        }

        clearTimeout(typingTimer);
        const keyword = $(this).val().trim();

        if (keyword.length > 0) {
            $defaultCategories.hide();
            $searchResultsContainer.show();
            $resultsList.empty();
            $loadingSpinner.show();

            typingTimer = setTimeout(() => performSearch(keyword), doneTypingInterval);
        } else {
            resetSearch();
        }
    });

    $('#search-box').on('submit', function (e) {
        e.preventDefault();
        const keyword = $searchInput.val().trim();
        if (keyword.length > 0) {
            window.location.href = `/containers?keyword=${encodeURIComponent(keyword)}`;
        }
    });

    function loadSearchCategories() {
        $.ajax({
            url: '/categories',
            method: 'GET',
            success: function (response) {
                $catListUl.empty();

                if (response.success && response.data && response.data.length > 0) {
                    response.data.forEach(cat => {
                        const htmlItem = `
                            <li class="cat-list-item">
                                <a href="/category/${cat.slug}" title="${cat.name}">
                                    ${cat.name}
                                </a>
                            </li>
                        `;
                        $catListUl.append(htmlItem);
                    });
                } else {
                    $catListUl.html('<p class="small text-muted">Chưa có danh mục nào.</p>');
                }
            },
            error: function (err) {
                console.error("Lỗi load categories trong search popup:", err);
                $catListUl.html('<p class="small text-danger">Lỗi tải danh mục.</p>');
            }
        });
    }

    function performSearch(keyword) {
        $.ajax({
            url: '/products/search',
            method: 'GET',
            data: {
                keyword: keyword
            },
            dataType: 'json',
            success: function (response) {
                $loadingSpinner.hide();
                $resultsList.empty();

                if (response.success && response.data && response.data.length > 0) {
                    response.data.forEach(product => {
                        let imgUrl = 'images/default-product.jpg';

                        if (product.has_variants && product.variants && product.variants.length > 0) {
                            if (product.variants[0].images && product.variants[0].images.length > 0) {
                                imgUrl = product.variants[0].images[0];
                            }
                        } else if (product.thumbnail) {
                            imgUrl = product.thumbnail;
                        } else if (product.images && product.images.length > 0) {
                            imgUrl = product.images[0];
                        }

                        let priceHtml = '';
                        if (product.has_variants && product.variants && product.variants.length > 0) {
                            const sizes = product.variants[0].sizes;
                            if (sizes && sizes.length > 0) {
                                const prices = sizes.map(s => s.price);
                                const minPrice = Math.min(...prices);
                                const maxPrice = Math.max(...prices);

                                if (minPrice === maxPrice) {
                                    priceHtml = `<span class="price text-primary fw-bold">${formatCurrency(minPrice)}</span>`;
                                } else {
                                    priceHtml = `<span class="price text-primary fw-bold">${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}</span>`;
                                }
                            }
                        } else {
                            priceHtml = `<span class="price text-primary fw-bold">${formatCurrency(product.price || 0)}</span>`;
                        }

                        const htmlItem = `
                            <a href="/product-detail?id=${product._id}" class="d-flex align-items-center p-2 text-decoration-none text-dark search-item border-bottom">
                                <div class="flex-shrink-0">
                                    <img src="${imgUrl}" alt="${product.name}" class="rounded" width="60" height="60" style="object-fit: cover;">
                                </div>
                                <div class="flex-grow-1 ms-3">
                                    <h6 class="text-uppercase mb-1 fs-6">${product.name}</h6>
                                    ${priceHtml}
                                </div>
                            </a>
                        `;
                        $resultsList.append(htmlItem);
                    });

                    const viewAllBtn = `
                        <div class="text-center mt-3 mb-2">
                            <a href="/containers?keyword=${encodeURIComponent(keyword)}" class="btn btn-sm btn-dark w-100">
                                Xem tất cả kết quả
                            </a>
                        </div>
                    `;
                    $resultsList.append(viewAllBtn);

                } else {
                    $resultsList.html('<p class="text-center text-muted mt-3">Không tìm thấy sản phẩm nào phù hợp.</p>');
                }
            },
            error: function (err) {
                $loadingSpinner.hide();
                console.error("Lỗi tìm kiếm:", err);
                $resultsList.html('<p class="text-center text-danger mt-3">Đã xảy ra lỗi. Vui lòng thử lại.</p>');
            }
        });
    }

    function resetSearch() {
        $searchResultsContainer.hide();
        $defaultCategories.fadeIn();
        $resultsList.empty();
    }
});