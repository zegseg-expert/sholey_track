// Simple JavaScript for Shorley Smart AirTrack Pro
document.addEventListener('DOMContentLoaded', function() {
    console.log('Shorley Smart AirTrack Pro - Ready');
    
    // Add smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});
