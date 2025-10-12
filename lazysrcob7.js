function lazyLoad() {
  const images = document.querySelectorAll('img[lazysrc]');
  
  if (images.length === 0) return; // Exit if no images to process
  
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px 100px 0px',
    threshold: 0.1
  };

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.getAttribute('lazysrc');
        img.removeAttribute('lazysrc');
        observer.unobserve(img);
        
        // Check if all images are processed
        if (document.querySelectorAll('img[lazysrc]').length === 0) {
          observer.disconnect(); // Clear the observer
        }
      }
    });
  }, observerOptions);

  images.forEach(image => imageObserver.observe(image));
}
