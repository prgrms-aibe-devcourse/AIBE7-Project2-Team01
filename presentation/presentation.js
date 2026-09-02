const slides = Array.from(document.querySelectorAll("[data-slide]"));
const counter = document.querySelector("[data-counter]");
const progress = document.querySelector("[data-progress]");
const previousButton = document.querySelector("[data-prev]");
const nextButton = document.querySelector("[data-next]");

let currentIndex = readIndexFromHash();

showSlide(currentIndex);

previousButton?.addEventListener("click", () => move(-1));
nextButton?.addEventListener("click", () => move(1));

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === " ") {
    event.preventDefault();
    move(1);
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    move(-1);
  }
  if (event.key.toLowerCase() === "f") {
    document.documentElement.requestFullscreen?.();
  }
});

window.addEventListener("hashchange", () => {
  currentIndex = readIndexFromHash();
  showSlide(currentIndex);
});

function move(direction) {
  const nextIndex = Math.min(Math.max(currentIndex + direction, 0), slides.length - 1);
  if (nextIndex === currentIndex) {
    return;
  }
  currentIndex = nextIndex;
  window.location.hash = `#${currentIndex + 1}`;
  showSlide(currentIndex);
}

function showSlide(index) {
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === index);
  });

  if (counter) {
    counter.textContent = `${index + 1} / ${slides.length}`;
  }

  if (progress) {
    progress.style.width = `${((index + 1) / slides.length) * 100}%`;
  }

  if (previousButton) {
    previousButton.disabled = index === 0;
  }

  if (nextButton) {
    nextButton.disabled = index === slides.length - 1;
  }
}

function readIndexFromHash() {
  const raw = window.location.hash.replace("#", "");
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.min(Math.max(parsed - 1, 0), slides.length - 1);
}
