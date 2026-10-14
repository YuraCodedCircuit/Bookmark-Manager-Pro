import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine. Keep notification admission deterministic while
// real viewport fitting, wrapping, and zoom are verified in browser checks.
const boundingRect = HTMLElement.prototype.getBoundingClientRect;
HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.classList.contains('notification-card'))
    return new DOMRect(0, 0, 416, 80);
  return boundingRect.call(this);
};
