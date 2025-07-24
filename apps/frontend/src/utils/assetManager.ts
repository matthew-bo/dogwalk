export interface SpriteSheet {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  cols: number;
  rows: number;
}

export interface AnimationFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Animation {
  name: string;
  frames: AnimationFrame[];
  frameRate: number;
  loop: boolean;
}

export interface DogBreed {
  id: string;
  name: string;
  displayName: string;
  spriteSheet: string;
  animations: {
    walk: Animation;
    run: Animation;
    idle: Animation;
    sniff: Animation;
    bolt: Animation;
  };
  color: string;
}

// Asset paths - in production these would be actual sprite files
export const ASSET_PATHS = {
  // Dog breed sprite sheets
  dogs: {
    golden_retriever: '/assets/sprites/dog_golden_walk.png',
    labrador: '/assets/sprites/dog_labrador_walk.png',
    husky: '/assets/sprites/dog_husky_walk.png',
    bulldog: '/assets/sprites/dog_bulldog_walk.png',
    beagle: '/assets/sprites/dog_beagle_walk.png',
  },
  // Background layers
  backgrounds: {
    park_bg_day: '/assets/backgrounds/park_bg_day.svg',
    park_trees: '/assets/backgrounds/park_trees.png',
    park_benches: '/assets/backgrounds/park_benches.png',
    park_path: '/assets/backgrounds/park_path.png',
  },
  // UI elements
  ui: {
    leash_normal: '/assets/ui/leash_normal.png',
    leash_slack: '/assets/ui/leash_slack.png',
    treat_bush: '/assets/ui/treat_bush.png',
    tennis_ball: '/assets/ui/tennis_ball.png',
    squirrel: '/assets/ui/squirrel.png',
  },
  // Effects
  effects: {
    confetti: '/assets/effects/confetti.png',
    coins: '/assets/effects/coins.png',
    sparkles: '/assets/effects/sparkles.png',
    speed_lines: '/assets/effects/speed_lines.png',
  }
};

// Dog breed configurations
export const DOG_BREEDS: DogBreed[] = [
  {
    id: 'golden_retriever',
    name: 'golden_retriever',
    displayName: 'Golden Retriever',
    spriteSheet: ASSET_PATHS.dogs.golden_retriever,
    color: '#D4A574',
    animations: {
      walk: {
        name: 'walk',
        frames: Array.from({length: 24}, (_, i) => ({
          x: (i % 8) * 64,
          y: Math.floor(i / 8) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 12,
        loop: true
      },
      run: {
        name: 'run',
        frames: Array.from({length: 16}, (_, i) => ({
          x: (i % 8) * 64,
          y: (Math.floor(i / 8) + 3) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 20,
        loop: true
      },
      idle: {
        name: 'idle',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 5 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 4,
        loop: true
      },
      sniff: {
        name: 'sniff',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 6 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 8,
        loop: false
      },
      bolt: {
        name: 'bolt',
        frames: Array.from({length: 12}, (_, i) => ({
          x: (i % 6) * 64,
          y: (Math.floor(i / 6) + 7) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 24,
        loop: false
      }
    }
  },
  {
    id: 'labrador',
    name: 'labrador',
    displayName: 'Labrador',
    spriteSheet: ASSET_PATHS.dogs.labrador,
    color: '#8B4513',
    animations: {
      walk: {
        name: 'walk',
        frames: Array.from({length: 24}, (_, i) => ({
          x: (i % 8) * 64,
          y: Math.floor(i / 8) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 12,
        loop: true
      },
      run: {
        name: 'run',
        frames: Array.from({length: 16}, (_, i) => ({
          x: (i % 8) * 64,
          y: (Math.floor(i / 8) + 3) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 20,
        loop: true
      },
      idle: {
        name: 'idle',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 5 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 4,
        loop: true
      },
      sniff: {
        name: 'sniff',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 6 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 8,
        loop: false
      },
      bolt: {
        name: 'bolt',
        frames: Array.from({length: 12}, (_, i) => ({
          x: (i % 6) * 64,
          y: (Math.floor(i / 6) + 7) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 24,
        loop: false
      }
    }
  },
  {
    id: 'husky',
    name: 'husky',
    displayName: 'Siberian Husky',
    spriteSheet: ASSET_PATHS.dogs.husky,
    color: '#708090',
    animations: {
      walk: {
        name: 'walk',
        frames: Array.from({length: 24}, (_, i) => ({
          x: (i % 8) * 64,
          y: Math.floor(i / 8) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 12,
        loop: true
      },
      run: {
        name: 'run',
        frames: Array.from({length: 16}, (_, i) => ({
          x: (i % 8) * 64,
          y: (Math.floor(i / 8) + 3) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 20,
        loop: true
      },
      idle: {
        name: 'idle',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 5 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 4,
        loop: true
      },
      sniff: {
        name: 'sniff',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 6 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 8,
        loop: false
      },
      bolt: {
        name: 'bolt',
        frames: Array.from({length: 12}, (_, i) => ({
          x: (i % 6) * 64,
          y: (Math.floor(i / 6) + 7) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 24,
        loop: false
      }
    }
  },
  {
    id: 'bulldog',
    name: 'bulldog',
    displayName: 'French Bulldog',
    spriteSheet: ASSET_PATHS.dogs.bulldog,
    color: '#D2B48C',
    animations: {
      walk: {
        name: 'walk',
        frames: Array.from({length: 24}, (_, i) => ({
          x: (i % 8) * 64,
          y: Math.floor(i / 8) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 10, // Slightly slower for bulldog character
        loop: true
      },
      run: {
        name: 'run',
        frames: Array.from({length: 16}, (_, i) => ({
          x: (i % 8) * 64,
          y: (Math.floor(i / 8) + 3) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 16, // Slightly slower for bulldog character
        loop: true
      },
      idle: {
        name: 'idle',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 5 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 4,
        loop: true
      },
      sniff: {
        name: 'sniff',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 6 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 8,
        loop: false
      },
      bolt: {
        name: 'bolt',
        frames: Array.from({length: 12}, (_, i) => ({
          x: (i % 6) * 64,
          y: (Math.floor(i / 6) + 7) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 20, // Slightly slower for bulldog character
        loop: false
      }
    }
  },
  {
    id: 'beagle',
    name: 'beagle',
    displayName: 'Beagle',
    spriteSheet: ASSET_PATHS.dogs.beagle,
    color: '#DEB887',
    animations: {
      walk: {
        name: 'walk',
        frames: Array.from({length: 24}, (_, i) => ({
          x: (i % 8) * 64,
          y: Math.floor(i / 8) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 14, // Slightly faster for energetic beagle
        loop: true
      },
      run: {
        name: 'run',
        frames: Array.from({length: 16}, (_, i) => ({
          x: (i % 8) * 64,
          y: (Math.floor(i / 8) + 3) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 22, // Slightly faster for energetic beagle
        loop: true
      },
      idle: {
        name: 'idle',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 5 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 6, // Slightly faster for energetic beagle
        loop: true
      },
      sniff: {
        name: 'sniff',
        frames: Array.from({length: 8}, (_, i) => ({
          x: i * 64,
          y: 6 * 64,
          width: 64,
          height: 64
        })),
        frameRate: 10, // Faster sniffing for beagle (known for their nose)
        loop: false
      },
      bolt: {
        name: 'bolt',
        frames: Array.from({length: 12}, (_, i) => ({
          x: (i % 6) * 64,
          y: (Math.floor(i / 6) + 7) * 64,
          width: 64,
          height: 64
        })),
        frameRate: 26, // Faster for energetic beagle
        loop: false
      }
    }
  }
];

class AssetManager {
  private loadedImages = new Map<string, HTMLImageElement>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();

  async loadImage(path: string): Promise<HTMLImageElement> {
    // Return cached image if already loaded
    if (this.loadedImages.has(path)) {
      return this.loadedImages.get(path)!;
    }

    // Return existing promise if currently loading
    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path)!;
    }

    // Start loading new image
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(path, img);
        this.loadingPromises.delete(path);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(path);
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });

    this.loadingPromises.set(path, promise);
    return promise;
  }

  async preloadAssets(paths: string[]): Promise<HTMLImageElement[]> {
    const promises = paths.map(path => this.loadImage(path));
    return Promise.all(promises);
  }

  getDogBreed(id: string): DogBreed | undefined {
    return DOG_BREEDS.find(breed => breed.id === id);
  }

  getAllDogBreeds(): DogBreed[] {
    return DOG_BREEDS;
  }

  // For demo/fallback when actual sprites aren't available
  createPlaceholderCanvas(width: number, height: number, color: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    // Draw simple dog shape
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Add simple features
    ctx.fillStyle = '#000';
    ctx.fillRect(width * 0.1, height * 0.2, width * 0.1, height * 0.1); // Eye
    ctx.fillRect(width * 0.15, height * 0.4, width * 0.2, height * 0.1); // Nose
    
    return canvas;
  }

  // Enhanced placeholder system with SVG graphics
  async loadPlaceholderAsset(type: 'dog' | 'background' | 'ui', options: any): Promise<HTMLImageElement> {
    const { generateDogPlaceholder, generateParkBackground, generateUIElement } = await import('./placeholderAssets');
    
    let dataUrl = '';
    const cacheKey = `${type}-${JSON.stringify(options)}`;
    
    switch (type) {
      case 'dog':
        dataUrl = generateDogPlaceholder(options.breed, options.color);
        break;
      case 'background':
        dataUrl = generateParkBackground();
        break;
      case 'ui':
        dataUrl = generateUIElement(options.element);
        break;
    }
    
    // Cache and convert to image
    if (this.loadedImages.has(cacheKey)) {
      return this.loadedImages.get(cacheKey)!;
    }
    
    const img = new Image();
    img.src = dataUrl;
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        this.loadedImages.set(cacheKey, img);
        resolve(img);
      };
      img.onerror = reject;
    });
  }

  // Get dog sprite with fallback to placeholder
  async getDogSprite(breedId: string): Promise<HTMLImageElement> {
    const breed = this.getDogBreed(breedId);
    if (!breed) throw new Error(`Unknown breed: ${breedId}`);
    
    try {
      // Try to load actual sprite
      return await this.loadImage(breed.spriteSheet);
    } catch (error) {
      // Fallback to placeholder
      return await this.loadPlaceholderAsset('dog', { 
        breed: breed.name, 
        color: breed.color 
      });
    }
  }
}

export const assetManager = new AssetManager(); 