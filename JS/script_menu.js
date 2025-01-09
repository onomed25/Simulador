document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector(".menu-toggle");
    const nav = document.querySelector("nav");

    menuToggle.addEventListener("click", () => {
        menuToggle.classList.toggle("active");
        nav.style.display = nav.style.display === "flex" ? "none" : "flex";
    });
});
