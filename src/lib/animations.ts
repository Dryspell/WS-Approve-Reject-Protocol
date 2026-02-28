/**
 * Animation utilities for The Vote Exchange Protocol
 * Using CSS transitions and keyframes for performance
 */

export const animations = {
  // Number counter animation
  countUp: (element: HTMLElement, start: number, end: number, duration: number = 1000) => {
    const startTime = Date.now();
    const range = end - start;

    const update = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + range * eased;
      
      element.textContent = `$${current.toFixed(2)}`;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  },

  // Pulse animation for attention
  pulse: (element: HTMLElement) => {
    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = 'pulse 0.5s ease-in-out';
    }, 10);
  },

  // Shake animation for errors
  shake: (element: HTMLElement) => {
    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = 'shake 0.5s ease-in-out';
    }, 10);
  },

  // Bounce animation for success
  bounce: (element: HTMLElement) => {
    element.style.animation = 'none';
    setTimeout(() => {
      element.style.animation = 'bounce 0.6s ease-in-out';
    }, 10);
  },

  // Fade in
  fadeIn: (element: HTMLElement, duration: number = 300) => {
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease-in`;
    setTimeout(() => {
      element.style.opacity = '1';
    }, 10);
  },

  // Fade out
  fadeOut: (element: HTMLElement, duration: number = 300): Promise<void> => {
    return new Promise((resolve) => {
      element.style.transition = `opacity ${duration}ms ease-out`;
      element.style.opacity = '0';
      setTimeout(resolve, duration);
    });
  },

  // Slide in from direction
  slideIn: (element: HTMLElement, direction: 'left' | 'right' | 'top' | 'bottom', duration: number = 300) => {
    const transforms = {
      left: 'translateX(-100%)',
      right: 'translateX(100%)',
      top: 'translateY(-100%)',
      bottom: 'translateY(100%)',
    };

    element.style.transform = transforms[direction];
    element.style.opacity = '0';
    element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    
    setTimeout(() => {
      element.style.transform = 'translate(0, 0)';
      element.style.opacity = '1';
    }, 10);
  },

  // Scale up animation
  scaleUp: (element: HTMLElement, duration: number = 300) => {
    element.style.transform = 'scale(0.8)';
    element.style.opacity = '0';
    element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
      element.style.opacity = '1';
    }, 10);
  },

  // Confetti animation (CSS-based)
  confetti: () => {
    if (typeof document === 'undefined') return;

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: -10px;
        opacity: 1;
        animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
      `;
      container.appendChild(confetti);
    }

    document.body.appendChild(container);

    setTimeout(() => {
      document.body.removeChild(container);
    }, 5000);
  },
};

// CSS keyframes (add to global CSS)
export const animationStyles = `
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes confetti-fall {
  to {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes scale-in {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-in;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.3s ease-out;
}

.animate-pulse {
  animation: pulse 0.5s ease-in-out;
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

.animate-bounce {
  animation: bounce 0.6s ease-in-out;
}
`;

