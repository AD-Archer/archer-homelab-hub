/*
 * ============================================================================
 * HOMELAB DASHBOARD - SETTINGS STORE
 * ============================================================================
 * 
 * This file manages all dashboard configuration settings including:
 * - Layout modes (Grid vs Freeform)
 * - Card positioning, sizing, and state
 * - Grid system configuration with Lego-like snapping
 * - Persistent storage via localStorage
 * 
 * ARCHITECTURE:
 * - Grid Mode: Uses CSS Grid for structured layout with snap-to-grid behavior
 * - Freeform Mode: Allows absolute positioning with optional magnetic snapping
 * - Each card has both grid coordinates AND absolute positioning data
 * - Settings are automatically persisted and restored on page load
 * 
 * GRID SYSTEM:
 * - Default 6x4 grid (configurable)
 * - Cards can span multiple rows/columns (like Lego blocks)
 * - Grid positions use 0-based indexing
 * - Automatic space filling and expansion/contraction
 * 
 * MAINTAINER NOTES:
 * - Always update both position types when moving cards
 * - Grid positions are calculated automatically from absolute positions
 * - Default card data is used as fallback when localStorage is empty
 * - Store updates trigger reactive UI changes across all components
 * ============================================================================
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface CardSettings {
	id: string;
	name: string;
	enabled: boolean;
	order: number;
	size: 'small' | 'medium' | 'large' | 'full';
	position: { x: number; y: number };
	dimensions: { width: number; height: number };
	gridPosition?: { row: number; col: number; rowSpan: number; colSpan: number };
	// Lego-like expansion system
	canExpandUp?: boolean;
	canExpandDown?: boolean;
	canExpandLeft?: boolean;
	canExpandRight?: boolean;
	isSnappedToGrid?: boolean;
}

export interface DashboardSettings {
	layoutMode: 'grid' | 'freeform';
	gridSize: { cols: number; rows: number };
	cards: CardSettings[];
	// Grid system configuration
	snapToGrid?: boolean;
	gridCellSize?: { width: number; height: number };
	magneticSnapping?: boolean;
	snapThreshold?: number; // pixels
}

const defaultCards: CardSettings[] = [
	{ 
		id: 'system-info', 
		name: 'System Information', 
		enabled: true, 
		order: 0, 
		size: 'medium',
		position: { x: 50, y: 120 },
		dimensions: { width: 400, height: 300 },
		gridPosition: { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
		canExpandUp: false,
		canExpandDown: true,
		canExpandLeft: false,
		canExpandRight: true,
		isSnappedToGrid: true
	},
	{ 
		id: 'services-list', 
		name: 'Services & Processes', 
		enabled: true, 
		order: 1, 
		size: 'large',
		position: { x: 500, y: 120 },
		dimensions: { width: 500, height: 400 },
		gridPosition: { row: 0, col: 2, rowSpan: 2, colSpan: 3 },
		canExpandUp: false,
		canExpandDown: true,
		canExpandLeft: true,
		canExpandRight: true,
		isSnappedToGrid: true
	},
	{ 
		id: 'network-status', 
		name: 'Network Status', 
		enabled: true, 
		order: 2, 
		size: 'small',
		position: { x: 50, y: 450 },
		dimensions: { width: 350, height: 250 },
		gridPosition: { row: 2, col: 0, rowSpan: 1, colSpan: 2 },
		canExpandUp: true,
		canExpandDown: true,
		canExpandLeft: false,
		canExpandRight: true,
		isSnappedToGrid: true
	},
	{ 
		id: 'file-browser', 
		name: 'File Browser', 
		enabled: true, 
		order: 3, 
		size: 'medium',
		position: { x: 1050, y: 120 },
		dimensions: { width: 450, height: 300 },
		gridPosition: { row: 2, col: 2, rowSpan: 2, colSpan: 2 },
		canExpandUp: true,
		canExpandDown: false,
		canExpandLeft: true,
		canExpandRight: false,
		isSnappedToGrid: true
	}
];

const defaultSettings: DashboardSettings = {
	layoutMode: 'grid',
	gridSize: { cols: 6, rows: 4 },
	cards: defaultCards,
	snapToGrid: true,
	gridCellSize: { width: 200, height: 150 },
	magneticSnapping: true,
	snapThreshold: 20
};

// Helper functions for grid-to-absolute coordinate conversion
function gridToAbsolutePosition(gridPos: { row: number; col: number; rowSpan: number; colSpan: number }, settings: DashboardSettings): { x: number; y: number } {
	const cellSize = settings.gridCellSize || { width: 200, height: 150 };
	const headerHeight = 88; // Account for page header
	
	return {
		x: gridPos.col * cellSize.width,
		y: headerHeight + (gridPos.row * cellSize.height)
	};
}

function gridToDimensions(gridPos: { row: number; col: number; rowSpan: number; colSpan: number }, settings: DashboardSettings): { width: number; height: number } {
	const cellSize = settings.gridCellSize || { width: 200, height: 150 };
	
	return {
		width: gridPos.colSpan * cellSize.width,
		height: gridPos.rowSpan * cellSize.height
	};
}

function absoluteToGridPosition(position: { x: number; y: number }, settings: DashboardSettings): { row: number; col: number } {
	const cellSize = settings.gridCellSize || { width: 200, height: 150 };
	const headerHeight = 88;
	
	return {
		col: Math.round(position.x / cellSize.width),
		row: Math.round((position.y - headerHeight) / cellSize.height)
	};
}

function createSettings() {
	// Load from localStorage if available
	const storedData = browser ? localStorage.getItem('dashboard-settings') : null;
	
	let initialSettings: DashboardSettings;
	if (storedData) {
		try {
			const parsed = JSON.parse(storedData);
			// Handle legacy format (array of cards) or new format (full settings object)
			if (Array.isArray(parsed)) {
				// Legacy format - convert to new format
				const cards = defaultSettings.cards.map(defaultCard => {
					const storedCard = parsed.find((card: any) => card.id === defaultCard.id);
					return storedCard ? {
						...defaultCard,
						...storedCard,
						position: storedCard.position || defaultCard.position,
						dimensions: storedCard.dimensions || defaultCard.dimensions,
						size: storedCard.size || defaultCard.size,
						gridPosition: defaultCard.gridPosition
					} : defaultCard;
				});
				initialSettings = {
					...defaultSettings,
					cards
				};
			} else {
				// New format
				initialSettings = {
					...defaultSettings,
					...parsed,
					cards: defaultSettings.cards.map(defaultCard => {
						const storedCard = parsed.cards?.find((card: any) => card.id === defaultCard.id);
						return storedCard ? {
							...defaultCard,
							...storedCard,
							position: storedCard.position || defaultCard.position,
							dimensions: storedCard.dimensions || defaultCard.dimensions,
							size: storedCard.size || defaultCard.size,
							gridPosition: storedCard.gridPosition || defaultCard.gridPosition
						} : defaultCard;
					})
				};
			}
		} catch (e) {
			console.warn('Failed to parse stored settings, using defaults:', e);
			initialSettings = defaultSettings;
		}
	} else {
		initialSettings = defaultSettings;
	}

	const { subscribe, set, update } = writable<DashboardSettings>(initialSettings);

	// Keep a reference to current settings for getSettings method
	let currentSettings = initialSettings;
	
	// Update currentSettings whenever the store changes
	subscribe(settings => {
		currentSettings = settings;
	});

	return {
		subscribe,
		updateCard: (id: string, updates: Partial<CardSettings>) => {
			update(settings => {
				const cardIndex = settings.cards.findIndex(card => card.id === id);
				if (cardIndex !== -1) {
					settings.cards[cardIndex] = { ...settings.cards[cardIndex], ...updates };
				}
				// Save to localStorage
				if (browser) {
					localStorage.setItem('dashboard-settings', JSON.stringify(settings));
				}
				return settings;
			});
		},
		updateLayoutMode: (mode: 'grid' | 'freeform') => {
			update(settings => {
				settings.layoutMode = mode;
				if (browser) {
					localStorage.setItem('dashboard-settings', JSON.stringify(settings));
				}
				return settings;
			});
		},
		reorderCards: (newOrder: CardSettings[]) => {
			update(settings => {
				settings.cards = newOrder;
				if (browser) {
					localStorage.setItem('dashboard-settings', JSON.stringify(settings));
				}
				return settings;
			});
		},
		reset: () => {
			set(defaultSettings);
			if (browser) {
				localStorage.setItem('dashboard-settings', JSON.stringify(defaultSettings));
			}
		},
		expandCard: (cardId: string, direction: 'up' | 'down' | 'left' | 'right') => {
			update(settings => {
				const cardIndex = settings.cards.findIndex(c => c.id === cardId);
				if (cardIndex === -1) return settings;
				
				const card = settings.cards[cardIndex];
				const gridPos = card.gridPosition;
				if (!gridPos) return settings;
				
				// Calculate new grid position based on expansion direction
				let newGridPos = { ...gridPos };
				
				switch (direction) {
					case 'up':
						if (gridPos.row > 0) {
							newGridPos.row -= 1;
							newGridPos.rowSpan += 1;
						}
						break;
					case 'down':
						if (gridPos.row + gridPos.rowSpan < settings.gridSize.rows) {
							newGridPos.rowSpan += 1;
						}
						break;
					case 'left':
						if (gridPos.col > 0) {
							newGridPos.col -= 1;
							newGridPos.colSpan += 1;
						}
						break;
					case 'right':
						if (gridPos.col + gridPos.colSpan < settings.gridSize.cols) {
							newGridPos.colSpan += 1;
						}
						break;
				}
				
				// Check for collisions with other cards
				const hasCollision = settings.cards.some((otherCard, index) => {
					if (index === cardIndex || !otherCard.enabled || !otherCard.gridPosition) return false;
					
					const otherPos = otherCard.gridPosition;
					return !(
						newGridPos.col >= otherPos.col + otherPos.colSpan ||
						newGridPos.col + newGridPos.colSpan <= otherPos.col ||
						newGridPos.row >= otherPos.row + otherPos.rowSpan ||
						newGridPos.row + newGridPos.rowSpan <= otherPos.row
					);
				});
				
				if (!hasCollision) {
					// Update grid position and recalculate absolute position
					settings.cards[cardIndex] = {
						...card,
						gridPosition: newGridPos,
						position: gridToAbsolutePosition(newGridPos, settings),
						dimensions: gridToDimensions(newGridPos, settings)
					};
				}
				
				// Save to localStorage
				if (browser) {
					localStorage.setItem('dashboard-settings', JSON.stringify(settings));
				}
				return settings;
			});
		},
		shrinkCard: (cardId: string, direction: 'up' | 'down' | 'left' | 'right') => {
			update(settings => {
				const cardIndex = settings.cards.findIndex(c => c.id === cardId);
				if (cardIndex === -1) return settings;
				
				const card = settings.cards[cardIndex];
				const gridPos = card.gridPosition;
				if (!gridPos) return settings;
				
				// Calculate new grid position based on shrink direction
				let newGridPos = { ...gridPos };
				
				switch (direction) {
					case 'up':
						if (gridPos.rowSpan > 1) {
							newGridPos.row += 1;
							newGridPos.rowSpan -= 1;
						}
						break;
					case 'down':
						if (gridPos.rowSpan > 1) {
							newGridPos.rowSpan -= 1;
						}
						break;
					case 'left':
						if (gridPos.colSpan > 1) {
							newGridPos.col += 1;
							newGridPos.colSpan -= 1;
						}
						break;
					case 'right':
						if (gridPos.colSpan > 1) {
							newGridPos.colSpan -= 1;
						}
						break;
				}
				
				// Update grid position and recalculate absolute position
				settings.cards[cardIndex] = {
					...card,
					gridPosition: newGridPos,
					position: gridToAbsolutePosition(newGridPos, settings),
					dimensions: gridToDimensions(newGridPos, settings)
				};
				
				// Save to localStorage
				if (browser) {
					localStorage.setItem('dashboard-settings', JSON.stringify(settings));
				}
				return settings;
			});
		},
		snapToGrid: (cardId: string, x: number, y: number) => {
			update(settings => {
				const cardIndex = settings.cards.findIndex(c => c.id === cardId);
				if (cardIndex === -1) return settings;
				
				const card = settings.cards[cardIndex];
				const cellSize = settings.gridCellSize || { width: 200, height: 150 };
				
				// Calculate grid position from absolute coordinates
				const col = Math.round(x / cellSize.width);
				const row = Math.round(y / cellSize.height);
				
				// Ensure within grid bounds
				const boundedCol = Math.max(0, Math.min(col, settings.gridSize.cols - (card.gridPosition?.colSpan || 1)));
				const boundedRow = Math.max(0, Math.min(row, settings.gridSize.rows - (card.gridPosition?.rowSpan || 1)));
				
				const newGridPos = {
					row: boundedRow,
					col: boundedCol,
					rowSpan: card.gridPosition?.rowSpan || 1,
					colSpan: card.gridPosition?.colSpan || 1
				};
				
				// Check for collisions
				const hasCollision = settings.cards.some((otherCard, index) => {
					if (index === cardIndex || !otherCard.enabled || !otherCard.gridPosition) return false;
					
					const otherPos = otherCard.gridPosition;
					return !(
						newGridPos.col >= otherPos.col + otherPos.colSpan ||
						newGridPos.col + newGridPos.colSpan <= otherPos.col ||
						newGridPos.row >= otherPos.row + otherPos.rowSpan ||
						newGridPos.row + newGridPos.rowSpan <= otherPos.row
					);
				});
				
				if (!hasCollision) {
					settings.cards[cardIndex] = {
						...card,
						gridPosition: newGridPos,
						position: gridToAbsolutePosition(newGridPos, settings),
						dimensions: gridToDimensions(newGridPos, settings),
						isSnappedToGrid: true
					};
				}
				
				// Save to localStorage
				if (browser) {
					localStorage.setItem('dashboard-settings', JSON.stringify(settings));
				}
				return settings;
			});
		},

		// Get current settings (useful for accessing configuration in components)
		getSettings: () => {
			return currentSettings;
		}
	};
}

export const cardSettings = createSettings();
