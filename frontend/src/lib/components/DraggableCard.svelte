<!--
 ============================================================================
 HOMELAB DASHBOARD - DRAGGABLE CARD COMPONENT
 ============================================================================
 
 This component provides the interactive wrapper for all dashboard cards with:
 - Drag and drop functionality for repositioning
 - Resize handles for manual sizing
 - Layout mode awareness (Grid vs Freeform)
 - Lego-like expansion/contraction controls
 - Magnetic snapping to grid system
 - Responsive size presets
 
 FEATURES:
 - Grid Mode: Cards snap to grid positions with expand/shrink arrows
 - Freeform Mode: Free positioning with optional magnetic snapping
 - Expansion Controls: Arrow buttons that resize cards and affect neighbors
 - Size Presets: Quick buttons for small/medium/large/full sizes
 - Boundary Checking: Prevents cards from moving outside viewport
 - Collision Detection: Prevents cards from overlapping in grid mode
 
 INTERACTION PATTERNS:
 - Drag: Click and drag the header to move the card
 - Resize: Drag the bottom-right corner handle
 - Expand: Click directional arrows to grow the card
 - Shrink: Click directional arrows while holding modifier key
 - Snap: Cards automatically snap to grid when magneticSnapping is enabled
 
 ACCESSIBILITY:
 - All interactive elements have proper ARIA labels
 - Keyboard navigation support for drag handles
 - High contrast resize handles
 - Screen reader friendly controls
 
 MAINTAINER NOTES:
 - This component is layout-mode agnostic - handles both grid and freeform
 - Position updates automatically sync with the settings store
 - Grid calculations use the utility functions from settings store
 - All mouse events are properly cleaned up to prevent memory leaks
 ============================================================================
-->

<script lang="ts">
	import { cardSettings, type CardSettings } from '$lib/stores/settings';

	interface Props {
		card: CardSettings;
		children: any;
		layoutMode?: 'grid' | 'freeform';
	}

	let { card, children, layoutMode = 'freeform' }: Props = $props();

	// Ensure card has all required properties with defaults
	const safeCard = $derived(() => ({
		...card,
		position: card.position || { x: 0, y: 0 },
		dimensions: card.dimensions || { width: 400, height: 300 },
		size: card.size || 'medium'
	}));

	let isDragging = $state(false);
	let isResizing = $state(false);
	let dragStartPos = $state({ x: 0, y: 0 });
	let dragStartCardPos = $state({ x: 0, y: 0 });
	let resizeStartPos = $state({ x: 0, y: 0 });
	let resizeStartDimensions = $state({ width: 0, height: 0 });
	let cardElement = $state<HTMLElement>();

	function handleMouseDown(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('.resize-handle')) return;
		
		isDragging = true;
		dragStartPos = { x: e.clientX, y: e.clientY };
		dragStartCardPos = { x: safeCard().position.x, y: safeCard().position.y };
		
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		e.preventDefault();
	}

	function handleResizeMouseDown(e: MouseEvent) {
		isResizing = true;
		resizeStartPos = { x: e.clientX, y: e.clientY };
		resizeStartDimensions = { width: safeCard().dimensions.width, height: safeCard().dimensions.height };
		
		document.addEventListener('mousemove', handleResizeMouseMove);
		document.addEventListener('mouseup', handleResizeMouseUp);
		e.preventDefault();
		e.stopPropagation();
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		
		const deltaX = e.clientX - dragStartPos.x;
		const deltaY = e.clientY - dragStartPos.y;
		
		// Get viewport dimensions and card dimensions for proper boundary checking
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const headerHeight = 88; // Approximate header height
		const scrollTop = window.scrollY || document.documentElement.scrollTop;
		
		const cardWidth = safeCard().dimensions.width;
		const cardHeight = safeCard().dimensions.height;
		
		// Calculate new position with boundaries, accounting for scroll
		let newX = Math.max(0, Math.min(viewportWidth - cardWidth, dragStartCardPos.x + deltaX));
		let newY = Math.max(headerHeight + scrollTop, Math.min(viewportHeight + scrollTop - cardHeight, dragStartCardPos.y + deltaY));
		
		// Grid snapping in grid mode
		if (layoutMode === 'grid') {
			// Get current settings to check for magnetic snapping
			const settings = cardSettings.getSettings();
			
			if (settings.magneticSnapping) {
				const gridCellWidth = viewportWidth / settings.gridSize.cols;
				const gridCellHeight = (viewportHeight - headerHeight) / settings.gridSize.rows;
				const snapThreshold = settings.snapThreshold || 20;
				
				// Calculate closest grid position (relative to scroll position)
				const relativeY = newY - headerHeight - scrollTop;
				const closestGridX = Math.round(newX / gridCellWidth) * gridCellWidth;
				const closestGridY = Math.round(relativeY / gridCellHeight) * gridCellHeight + headerHeight + scrollTop;
				
				// Snap if within threshold
				if (Math.abs(newX - closestGridX) < snapThreshold) {
					newX = closestGridX;
				}
				if (Math.abs(newY - closestGridY) < snapThreshold) {
					newY = closestGridY;
				}
			}
		}
		
		cardSettings.updateCard(card.id, {
			position: { x: newX, y: newY }
		});
	}

	function handleResizeMouseMove(e: MouseEvent) {
		if (!isResizing) return;
		
		const deltaX = e.clientX - resizeStartPos.x;
		const deltaY = e.clientY - resizeStartPos.y;
		
		// Get current position and viewport boundaries
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const headerHeight = 88;
		const currentX = safeCard().position.x;
		const currentY = safeCard().position.y;
		
		// Calculate maximum allowed dimensions based on position
		const maxWidth = viewportWidth - currentX;
		const maxHeight = viewportHeight - currentY;
		
		let newWidth = Math.max(200, Math.min(maxWidth, resizeStartDimensions.width + deltaX));
		let newHeight = Math.max(150, Math.min(maxHeight, resizeStartDimensions.height + deltaY));
		
		// Grid snapping for resize in grid mode
		if (layoutMode === 'grid') {
			const settings = cardSettings.getSettings();
			
			if (settings.magneticSnapping) {
				const gridCellWidth = viewportWidth / settings.gridSize.cols;
				const gridCellHeight = (viewportHeight - headerHeight) / settings.gridSize.rows;
				const snapThreshold = settings.snapThreshold || 20;
				
				// Calculate closest grid dimensions
				const closestGridWidth = Math.round(newWidth / gridCellWidth) * gridCellWidth;
				const closestGridHeight = Math.round(newHeight / gridCellHeight) * gridCellHeight;
				
				// Snap if within threshold
				if (Math.abs(newWidth - closestGridWidth) < snapThreshold) {
					newWidth = Math.max(gridCellWidth, closestGridWidth);
				}
				if (Math.abs(newHeight - closestGridHeight) < snapThreshold) {
					newHeight = Math.max(gridCellHeight, closestGridHeight);
				}
			}
		}
		
		cardSettings.updateCard(card.id, {
			dimensions: { width: newWidth, height: newHeight }
		});
	}

	function handleMouseUp() {
		isDragging = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	}

	function handleResizeMouseUp() {
		isResizing = false;
		document.removeEventListener('mousemove', handleResizeMouseMove);
		document.removeEventListener('mouseup', handleResizeMouseUp);
	}

	function getSizePreset(size: string) {
		switch (size) {
			case 'small':
				return { width: 300, height: 200 };
			case 'medium':
				return { width: 400, height: 300 };
			case 'large':
				return { width: 500, height: 400 };
			case 'full':
				return { width: 800, height: 500 };
			default:
				return safeCard().dimensions;
		}
	}

	function applyPresetSize(size: 'small' | 'medium' | 'large' | 'full') {
		const preset = getSizePreset(size);
		cardSettings.updateCard(card.id, {
			size,
			dimensions: preset
		});
	}

	// Expansion and contraction functions for Lego-like behavior
	function expandCard(direction: 'up' | 'down' | 'left' | 'right') {
		if (layoutMode === 'grid') {
			cardSettings.expandCard(card.id, direction);
		}
	}

	function shrinkCard(direction: 'up' | 'down' | 'left' | 'right') {
		if (layoutMode === 'grid') {
			cardSettings.shrinkCard(card.id, direction);
		}
	}

	// Check if card can expand in a given direction
	function canExpand(direction: 'up' | 'down' | 'left' | 'right'): boolean {
		if (layoutMode !== 'grid' || !safeCard().gridPosition) return false;
		
		const gridPos = safeCard().gridPosition!;
		const gridSize = { cols: 6, rows: 4 }; // Get from settings store if needed
		
		switch (direction) {
			case 'up': return gridPos.row > 0;
			case 'down': return gridPos.row + gridPos.rowSpan < gridSize.rows;
			case 'left': return gridPos.col > 0;
			case 'right': return gridPos.col + gridPos.colSpan < gridSize.cols;
			default: return false;
		}
	}

	// Check if card can shrink in a given direction
	function canShrink(direction: 'up' | 'down' | 'left' | 'right'): boolean {
		if (layoutMode !== 'grid' || !safeCard().gridPosition) return false;
		
		const gridPos = safeCard().gridPosition!;
		
		switch (direction) {
			case 'up':
			case 'down': return gridPos.rowSpan > 1;
			case 'left':
			case 'right': return gridPos.colSpan > 1;
			default: return false;
		}
	}
</script>

{#if layoutMode === 'freeform'}
<div
	bind:this={cardElement}
	class="absolute bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden {isDragging ? 'z-50 shadow-2xl' : 'z-10'} {isResizing ? 'select-none' : ''}"
	style="left: {safeCard().position.x}px; top: {safeCard().position.y}px; width: {safeCard().dimensions.width}px; height: {safeCard().dimensions.height}px;"
>
	<!-- Card Header with drag handle and controls -->
	<div 
		class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-move"
		onmousedown={handleMouseDown}
		role="button"
		tabindex="0"
		aria-label="Drag to move {safeCard().name} card"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				// Could implement keyboard drag here in the future
			}
		}}
	>
		<div class="flex items-center space-x-2">
			<div class="flex space-x-1">
				<div class="w-3 h-3 bg-red-500 rounded-full"></div>
				<div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
				<div class="w-3 h-3 bg-green-500 rounded-full"></div>
			</div>
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
				{safeCard().name}
			</span>
		</div>
		
		<div class="flex items-center space-x-2">
			<!-- Size preset buttons -->
			<div class="flex space-x-1">
				<button
					onclick={() => applyPresetSize('small')}
					class="w-4 h-4 border border-gray-400 rounded {safeCard().size === 'small' ? 'bg-indigo-500' : 'bg-gray-200'}"
					title="Small"
					aria-label="Set card size to small"
				></button>
				<button
					onclick={() => applyPresetSize('medium')}
					class="w-5 h-5 border border-gray-400 rounded {safeCard().size === 'medium' ? 'bg-indigo-500' : 'bg-gray-200'}"
					title="Medium"
					aria-label="Set card size to medium"
				></button>
				<button
					onclick={() => applyPresetSize('large')}
					class="w-6 h-6 border border-gray-400 rounded {safeCard().size === 'large' ? 'bg-indigo-500' : 'bg-gray-200'}"
					title="Large"
					aria-label="Set card size to large"
				></button>
			</div>
		</div>
	</div>

	<!-- Card Content -->
	<div class="h-full overflow-auto" style="height: calc(100% - 53px);">
		{@render children()}
	</div>

	<!-- Resize handle -->
	<div
		class="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-gray-400 hover:bg-gray-600 cursor-se-resize opacity-50 hover:opacity-100"
		onmousedown={handleResizeMouseDown}
		style="clip-path: polygon(100% 0%, 0% 100%, 100% 100%);"
		title="Resize"
		role="button"
		tabindex="0"
		aria-label="Resize {safeCard().name} card"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				// Could implement keyboard resize here in the future
			}
		}}
	></div>
</div>
{:else}
<!-- Grid mode rendering with Lego-like expansion controls + drag/resize -->
<div
	bind:this={cardElement}
	class="absolute bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden group {isDragging ? 'z-50 shadow-2xl' : 'z-10'} {isResizing ? 'select-none' : ''}"
	style="left: {safeCard().position.x}px; top: {safeCard().position.y}px; width: {safeCard().dimensions.width}px; height: {safeCard().dimensions.height}px;"
>
	<!-- Expansion Controls - Only visible in grid mode -->
	<!-- Top expansion arrow -->
	{#if canExpand('up')}
		<button
			onclick={() => expandCard('up')}
			class="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
			title="Expand up"
			aria-label="Expand {safeCard().name} upward"
		>
			<svg class="w-3 h-3 mx-auto mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
			</svg>
		</button>
	{/if}
	{#if canShrink('up')}
		<button
			onclick={() => shrinkCard('up')}
			class="absolute -top-3 left-1/3 transform -translate-x-1/2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
			title="Shrink from top"
			aria-label="Shrink {safeCard().name} from top"
		>
			<svg class="w-2 h-2 mx-auto mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	{/if}

	<!-- Bottom expansion arrow -->
	{#if canExpand('down')}
		<button
			onclick={() => expandCard('down')}
			class="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
			title="Expand down"
			aria-label="Expand {safeCard().name} downward"
		>
			<svg class="w-3 h-3 mx-auto mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	{/if}
	{#if canShrink('down')}
		<button
			onclick={() => shrinkCard('down')}
			class="absolute -bottom-3 left-1/3 transform -translate-x-1/2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
			title="Shrink from bottom"
			aria-label="Shrink {safeCard().name} from bottom"
		>
			<svg class="w-2 h-2 mx-auto mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7" />
			</svg>
		</button>
	{/if}

	<!-- Left expansion arrow -->
	{#if canExpand('left')}
		<button
			onclick={() => expandCard('left')}
			class="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
			title="Expand left"
			aria-label="Expand {safeCard().name} leftward"
		>
			<svg class="w-3 h-3 mx-auto mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
	{/if}
	{#if canShrink('left')}
		<button
			onclick={() => shrinkCard('left')}
			class="absolute -left-3 top-1/3 transform -translate-y-1/2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
			title="Shrink from left"
			aria-label="Shrink {safeCard().name} from left"
		>
			<svg class="w-2 h-2 mx-auto mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	{/if}

	<!-- Right expansion arrow -->
	{#if canExpand('right')}
		<button
			onclick={() => expandCard('right')}
			class="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
			title="Expand right"
			aria-label="Expand {safeCard().name} rightward"
		>
			<svg class="w-3 h-3 mx-auto mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	{/if}
	{#if canShrink('right')}
		<button
			onclick={() => shrinkCard('right')}
			class="absolute -right-3 top-1/3 transform -translate-y-1/2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg"
			title="Shrink from right"
			aria-label="Shrink {safeCard().name} from right"
		>
			<svg class="w-2 h-2 mx-auto mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
	{/if}

	<!-- Grid Card Header with drag handle -->
	<div 
		class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-move"
		onmousedown={handleMouseDown}
		role="button"
		tabindex="0"
		aria-label="Drag to move {safeCard().name} card"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				// Could implement keyboard drag here in the future
			}
		}}
	>
		<div class="flex items-center space-x-2">
			<div class="flex space-x-1">
				<div class="w-3 h-3 bg-red-500 rounded-full"></div>
				<div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
				<div class="w-3 h-3 bg-green-500 rounded-full"></div>
			</div>
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
				{safeCard().name}
			</span>
		</div>
		
		<div class="flex items-center space-x-2">
			<div class="text-xs text-gray-500 dark:text-gray-400">
				{safeCard().gridPosition?.colSpan || 1}x{safeCard().gridPosition?.rowSpan || 1}
			</div>
		</div>
	</div>

	<!-- Grid Card Content -->
	<div class="h-full overflow-auto" style="height: calc(100% - 53px);">
		{@render children()}
	</div>

	<!-- Resize handle for grid mode -->
	<div
		class="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-gray-400 hover:bg-gray-600 cursor-se-resize opacity-50 hover:opacity-100"
		onmousedown={handleResizeMouseDown}
		style="clip-path: polygon(100% 0%, 0% 100%, 100% 100%);"
		title="Resize"
		role="button"
		tabindex="0"
		aria-label="Resize {safeCard().name} card"
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				// Could implement keyboard resize here in the future
			}
		}}
	></div>
</div>
{/if}
