import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface CardSettings {
	id: string;
	name: string;
	enabled: boolean;
	order: number;
}

const defaultCards: CardSettings[] = [
	{ id: 'system-info', name: 'System Information', enabled: true, order: 0 },
	{ id: 'services-list', name: 'Services & Processes', enabled: true, order: 1 },
	{ id: 'network-status', name: 'Network Status', enabled: true, order: 2 },
	{ id: 'file-browser', name: 'File Browser', enabled: true, order: 3 }
];

function createSettings() {
	// Load from localStorage if available
	const storedSettings = browser ? localStorage.getItem('dashboard-settings') : null;
	const initialSettings = storedSettings ? JSON.parse(storedSettings) : defaultCards;

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
