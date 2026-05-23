const header = document.querySelector(".site-header");
const navToggle = document.querySelector("[data-nav-toggle]");

if (navToggle && header) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const toast = document.createElement("div");
toast.className = "toast";
toast.setAttribute("role", "status");
document.body.appendChild(toast);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-show");
  }, 2600);
}

document.querySelectorAll("form[data-demo-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = form.dataset.success || "入力内容を確認しました。実装時はここから送信処理に接続します。";
    showToast(message);
  });
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest("[data-filter-group]");
    const value = button.dataset.filter;
    if (!group) return;

    group.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");

    document.querySelectorAll("[data-filter-item]").forEach((card) => {
      const category = card.dataset.category || "";
      const shouldShow = value === "all" || category.split(" ").includes(value);
      card.hidden = !shouldShow;
    });
  });
});

document.querySelectorAll("[data-password-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.querySelector(button.dataset.passwordToggle);
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    button.textContent = isPassword ? "非表示" : "表示";
  });
});
