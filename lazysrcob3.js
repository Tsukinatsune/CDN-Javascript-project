const images = document.querySelectorAll('img[lazysrc]');
  
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
      }
    });
  }, observerOptions);

  images.forEach(image => imageObserver.observe(image));
