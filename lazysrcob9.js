function lazyLoadImages() {
  const style = document.createElement('style');
  style.textContent = `
    img[lazysrc] {
      filter: blur(5px);
      transition: filter 0.3s ease;
      display: block;
      width: 100%;
      height: auto;
    }
  `;
  document.head.appendChild(style);

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px 100px 0px',
    threshold: 0.1
  };

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('lazysrc');

        const preloader = new Image();
        preloader.src = src;

        // Handle successful load
        preloader.onload = () => {
          img.src = src; // Set the src only after preloading
          img.style.filter = 'none';
          img.style.transition = 'filter 0.3s ease';
          img.removeAttribute('lazysrc');
          observer.unobserve(img);
          
          // Disconnect observer if no more images to lazy-load
          if (document.querySelectorAll('img[lazysrc]').length === 0) {
            observer.disconnect();
          }
        };

        preloader.onerror = () => {
          console.error(`Failed to load image: ${src}`);
          img.removeAttribute('lazysrc');
          observer.unobserve(img);
        };
      }
    });
  }, observerOptions);

  function observeImages() {
    const images = document.querySelectorAll('img[lazysrc]');
    images.forEach(image => {
      image.style.filter = 'blur(5px)';
      image.style.transition = 'filter 0.3s ease';
      imageObserver.observe(image);
    });
  }

  observeImages();

  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches('img[lazysrc]')) {
              node.style.filter = 'blur(5px)';
              node.style.transition = 'filter 0.3s ease';
              imageObserver.observe(node);
            }
            node.querySelectorAll('img[lazysrc]').forEach(img => {
              img.style.filter = 'blur(5px)';
              img.style.transition = 'filter 0.3s ease';
              imageObserver.observe(img);
            });
          }
        });
      }
    });
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}
