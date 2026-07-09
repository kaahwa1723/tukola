'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px 0px -60px 0px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Immediate check: if element is already in viewport, show it right away
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < viewportHeight + 100 && rect.bottom > -100) {
      setIsVisible(true);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

export type AnimationType = 
  | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' 
  | 'fadeIn' | 'fadeInScale' | 'fadeInBlur'
  | 'scaleUp' | 'scaleDown' | 'zoomIn'
  | 'flipX' | 'flipY' | 'rotateIn'
  | 'bounceIn' | 'elasticIn'
  | 'stagger';

export function getScrollAnimationClasses(
  isVisible: boolean, 
  animation: AnimationType = 'slideUp',
  duration: number = 700
) {
  const base = `transition-all ease-out`;
  const dur = duration > 0 ? `duration-[${duration}ms]` : 'duration-700';
  
  const hidden: Record<AnimationType, string> = {
    slideUp: 'opacity-0 translate-y-12',
    slideDown: 'opacity-0 -translate-y-12',
    slideLeft: 'opacity-0 translate-x-12',
    slideRight: 'opacity-0 -translate-x-12',
    fadeIn: 'opacity-0',
    fadeInScale: 'opacity-0 scale-90',
    fadeInBlur: 'opacity-0 blur-sm',
    scaleUp: 'opacity-0 scale-75',
    scaleDown: 'opacity-0 scale-125',
    zoomIn: 'opacity-0 scale-50',
    flipX: 'opacity-0 rotate-x-90',
    flipY: 'opacity-0 rotate-y-90',
    rotateIn: 'opacity-0 -rotate-12 scale-90',
    bounceIn: 'opacity-0 translate-y-16',
    elasticIn: 'opacity-0 translate-y-12 scale-95',
    stagger: 'opacity-0 translate-y-8',
  };
  
  const visible: Record<AnimationType, string> = {
    slideUp: 'opacity-100 translate-y-0',
    slideDown: 'opacity-100 translate-y-0',
    slideLeft: 'opacity-100 translate-x-0',
    slideRight: 'opacity-100 translate-x-0',
    fadeIn: 'opacity-100',
    fadeInScale: 'opacity-100 scale-100',
    fadeInBlur: 'opacity-100 blur-0',
    scaleUp: 'opacity-100 scale-100',
    scaleDown: 'opacity-100 scale-100',
    zoomIn: 'opacity-100 scale-100',
    flipX: 'opacity-100 rotate-x-0',
    flipY: 'opacity-100 rotate-y-0',
    rotateIn: 'opacity-100 rotate-0 scale-100',
    bounceIn: 'opacity-100 translate-y-0',
    elasticIn: 'opacity-100 translate-y-0 scale-100',
    stagger: 'opacity-100 translate-y-0',
  };

  return `${base} ${isVisible ? visible[animation] : hidden[animation]}`;
}

// Parallax scroll effect
export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const scrolled = window.innerHeight - rect.top;
    setOffset(scrolled * speed * 0.1);
  }, [speed]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { ref, offset };
}

// Counter animation
export function useCountUp(end: number, duration: number = 2000, start: number = 0) {
  const [count, setCount] = useState(start);
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else setCount(end);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration, start]);

  return { ref, count };
}

// Staggered children animation
export function useStaggerAnimation(itemCount: number, baseDelay: number = 100) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  
  const getDelay = (index: number) => {
    if (!isVisible) return 0;
    return index * baseDelay;
  };

  const getStaggerClasses = (index: number) => {
    const delay = getDelay(index);
    return {
      transitionDelay: `${delay}ms`,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
      transition: `opacity 600ms ease-out ${delay}ms, transform 600ms ease-out ${delay}ms`,
    };
  };

  return { ref, isVisible, getStaggerClasses, getDelay };
}

// Magnetic hover effect
export function useMagneticEffect() {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
    setPosition({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  return { ref, position, handleMouseMove, handleMouseLeave };
}

// Text reveal animation (word by word)
export function useTextReveal(text: string, delay: number = 50) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });
  const words = text.split(' ');
  
  return { 
    ref, 
    isVisible, 
    words, 
    getWordStyle: (index: number) => ({
      display: 'inline-block',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 400ms ease-out ${index * delay}ms, transform 400ms ease-out ${index * delay}ms`,
      marginRight: '0.3em',
    })
  };
}

// Smooth scroll progress
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}
