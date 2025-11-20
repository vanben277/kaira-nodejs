$(document).ready(function () {
    const adminLogoutBtn = $("#adminLogoutBtn");

    if (adminLogoutBtn.length) {
        adminLogoutBtn.on("click", function (e) {
            e.preventDefault();

            $.ajax({
                url: "/auth/logout",
                type: "POST",
                contentType: "application/json",
                success: function (data) {
                    if (data.success) {
                        window.location.href = data.redirect || "/auth/signin";
                    } else {
                        alert(data.message);
                    }
                },
                error: function (xhr) {
                    console.error("Lỗi khi đăng xuất:", xhr);
                    alert("Đã xảy ra lỗi khi đăng xuất.");
                },
            });
        });
    }

    const navbarNav = $(".navbar-nav");
    const homeLink = navbarNav.find("li:first");

    function fetchNestedCategories() {
        $.ajax({
            url: "/categories/nested",
            method: "GET",
            dataType: "json",
            success: function (data) {
                if (data.success && data.categories) {
                    renderParentCategories(data.categories);
                } else {
                    console.error("Lỗi khi lấy danh mục:", data.message);
                }
            },
            error: function (xhr) {
                console.error("Lỗi fetch danh mục:", xhr);
            },
        });
    }

    function renderParentCategories(categories) {
        categories.forEach((category) => {
            const navItem = $(`
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
              ${category.name}
            </a>
            <ul class="dropdown-menu"></ul>
          </li>
        `);

            if (category.children && category.children.length > 0) {
                renderChildCategories(
                    navItem.find(".dropdown-menu"),
                    category.children
                );
            }

            homeLink.after(navItem);
        });
    }

    function renderChildCategories(ulElement, children) {
        children.forEach((child) => {
            const li = $(`
          <li>
            <a class="dropdown-item" href="/category/${child.slug}">${child.name}</a>
          </li>
        `);

            // Nếu còn phân cấp sâu hơn
            if (child.children && child.children.length > 0) {
                const subMenu = $(`
            <ul class="dropdown-menu dropdown-submenu"></ul>
          `);
                renderChildCategories(subMenu, child.children);
                li.append(subMenu);
            }

            ulElement.append(li);
        });
    }

    fetchNestedCategories();
});