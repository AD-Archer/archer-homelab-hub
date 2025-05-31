<script lang="ts">
	import { onMount } from 'svelte';
	import SystemInfo from '$lib/components/SystemInfo.svelte';
	import ServicesList from '$lib/components/ServicesList.svelte';
	import NetworkStatus from '$lib/components/NetworkStatus.svelte';
	import FileBrowser from '$lib/components/FileBrowser.svelte';
	import Settings from '$lib/components/Settings.svelte';
	import DraggableCard from '$lib/components/DraggableCard.svelte';
	import { cardSettings, type CardSettings } from '$lib/stores/settings';

	let systemData = $state<any>(null);
	let services = $state<any[]>([]);
	let networkData = $state<any>(null);
	let loading = $state(true);
	let error = $state('');
	let showSettings = $state(false);
	let cards = $state<CardSettings[]>([]);

	const API_BASE = 'http://localhost:8080/api';

	// Subscribe to card settings
	cardSettings.subscribe(value => {
		cards = [...value].sort((a, b) => a.order - b.order);
	});

	// Get enabled cards only
	const enabledCards = $derived(() => cards.filter(card => card.enabled));

	async function fetchData() {
		try {
			loading = true;
			error = '';

			// Try to fetch real data first
			try {
				const [systemRes, servicesRes, networkRes] = await Promise.all([
					fetch(`${API_BASE}/system`),
					fetch(`${API_BASE}/services`),
					fetch(`${API_BASE}/network`)
				]);

				if (systemRes.ok && servicesRes.ok && networkRes.ok) {
					systemData = await systemRes.json();
					services = await servicesRes.json();
					networkData = await networkRes.json();
					return;
				}
			} catch (apiError) {
				console.warn('API not available, using mock data:', apiError);
			}

			// Use mock data if API is not available
			systemData = {
				hostname: 'archer-homelab',
				uptime: '2 days, 14 hours, 30 minutes',
				cpu: {
					usage: 23.5,
					cores: 8,
					model: 'Intel Core i7-9700K'
				},
				memory: {
					total: 16777216, // 16GB in KB
					used: 8388608,   // 8GB in KB
					available: 8388608
				},
				disk: {
					total: 1000000000, // 1TB in KB  
					used: 400000000,   // 400GB in KB
					available: 600000000
				}
			};

			services = [
				{ name: 'nginx', status: 'active', port: 80 },
				{ name: 'docker', status: 'active', port: null },
				{ name: 'ssh', status: 'active', port: 22 },
				{ name: 'postgresql', status: 'inactive', port: 5432 },
				{ name: 'redis', status: 'active', port: 6379 }
			];

			networkData = {
				interfaces: [
					{
						name: 'eth0',
						ip: '192.168.1.100',
						status: 'up',
						speed: '1000 Mbps'
					},
					{
						name: 'wlan0', 
						ip: '192.168.1.101',
						status: 'up',
						speed: '300 Mbps'
					}
				],
				connections: 42
			};

		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			console.error('Error fetching data:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchData();
		// Refresh data every 5 seconds
		const interval = setInterval(fetchData, 5000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Homeserver Dashboard</title>
</svelte:head>

<div class="bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<header class="bg-white dark:bg-gray-800 shadow">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center py-6">
				<div class="flex items-center">
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
						🏠 Homeserver Dashboard
					</h1>
				</div>
				<div class="flex items-center space-x-4">
					<div class="flex items-center space-x-2">
						<div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
						<span class="text-sm text-gray-600 dark:text-gray-300">Live</span>
					</div>
					<button
						onclick={() => showSettings = true}
						class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
						title="Settings"
					>
						<svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						Settings
					</button>
					<button
						onclick={fetchData}
						class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					>
						Refresh
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content - Full Screen Dashboard Canvas -->
	<main class="relative w-full min-h-screen" style="height: calc(100vh - 88px); overflow: hidden;">
		{#if loading && !systemData}
			<div class="absolute inset-0 flex justify-center items-center bg-gray-50 dark:bg-gray-900 z-20">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		{:else if error}
			<div class="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-md p-4 z-20">
				<div class="flex">
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error</h3>
						<div class="mt-2 text-sm text-red-700">
							<p>{error}</p>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Dashboard Canvas - Full Viewport -->
			<div class="absolute inset-0 bg-gray-50 dark:bg-gray-900">
				{#each enabledCards() as card}
					<DraggableCard {card}>
						{#if card.id === 'system-info'}
							<SystemInfo {systemData} />
						{:else if card.id === 'services-list'}
							<ServicesList {services} />
						{:else if card.id === 'network-status'}
							<NetworkStatus {networkData} />
						{:else if card.id === 'file-browser'}
							<FileBrowser />
						{/if}
					</DraggableCard>
				{/each}
				
				<!-- Dashboard instructions overlay (when empty) -->
				{#if enabledCards().length === 0}
					<div class="absolute inset-0 flex items-center justify-center">
						<div class="text-center">
							<div class="text-4xl mb-4">📊</div>
							<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
								Your dashboard is empty
							</h3>
							<p class="text-gray-600 dark:text-gray-400 mb-4">
								Add some cards from the settings to get started.
							</p>
							<button
								onclick={() => showSettings = true}
								class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
							>
								Open Settings
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Settings Modal -->
		<Settings 
			isOpen={showSettings} 
			onClose={() => showSettings = false} 
		/>
	</main>
</div>
.env.example