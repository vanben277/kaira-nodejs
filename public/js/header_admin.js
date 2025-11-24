function loadAdminInfo() {
    fetch('/admin/accounts/me')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data) {
                const user = data.data;
                const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
                    || user.email.split('@')[0]
                    || 'Admin';

                const avatarUrl = user.avatar
                    ? user.avatar + '?t=' + new Date().getTime()
                    : '/images/nuben.jpg';

                const navbarName = document.getElementById('navbarName');
                const navbarAvatar = document.getElementById('navbarAvatar');
                if (navbarName) navbarName.textContent = fullName;
                if (navbarAvatar) navbarAvatar.src = avatarUrl;

                const sidebarName = document.getElementById('sidebarName');
                const sidebarAvatar = document.getElementById('sidebarAvatar');
                const sidebarRole = document.getElementById('sidebarRole');
                if (sidebarName) sidebarName.textContent = fullName;
                if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
                if (sidebarRole) sidebarRole.textContent = user.role === 'ADMIN' ? 'Quản trị viên' : user.role;
            }
        })
        .catch(err => {
            console.error('Lỗi load thông tin admin:', err);
        });
}

document.addEventListener('DOMContentLoaded', loadAdminInfo);

document
    .getElementById("adminLogoutBtn")
    ?.addEventListener("click", async function (e) {
        e.preventDefault();
        try {
            const res = await fetch("/auth/logout", { method: "POST" });
            const json = await res.json();
            if (json.success) {
                window.location.href = json.redirect || "/auth/signin";
            } else {
                alert(json.message || "Đăng xuất thất bại");
            }
        } catch (err) {
            alert("Lỗi kết nối");
        }
    });