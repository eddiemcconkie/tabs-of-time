<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import LineMenu from '#lib/components/LineMenu.svelte';
	import NoteBuilder from '#lib/components/NoteBuilder.svelte';
	import NoteCard from '#lib/components/NoteCard.svelte';
	import SongMenu from '#lib/components/SongMenu.svelte';
	import { playNote } from '#lib/audio.js';
	import {
		cloneNote,
		createLine,
		createNote,
		decodeTabs,
		encodeTabs,
		type TabLine,
		type TabNote
	} from '#lib/tabs.js';
	import { SvelteURL, SvelteURLSearchParams } from 'svelte/reactivity';

	type AppMode = 'landing' | 'view' | 'edit';
	interface Props {
		mode: AppMode;
	}

	interface SavedSong {
		id: string;
		title: string;
		tabs: string;
		savedAt: number;
	}

	const SAVED_SONGS_KEY = 'tabs-of-time-saved-songs';
	let { mode }: Props = $props();

	function readSavedSongs(): SavedSong[] {
		try {
			const value: unknown = JSON.parse(localStorage.getItem(SAVED_SONGS_KEY) ?? '[]');
			if (!Array.isArray(value)) return [];
			const songs = value
				.flatMap((song): SavedSong[] => {
					if (typeof song !== 'object' || song === null) return [];
					const candidate = song as Partial<SavedSong>;
					if (
						typeof candidate.title !== 'string' ||
						typeof candidate.tabs !== 'string' ||
						typeof candidate.savedAt !== 'number'
					)
						return [];
					return [
						{
							id:
								typeof candidate.id === 'string' && candidate.id
									? candidate.id
									: crypto.randomUUID(),
							title: candidate.title,
							tabs: candidate.tabs,
							savedAt: candidate.savedAt
						}
					];
				})
				.sort((a, b) => b.savedAt - a.savedAt)
				.filter((song, index, all) => all.findIndex((item) => item.tabs === song.tabs) === index);
			localStorage.setItem(SAVED_SONGS_KEY, JSON.stringify(songs));
			return songs;
		} catch {
			return [];
		}
	}

	function readInitialState() {
		let hash: string;
		try {
			hash = decodeURIComponent(window.location.hash.slice(1));
		} catch {
			hash = window.location.hash.slice(1);
		}
		const decoded = decodeTabs(hash);
		const url = new URL(window.location.href);
		return {
			title: url.searchParams.get('title') ?? '',
			savedSongId: url.searchParams.get('song'),
			lines: decoded.lines,
			invalidTokens: decoded.invalidTokens
		};
	}

	const initialSavedSongs = readSavedSongs();
	const initial = readInitialState();
	let title = $state(initial.title);
	let lines = $state<TabLine[]>(initial.lines);
	/**
	 * Current builder target:
	 * - `noteId` set → the builder is editing that existing note.
	 * - `noteId` null → the builder is composing a new note to append on `lineIndex`.
	 */
	let target = $state<{ lineIndex: number; noteId: string | null }>({ lineIndex: 0, noteId: null });
	let builderNote = $state<TabNote>(createNote());
	let flashNoteId = $state<string | null>(null);
	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	let savedSongs = $state<SavedSong[]>(initialSavedSongs);
	let activeSavedSongId = $state<string | null>(
		initial.savedSongId && initialSavedSongs.some((song) => song.id === initial.savedSongId)
			? initial.savedSongId
			: null
	);
	let message = $state(
		initial.invalidTokens.length ? 'Some invalid notes in this link were skipped.' : ''
	);
	let messageTimer: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Play mode: a silent, continuous auto-scroll so you can play along on the
	 * controller. Manual scrolling suspends it; on release it resumes from
	 * wherever you left off — instantly mid-song, after a short wait at the top.
	 */
	const PLAY_SPEED_KEY = 'oot-tabs.play-speed';
	const SPEED_UNIT_PX = 60; // scroll speed per slider unit — px/s (1.0 = gentle pace)
	const RESUME_DELAY_MS = 700; // grace beat at the top before the sweep resumes
	let playSpeed = $state(loadPlaySpeed());
	let playing = $state(false);
	let playRafId: number | undefined;
	let playLastTick = 0;
	let playTargetY = 0;
	let playHoldUntil = 0;
	let driving = false;
	let driveTimer: ReturnType<typeof setTimeout> | undefined;

	type WakeLock = {
		release(): Promise<void>;
		addEventListener?(type: string, listener: () => void): void;
	};

	/** Keeps the screen awake during playback (best-effort; unsupported → ignore). */
	let wakeLock: WakeLock | null = null;

	async function acquireWakeLock() {
		try {
			const wake = (
				navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<WakeLock> } }
			).wakeLock;
			if (!wake) return;
			wakeLock = await wake.request('screen');
			// Waking on tab-show needs a re-request — the browser voids locks when hidden.
			wakeLock.addEventListener?.('release', () => (wakeLock = null));
		} catch {
			// Denied or unavailable; playback just proceeds without wake lock.
		}
	}

	function releaseWakeLock() {
		wakeLock?.release().catch(() => {});
		wakeLock = null;
	}

	let encodedTabs = $derived(encodeTabs(lines));
	let selectedLocation = $derived.by(() => {
		if (!target.noteId) return null;
		for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
			const noteIndex = lines[lineIndex].notes.findIndex((note) => note.id === target.noteId);
			if (noteIndex >= 0) return { lineIndex, noteIndex };
		}
		return null;
	});
	/** Line the builder applies to: the edited note's line, or the row picked for adding. */
	let activeLineIndex = $derived.by(() => {
		if (target.noteId && selectedLocation) return selectedLocation.lineIndex;
		return Math.min(target.lineIndex, Math.max(lines.length - 1, 0));
	});
	let editingNote = $derived(Boolean(target.noteId));

	$effect(() => {
		if (mode === 'landing') return;
		const url = new SvelteURL(window.location.href);
		if (title.trim()) url.searchParams.set('title', title.trim());
		else url.searchParams.delete('title');
		if (activeSavedSongId) url.searchParams.set('song', activeSavedSongId);
		else url.searchParams.delete('song');
		url.hash = encodedTabs;
		window.history.replaceState(null, '', url);
	});

	let isSavedLocally = $derived.by(() => {
		if (activeSavedSongId) return savedSongs.some((song) => song.id === activeSavedSongId);
		return savedSongs.some((song) => song.tabs === encodedTabs);
	});

	function announce(text: string) {
		message = text;
		if (messageTimer) clearTimeout(messageTimer);
		messageTimer = setTimeout(() => (message = ''), 2600);
	}

	function saveCurrentSong(): boolean {
		if (!encodedTabs) {
			announce('Add at least one note first');
			return false;
		}
		const songTitle = title.trim();
		if (!songTitle) {
			announce('Name the song before saving');
			return false;
		}
		const existingSong =
			savedSongs.find((song) => song.id === activeSavedSongId) ??
			savedSongs.find((song) => song.tabs === encodedTabs);
		const savedSong: SavedSong = {
			id: existingSong?.id ?? crypto.randomUUID(),
			title: songTitle,
			tabs: encodedTabs,
			savedAt: Date.now()
		};
		activeSavedSongId = savedSong.id;
		savedSongs = [
			savedSong,
			...savedSongs.filter((song) => song.id !== savedSong.id && song.tabs !== encodedTabs)
		];
		localStorage.setItem(SAVED_SONGS_KEY, JSON.stringify(savedSongs));
		return true;
	}

	function removeSavedSong(id: string) {
		savedSongs = savedSongs.filter((song) => song.id !== id);
		localStorage.setItem(SAVED_SONGS_KEY, JSON.stringify(savedSongs));
		announce('Saved song removed');
	}

	function routeSuffix(includeLocalId = true): string {
		const params = new SvelteURLSearchParams();
		if (title.trim()) params.set('title', title.trim());
		if (includeLocalId && activeSavedSongId) params.set('song', activeSavedSongId);
		const query = params.size ? `?${params}` : '';
		return `${query}${encodedTabs ? `#${encodedTabs}` : ''}`;
	}

	/** Pick an existing note: the builder switches to "update" mode with a copy of that note. */
	function selectNote(lineIndex: number, note: TabNote) {
		target = { lineIndex, noteId: note.id };
		builderNote = cloneNote(note);
		playNote(note);
	}

	/** Pick a row: the builder switches to "add" mode targeting that line, with a fresh note. */
	function selectLine(lineIndex: number) {
		if (target.lineIndex === lineIndex && !target.noteId) return;
		target = { lineIndex, noteId: null };
		builderNote = createNote();
	}

	function cancelSelection() {
		target = { lineIndex: target.lineIndex, noteId: null };
		builderNote = createNote();
	}

	/** Briefly highlight a freshly added note. */
	function flashNote(id: string) {
		flashNoteId = id;
		if (flashTimer) clearTimeout(flashTimer);
		flashTimer = setTimeout(() => (flashNoteId = null), 1100);
	}

	function loadPlaySpeed(): number {
		if (typeof localStorage === 'undefined') return 1;
		const stored = parseFloat(localStorage.getItem(PLAY_SPEED_KEY) ?? '');
		return Number.isFinite(stored) && stored > 0 ? Math.max(0.1, Math.min(stored, 1.5)) : 1;
	}

	function persistPlaySpeed() {
		try {
			localStorage.setItem(PLAY_SPEED_KEY, String(playSpeed));
		} catch {
			// Storage may be unavailable (private mode); speed just stays per-session.
		}
	}

	function sheetMaxScroll(): number {
		return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
	}

	function stopPlayback() {
		playing = false;
		if (playRafId !== undefined) cancelAnimationFrame(playRafId);
		playRafId = undefined;
		if (driveTimer) clearTimeout(driveTimer);
		driveTimer = undefined;
		releaseWakeLock();
	}

	function togglePlayback() {
		if (playing) {
			stopPlayback();
			return;
		}
		const start = window.scrollY;
		playing = true;
		void acquireWakeLock();
		playTargetY = start;
		playHoldUntil = performance.now() + RESUME_DELAY_MS; // beat to ready your hands
		playLastTick = performance.now();
		playRafId = requestAnimationFrame(playTick);
	}

	function playTick(now: number) {
		if (!playing) return;
		const dt = Math.min((now - playLastTick) / 1000, 0.1);
		playLastTick = now;
		if (now >= playHoldUntil) {
			// Stay put (no drift) while the user drives; catch up neither way.
			if (!driving) {
				playTargetY = Math.min(playTargetY + playSpeed * SPEED_UNIT_PX * dt, sheetMaxScroll());
				window.scrollTo(0, playTargetY);
			}
		}
		if (playTargetY >= sheetMaxScroll() - 1) {
			stopPlayback(); // reached the bottom — sweep complete
			return;
		}
		playRafId = requestAnimationFrame(playTick);
	}

	/** User input (wheel/touch) suspends the sweep for as long as it lasts. */
	function suspendAutoScroll(ms: number) {
		driving = true;
		if (driveTimer) clearTimeout(driveTimer);
		driveTimer = setTimeout(endUserScroll, ms);
	}

	function endUserScroll() {
		driving = false;
		driveTimer = undefined;
		if (!playing) return;
		playTargetY = window.scrollY; // resume from wherever the user left off
		if (window.scrollY <= 1) playHoldUntil = performance.now() + RESUME_DELAY_MS;
		else playHoldUntil = performance.now(); // mid-song: continue immediately
	}

	/** Insert the composer's note before/after the selected note and make it the new target. */
	function addAdjacentNote(before: boolean) {
		const location = selectedLocation;
		if (!location) return;
		const note = cloneNote(builderNote);
		lines[location.lineIndex].notes.splice(
			before ? location.noteIndex : location.noteIndex + 1,
			0,
			note
		);
		flashNote(note.id);
		selectNote(location.lineIndex, note);
	}

	/** Selectable target: clicking empty row space adds there; note cards pick themselves. */
	function lineSelect(lineIndex: number) {
		return (node: HTMLElement) => {
			const handler = (event: MouseEvent) => {
				const origin = event.target as HTMLElement | null;
				if (origin?.closest('.interactive-wrap, .line-menu')) return;
				selectLine(lineIndex);
			};
			node.addEventListener('click', handler);
			return () => node.removeEventListener('click', handler);
		};
	}

	function submitBuilder() {
		const location = selectedLocation;
		if (location) {
			const line = lines[location.lineIndex];
			line.notes[location.noteIndex] = { ...builderNote, id: target.noteId! };
			const next = line.notes[location.noteIndex + 1];
			if (next) selectNote(location.lineIndex, next);
			else cancelSelection();
			return;
		}

		const lineIndex = activeLineIndex;
		const note = cloneNote(builderNote);
		lines[lineIndex].notes.push(note);
		flashNote(note.id);
		builderNote = createNote(builderNote.button, builderNote.accidental, builderNote.bend);
	}

	function addLine() {
		lines.push(createLine());
		target = { lineIndex: lines.length - 1, noteId: null };
		builderNote = createNote();
	}

	function removeSelected() {
		const location = selectedLocation;
		if (!location) return;
		lines[location.lineIndex].notes.splice(location.noteIndex, 1);
		cancelSelection();
	}

	function duplicateLine(lineIndex: number) {
		const copy = createLine(lines[lineIndex].notes.map(cloneNote));
		lines.splice(lineIndex + 1, 0, copy);
		target = { lineIndex: lineIndex + 1, noteId: null };
		builderNote = createNote();
	}

	function removeLine(lineIndex: number) {
		if (lines.length === 1) lines[0].notes = [];
		else lines.splice(lineIndex, 1);
		target = { lineIndex: Math.min(target.lineIndex, Math.max(lines.length - 1, 0)), noteId: null };
		builderNote = createNote();
	}

	function moveLine(lineIndex: number, direction: -1 | 1) {
		const destination = lineIndex + direction;
		if (destination < 0 || destination >= lines.length) return;
		const [line] = lines.splice(lineIndex, 1);
		lines.splice(destination, 0, line);
		if (target.noteId) {
			// Keep an edited note anchored to wherever its line landed.
			if (selectedLocation) target = { ...target, lineIndex: selectedLocation.lineIndex };
		} else if (target.lineIndex === lineIndex) {
			target = { ...target, lineIndex: destination };
		} else if (target.lineIndex === destination) {
			target = { ...target, lineIndex: lineIndex };
		}
	}

	function shareUrl(): string {
		const url = new SvelteURL(resolve('/song'), window.location.origin);
		if (title.trim()) url.searchParams.set('title', title.trim());
		else url.searchParams.delete('title');
		url.searchParams.delete('song');
		url.hash = encodedTabs;
		return url.toString();
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl());
			announce('Share link copied');
		} catch {
			announce('Could not copy the link');
		}
	}

	async function finishEditing() {
		if (!saveCurrentSong()) return;
		cancelSelection();
		await goto(resolve(`/song${routeSuffix()}` as `/song#${string}`));
	}
</script>

<svelte:head>
	<title>{title ? `${title} · Tabs of Time` : 'Tabs of Time'}</title>
	<meta
		name="description"
		content="Write and share button tabs for Ocarina of Time on Nintendo Switch 2."
	/>
</svelte:head>

<svelte:window
	onwheel={() => suspendAutoScroll(180)}
	ontouchstart={() => suspendAutoScroll(700)}
	ontouchend={() => suspendAutoScroll(700)}
	ontouchcancel={() => suspendAutoScroll(700)}
/>

<svelte:document
	onvisibilitychange={() => {
		if (document.visibilityState === 'visible' && playing) void acquireWakeLock();
	}}
/>

<div class="app-shell" class:landing={mode === 'landing'}>
	<header class="site-header">
		<a class="brand" href={resolve('/')} aria-label="Tabs of Time home">
			<span class="brand-mark" aria-hidden="true">♪</span>
			<span><strong>Tabs</strong> <em>of</em> <strong>Time</strong></span>
		</a>
		{#if mode !== 'landing'}
			<div class="header-actions">
				{#if mode === 'view'}
					<a class="nav-item" href={resolve('/')}>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M14.5 5.5 8 12l6.5 6.5" />
						</svg>
						Songs
					</a>
				{/if}
				{#if mode === 'edit'}
					<button type="button" class="button gold" onclick={finishEditing}>Done</button>
				{/if}
			</div>
		{/if}
	</header>

	{#if mode === 'landing'}
		<main class="home">
			<div class="home-content">
				<section class="saved-library" aria-labelledby="saved-songs-title">
					<div class="saved-library-heading">
						<h1 id="saved-songs-title">Songs</h1>
						<a class="button gold" href={resolve('/edit')}>New +</a>
					</div>
					{#if savedSongs.length}
						<ul>
							{#each savedSongs as song (song.id)}
								<li>
									<a
										href={resolve(
											`/song?song=${song.id}&title=${encodeURIComponent(song.title)}#${song.tabs}`
										)}
									>
										<strong>{song.title}</strong>
									</a>
									<SongMenu title={song.title} ondelete={() => removeSavedSong(song.id)} />
								</li>
							{/each}
						</ul>
					{:else}
						<p>No saved songs yet.</p>
					{/if}
				</section>
			</div>
		</main>
	{:else}
		<main class="workspace">
			<section class="song-heading">
				{#if mode === 'edit'}
					<label class="title-field">
						<span class="sr-only">Song title</span>
						<input bind:value={title} maxlength="80" placeholder="Song name" required />
					</label>
				{:else}
					<div class="song-title-row">
						<h1>{title || 'Untitled song'}</h1>
						<div class="song-actions">
							<a
								class="button secondary"
								href={resolve(`/edit${routeSuffix()}` as `/edit#${string}`)}
								onclick={stopPlayback}>Edit</a
							>
							{#if !isSavedLocally}
								<button type="button" class="button secondary" onclick={saveCurrentSong}
									>Save</button
								>
							{/if}
							<button type="button" class="button gold" onclick={copyLink}>Copy link</button>
						</div>
					</div>
				{/if}
			</section>

			{#if mode === 'view'}
				<div class="play-bar">
					<span class="speed-label">Speed <em>{playSpeed.toFixed(1)}</em></span>
					<input
						type="range"
						class="speed-slider"
						min="0.1"
						max="1.5"
						step="0.1"
						aria-label="Playback speed"
						bind:value={playSpeed}
						oninput={persistPlaySpeed}
					/>
					<button type="button" class="button gold" onclick={togglePlayback}>
						{playing ? 'Stop' : 'Play'}
					</button>
				</div>
			{/if}

			<div class:editor-layout={mode === 'edit'}>
				<section class="tab-sheet" aria-label="Song tab">
					{#each lines as line, lineIndex (line.id)}
						<div
							class:active-line={mode === 'edit' && activeLineIndex === lineIndex && !target.noteId}
							class="tab-line"
							class:selectable={mode === 'edit'}
							{@attach lineSelect(lineIndex)}
						>
							<div class="line-header">
								<span class="line-number">{String(lineIndex + 1).padStart(2, '0')}</span>
								{#if mode === 'edit'}
									<LineMenu
										lineNumber={lineIndex + 1}
										canMoveUp={lineIndex > 0}
										canMoveDown={lineIndex < lines.length - 1}
										onmoveup={() => moveLine(lineIndex, -1)}
										onmovedown={() => moveLine(lineIndex, 1)}
										onduplicate={() => duplicateLine(lineIndex)}
										ondelete={() => removeLine(lineIndex)}
									/>
								{/if}
							</div>
							<div class="notes">
								{#each line.notes as note (note.id)}
									<NoteCard
										{note}
										interactive={mode === 'edit'}
										selected={target.noteId === note.id}
										flash={flashNoteId === note.id}
										onselect={() => selectNote(lineIndex, note)}
									/>
								{/each}
							</div>
						</div>
					{/each}

					{#if mode === 'edit'}
						<button type="button" class="add-line" onclick={addLine}>＋ Add line</button>
					{/if}
				</section>

				{#if mode === 'edit'}
					<aside class="editor-panel">
						<NoteBuilder
							value={builderNote}
							editing={editingNote}
							onchange={(note) => (builderNote = note)}
							onsubmit={submitBuilder}
							ondelete={removeSelected}
							onaddbefore={() => addAdjacentNote(true)}
							onaddafter={() => addAdjacentNote(false)}
						/>
					</aside>
				{/if}
			</div>
		</main>
	{/if}

	<footer>
		<p>Unofficial fan-made tool. Not affiliated with or endorsed by Nintendo.</p>
		<p>
			Game artwork © Nintendo · Controller glyphs by <a
				href="https://kenney.nl/assets/input-prompts">Kenney</a
			>
			(CC0) ·
			<a href="https://zeldauniverse.net/wp-content/uploads/2021/11/hylia-serif.zip">Hylia Serif</a>
		</p>
	</footer>

	{#if message}<div class="toast" role="status">{message}</div>{/if}
</div>
