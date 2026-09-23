const popup = document.getElementById('popup');
const popupClose = document.getElementById('popup-close');
const popupOverlay = document.getElementById('popup-overlay');
const popupTriggers = document.querySelectorAll('.popup-trigger');

popupTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
        popup.classList.remove('hidden');
    });
});

popupClose.addEventListener('click', () => {
    popup.classList.add('hidden');
});

popupOverlay.addEventListener('click', () => {
    popup.classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        popup.classList.add('hidden');
    }
});
