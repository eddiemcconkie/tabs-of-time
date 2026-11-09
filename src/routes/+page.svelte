<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import TabsApp from '#lib/components/TabsApp.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		if (window.location.hash.length <= 1) return;
		void goto(
			resolve(`/song${window.location.search}${window.location.hash}` as `/song#${string}`),
			{ replace: true }
		);
	});
</script>

<TabsApp mode="landing" />
