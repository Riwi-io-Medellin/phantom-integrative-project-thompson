export function setupSwapsCarousels() {
  const cleanups = [];
  const carousels = document.querySelectorAll('.swaps-dashboard .carousel');

  carousels.forEach((carousel) => {
    const container = carousel.querySelector('.carousel-container');
    const wrapper = carousel.querySelector('.card-wrapper');
    const firstCard = wrapper?.querySelector('.nft-card');
    const prev = carousel.querySelector('.prev');
    const next = carousel.querySelector('.next');

    if (!container || !wrapper || !prev || !next) return;

    const getStep = () => {
      const cardWidth =
        firstCard?.getBoundingClientRect().width || container.clientWidth * 0.8;
      const gap = Number.parseFloat(window.getComputedStyle(wrapper).gap || '0');
      return cardWidth + gap;
    };

    const handlePrev = () => {
      container.scrollBy({
        left: -getStep(),
        behavior: 'smooth',
      });
    };

    const handleNext = () => {
      container.scrollBy({
        left: getStep(),
        behavior: 'smooth',
      });
    };

    prev.addEventListener('click', handlePrev);
    next.addEventListener('click', handleNext);

    cleanups.push(() => {
      prev.removeEventListener('click', handlePrev);
      next.removeEventListener('click', handleNext);
    });
  });

  return () => {
    cleanups.forEach((cleanup) => {
      cleanup();
    });
  };
}
