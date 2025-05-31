<script lang="ts">
	import { cardSettings, type CardSettings } from '$lib/stores/settings';
	import { fade, fly } from 'svelte/transition';

	let { isOpen = false, onClose }: { isOpen: boolean; onClose: () => void } = $props();

	let activeTab = $state('cards');
	let draggedIndex = $state<number | null>(null);
	let cards = $state<CardSettings[]>([]);

	// Subscribe to card settings
	cardSettings.subscribe(value => {
		cards = [...value].sort((a, b) => a.order - b.order);
	});

	function handleCardToggle(cardId: string, enabled: boolean) {
		cardSettings.updateCard(cardId, { enabled });
	}

	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/html', '');
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		if (draggedIndex === null || draggedIndex === dropIndex) return;

		const newCards = [...cards];
		const draggedCard = newCards[draggedIndex];
		
		// Remove dragged card
		newCards.splice(draggedIndex, 1);
		
		// Insert at new position
		newCards.splice(dropIndex, 0, draggedCard);
		
		// Update order values
		const reorderedCards = newCards.map((card, index) => ({
			...card,
			order: index
		}));
		
		cardSettings.reorderCards(reorderedCards);
		draggedIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
	}

	function resetSettings() {
		cardSettings.reset();
	}

	function closeModal() {
		onClose();
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		transition:fade={{ duration: 200 }}
	>
		<!-- Backdrop -->
		<button
			class="fixed inset-0 bg-black bg-opacity-50"
			onclick={closeModal}
			onkeydown={(e) => e.key === 'Enter' && closeModal()}
			aria-label="Close settings"
			transition:fade={{ duration: 200 }}
		></button>

		<!-- Modal -->
		<div class="flex min-h-full items-center justify-center p-4">
			<div
				class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
				transition:fly={{ y: 20, duration: 300 }}
			>
				<!-- Header -->
				<div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<h2 class="text-xl font-semibold text-gray-900 dark:text-white">
						Dashboard Settings
					</h2>
					<button
						onclick={closeModal}
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					>
						<span class="sr-only">Close</span>
						<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Tabs -->
				<div class="border-b border-gray-200 dark:border-gray-700">
					<nav class="flex space-x-8 px-6" aria-label="Tabs">
						<button
							onclick={() => activeTab = 'cards'}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'cards' 
								? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
								: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
						>
							📊 Dashboard Cards
						</button>
						<button
							onclick={() => activeTab = 'appearance'}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'appearance' 
								? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
								: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
						>
							🎨 Appearance
						</button>
						<button
							onclick={() => activeTab = 'general'}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'general' 
								? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
								: 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
						>
							⚙️ General
						</button>
					</nav>
				</div>

				<!-- Tab Content -->
				<div class="p-6 overflow-y-auto max-h-[60vh]">
					{#if activeTab === 'cards'}
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
									Manage Dashboard Cards
								</h3>
								<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
									Enable, disable, and reorder the cards on your dashboard. Drag and drop to reorder.
								</p>
							</div>

							<div class="space-y-3">
								{#each cards as card, index}
									<div
										class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 {draggedIndex === index ? 'opacity-50' : ''}"
										draggable="true"
										role="listitem"
										ondragstart={(e) => handleDragStart(e, index)}
										ondragover={handleDragOver}
										ondrop={(e) => handleDrop(e, index)}
										ondragend={handleDragEnd}
									>
										<div class="flex items-center space-x-3">
											<div class="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
												<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
												</svg>
											</div>
											<div class="flex items-center space-x-3">
												<span class="text-sm font-medium text-gray-900 dark:text-white">
													{card.name}
												</span>
												<span class="text-xs text-gray-500 dark:text-gray-400">
													Order: {card.order + 1}
												</span>
											</div>
										</div>
										<div class="flex items-center space-x-3">
											<label class="relative inline-flex items-center cursor-pointer">
												<input
													type="checkbox"
													class="sr-only peer"
													checked={card.enabled}
													onchange={(e) => {
														const target = e.target as HTMLInputElement;
														handleCardToggle(card.id, target.checked);
													}}
												/>
												<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
											</label>
										</div>
									</div>
								{/each}
							</div>

							<div class="flex justify-start">
								<button
									onclick={resetSettings}
									class="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 rounded-md transition-colors"
								>
									Reset to Default
								</button>
							</div>
						</div>

					{:else if activeTab === 'appearance'}
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
									Appearance Settings
								</h3>
								<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
									Customize the look and feel of your dashboard.
								</p>
							</div>

							<div class="space-y-4">
								<div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
									<p class="text-sm text-gray-600 dark:text-gray-400">
										🚧 Theme and appearance options coming soon!
									</p>
								</div>
							</div>
						</div>

					{:else if activeTab === 'general'}
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
									General Settings
								</h3>
								<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
									Configure general dashboard behavior.
								</p>
							</div>

							<div class="space-y-4">
								<div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
									<p class="text-sm text-gray-600 dark:text-gray-400">
										🚧 General settings coming soon!
									</p>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Footer -->
				<div class="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
					<button
						onclick={closeModal}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
