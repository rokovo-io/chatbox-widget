// widget.js - WITH INLINE PRODUCT CAROUSEL (FIXED POSITIONING)
(function() {
  'use strict';

  const WIDGET_SCRIPT = document.currentScript;

  // Inject Tailwind and dependencies
  function loadDependencies() {
    return new Promise((resolve) => {
      let loaded = 0;
      const checkLoaded = () => {
        loaded++;
        if (loaded === 2) resolve();
      };

      if (!window.React) {
        const reactScript = document.createElement('script');
        reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
        reactScript.crossOrigin = 'anonymous';
        reactScript.onload = checkLoaded;
        document.head.appendChild(reactScript);
      } else {
        checkLoaded();
      }

      if (!window.ReactDOM) {
        const reactDomScript = document.createElement('script');
        reactDomScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
        reactDomScript.crossOrigin = 'anonymous';
        reactDomScript.onload = checkLoaded;
        document.head.appendChild(reactDomScript);
      } else {
        checkLoaded();
      }
    });
  }

  function loadTailwind() {
    if (document.querySelector('script[src*="tailwindcss"]')) return;
    const tailwindScript = document.createElement('script');
    tailwindScript.src = 'https://cdn.tailwindcss.com';
    document.head.appendChild(tailwindScript);
  }

  // Product Parser
  function parseProducts(message) {
    const products = [];
    const lines = message.split('\n');
    let currentProduct = null;
    
    console.log('🔍 Parsing message for products...');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const pattern1 = line.match(/^(\d+)\.\s+(.+?)\s+-\s+(.+?),\s+\$?([\d,]+\.?\d*(?:\s+to\s+\$?[\d,]+\.?\d*)?)/i);
      const pattern2 = line.match(/^(\d+)\.\s+(.+?)\s+-\s+(.+?)\s+-\s+Price:\s+\$?([\d,]+\.?\d*(?:\s*-\s*\$?[\d,]+\.?\d*)?)/i);
      const pattern3 = line.match(/^(\d+)\.\s+(.+?)\s+\(([^)]+)\)\s+-\s+Price:\s+\$?([\d,]+\.?\d*)/i);
      
      if (pattern1 || pattern2 || pattern3) {
        if (currentProduct && (currentProduct.link || currentProduct.image)) {
          products.push(currentProduct);
        }
        
        const match = pattern1 || pattern2 || pattern3;
        currentProduct = {
          name: match[2].trim(),
          description: match[3].trim(),
          price: match[4].trim().replace(/\s*(?:to|-)\s*\$?[\d,]+\.?\d*/, ''),
          link: null,
          image: null
        };
        console.log('✅ Found product:', currentProduct.name);
        
        const inlineLink = line.match(/\[View Product\]\((https?:\/\/[^\)]+)\)/i);
        if (inlineLink) currentProduct.link = inlineLink[1].trim();
        
        const inlineImage = line.match(/!\[(?:Image|[^\]]*)\]\((https?:\/\/[^\)]+)\)/);
        if (inlineImage) currentProduct.image = inlineImage[1].trim();
        
        continue;
      }
      
      if (currentProduct) {
        const linkMatch1 = line.match(/^(?:-\s*)?Link:\s*(https?:\/\/\S+)/i);
        const linkMatch2 = line.match(/\[View Product\]\((https?:\/\/[^\)]+)\)/i);
        const linkMatch3 = line.match(/^(https?:\/\/(?:www\.)?[^\s]+\.com\/products\/[^\s]+)/i);
        
        if (linkMatch1) currentProduct.link = linkMatch1[1].trim();
        else if (linkMatch2) currentProduct.link = linkMatch2[1].trim();
        else if (linkMatch3 && !currentProduct.link) currentProduct.link = linkMatch3[1].trim();
        
        const imageMatch1 = line.match(/(?:-\s*)?Image:\s*!\[(?:[^\]]*)\]\((https?:\/\/[^\)]+)\)/i);
        const imageMatch2 = line.match(/!\[(?:Image|Link|[^\]]*)\]\((https?:\/\/[^\)]+)\)/);
        const imageMatch3 = line.match(/^(https?:\/\/cdn\.shopify\.com\/[^\s]+)/i);
        
        if (imageMatch1) currentProduct.image = imageMatch1[1].trim();
        else if (imageMatch2 && !currentProduct.image) currentProduct.image = imageMatch2[1].trim();
        else if (imageMatch3 && !currentProduct.image) currentProduct.image = imageMatch3[1].trim();
      }
    }
    
    if (currentProduct && (currentProduct.link || currentProduct.image)) {
      products.push(currentProduct);
    }
    
    console.log(`📦 Total products parsed: ${products.length}`);
    return products;
  }

  // IMPROVED: Split message and insert carousel placeholder
  function parseMessageWithProducts(message) {
    const lines = message.split('\n');
    let beforeProducts = [];
    let afterProducts = [];
    let inProductSection = false;
    let productSectionEnded = false;
    let firstProductIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a product line
      const isProductLine = line.match(/^(\d+)\.\s+(.+?)\s+-\s+.+?,\s+\$?[\d,]/i) ||
                           line.match(/^(\d+)\.\s+(.+?)\s+-\s+.+?\s+-\s+Price:/i);
      
      // Check if this is product metadata
      const isProductMetadata = line.match(/^(?:-\s*)?(?:Link:|Image:)/i) ||
                               line.match(/^\[View Product\]/i) ||
                               line.match(/^https?:\/\/(?:www\.)?(?:tentree\.com|cdn\.shopify\.com)/i) ||
                               line.match(/^!\[/i);
      
      if (isProductLine && !inProductSection) {
        // First product found
        inProductSection = true;
        firstProductIndex = i;
      } else if (inProductSection && !productSectionEnded) {
        if (!isProductLine && !isProductMetadata && line.length > 0 && !line.match(/^Available/i)) {
          // Product section ended
          productSectionEnded = true;
          afterProducts.push(lines[i]);
        }
      } else if (!inProductSection) {
        // Before products
        beforeProducts.push(lines[i]);
      } else if (productSectionEnded) {
        // After products
        afterProducts.push(lines[i]);
      }
    }
    
    // If we found products, insert placeholder
    if (firstProductIndex !== -1) {
      return {
        before: beforeProducts.join('\n').trim(),
        hasProducts: true,
        after: afterProducts.join('\n').trim()
      };
    }
    
    // No products found
    return {
      before: message,
      hasProducts: false,
      after: ''
    };
  }

  // Inject custom styles
  function injectStyles() {
    if (document.getElementById('rokovo-widget-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'rokovo-widget-styles';
    styles.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      #rokovo-widget-root * {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-sizing: border-box;
      }
      
      #rokovo-widget-root .chat-bubble {
        border-radius: 18px !important;
      }
      
      #rokovo-widget-root .chat-bubble-user {
        border-radius: 18px !important;
        border-bottom-right-radius: 6px !important;
      }
      
      #rokovo-widget-root .chat-bubble-assistant {
        border-radius: 18px !important;
        border-bottom-left-radius: 6px !important;
      }
      
      #rokovo-widget-root .product-card {
        border-radius: 12px !important;
        overflow: hidden;
      }
      
      #rokovo-widget-root .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      #rokovo-widget-root .scrollbar-thin::-webkit-scrollbar {
        width: 6px;
      }
      
      #rokovo-widget-root .scrollbar-thin::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
      }
      
      #rokovo-widget-root .scrollbar-thin::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }
      
      #rokovo-widget-root .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      /* Carousel Styles */
      #rokovo-widget-root .carousel-container {
        position: relative;
        overflow: hidden;
        border-radius: 12px;
        margin: 16px 0;
      }
      
      #rokovo-widget-root .carousel-track {
        display: flex;
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform;
      }
      
      #rokovo-widget-root .carousel-slide {
        flex-shrink: 0;
        width: 100%;
        padding: 0 4px;
      }
      
      #rokovo-widget-root .carousel-nav-button {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 10;
      }
      
      #rokovo-widget-root .carousel-nav-button:hover {
        background: rgba(0, 0, 0, 0.9);
        transform: translateY(-50%) scale(1.1);
      }
      
      #rokovo-widget-root .carousel-nav-button:active {
        transform: translateY(-50%) scale(0.95);
      }
      
      #rokovo-widget-root .carousel-nav-button.prev {
        left: 8px;
      }
      
      #rokovo-widget-root .carousel-nav-button.next {
        right: 8px;
      }
      
      #rokovo-widget-root .carousel-dots {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-top: 12px;
      }
      
      #rokovo-widget-root .carousel-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: all 0.3s;
      }
      
      #rokovo-widget-root .carousel-dot.active {
        width: 20px;
        border-radius: 3px;
        background: currentColor;
      }
      
      #rokovo-widget-root .carousel-dot:hover:not(.active) {
        background: rgba(255, 255, 255, 0.5);
      }
      
      @keyframes rokovo-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-6px); opacity: 1; }
      }
      
      #rokovo-widget-root .animate-typing span {
        display: inline-block;
        animation: rokovo-bounce 1.4s ease-in-out infinite;
      }
      
      #rokovo-widget-root .animate-typing span:nth-child(1) {
        animation-delay: 0s;
      }
      
      #rokovo-widget-root .animate-typing span:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      #rokovo-widget-root .animate-typing span:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      @keyframes rokovo-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      #rokovo-widget-root .animate-pulse-slow {
        animation: rokovo-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      
      @keyframes rokovo-fade-in {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      
      #rokovo-widget-root .animate-fade-in {
        animation: rokovo-fade-in 0.2s ease-out;
      }
      
      @keyframes rokovo-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      #rokovo-widget-root .animate-slide-up {
        animation: rokovo-slide-up 0.3s ease-out;
      }
      
      #rokovo-widget-root .product-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      #rokovo-widget-root .product-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.4);
      }
      
      #rokovo-widget-root .product-card img {
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      #rokovo-widget-root .product-card:hover img {
        transform: scale(1.05);
      }
      
      body.rokovo-chat-open {
        overflow: hidden;
      }
      
      @media (max-width: 640px) {
        #rokovo-widget-root .mobile-fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          border-radius: 0 !important;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // Widget Component
  function RokovoWidget({ config }) {
    const React = window.React;
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionId, setSessionId] = useState(null);
    const [error, setError] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 640);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
      if (isOpen && isMobile) {
        document.body.classList.add('rokovo-chat-open');
      } else {
        document.body.classList.remove('rokovo-chat-open');
      }
      return () => document.body.classList.remove('rokovo-chat-open');
    }, [isOpen, isMobile]);

    const scrollToBottom = useCallback(() => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    const initSession = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${config.apiBaseUrl}/transport/widget`, {
          method: 'POST',
          headers: {
            'api-key': config.publishableKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ externalUserId: `external_${Date.now()}` })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        setSessionId(data.data.sessionId);
        
        setMessages([{
          id: '1',
          content: `Hello! I'm ${config.agentName} from ${config.businessName}. How can I help you today?`,
          role: 'assistant'
        }]);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setError('Failed to connect. Please try again.');
        setIsLoading(false);
      }
    };

    useEffect(() => {
      if (isOpen && messages.length === 0) {
        initSession();
      }
    }, [isOpen]);

    const sendMessage = async () => {
      if (!input.trim() || isTyping || !sessionId) return;

      const userMessage = {
        id: Date.now().toString(),
        content: input.trim(),
        role: 'user'
      };

      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsTyping(true);

      try {
        const response = await fetch(`${config.apiBaseUrl}/transport/widget`, {
          method: 'PATCH',
          headers: {
            'api-key': config.publishableKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId,
            content: userMessage.content
          })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: data.data.response.content,
          role: 'assistant'
        }]);
      } catch (error) {
        console.error('Failed to send message:', error);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: "I'm sorry, I'm having trouble responding right now. Please try again.",
          role: 'assistant'
        }]);
      } finally {
        setIsTyping(false);
        inputRef.current?.focus();
      }
    };

    const toggleChat = () => {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    };

    // Product Card Component
    const ProductCard = React.memo(({ product, primaryColor }) => (
      React.createElement('a', {
        href: product.link,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'product-card block bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 animate-fade-in',
        style: { textDecoration: 'none' }
      },
        product.image && React.createElement('div', {
          className: 'w-full bg-gray-900 relative overflow-hidden',
          style: { paddingBottom: '100%' }
        },
          React.createElement('img', {
            src: product.image,
            alt: product.name,
            className: 'absolute inset-0 w-full h-full object-cover',
            loading: 'lazy',
            onError: (e) => {
              e.target.style.display = 'none';
              const parent = e.target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                    <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                `;
              }
            }
          })
        ),
        React.createElement('div', { className: 'p-4' },
          React.createElement('h4', {
            className: 'text-white font-semibold text-base mb-2 line-clamp-2',
            style: { minHeight: '3rem', lineHeight: '1.5rem' }
          }, product.name),
          product.description && React.createElement('p', {
            className: 'text-gray-400 text-sm mb-3 line-clamp-2',
            style: { minHeight: '2.5rem', lineHeight: '1.25rem' }
          }, product.description),
          React.createElement('div', {
            className: 'flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50'
          },
            React.createElement('div', {
              className: 'flex flex-col'
            },
              React.createElement('span', {
                className: 'text-gray-500 text-xs mb-1'
              }, 'Price'),
              React.createElement('p', {
                className: 'font-bold text-xl',
                style: { color: primaryColor }
              }, `$${product.price}`)
            ),
            React.createElement('div', {
              className: 'flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg transition-all hover:scale-105',
              style: { 
                background: `${primaryColor}15`,
                color: primaryColor,
                border: `1px solid ${primaryColor}30`
              }
            },
              React.createElement('span', null, 'View Details'),
              React.createElement('svg', {
                className: 'w-4 h-4',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24',
                strokeWidth: '2.5',
                strokeLinecap: 'round',
                strokeLinejoin: 'round'
              },
                React.createElement('path', { d: 'M5 12h14M12 5l7 7-7 7' })
              )
            )
          )
        )
      )
    ));

    // Product Carousel Component
    const ProductCarousel = React.memo(({ products, primaryColor }) => {
      const [currentIndex, setCurrentIndex] = useState(0);
      const [touchStart, setTouchStart] = useState(null);
      const [touchEnd, setTouchEnd] = useState(null);
      const carouselRef = useRef(null);

      const minSwipeDistance = 50;

      const nextSlide = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % products.length);
      }, [products.length]);

      const prevSlide = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + products.length) % products.length);
      }, [products.length]);

      const goToSlide = useCallback((index) => {
        setCurrentIndex(index);
      }, []);

      const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
      };

      const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
      };

      const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) nextSlide();
        if (isRightSwipe) prevSlide();
      };

      if (products.length === 0) return null;

      return React.createElement('div', {
        className: 'carousel-container relative',
        onTouchStart,
        onTouchMove,
        onTouchEnd
      },
        // Carousel Track
        React.createElement('div', {
          ref: carouselRef,
          className: 'carousel-track',
          style: {
            transform: `translateX(-${currentIndex * 100}%)`
          }
        },
          products.map((product, idx) =>
            React.createElement('div', {
              key: idx,
              className: 'carousel-slide'
            },
              React.createElement(ProductCard, { product, primaryColor })
            )
          )
        ),

        // Navigation Buttons
        products.length > 1 && React.createElement(React.Fragment, null,
          React.createElement('button', {
            onClick: prevSlide,
            className: 'carousel-nav-button prev',
            'aria-label': 'Previous product',
            style: { 
              opacity: currentIndex === 0 ? 0.5 : 1,
              cursor: currentIndex === 0 ? 'default' : 'pointer'
            }
          },
            React.createElement('svg', {
              className: 'w-5 h-5',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              strokeWidth: '3',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              React.createElement('path', { d: 'M15 18l-6-6 6-6' })
            )
          ),
          React.createElement('button', {
            onClick: nextSlide,
            className: 'carousel-nav-button next',
            'aria-label': 'Next product',
            style: { 
              opacity: currentIndex === products.length - 1 ? 0.5 : 1,
              cursor: currentIndex === products.length - 1 ? 'default' : 'pointer'
            }
          },
            React.createElement('svg', {
              className: 'w-5 h-5',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              strokeWidth: '3',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              React.createElement('path', { d: 'M9 18l6-6-6-6' })
            )
          )
        ),

        // Dots Navigation
        products.length > 1 && React.createElement('div', {
          className: 'carousel-dots',
          style: { color: primaryColor }
        },
          products.map((_, idx) =>
            React.createElement('button', {
              key: idx,
              onClick: () => goToSlide(idx),
              className: `carousel-dot ${idx === currentIndex ? 'active' : ''}`,
              'aria-label': `Go to product ${idx + 1}`,
              style: idx === currentIndex ? { background: primaryColor } : {}
            })
          )
        ),

        // Product Counter
        products.length > 1 && React.createElement('div', {
          className: 'text-center mt-2'
        },
          React.createElement('span', {
            className: 'text-gray-400 text-xs font-medium'
          }, `${currentIndex + 1} of ${products.length} products`)
        )
      );
    });

    // FIXED: Message Component with proper inline rendering
    const Message = React.memo(({ message, index, primaryColor, isMobile }) => {
      const products = useMemo(() => {
        return message.role === 'assistant' ? parseProducts(message.content) : [];
      }, [message.content, message.role]);
      
      const parsedContent = useMemo(() => {
        if (products.length === 0) {
          return { before: message.content, hasProducts: false, after: '' };
        }
        return parseMessageWithProducts(message.content);
      }, [message.content, products.length]);

      return React.createElement('div', {
        className: `flex gap-3 mb-4 animate-slide-up ${message.role === 'user' ? 'justify-end' : 'items-start'}`,
        style: { animationDelay: `${index * 0.05}s` }
      },
        message.role === 'assistant' && React.createElement('div', {
          className: 'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg',
          style: { 
            background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)`,
            border: `2px solid ${primaryColor}30`
          }
        },
          React.createElement('svg', {
            width: '18',
            height: '18',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: primaryColor,
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          },
            React.createElement('path', { d: 'M12 8V4H8' }),
            React.createElement('rect', { width: '16', height: '12', x: '4', y: '8', rx: '2' }),
            React.createElement('path', { d: 'M2 14h2M20 14h2M15 13v2M9 13v2' })
          )
        ),
        React.createElement('div', {
          className: `flex flex-col ${message.role === 'user' ? 'max-w-[80%]' : 'max-w-[90%]'}`
        },
          React.createElement('div', {
            className: `chat-bubble ${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'} px-4 py-3 shadow-md`,
            style: message.role === 'user' ? { 
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
              color: 'white',
              fontSize: '14px',
              lineHeight: '1.6'
            } : {
              background: 'rgba(31, 41, 55, 0.7)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              color: 'rgb(243, 244, 246)',
              fontSize: '14px',
              lineHeight: '1.6'
            }
          },
            // Text before products
            parsedContent.before && React.createElement('div', {
              style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
            }, parsedContent.before),
            
            // Products carousel inline
            parsedContent.hasProducts && products.length > 0 && React.createElement(ProductCarousel, {
              products,
              primaryColor
            }),
            
            // Text after products
            parsedContent.after && React.createElement('div', {
              style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
            }, parsedContent.after)
          )
        )
      );
    });

    // Typing Indicator
    const TypingIndicator = React.memo(({ primaryColor, agentName }) => (
      React.createElement('div', {
        className: 'flex gap-3 items-start mb-4 animate-fade-in'
      },
        React.createElement('div', {
          className: 'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg',
          style: { 
            background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}10)`,
            border: `2px solid ${primaryColor}30`
          }
        },
          React.createElement('svg', {
            width: '18',
            height: '18',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: primaryColor,
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          },
            React.createElement('path', { d: 'M12 8V4H8' }),
            React.createElement('rect', { width: '16', height: '12', x: '4', y: '8', rx: '2' })
          )
        ),
        React.createElement('div', {
          className: 'chat-bubble chat-bubble-assistant px-4 py-3 flex items-center gap-3 shadow-md',
          style: {
            background: 'rgba(31, 41, 55, 0.7)',
            border: '1px solid rgba(75, 85, 99, 0.5)'
          }
        },
          React.createElement('span', {
            className: 'text-gray-400 text-sm'
          }, `${agentName} is typing`),
          React.createElement('div', {
            className: 'flex gap-1 animate-typing'
          },
            React.createElement('span', {
              className: 'w-1.5 h-1.5 rounded-full',
              style: { background: primaryColor }
            }),
            React.createElement('span', {
              className: 'w-1.5 h-1.5 rounded-full',
              style: { background: primaryColor }
            }),
            React.createElement('span', {
              className: 'w-1.5 h-1.5 rounded-full',
              style: { background: primaryColor }
            })
          )
        )
      )
    ));

    const messagesList = useMemo(() => (
      messages.map((msg, idx) =>
        React.createElement(Message, { 
          key: msg.id, 
          message: msg, 
          index: idx,
          primaryColor: config.primaryColor,
          isMobile
        })
      )
    ), [messages, config.primaryColor, isMobile]);

    return React.createElement('div', {
      id: 'rokovo-widget-root',
      className: 'fixed bottom-6 right-6 z-[999999]',
      style: { fontFamily: 'Inter, system-ui, sans-serif' }
    },
      // Toggle Button
      React.createElement('button', {
        onClick: toggleChat,
        className: 'relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-50',
        style: {
          background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.primaryColor}cc 100%)`,
          boxShadow: `0 10px 40px -10px ${config.primaryColor}80, 0 4px 12px ${config.primaryColor}40`,
          borderRadius: '50%'
        },
        'aria-label': isOpen ? 'Close chat' : 'Open chat',
        'aria-expanded': isOpen
      },
        React.createElement('div', {
          className: 'relative w-full h-full flex items-center justify-center'
        },
          React.createElement('div', {
            className: 'absolute inset-0 flex items-center justify-center transition-all duration-300',
            style: {
              transform: isOpen ? 'rotate(90deg) scale(0)' : 'rotate(0) scale(1)',
              opacity: isOpen ? 0 : 1
            }
          },
            React.createElement('svg', {
              className: 'w-8 h-8 text-white',
              fill: 'currentColor',
              viewBox: '0 0 24 24'
            },
              React.createElement('path', {
                d: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z'
              })
            )
          ),
          React.createElement('div', {
            className: 'absolute inset-0 flex items-center justify-center transition-all duration-300',
            style: {
              transform: isOpen ? 'rotate(0) scale(1)' : 'rotate(-90deg) scale(0)',
              opacity: isOpen ? 1 : 0
            }
          },
            React.createElement('svg', {
              className: 'w-8 h-8 text-white',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              strokeWidth: '2.5',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              React.createElement('path', { d: 'M18 6L6 18M6 6l12 12' })
            )
          )
        )
      ),

      // Chat Window
      isOpen && React.createElement('div', {
        className: `absolute bottom-20 right-0 bg-gray-900 shadow-2xl border border-gray-800 flex flex-col overflow-hidden animate-slide-up ${isMobile ? 'mobile-fullscreen' : ''}`,
        style: isMobile ? {
          borderRadius: '0'
        } : {
          width: '420px',
          height: '680px',
          maxWidth: 'calc(100vw - 3rem)',
          maxHeight: 'calc(100vh - 140px)',
          backdropFilter: 'blur(20px)',
          background: 'linear-gradient(to bottom, rgb(17 24 39 / 0.98), rgb(0 0 0 / 0.98))',
          borderRadius: '24px'
        }
      },
        // Header
        React.createElement('div', {
          className: 'border-b border-gray-800 p-5 flex items-center gap-3',
          style: { 
            background: `linear-gradient(135deg, ${config.primaryColor}08 0%, transparent 100%)`
          }
        },
          React.createElement('div', {
            className: 'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
            style: { 
              background: config.primaryColor,
              boxShadow: `0 4px 16px ${config.primaryColor}50`
            }
          },
            React.createElement('svg', {
              className: 'w-6 h-6 text-white',
              fill: 'currentColor',
              viewBox: '0 0 24 24'
            },
              React.createElement('path', {
                d: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z'
              })
            )
          ),
          React.createElement('div', { className: 'flex-1 min-w-0' },
            React.createElement('h3', {
              className: 'text-white font-semibold text-base truncate'
            }, config.agentName),
            React.createElement('div', {
              className: 'flex items-center gap-2 mt-0.5'
            },
              React.createElement('div', {
                className: 'w-2 h-2 bg-green-500 rounded-full animate-pulse-slow'
              }),
              React.createElement('span', {
                className: 'text-gray-400 text-xs'
              }, 'Online')
            )
          ),
          !isMobile && React.createElement('button', {
            onClick: toggleChat,
            className: 'text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600',
            'aria-label': 'Close chat'
          },
            React.createElement('svg', {
              className: 'w-5 h-5',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              strokeWidth: '2',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              React.createElement('path', { d: 'M18 6L6 18M6 6l12 12' })
            )
          )
        ),

        // Messages
        React.createElement('div', {
          className: 'flex-1 overflow-y-auto p-5 scrollbar-thin',
          style: { minHeight: 0 }
        },
          isLoading ? 
            React.createElement('div', {
              className: 'flex flex-col items-center justify-center h-full text-gray-400'
            },
              React.createElement('div', {
                className: 'w-14 h-14 border-4 border-gray-700 rounded-full animate-spin mb-4',
                style: { 
                  borderTopColor: config.primaryColor,
                  borderRightColor: config.primaryColor
                }
              }),
              React.createElement('p', { className: 'text-sm font-medium' }, 'Connecting...')
            )
          : error ?
            React.createElement('div', {
              className: 'flex flex-col items-center justify-center h-full text-center px-8'
            },
              React.createElement('div', {
                className: 'w-16 h-16 bg-red-500 bg-opacity-20 rounded-full flex items-center justify-center mb-4'
              },
                React.createElement('svg', {
                  className: 'w-8 h-8 text-red-500',
                  fill: 'none',
                  stroke: 'currentColor',
                  viewBox: '0 0 24 24',
                  strokeWidth: '2'
                },
                  React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  })
                )
              ),
              React.createElement('p', {
                className: 'text-red-400 text-sm mb-4 font-medium'
              }, error),
              React.createElement('button', {
                onClick: initSession,
                className: 'px-6 py-3 rounded-xl text-white text-sm font-medium transition-all hover:shadow-lg active:scale-95',
                style: { 
                  background: config.primaryColor,
                  boxShadow: `0 4px 12px ${config.primaryColor}40`
                }
              }, 'Try Again')
            )
          :
            React.createElement('div', null,
              messagesList,
              isTyping && React.createElement(TypingIndicator, { 
                primaryColor: config.primaryColor,
                agentName: config.agentName
              }),
              React.createElement('div', { ref: messagesEndRef })
            )
        ),

        // Input
        React.createElement('div', {
          className: 'border-t border-gray-800 p-4',
          style: { background: 'rgb(17 24 39 / 0.9)' }
        },
          React.createElement('div', {
            className: 'flex gap-2'
          },
            React.createElement('input', {
              ref: inputRef,
              type: 'text',
              value: input,
              onChange: (e) => setInput(e.target.value),
              onKeyPress: (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              },
              placeholder: 'Type your message...',
              disabled: isLoading || !sessionId || error,
              className: 'flex-1 bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 focus:ring-2 focus:ring-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              style: { 
                fontSize: '14px',
                borderRadius: '14px'
              }
            }),
            React.createElement('button', {
              onClick: sendMessage,
              disabled: !input.trim() || isTyping || isLoading || !sessionId || error,
              className: 'text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg active:scale-95 flex items-center justify-center',
              style: { 
                background: config.primaryColor,
                minWidth: '54px',
                padding: '12px 16px',
                borderRadius: '14px',
                boxShadow: !input.trim() ? 'none' : `0 4px 12px ${config.primaryColor}40`
              }
            },
              React.createElement('svg', {
                className: 'w-5 h-5',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24',
                strokeWidth: '2.5',
                strokeLinecap: 'round',
                strokeLinejoin: 'round'
              },
                React.createElement('path', { d: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' })
              )
            )
          )
        ),

        // Footer
        React.createElement('div', {
          className: 'border-t border-gray-800 px-4 py-3 text-center',
          style: { background: 'rgb(0 0 0 / 0.5)' }
        },
          React.createElement('a', {
            href: 'https://rokovo.io',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'text-gray-500 text-xs hover:text-gray-400 transition-colors inline-flex items-center gap-1.5 font-medium',
            style: { textDecoration: 'none' }
          },
            'Powered by ',
            React.createElement('span', {
              className: 'font-semibold',
              style: { color: config.primaryColor }
            }, 'Rokovo')
          )
        )
      )
    );
  }

  // Initialize widget
  async function init() {
    const script = WIDGET_SCRIPT || document.querySelector('script[data-publishable-key]');
    
    if (!script) {
      console.error('Rokovo Widget: Script tag not found');
      return;
    }

    const config = {
      publishableKey: script.getAttribute('data-publishable-key'),
      businessName: script.getAttribute('data-business-name') || 'Your Business',
      agentName: script.getAttribute('data-agent-name') || 'AI Assistant',
      primaryColor: script.getAttribute('data-primary-color') || '#FF4800',
      apiBaseUrl: script.getAttribute('data-api-base-url') || 'https://api.rokovo.io'
    };

    if (!config.publishableKey) {
      console.error('Rokovo Widget: publishableKey is required');
      return;
    }

    console.log('🚀 Rokovo Widget: Initializing...', config);

    await loadDependencies();
    loadTailwind();
    injectStyles();

    await new Promise(resolve => setTimeout(resolve, 300));

    const container = document.createElement('div');
    container.id = `rokovo-widget-${config.publishableKey}`;
    document.body.appendChild(container);

    const root = window.ReactDOM.createRoot(container);
    root.render(window.React.createElement(RokovoWidget, { config }));
    
    console.log('✅ Rokovo Widget: Loaded successfully!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.RokovoWidget = { init };
})();
