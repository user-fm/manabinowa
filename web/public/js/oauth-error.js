const params = new URLSearchParams(window.location.search);

document.getElementById("error-code").textContent =
  params.get("error") || "unknown_error";

document.getElementById("error-desc").textContent =
  params.get("error_description") || "No additional information.";
