import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, X, Loader2 } from 'lucide-react';

export interface SwipeCardData {
  id: string;
  image?: string;
  title: string;
  description?: string;
  metadata?: any;
}

export interface SwipeCardProps {
  cards: SwipeCardData[];
  onSwipeLeft?: string;  // API endpoint
  onSwipeRight?: string; // API endpoint
  showControls?: boolean; // Show Like/Dislike buttons
  className?: string;
}

interface CardState {
  loading: boolean;
  error?: string;
}

const SWIPE_THRESHOLD = 150;
const ROTATION_RANGE = 15;
const CARD_STACK_VISIBLE = 3;

const SwipeCard: React.FC<SwipeCardProps> = ({
  cards = [],
  onSwipeLeft,
  onSwipeRight,
  showControls = true,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for drag
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-ROTATION_RANGE, 0, ROTATION_RANGE]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Reset motion values when card changes
  useEffect(() => {
    x.set(0);
  }, [currentIndex, x]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (cardStates[cards[currentIndex]?.id]?.loading) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleSwipe('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSwipe('right');
          break;
        case 'Enter':
          e.preventDefault();
          handleSwipe('right');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards, cardStates]);

  // Template variable replacement utility
  const replaceTemplateVariables = useCallback((template: string, card: SwipeCardData): string => {
    if (!template) return template;

    return template
      .replace(/\{\{id\}\}/g, card.id)
      .replace(/\{\{title\}\}/g, card.title)
      .replace(/\{\{description\}\}/g, card.description || '')
      .replace(/\{\{metadata\}\}/g, JSON.stringify(card.metadata || {}));
  }, []);

  // API call function
  const callAPI = async (endpoint: string, card: SwipeCardData): Promise<void> => {
    const processedEndpoint = replaceTemplateVariables(endpoint, card);

    try {
      const response = await fetch(processedEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: card.id,
          title: card.title,
          description: card.description,
          metadata: card.metadata,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API call successful:', data);
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  };

  // Handle swipe action
  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    // Prevent multiple simultaneous swipes
    if (cardStates[currentCard.id]?.loading) return;

    // Set loading state
    setCardStates(prev => ({
      ...prev,
      [currentCard.id]: { loading: true },
    }));

    // Trigger animation
    setExitDirection(direction);

    // Determine which API endpoint to call
    const endpoint = direction === 'left' ? onSwipeLeft : onSwipeRight;

    try {
      // Call API if endpoint is provided
      if (endpoint) {
        await callAPI(endpoint, currentCard);
      }

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Move to next card
      setCurrentIndex(prev => prev + 1);
      setExitDirection(null);

      // Clear loading state
      setCardStates(prev => ({
        ...prev,
        [currentCard.id]: { loading: false },
      }));
    } catch (error) {
      // Handle error
      setCardStates(prev => ({
        ...prev,
        [currentCard.id]: {
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));

      // Reset animation
      setExitDirection(null);
      x.set(0);
    }
  }, [cards, currentIndex, onSwipeLeft, onSwipeRight, cardStates, x, callAPI]);

  // Handle drag end
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Determine if swipe threshold is met
    if (Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 500) {
      const direction = offset > 0 ? 'right' : 'left';
      handleSwipe(direction);
    } else {
      // Snap back to center
      x.set(0);
    }
  }, [handleSwipe, x]);

  // Manual button handlers
  const handleDislike = useCallback(() => {
    handleSwipe('left');
  }, [handleSwipe]);

  const handleLike = useCallback(() => {
    handleSwipe('right');
  }, [handleSwipe]);

  // Get visible cards for stack effect
  const getVisibleCards = () => {
    const visibleCards: SwipeCardData[] = [];
    for (let i = currentIndex; i < Math.min(currentIndex + CARD_STACK_VISIBLE, cards.length); i++) {
      visibleCards.push(cards[i]);
    }
    return visibleCards;
  };

  // Calculate stack card styles
  const getStackCardStyle = (index: number) => {
    const stackIndex = index - currentIndex;
    const scale = 1 - (stackIndex * 0.05);
    const yOffset = stackIndex * 10;
    const zIndex = CARD_STACK_VISIBLE - stackIndex;

    return {
      scale,
      y: yOffset,
      zIndex,
      opacity: 1 - (stackIndex * 0.2),
    };
  };

  // Empty state
  if (cards.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="text-center py-8">
          <Heart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Cards Available</h3>
          <p className="text-gray-500">Add cards to start swiping</p>
        </div>
      </div>
    );
  }

  // All cards swiped
  if (currentIndex >= cards.length) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="text-center py-8">
          <Heart className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Done!</h3>
          <p className="text-gray-500">You've reviewed all cards</p>
        </div>
      </div>
    );
  }

  const visibleCards = getVisibleCards();
  const currentCard = cards[currentIndex];
  const isLoading = cardStates[currentCard?.id]?.loading;
  const error = cardStates[currentCard?.id]?.error;

  return (
    <div className={`relative ${className}`}>
      {/* Card Stack Container */}
      <div
        className="relative w-full max-w-sm mx-auto"
        style={{ height: '500px' }}
        role="region"
        aria-label="Swipeable cards"
      >
        {/* Stack of cards */}
        {visibleCards.map((card, index) => {
          const actualIndex = currentIndex + index;
          const isTopCard = actualIndex === currentIndex;
          const stackStyle = getStackCardStyle(actualIndex);

          if (isTopCard) {
            // Top card with drag interaction
            return (
              <motion.div
                key={card.id}
                ref={cardRef}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                style={{
                  x,
                  rotate,
                  opacity,
                  zIndex: stackStyle.zIndex,
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                animate={exitDirection ? {
                  x: exitDirection === 'left' ? -400 : 400,
                  opacity: 0,
                  transition: { duration: 0.3 },
                } : {}}
                tabIndex={0}
                role="article"
                aria-label={`Card ${actualIndex + 1} of ${cards.length}: ${card.title}`}
              >
                <CardContent card={card} isLoading={isLoading} error={error} x={x} />
              </motion.div>
            );
          }

          // Background stack cards
          return (
            <motion.div
              key={card.id}
              className="absolute inset-0 pointer-events-none"
              initial={stackStyle}
              animate={stackStyle}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <CardContent card={card} isStack />
            </motion.div>
          );
        })}
      </div>

      {/* Manual Control Buttons */}
      {showControls && (
        <div className="flex justify-center items-center gap-6 mt-8">
          <button
            onClick={handleDislike}
            disabled={isLoading}
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-red-500 text-red-500 shadow-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95"
            aria-label="Dislike (Left Arrow)"
          >
            <X className="w-8 h-8" />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-full">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            )}
          </button>

          <button
            onClick={handleLike}
            disabled={isLoading}
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-green-500 text-green-500 shadow-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95"
            aria-label="Like (Right Arrow or Enter)"
          >
            <Heart className="w-8 h-8" />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-full">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            )}
          </button>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          {currentIndex + 1} / {cards.length}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Keyboard Hints */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          Use arrow keys (← →) or swipe to navigate
        </p>
      </div>
    </div>
  );
};

interface CardContentProps {
  card: SwipeCardData;
  isLoading?: boolean;
  error?: string;
  isStack?: boolean;
  x?: any;
}

const CardContent: React.FC<CardContentProps> = ({ card, isLoading, error, isStack, x }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Visual feedback during drag
  const likeOpacity = x ? useTransform(x, [0, 100], [0, 1]) : 0;
  const dislikeOpacity = x ? useTransform(x, [-100, 0], [1, 0]) : 0;

  return (
    <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Image */}
      {card.image && (
        <div className="relative h-3/5 bg-gray-100">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
            </div>
          )}

          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl">📷</span>
                </div>
                <p className="text-sm text-gray-500">Image not available</p>
              </div>
            </div>
          ) : (
            <img
              src={card.image}
              alt={card.title}
              className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          )}

          {/* Drag feedback overlays */}
          {!isStack && x && (
            <>
              {/* Like overlay */}
              <motion.div
                className="absolute inset-0 bg-green-500/30 flex items-center justify-center"
                style={{ opacity: likeOpacity }}
              >
                <div className="bg-green-500 text-white px-8 py-4 rounded-lg text-2xl font-bold rotate-12 border-4 border-white">
                  LIKE
                </div>
              </motion.div>

              {/* Dislike overlay */}
              <motion.div
                className="absolute inset-0 bg-red-500/30 flex items-center justify-center"
                style={{ opacity: dislikeOpacity }}
              >
                <div className="bg-red-500 text-white px-8 py-4 rounded-lg text-2xl font-bold -rotate-12 border-4 border-white">
                  NOPE
                </div>
              </motion.div>
            </>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-white" />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={`${card.image ? 'h-2/5' : 'h-full'} p-6 flex flex-col justify-between`}>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2 line-clamp-2">
            {card.title}
          </h3>
          {card.description && (
            <p className="text-gray-600 line-clamp-3">
              {card.description}
            </p>
          )}
        </div>

        {/* Metadata badge */}
        {card.metadata && Object.keys(card.metadata).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(card.metadata).slice(0, 3).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {String(value)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SwipeCard;
