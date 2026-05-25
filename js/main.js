// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// Mobile hamburger menu
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
// Close mobile menu on link click
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// Smooth reveal on scroll
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12 });
reveals.forEach(el => observer.observe(el));

// Booking form submission
function handleBooking(e) {
  e.preventDefault();
  document.getElementById('modal').classList.add('open');
}
function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.getElementById('bookingForm').reset();
}

// Close modal on overlay click
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Set min date for date picker to today
const dateInputs = document.querySelectorAll('input[type="date"]');
const today = new Date().toISOString().split('T')[0];
dateInputs.forEach(d => d.setAttribute('min', today));
