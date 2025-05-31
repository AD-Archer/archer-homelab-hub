<script lang="ts">
	import { cardSettings, type CardSettings } from '$lib/stores/settings';

	interface Props {
		card: CardSettings;
		children: any;
	}

	let { card, children }: Props = $props();

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
		
		const cardWidth = safeCard().dimensions.width;
		const cardHeight = safeCard().dimensions.height;
		
		// Calculate new position with boundaries
		const newX = Math.max(0, Math.min(viewportWidth - cardWidth, dragStartCardPos.x + deltaX));
		const newY = Math.max(headerHeight, Math.min(viewportHeight - cardHeight, dragStartCardPos.y + deltaY));
		
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
		const currentX = safeCard().position.x;
		const currentY = safeCard().position.y;
		
		// Calculate maximum allowed dimensions based on position
		const maxWidth = viewportWidth - currentX;
		const maxHeight = viewportHeight - currentY;
		
		const newWidth = Math.max(200, Math.min(maxWidth, resizeStartDimensions.width + deltaX));
		const newHeight = Math.max(150, Math.min(maxHeight, resizeStartDimensions.height + deltaY));
		
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
</script>

<div
	bind:this={cardElement}
	class="fixed bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden {isDragging ? 'z-50 shadow-2xl' : 'z-10'} {isResizing ? 'select-none' : ''}"
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
