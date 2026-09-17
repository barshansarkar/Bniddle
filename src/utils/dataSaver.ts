export const DATA_SAVER_SCRIPT = `
  (function() {
    // Block images
    var images = document.querySelectorAll('img');
    images.forEach(img => img.style.display = 'none');
    
    // Block videos
    var videos = document.querySelectorAll('video');
    videos.forEach(video => video.style.display = 'none');
    
    // Block iframes (ads)
    var iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => iframe.style.display = 'none');
    
    // Remove heavy elements
    var heavyElements = document.querySelectorAll('.ad, .advertisement, .banner, .popup');
    heavyElements.forEach(el => el.remove());
  })();
`;