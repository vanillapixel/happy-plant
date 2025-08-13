// Utility for closing modal
export function closeModal() {
    const modalContent = document.querySelector('.modal-content');
    document.body.classList.remove('modal-open');
    modalContent.innerHTML = '';
}
