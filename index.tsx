/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- ENUMS AND TYPES ---
enum GameType {
    SCHIEBEN = 'schieben'
}

type Highscore = {
    name: string;
    score: number;
    date: string;
    game: GameType;
}

// --- GLOBAL STATE ---
let playerScore = 0;
let henryScore = 0;
let totalPlayerScore = 0;
let totalHenryScore = 0;
let currentRound = 1;
let gameActive = false;
let difficulty = 'medium';
const selectedGame: GameType = GameType.SCHIEBEN; // Only one game now
let highscoresData: Highscore[] = [];
let scoreToSave = 0; // Temp score while waiting for name input
let lastHenryQuotes: { [key: string]: string } = {};
let isMuted = false;
let isMusicStarted = false;

// --- KRUG-SCHIEBEN STATE ---
const SHUFFLE_MAX_ROUNDS = 10;
type ShuffleState = 'power' | 'angle' | 'sliding' | 'done';
let shuffleState: ShuffleState = 'done';
let selectedPower = 0;

// --- CONSTANTS ---
const HIGHSCORE_STORAGE_KEY = 'henrysBierolympiadeHighscores';
const henryQuotes = {
  gameStart: [
    "Zeig mir, was du drauf hast! Ein ruhiges Händchen und ein gutes Auge!", 
    "Das wird eine klare Sache für mich.", 
    "Konzentration! Der Krug will geführt werden.",
    "Heute spendier' ich dir 'ne Lektion im Krug-Schieben!",
    "Mal sehen, ob du mehr als nur heiße Luft zu bieten hast.",
    "Na dann, auf geht's! Möge der Bessere... also ich... gewinnen!",
    "Ich hab schon Krüge geschoben, da hast du noch in die Windeln gemacht!",
    "Bist du bereit, eine Lektion in Präzision zu erhalten?",
    "Der Krug wartet. Lass ihn nicht zu lange warten."
  ],
  playerGoodShot: [
    "Glück gehabt!", 
    "Nicht schlecht, aber das kannst du nicht wiederholen!", 
    "Unerhört! Mein Krug hatte einen Drall!",
    "Ein blindes Huhn findet auch mal ein Korn... oder einen Krug.",
    "Anfängerglück! Das zählt nicht wirklich.",
    "Zufall! Das war reiner Zufall!",
    "Hast du etwa heimlich geübt?",
    "Okay, der war nicht schlecht. Aber jetzt kommt mein Konter!",
    "Moment mal... das war fast so gut wie meine Würfe.",
    "Vorsicht, Hochmut kommt vor dem Fall!"
  ],
  playerBadShot: [
      "Haha! War das alles?",
      "Mein Zug! Ich zeig' dir, wie das geht.",
      "Zu viel oder zu wenig Gefühl in den Händen?",
      "Das war wohl nichts. Brauchst du Nachhilfe?",
      "Schwacher Versuch. Jetzt kommt der Meister.",
      "Zitterst du etwa? Haha!",
      "Das war ja ein Schuss in den Ofen.",
      "Soll ich dir mal zeigen, wie man das mit Gefühl macht?",
      "Mehr Kraft! Oder weniger? Ach, egal, war eh nichts.",
      "Vielleicht solltest du es mal mit Bowling versuchen."
  ],
  henryGoodShot: [
    "Perfekt geschoben!", 
    "Das ist die Technik eines Meisters!", 
    "Ich hab's einfach im Gefühl.",
    "Siehst du? So macht man das!",
    "Lehrstunde beendet. Nächste Runde?",
    "So schiebt der Meister! Lern was draus.",
    "Wie auf Schienen! Einfach perfekt.",
    "Das ist die Kunst des Krug-Schiebens.",
    "Und wieder ein Volltreffer. Langsam wird's langweilig.",
    "Ich bin in Topform heute!"
  ],
  henryBadShot: [
      "Verdammt! Der Tisch ist schief!",
      "Das war nur zum Aufwärmen.",
      "Ich hab dich nur gewinnen lassen, um es spannend zu machen.",
      "Hmpf. Konzentrationsfehler.",
      "Gleich hab ich den Dreh wieder raus.",
      "Uff... der Tisch hat 'ne Delle, eindeutig!",
      "Ich wollte nur sehen, ob du aufpasst.",
      "Der war nur gespielt schlecht, um dich in Sicherheit zu wiegen.",
      "Der Krug ist heute aber auch rutschig.",
      "Sogar meine schlechten Würfe sind noch elegant."
  ],
  roundEndHenryWins: [
    "Wieder eine Runde für mich. Zu einfach!",
    "Ich baue meinen Vorsprung aus!",
    "Gib's auf, du hast keine Chance!",
    "Und der Punkt geht an... MICH! Überraschung.",
    "Siehst du? Erfahrung schlägt alles.",
    "Du machst es mir echt zu einfach."
  ],
  roundEndPlayerWins: [
    "Das war nur Glück, verlass dich nicht drauf!",
    "Jetzt werd ich ernst machen!",
    "Du forderst mich wirklich heraus... interessant.",
    "Na schön, die Runde geb ich dir. Aber nur die!",
    "Freu dich nicht zu früh, das Spiel ist noch lang.",
    "Wie hast du das gemacht?! Schummelst du?"
  ],
  roundEndTie: [
    "Unentschieden. Das lasse ich nicht auf mir sitzen!",
    "Gleichstand... noch!",
    "Wir sind auf Augenhöhe. Für den Moment.",
    "Patt. Das ist ja fast wie verlieren für mich.",
    "Noch bist du auf Augenhöhe. Betonung auf 'noch'.",
    "Ein Unentschieden? Das akzeptiere ich nicht. Nächste Runde!"
  ],
  gameEndPlayerWins: [
    "Das war pures Glück! Revanche! Sofort!",
    "Du hast gewonnen? Das muss ein Fehler in der Matrix sein. Nächstes Mal nicht!",
    "Glückwunsch... Anfänger. Das nächste Spiel geht an mich."
  ],
  gameEndHenryWins: [
      "Haha! Gegen mich hast du keine Chance! War doch klar.",
      "Sieg! Wie immer. Ein Prost auf mich!",
      "Eine solide Leistung von dir, aber am Ende gewinnt immer der Meister."
  ]
};

// --- Physics & AI Calibration ---
// Rule 1: The target is centered at 65% of the table's length (100% - 35% top position in CSS).
const TARGET_CENTER_PERCENTAGE = 0.65;
// Rule 2: A power of 95% makes the mug travel 100% of the table's length (a foul).
const FOUL_POWER = 95;
// Rule 3: Use a non-linear power curve for a more natural feel.
const PHYSICS_EXPONENT = 1.5;

// Derived Sweet Spot: Calculate the exact power needed to hit the target center based on the rules above.
const SWEET_SPOT_POWER = FOUL_POWER * Math.pow(TARGET_CENTER_PERCENTAGE, 1 / PHYSICS_EXPONENT);
// This results in a sweet spot of ~72.04%

// AI difficulty is now calibrated to the dynamically calculated SWEET_SPOT_POWER.
const difficultySettings: any = {
  easy:    { shufflePower: { min: SWEET_SPOT_POWER - 10, max: SWEET_SPOT_POWER + 10 }, shuffleAngleError: 15 }, // 62-82
  medium:  { shufflePower: { min: SWEET_SPOT_POWER - 7, max: SWEET_SPOT_POWER + 7 }, shuffleAngleError: 10 },   // 65-79
  hard:    { shufflePower: { min: SWEET_SPOT_POWER - 4, max: SWEET_SPOT_POWER + 4 }, shuffleAngleError: 6 },    // 68-76
  extreme: { shufflePower: { min: SWEET_SPOT_POWER - 1, max: SWEET_SPOT_POWER + 1 }, shuffleAngleError: 1.5 } // 71-73
};


// --- DOM ELEMENTS ---
const menuScreen = document.getElementById('menuScreen');
const shuffleGameScreen = document.getElementById('shuffleGameScreen');
const gameoverScreen = document.getElementById('gameoverScreen');
const highscoreScreen = document.getElementById('highscoreScreen');
const rulesScreen = document.getElementById('rulesScreen');
const muteBtn = document.getElementById('muteBtn');

// --- SOUND ELEMENTS ---
const clickSound = document.getElementById('clickSound') as HTMLAudioElement;
const slideSound = document.getElementById('slideSound') as HTMLAudioElement;
const scoreSound = document.getElementById('scoreSound') as HTMLAudioElement;
const winSound = document.getElementById('winSound') as HTMLAudioElement;
const loseSound = document.getElementById('loseSound') as HTMLAudioElement;
const backgroundMusic = document.getElementById('backgroundMusic') as HTMLAudioElement;
const allSounds: (HTMLAudioElement | null)[] = [clickSound, slideSound, scoreSound, winSound, loseSound, backgroundMusic];

// --- SOUND LOGIC ---
function playSound(sound: HTMLAudioElement | null) {
  if (isMuted || !sound) return;
  // Resetting time allows the sound to be re-triggered before it's finished
  sound.currentTime = 0;
  sound.play().catch(error => {
    // Autoplay is often blocked by browsers until the user interacts with the page.
    console.warn("Sound play was blocked by the browser:", error);
  });
}

function startMusicIfNotPlaying() {
    if (!isMusicStarted && backgroundMusic) {
        backgroundMusic.volume = 0.2; // Set to a quiet volume
        backgroundMusic.play().then(() => {
            isMusicStarted = true;
        }).catch(error => {
            console.warn("Background music autoplay was blocked:", error);
            // We'll try again on the next interaction.
        });
    }
}

// --- GENERIC GAME LOGIC ---

function startGame(diff: string) {
  difficulty = diff;
  playerScore = 0;
  henryScore = 0;
  totalPlayerScore = 0;
  totalHenryScore = 0;
  currentRound = 1;
  gameActive = true;
  lastHenryQuotes = {}; // Reset last quotes for a new game
  
  menuScreen?.classList.remove('active');
  startShuffleGame();
}

function backToMenu() {
  gameoverScreen?.classList.remove('active');
  highscoreScreen?.classList.remove('active');
  shuffleGameScreen?.classList.remove('active');
  rulesScreen?.classList.remove('active');
  menuScreen?.classList.add('active');
  document.getElementById('newHighscore')!.style.display = 'none';
  (document.getElementById('playerNameInput') as HTMLInputElement).value = '';
  scoreToSave = 0;
}

function endGame() {
    gameActive = false;

    shuffleGameScreen?.classList.remove('active');
    gameoverScreen?.classList.add('active');

    const finalScore = totalPlayerScore;
    const won = totalPlayerScore > totalHenryScore;
    
    if (won) {
        playSound(winSound);
    } else {
        playSound(loseSound);
    }

    const gameoverTitleEl = document.getElementById('gameoverTitle');
    if (gameoverTitleEl) gameoverTitleEl.textContent = won ? '🏆 DU HAST GEWONNEN! 🏆' : '😢 HENRY GEWINNT! 😢';
    
    const finalQuoteEl = document.getElementById('finalQuote');
    if(finalQuoteEl) finalQuoteEl.textContent = won ? getHenryQuote('gameEndPlayerWins') : getHenryQuote('gameEndHenryWins');
    
    document.getElementById('finalPlayerScore')!.textContent = `${totalPlayerScore}`;
    document.getElementById('finalHenryScore')!.textContent = `${totalHenryScore}`;
    
    const finalRoundEl = document.getElementById('finalRound');
    const finalRoundLabelEl = document.getElementById('finalRoundLabel');
    if (finalRoundEl && finalRoundLabelEl) {
        finalRoundEl.textContent = `${currentRound}`;
        finalRoundLabelEl.textContent = 'Runden';
    }
    
    const accuracyContainer = document.getElementById('finalAccuracyContainer');
    if(accuracyContainer) {
        accuracyContainer.style.display = 'none';
    }
    
    document.getElementById('roundResult')!.textContent = `Endergebnis nach ${currentRound} Runden.`;
    
    const nextRoundBtn = document.getElementById('nextRoundBtn')!;
    const backToMenuBtn = document.getElementById('backToMenuBtn')!;
    nextRoundBtn.style.display = 'none';
    backToMenuBtn.style.display = 'none';

    if (isNewHighscore(finalScore)) {
        scoreToSave = finalScore;
        document.getElementById('newHighscore')!.style.display = 'block';
    } else {
        backToMenuBtn.style.display = 'inline-block';
    }
}


// --- KRUG-SCHIEBEN LOGIC ---

function startShuffleGame() {
    shuffleGameScreen?.classList.add('active');
    updateShuffleUI();
    
    document.getElementById('shuffleHenryQuote')!.textContent = getHenryQuote('gameStart');

    setTimeout(startShuffleTurn, 1000);
}

function updateShuffleUI() {
    document.getElementById('shufflePlayerScore')!.textContent = `${totalPlayerScore}`;
    document.getElementById('shuffleHenryScore')!.textContent = `${totalHenryScore}`;
    document.getElementById('shuffleRoundDisplay')!.textContent = `Runde ${currentRound}/${SHUFFLE_MAX_ROUNDS}`;
}

function startShuffleTurn() {
    const turnIndicator = document.getElementById('turnIndicator')!;
    turnIndicator.innerHTML = 'Dein Zug';
    turnIndicator.className = 'turn-indicator player';

    shuffleState = 'power';
    const mug = document.querySelector('.shuffle-mug') as HTMLElement;
    mug.style.transition = 'none';
    mug.style.transform = 'translateX(-50%)';

    const actionBtn = document.getElementById('shuffleActionBtn') as HTMLButtonElement;
    actionBtn.disabled = false;
    actionBtn.textContent = 'Kraft!';

    const powerIndicator = document.querySelector('.power-meter-indicator-h') as HTMLElement;
    const angleIndicator = document.querySelector('.angle-indicator-h') as HTMLElement;
    powerIndicator.style.animationPlayState = 'running';
    angleIndicator.style.animationPlayState = 'paused';
}

function handleShuffleAction() {
    if (shuffleState === 'sliding' || shuffleState === 'done') return;

    const actionBtn = document.getElementById('shuffleActionBtn') as HTMLButtonElement;
    const powerIndicator = document.querySelector('.power-meter-indicator-h') as HTMLElement;
    const angleIndicator = document.querySelector('.angle-indicator-h') as HTMLElement;

    if (shuffleState === 'power') {
        powerIndicator.style.animationPlayState = 'paused';
        const powerMeter = document.querySelector('.power-meter-h') as HTMLElement;
        selectedPower = (powerIndicator.offsetWidth / powerMeter.offsetWidth) * 100;
        
        shuffleState = 'angle';
        actionBtn.textContent = 'Winkel!';
        angleIndicator.style.animationPlayState = 'running';

    } else if (shuffleState === 'angle') {
        angleIndicator.style.animationPlayState = 'paused';
        const angleMeter = document.querySelector('.angle-meter-h') as HTMLElement;
        const indicatorRect = angleIndicator.getBoundingClientRect();
        const meterRect = angleMeter.getBoundingClientRect();
        
        // Position des Indikator-Zentrums relativ zum Meter-Zentrum (-0.5 bis 0.5)
        const relativePosition = ((indicatorRect.left + indicatorRect.width / 2) - (meterRect.left + meterRect.width / 2)) / meterRect.width;
        
        // Mappt auf einen Winkel, z.B. -40 bis 40 Grad
        const maxAngle = 40; 
        const angle = relativePosition * 2 * maxAngle;
        
        shuffleState = 'sliding';
        actionBtn.disabled = true;

        animateMugSlide(selectedPower, angle, 'player');
    }
}


function animateMugSlide(power: number, angle: number, user: 'player' | 'henry') {
    const mug = document.querySelector('.shuffle-mug') as HTMLElement;
    const table = document.querySelector('.shuffle-table') as HTMLElement;
    if (!mug || !table) return;

    playSound(slideSound);
    mug.style.transition = 'transform 2s cubic-bezier(0.2, 0.8, 0.4, 1)';
    
    const tableHeight = table.offsetHeight;
    
    // The physics calculation is now derived from the constants defined at the top.
    // This ensures that FOUL_POWER (95%) results in a distance of exactly tableHeight.
    const distanceMultiplier = tableHeight / Math.pow(FOUL_POWER / 100, PHYSICS_EXPONENT);
    const distance = Math.pow(power / 100, PHYSICS_EXPONENT) * distanceMultiplier;

    const angleRad = angle * (Math.PI / 180);
    const finalX = distance * Math.sin(angleRad);
    const finalY = -distance * Math.cos(angleRad);

    // Initial position is translateX(-50%). We add to that.
    mug.style.transform = `translateX(calc(-50% + ${finalX}px)) translateY(${finalY}px)`;

    setTimeout(() => {
        const score = calculateShuffleScore(mug, table);
        if (score > 0) {
            playSound(scoreSound);
        }

        const turnIndicator = document.getElementById('turnIndicator')!;
        
        if (user === 'player') {
            playerScore = score;
            totalPlayerScore += score;
            showScorePopup(`+${score}`);
            
            let playerTurnQuote = "";
            if (score >= 50) {
                playerTurnQuote = getHenryQuote('playerGoodShot');
            } else if (score < 20) {
                playerTurnQuote = getHenryQuote('playerBadShot');
            } else {
                playerTurnQuote = "Mein Zug! Mal sehen, ob ich das toppen kann.";
            }
            document.getElementById('shuffleHenryQuote')!.textContent = playerTurnQuote;
            
            turnIndicator.innerHTML = `Henrys Zug`;
            turnIndicator.className = 'turn-indicator henry';
            
            setTimeout(henrySlide, 2000);
        } else {
            henryScore = score;
            totalHenryScore += score;
            showScorePopup(`Henry +${score}`, true);

            let henryTurnQuote = "";
            if (score >= 50) {
                henryTurnQuote = getHenryQuote('henryGoodShot');
            } else if (score < 20) {
                henryTurnQuote = getHenryQuote('henryBadShot');
            } else {
                henryTurnQuote = "Nicht perfekt, aber solide.";
            }
            document.getElementById('shuffleHenryQuote')!.textContent = henryTurnQuote;
            setTimeout(endShuffleRound, 1500);
        }
        updateShuffleUI();
    }, 2200);
}


function calculateShuffleScore(mug: HTMLElement, table: HTMLElement): number {
    const tableRect = table.getBoundingClientRect();
    const mugRect = mug.getBoundingClientRect();
    const target = table.querySelector('.target') as HTMLElement;
    if (!target) return 0;
    const targetRect = target.getBoundingClientRect();

    const mugCenterX = mugRect.left + mugRect.width / 2;
    const mugCenterY = mugRect.top + mugRect.height / 2;

    if (mugCenterY < tableRect.top || mugCenterY > tableRect.bottom ||
        mugCenterX < tableRect.left || mugCenterX > tableRect.right) {
        return 0; // Foul, off the table
    }

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    const distance = Math.sqrt(
        Math.pow(mugCenterX - targetCenterX, 2) + 
        Math.pow(mugCenterY - targetCenterY, 2)
    );

    const r100 = (target.querySelector('.r-100') as HTMLElement).offsetWidth / 2;
    const r50 = (target.querySelector('.r-50') as HTMLElement).offsetWidth / 2;
    const r20 = (target.querySelector('.r-20') as HTMLElement).offsetWidth / 2;
    const r10 = (target.querySelector('.r-10') as HTMLElement).offsetWidth / 2;

    if (distance <= r100) return 100;
    if (distance <= r50) return 50;
    if (distance <= r20) return 20;
    if (distance <= r10) return 10;
    
    return 0; // Missed target
}


function henrySlide() {
    const mug = document.querySelector('.shuffle-mug') as HTMLElement;
    mug.style.transition = 'none';
    mug.style.transform = 'translateX(-50%)';

    let henryPower: number;
    let henryAngle: number;

    // Henry's Skill Level: 9/10
    // 90% chance for a "Meisterwurf"
    // 10% chance for a "Profi-Wurf"
    if (Math.random() < 0.9) {
        // "Meisterwurf": Power between 63% and 68%.
        henryPower = 63 + Math.random() * (68 - 63);
        
        // Use 'extreme' angle for high precision.
        const angleError = difficultySettings['extreme'].shuffleAngleError;
        henryAngle = (Math.random() - 0.5) * 2 * angleError;
    } else {
        // "Profi-Wurf": Power is in one of two ranges: [50-62] or [69-80].
        const range1_size = 62 - 50;
        const range2_size = 80 - 69;
        const totalRangeSize = range1_size + range2_size;

        const randomPoint = Math.random() * totalRangeSize;

        if (randomPoint < range1_size) {
            // Point is in the first range
            henryPower = 50 + randomPoint;
        } else {
            // Point is in the second range
            henryPower = 69 + (randomPoint - range1_size);
        }

        // Use 'hard' angle for slightly less precision.
        const angleError = difficultySettings['hard'].shuffleAngleError;
        henryAngle = (Math.random() - 0.5) * 2 * angleError;
    }
    
    setTimeout(() => {
        animateMugSlide(henryPower, henryAngle, 'henry');
    }, 1000);
}

function endShuffleRound() {
    updateShuffleUI();
    
    let roundEndQuote = "";
    if (henryScore > playerScore) {
        roundEndQuote = getHenryQuote('roundEndHenryWins');
    } else if (playerScore > henryScore) {
        roundEndQuote = getHenryQuote('roundEndPlayerWins');
    } else {
        roundEndQuote = getHenryQuote('roundEndTie');
    }
    document.getElementById('shuffleHenryQuote')!.textContent = roundEndQuote;

    if (currentRound < SHUFFLE_MAX_ROUNDS) {
        currentRound++;
        setTimeout(startShuffleTurn, 2000); // Increased delay to read quote
    } else {
        setTimeout(() => endGame(), 2000); // Increased delay to read quote
    }
}

// --- UI HELPER FUNCTIONS ---

function showScorePopup(text: string, isHenry = false) {
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = text;
  popup.style.color = isHenry ? '#c0392b' : '#4CAF50';
  
  const gameContainer = document.querySelector('.game-container');
  if (!gameContainer) return;
  
  gameContainer.appendChild(popup);
  // Animation duration is 1.5s, so remove after that.
  setTimeout(() => popup.remove(), 1500);
}

function getHenryQuote(category: keyof typeof henryQuotes): string {
    const quotes = henryQuotes[category];
    if (!quotes || quotes.length === 0) return "";

    let newQuote = "";
    // Try to get a different quote than the last one from this category
    if (quotes.length > 1) {
        do {
            newQuote = quotes[Math.floor(Math.random() * quotes.length)];
        } while (newQuote === lastHenryQuotes[category]);
    } else {
        newQuote = quotes[0];
    }
    
    lastHenryQuotes[category] = newQuote;
    return newQuote;
}


// --- HIGHSCORE LOGIC ---
function loadHighscores() {
  const data = localStorage.getItem(HIGHSCORE_STORAGE_KEY);
  highscoresData = data ? JSON.parse(data) : [];
}

function saveHighscores() {
  localStorage.setItem(HIGHSCORE_STORAGE_KEY, JSON.stringify(highscoresData));
}

function isNewHighscore(score: number): boolean {
  if (score === 0) return false;
  const gameHighscores = highscoresData.filter(hs => hs.game === selectedGame);
  if (gameHighscores.length < 10) return true;
  const lowestHighscore = gameHighscores.sort((a, b) => a.score - b.score)[0];
  return score > lowestHighscore.score;
}

function addHighscore(name: string, score: number) {
  const newHighscore: Highscore = {
    name: name || 'Anonym',
    score,
    date: new Date().toLocaleDateString('de-DE'),
    game: selectedGame
  };
  highscoresData.push(newHighscore);
  highscoresData.sort((a, b) => b.score - a.score);
  
  const gameHighscores = highscoresData.filter(hs => hs.game === selectedGame);
    if (gameHighscores.length > 10) {
        const scoreToRemove = gameHighscores[10].score;
        const nameToRemove = gameHighscores[10].name;
        // Find the actual entry in the main array to remove
        const indexToRemove = highscoresData.findIndex(hs => hs.game === selectedGame && hs.score === scoreToRemove && hs.name === nameToRemove);
        if (indexToRemove > -1) {
            highscoresData.splice(indexToRemove, 1);
        }
    }
    
  saveHighscores();
}

function displayHighscores() {
    const container = document.getElementById('highscoreTableContainer');
    if (!container) return;

    const filteredScores = highscoresData.filter(hs => hs.game === GameType.SCHIEBEN).sort((a, b) => b.score - a.score);

    if (filteredScores.length === 0) {
        container.innerHTML = '<p>Noch keine Highscores. Sei der Erste!</p>';
        return;
    }

    let html = `
        <div class="highscore-table">
            <div class="highscore-header highscore-rank">#</div>
            <div class="highscore-header">Name</div>
            <div class="highscore-header">Punkte</div>
            <div class="highscore-header">Datum</div>
    `;

    filteredScores.forEach((score, index) => {
        const rank = index + 1;
        let rankDisplay = `${rank}`;
        if (rank === 1) rankDisplay = '🥇';
        if (rank === 2) rankDisplay = '🥈';
        if (rank === 3) rankDisplay = '🥉';

        html += `
            <div class="highscore-row">
                <div class="highscore-rank">${rankDisplay}</div>
                <div class="highscore-name">${score.name}</div>
                <div class="highscore-score">${score.score}</div>
                <!-- Wrapper for mobile layout -->
                <div class="highscore-details-wrapper">
                    <div class="highscore-date">${score.date}</div>
                </div>
            </div>
        `;
    });

    html += '</div>'; // close table
    container.innerHTML = html;
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Delegated listener for immediate sound feedback on button press
    document.body.addEventListener('mousedown', (e) => {
        startMusicIfNotPlaying();
        const targetButton = (e.target as HTMLElement).closest('button');
        if (targetButton && targetButton.id !== 'muteBtn') {
            playSound(clickSound);
        }
    });

    muteBtn?.addEventListener('click', () => {
        isMuted = !isMuted;
        if (muteBtn) muteBtn.textContent = isMuted ? '🔇' : '🔊';
        
        allSounds.forEach(sound => {
            if(sound) sound.muted = isMuted;
        });

        // Feedback sound when unmuting.
        if (!isMuted) {
            playSound(clickSound);
        }
    });

    document.getElementById('startGameBtn')?.addEventListener('click', () => {
        startGame('medium');
    });

    document.getElementById('backToMenuBtn')?.addEventListener('click', backToMenu);
    
    document.getElementById('shuffleActionBtn')?.addEventListener('click', handleShuffleAction);

    document.getElementById('showHighscoresBtn')?.addEventListener('click', () => {
        menuScreen?.classList.remove('active');
        highscoreScreen?.classList.add('active');
        displayHighscores();
    });

    document.getElementById('showRulesBtn')?.addEventListener('click', () => {
        menuScreen?.classList.remove('active');
        rulesScreen?.classList.add('active');
    });

    document.getElementById('backToMenuFromHighscoresBtn')?.addEventListener('click', backToMenu);
    document.getElementById('backToMenuFromRulesBtn')?.addEventListener('click', backToMenu);

    document.getElementById('saveHighscoreBtn')?.addEventListener('click', () => {
        const name = (document.getElementById('playerNameInput') as HTMLInputElement).value;
        if (name.trim() && scoreToSave > 0) {
            addHighscore(name, scoreToSave);
            scoreToSave = 0;
            document.getElementById('newHighscore')!.style.display = 'none';
            document.getElementById('backToMenuBtn')!.style.display = 'inline-block';
        }
    });
}

// --- INITIALIZATION ---
loadHighscores();
setupEventListeners();
startMusicIfNotPlaying();
