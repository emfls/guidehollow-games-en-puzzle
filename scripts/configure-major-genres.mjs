import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// The user requested broad genres, not one site for every provider tag/type.
// Keep this deliberately finite. Source genres are the provider's real slugs.
const groups = [
  { id: 'puzzle', label: 'Puzzles', sources: ['puzzle', 'logic', 'brain', 'match-3', 'bubble-shooter', 'words', 'number', 'math', 'sudoku', 'maze'] },
  { id: 'racing', label: 'Racing', sources: ['racing', 'car-racing', 'car', 'drifting', 'motorbike', 'dirt-bike', 'bike'] },
  { id: 'sports', label: 'Sports', sources: ['sports', 'soccer', 'american-football', 'basketball', 'tennis', 'golf', 'bowling', 'cricket', 'boxing', 'hockey', 'baseball'] },
  { id: 'arcade', label: 'Arcade', sources: ['arcade', 'skill', 'snake', 'running', 'runner', 'ball', 'retro', 'flappy-bird'] },
  { id: 'action', label: 'Action', sources: ['action', 'fighting', 'war', 'ninja', 'superhero'] },
  { id: 'adventure', label: 'Adventure', sources: ['adventure', 'escape', 'story', 'survival', 'crafting', 'hidden-object', 'pirates', 'minecraft'] },
  { id: 'strategy', label: 'Strategy', sources: ['strategy', 'tower-defense', 'management', 'army', 'battleship'] },
  { id: 'simulation', label: 'Simulation', sources: ['simulation', 'driving', 'farm', 'cooking', 'restaurant', 'hospital', 'construction', 'doctor', 'train', 'airplane'] },
  { id: 'horror', label: 'Horror', sources: ['horror', 'scary', 'ghost', 'zombie'] },
  { id: 'shooting', label: 'Shooting', sources: ['shooting', 'gun', 'first-person-shooter', 'sniper', 'archery', 'battle-royale'] },
  { id: 'rpg', label: 'RPG', sources: ['rpg'] },
  { id: 'platform', label: 'Platformers', sources: ['platform', 'obby', 'parkour'] },
  { id: 'idle', label: 'Idle & Clicker', sources: ['idle', 'clicker', 'tycoon'] },
  { id: 'card-board', label: 'Card & Board', sources: ['cards', 'board', 'solitaire', 'chess', 'checkers', 'backgammon', 'mahjong'] },
  { id: 'multiplayer', label: 'Multiplayer', sources: ['multiplayer', 'two-player', 'co-op', 'io', '1v1', 'pvp'] },
  { id: 'creative', label: 'Dress Up & Creative', sources: ['dress-up', 'make-over', 'make-up', 'fashion', 'drawing', 'decoration', 'hair', 'tattoo'] },
];

const copy = {
  action: ['arcade', '#f2dc69', 'Read the moment. Make your move.', 'Explore action games built around movement, combat and quick decisions. Compare each game’s objective, controls and supported devices before starting.', 'Choose a challenge by the kind of action you enjoy: close encounters, movement through a level or survival under pressure. Each game has its own guide so you can check its controls and pace before you play.'],
  adventure: ['puzzle', '#246b4b', 'Follow a clue. Find your next story.', 'Explore browser adventures, investigate scenes and work through escape challenges. Read each game’s story, objective and controls before you begin.', 'Adventure games ask you to observe your surroundings and decide what to try next. Compare the individual guides to find exploration, hidden objects, story choices or escape puzzles that match the kind of session you want.'],
  strategy: ['idle', '#bded65', 'Think ahead. Make each choice count.', 'Plan defenses, manage resources and choose your next move in browser strategy games. Find game-specific goals, controls and device information.', 'Look at what each game asks you to protect, build or manage before committing your resources. The individual guides explain the available decisions and help distinguish fast tactical rounds from slower planning challenges.'],
  simulation: ['simulation', '#16766b', 'Try another role. Shape your own world.', 'Try browser simulations with different roles, routines and systems to explore. Compare their goals, controls, device support and in-game languages.', 'Simulation games let you experiment with how a small world works. Start with a role or activity that interests you, then read its guide to understand what can be controlled and how progress is measured.'],
  horror: ['horror', '#ed777a', 'Keep your nerve. Find a way out.', 'Explore tense browser horror games, unsettling places and escape challenges. Read the objective and controls before entering each game.', 'Choose between investigating an unfamiliar place, watching for changes and trying to escape a threat. Horror games can use sudden sounds, darkness and frightening scenes; the individual guides help you understand the premise before launching.'],
  shooting: ['shooting', '#62d4ed', 'Find your target. Time your shot.', 'Explore browser shooting games with different aiming systems and objectives. Check controls, supported devices and game languages on each page.', 'Compare precision aiming, arena encounters and other shooting challenges by reading their individual guides. The controls and pace differ between games, so check whether a title uses keyboard and mouse, touch input or both before starting.'],
  rpg: ['arcade', '#f2dc69', 'Choose a path. Grow into the adventure.', 'Explore browser role-playing games with characters, encounters and progression systems. Read each game’s rules and controls before beginning your journey.', 'Role-playing games differ in how you explore, fight and develop your character. Use the game guides to compare their progression and decision-making, then choose a world whose pace and controls suit you.'],
  platform: ['simulation', '#16766b', 'One well-timed jump. A new way through.', 'Explore platform games built around jumps, movement and navigating obstacles. Find the rules, controls and supported devices for each challenge.', 'Read the course and experiment with timing before rushing ahead. Platform games can change how movement works from one title to the next, and the individual guides explain the particular goal and controls you will be using.'],
  idle: ['idle', '#bded65', 'Start small. Build something bigger.', 'Explore idle and clicker games about upgrades, production and growing a small operation. Check how each game works and which devices it supports.', 'Compare the upgrade choices and activities in each game before starting. These games use different forms of progress, and the guides describe what you control. Offline progress is game-specific and is not assumed for every title.'],
  'card-board': ['puzzle', '#246b4b', 'A familiar board. A different decision.', 'Play browser card and board games with clear rules and game-specific instructions. Find a table, puzzle or card layout that suits your session.', 'Start by checking the rules used in each game. Card layouts, board goals and turn structures can differ even when the pieces look familiar. The guides explain the available moves and whether you play alone or against an opponent.'],
  multiplayer: ['shooting', '#62d4ed', 'Share the challenge. Play your part.', 'Explore multiplayer browser games and compare their modes, controls and supported devices. Check each title’s guide before joining a game.', 'Multiplayer can mean an online match, a shared-device game or a cooperative challenge. Read the individual instructions to see which mode a title actually offers and how players join, rather than assuming every game works the same way.'],
  creative: ['simulation', '#16766b', 'Make it yours. One detail at a time.', 'Explore dress-up, styling and creative browser games. Read how each activity works, compare device support and choose something to make your own.', 'Compare styling, design and other creative activities through their individual guides. Each game provides its own tools and goals, so check the available choices before starting your next look or creation.'],
};

const sites = JSON.parse(readFileSync('data/sites.json', 'utf8'));
const byId = new Map(sites.map(site => [site.id, site]));
for (const group of groups) {
  const id = `en-${group.id}`;
  const existing = byId.get(id);
  if (existing) {
    existing.genreLabel = group.label;
    existing.sourceGenres = group.sources;
    continue;
  }
  const [theme, accent, tagline, description, intro] = copy[group.id];
  sites.push({
    id, locale: 'en', brand: `GuideHollow ${group.label}`, genre: group.id, genreLabel: group.label,
    repo: `emfls/guidehollow-games-${id}`, baseUrl: `https://${id}.guidehollow.com/`,
    title: `Free ${group.label} Games Online | GuideHollow`, tagline, description, intro,
    accent, theme, sourceGenres: group.sources, gameIds: [], subcategories: [],
    indexNowKey: randomBytes(16).toString('hex'), active: false,
  });
}

writeFileSync('data/sites.json', `${JSON.stringify(sites, null, 2)}\n`);
writeFileSync('data/genre-groups.json', `${JSON.stringify({
  language: 'en', scope: '16 broad game genres; detailed provider types remain in-site filters',
  source: 'https://playgama.com/all/categories', reviewedAt: '2026-11-07',
  groups,
}, null, 2)}\n`);
console.log(`Configured ${groups.length} broad English genres; existing publication flags and games were preserved.`);
