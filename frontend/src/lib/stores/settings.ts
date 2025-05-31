import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CardSettings {
	id: string;
	name: string;
	enabled: boolean;
	order: number;
	size: 'small' | 'medium' | 'large' | 'full';
	position: { x: number; y: number };
	dimensions: { width: number; height: number };
}

const defaultCards: CardSettings[] = [
	{ 
		id: 'system-info', 
		name: 'System Information', 
		enabled: true, 
		order: 0, 
		size: 'medium',
		position: { x: 50, y: 120 },
		dimensions: { width: 400, height: 300 }
	},
	{ 
		id: 'services-list', 
		name: 'Services & Processes', 
		enabled: true, 
		order: 1, 
		size: 'large',
		position: { x: 500, y: 120 },
		dimensions: { width: 500, height: 400 }
	},
	{ 
		id: 'network-status', 
		name: 'Network Status', 
		enabled: true, 
		order: 2, 
		size: 'small',
		position: { x: 50, y: 450 },
		dimensions: { width: 350, height: 250 }
	},
	{ 
		id: 'file-browser', 
		name: 'File Browser', 
		enabled: true, 
		order: 3, 
		size: 'medium',
		position: { x: 1050, y: 120 },
		dimensions: { width: 450, height: 300 }
	}
];

function createSettings() {
	// Load from localStorage if available
	const storedSettings = browser ? localStorage.getItem('dashboard-settings') : null;
	
	let initialSettings: CardSettings[];
	if (storedSettings) {
		try {
			const parsed = JSON.parse(storedSettings);
			// Ensure each stored card has all required properties
			initialSettings = defaultCards.map(defaultCard => {
				const storedCard = parsed.find((card: any) => card.id === defaultCard.id);
				return storedCard ? {
					...defaultCard,
					...storedCard,
					// Ensure these properties exist
					position: storedCard.position || defaultCard.position,
					dimensions: storedCard.dimensions || defaultCard.dimensions,
					size: storedCard.size || defaultCard.size
				} : defaultCard;
			});
		} catch (e) {
			console.warn('Failed to parse stored settings, using defaults:', e);
			initialSettings = defaultCards;
		}
	} else {
		initialSettings = defaultCards;
	}

	const { subscribe, set, update } = writable<CardSettings[]>(initialSettings);

	return {
		subscribe,
		updateCard: (id: string, updates: Partial<CardSettings>) => {
			update(cards => {
				const cardIndex = cards.findIndex(card => card.id === id);
				if (cardIndex !== -1) {
					cards[cardIndex] = { ...cards[cardIndex], ...updates };
				}
				// Save to localStorage
				if (browser) {
					localStorage.setItem('dashboard-settings', JSON.stringify(cards));
				}
				return cards;
			});
		},
		reorderCards: (newOrder: CardSettings[]) => {
			set(newOrder);
			// Save to localStorage
			if (browser) {
				localStorage.setItem('dashboard-settings', JSON.stringify(newOrder));
			}
		},
		reset: () => {
			set(defaultCards);
			if (browser) {
				localStorage.setItem('dashboard-settings', JSON.stringify(defaultCards));
			}
		}
	};
}

export const cardSettings = createSettings();
