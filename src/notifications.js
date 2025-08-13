// Notification logic
export function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    if (message.includes('Error')) {
        notification.style.backgroundColor = 'red';
    } else {
        notification.style.backgroundColor = 'green';
    }
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
