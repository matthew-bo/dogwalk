import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { DogBreed, assetManager } from '../../utils/assetManager';

interface DogSelectionCarouselProps {
  onDogSelected: (dogId: string) => void;
  selectedDogId?: string;
}

const DogSelectionCarousel: React.FC<DogSelectionCarouselProps> = ({
  onDogSelected,
  selectedDogId
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breeds] = useState<DogBreed[]>(assetManager.getAllDogBreeds());
  const [animationFrame, setAnimationFrame] = useState(0);
  const animationRef = useRef<number>();

  // Simple walking animation for preview
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => (prev + 1) % 24); // 24 frame walk cycle
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const currentBreed = breeds[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev - 1 + breeds.length) % breeds.length);
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % breeds.length);
  };

  const selectCurrentDog = () => {
    onDogSelected(currentBreed.id);
  };

  // Get breed-specific characteristics
  const getBreedCharacteristics = (breed: DogBreed) => {
    switch (breed.id) {
      case 'golden_retriever':
        return {
          emoji: '🦮',
          earStyle: 'long',
          furPattern: 'fluffy',
          size: 'large',
          specialFeature: '✨' // Golden sparkle
        };
      case 'labrador':
        return {
          emoji: '🐕‍🦺',
          earStyle: 'medium',
          furPattern: 'smooth',
          size: 'large',
          specialFeature: '💪' // Strong/athletic
        };
      case 'husky':
        return {
          emoji: '🐺',
          earStyle: 'pointed',
          furPattern: 'thick',
          size: 'large',
          specialFeature: '❄️' // Cold weather
        };
      case 'bulldog':
        return {
          emoji: '🐶',
          earStyle: 'small',
          furPattern: 'short',
          size: 'compact',
          specialFeature: '💨' // Breathing/snorting
        };
      case 'beagle':
        return {
          emoji: '🐕',
          earStyle: 'floppy',
          furPattern: 'short',
          size: 'medium',
          specialFeature: '👃' // Great nose/tracking
        };
      default:
        return {
          emoji: '🐕',
          earStyle: 'medium',
          furPattern: 'smooth',
          size: 'medium',
          specialFeature: '🐾'
        };
    }
  };

  // Create unique visual representation for each breed
  const renderDogPreview = (breed: DogBreed, isCenter: boolean = false) => {
    const walkOffset = Math.sin((animationFrame * 0.3)) * 2;
    const bounceOffset = Math.abs(Math.sin(animationFrame * 0.5)) * 3;
    const characteristics = getBreedCharacteristics(breed);
    
    return (
      <motion.div
        className={`relative transition-all duration-300 ${
          isCenter ? 'scale-110' : 'scale-90 opacity-70'
        }`}
        style={{
          transform: isCenter 
            ? `translateY(${bounceOffset - 3}px) translateX(${walkOffset}px)` 
            : 'none'
        }}
      >
        {/* Enhanced breed-specific visual */}
        <div 
          className={`relative rounded-full flex items-center justify-center shadow-lg border-4 border-white overflow-hidden ${
            characteristics.size === 'large' ? 'w-24 h-24' :
            characteristics.size === 'compact' ? 'w-20 h-16' :
            'w-22 h-22'
          }`}
          style={{ 
            backgroundColor: breed.color,
            borderRadius: characteristics.size === 'compact' ? '50% 50% 40% 40%' : '50%'
          }}
        >
          {/* Fur pattern overlay */}
          <div 
            className={`absolute inset-1 rounded-full ${
              characteristics.furPattern === 'fluffy' ? 'bg-gradient-to-br from-white to-transparent opacity-30' :
              characteristics.furPattern === 'thick' ? 'bg-gradient-to-t from-gray-600 to-transparent opacity-20' :
              ''
            }`} 
          />
          
          {/* Main breed emoji */}
          <div className={`${
            characteristics.size === 'large' ? 'text-5xl' :
            characteristics.size === 'compact' ? 'text-3xl' :
            'text-4xl'
          }`}>
            {characteristics.emoji}
          </div>
          
          {/* Breed-specific ears */}
          {characteristics.earStyle === 'long' && (
            <>
              <div className="absolute -left-2 top-2 w-4 h-8 rounded-full opacity-80" 
                   style={{ backgroundColor: breed.color, transform: `rotate(-20deg)` }} />
              <div className="absolute -right-2 top-2 w-4 h-8 rounded-full opacity-80" 
                   style={{ backgroundColor: breed.color, transform: `rotate(20deg)` }} />
            </>
          )}
          
          {characteristics.earStyle === 'pointed' && (
            <>
              <div className="absolute -left-1 top-0 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent opacity-80" 
                   style={{ borderBottomColor: breed.color }} />
              <div className="absolute -right-1 top-0 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent opacity-80" 
                   style={{ borderBottomColor: breed.color }} />
            </>
          )}
          
          {characteristics.earStyle === 'floppy' && (
            <>
              <div className="absolute -left-3 top-4 w-5 h-6 rounded-full opacity-80" 
                   style={{ backgroundColor: breed.color, transform: `rotate(-45deg)` }} />
              <div className="absolute -right-3 top-4 w-5 h-6 rounded-full opacity-80" 
                   style={{ backgroundColor: breed.color, transform: `rotate(45deg)` }} />
            </>
          )}
        </div>
        
        {/* Breed-specific special feature */}
        <motion.div
          className="absolute -top-1 -right-1 text-lg"
          animate={{
            scale: isCenter ? [1, 1.2, 1] : 1,
            rotate: isCenter ? [0, 10, -10, 0] : 0
          }}
          transition={{
            duration: 1.5,
            repeat: isCenter ? Infinity : 0,
            ease: "easeInOut"
          }}
        >
          {characteristics.specialFeature}
        </motion.div>
        
        {/* Animated tail wagging */}
        {isCenter && (
          <motion.div
            className="absolute -right-1 bottom-2 text-xl origin-left"
            animate={{
              rotate: [0, 20, -20, 0]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            🐾
          </motion.div>
        )}
        
        {/* Selection indicator */}
        {isCenter && selectedDogId === breed.id && (
          <motion.div
            className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
          >
            <Check size={16} className="text-white" />
          </motion.div>
        )}
        
        {/* Breed name label */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-white bg-opacity-90 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 shadow-md">
            {breed.displayName}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="rounded-lg p-4">
      <div className="text-center mb-4">
        <p className="text-gray-300 text-sm">
          Select your companion (visual only - all breeds play the same)
        </p>
      </div>

      {/* Carousel Container */}
      <div className="relative flex items-center justify-center space-x-6 mb-8 py-2">
        {/* Left Arrow */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToPrevious}
          className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-gray-200 hover:border-blue-300"
        >
          <ChevronLeft size={24} className="text-gray-700" />
        </motion.button>

        {/* Dog Preview Area */}
        <div className="flex items-center space-x-4">
          {/* Previous Dog (smaller) */}
          <div className="opacity-50">
            {renderDogPreview(breeds[(currentIndex - 1 + breeds.length) % breeds.length])}
          </div>

          {/* Current Dog (center, larger) */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderDogPreview(currentBreed, true)}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next Dog (smaller) */}
          <div className="opacity-50">
            {renderDogPreview(breeds[(currentIndex + 1) % breeds.length])}
          </div>
        </div>

        {/* Right Arrow */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToNext}
          className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-gray-200 hover:border-blue-300"
        >
          <ChevronRight size={24} className="text-gray-700" />
        </motion.button>
      </div>

      {/* Simplified Dog Name */}
      <div className="text-center mb-3">
        <AnimatePresence mode="wait">
          <motion.h3
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-bold text-white flex items-center justify-center"
          >
            {getBreedCharacteristics(currentBreed).emoji} {currentBreed.displayName} {getBreedCharacteristics(currentBreed).specialFeature}
          </motion.h3>
        </AnimatePresence>
      </div>

      {/* Breed Dots Indicator */}
      <div className="flex justify-center space-x-2 mb-4">
        {breeds.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentIndex 
                ? 'bg-blue-400 scale-125 shadow-lg shadow-blue-400/50' 
                : 'bg-gray-500 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>

      {/* Selection Button */}
      <div className="text-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={selectCurrentDog}
          className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
            selectedDogId === currentBreed.id
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          }`}
        >
          <div className="flex items-center space-x-2">
            {selectedDogId === currentBreed.id ? (
              <>
                <Check size={20} />
                <span>Selected!</span>
              </>
            ) : (
              <>
                <span>🐕</span>
                <span>Choose {currentBreed.displayName}</span>
              </>
            )}
          </div>
        </motion.button>
      </div>


    </div>
  );
};

export default DogSelectionCarousel; 