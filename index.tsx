/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- ENUMS AND TYPES ---
enum GameType {
    BIER_BLITZ = 'bier-blitz',
    SCHIEBEN = 'schieben'
}

type Highscore = {
    name: string;
    score: number;
    date: string;
    difficulty: string;
    game: GameType;
}

// --- GLOBAL STATE ---
let playerScore = 0;
let henryScore = 0;
let totalPlayerScore = 0;
let totalHenryScore = 0;
let currentRound = 1; // Used for Krug-Schieben
let gameActive = false;
let gamePaused = false;
let difficulty = 'medium';
let selectedGame: GameType | null = null;
let highscoresData: Highscore[] = [];
let scoreToSave = 0; // Temp score while waiting for name input

// --- BIER-BLITZ STATE ---
let bierBlitzRound = 1;
let beerInterval: any = null;
let henryInterval: any = null;
let gameTimer: any = null;
let timeLeft = 30;
let combo = 0;
let maxCombo = 0;
let streak = 0;
let lastHitTime = 0;
let activeBears = new Map();
let hits = 0;
let misses = 0;

const bierBlitzRounds: { [key: number]: { gridSize: number, maxWidth: string } } = {
    1: { gridSize: 2, maxWidth: '200px' },
    2: { gridSize: 3, maxWidth: '300px' },
    3: { gridSize: 4, maxWidth: '380px' }
};


// --- KRUG-SCHIEBEN STATE ---
const SHUFFLE_MAX_ROUNDS = 5;
type ShuffleState = 'power' | 'angle' | 'sliding' | 'done';
let shuffleState: ShuffleState = 'done';
let selectedPower = 0;

// --- CONSTANTS ---
const HIGHSCORE_STORAGE_KEY = 'henrysBierolympiadeHighscores';
const henryQuotes = {
  start: ["30 Sekunden! Zeig was du kannst!", "Diese Runde gehört mir!", "Meine Reflexe sind unschlagbar!", "Bereit für eine neue Runde?"],
  winning: ["Zu langsam, mein Freund!", "Ich bin einfach zu gut!", "Haha, das war einfach!", "Übung macht den Meister!"],
  losing: ["Nicht schlecht, nicht schlecht!", "Du hast heute Glück!", "Warte nur, ich hole auf!", "Das war nur Zufall!"],
  roundWin: ["Diese Runde geht an mich!", "Besser Glück beim nächsten Mal!", "Ich bin der Champion!", "Das war zu einfach!"],
  roundLose: ["Okay, du hast diese Runde...", "Das war beeindruckend!", "Nächste Runde wird anders!", "Respekt, gut gespielt!"],
  pause: ["Was? Brauchst du eine Pause?", "Keine Ausdauer mehr?", "Ich warte...", "Beeil dich!"],
  shuffleStart: ["Zeig mir, was du drauf hast! Ein ruhiges Händchen und ein gutes Auge!", "Das wird eine klare Sache für mich.", "Konzentration!"],
  shuffleWin: ["Perfekt geschoben!", "Das ist die Technik eines Meisters!", "Ich hab's einfach im Gefühl."],
  shuffleLose: ["Glück gehabt!", "Nicht schlecht, aber das kannst du nicht wiederholen!", "Unerhört! Mein Krug hatte einen Drall!"]
};

const difficultySettings: any = {
  easy:    { spawnRate: 2000, beerLifetime: 3000, henryReaction: 2000, henryAccuracy: 0.5,  goldenChance: 0.2,  roundTime: 30, pointMultiplier: 1,   shufflePower: { min: 60, max: 80 }, shuffleAngleError: 15 },
  medium:  { spawnRate: 1500, beerLifetime: 2500, henryReaction: 1500, henryAccuracy: 0.65, goldenChance: 0.15, roundTime: 30, pointMultiplier: 1.5, shufflePower: { min: 70, max: 90 }, shuffleAngleError: 10 },
  hard:    { spawnRate: 1200, beerLifetime: 2000, henryReaction: 1200, henryAccuracy: 0.75, goldenChance: 0.12, roundTime: 30, pointMultiplier: 2,   shufflePower: { min: 80, max: 98 }, shuffleAngleError: 6 },
  extreme: { spawnRate: 900,  beerLifetime: 1500, henryReaction: 900,  henryAccuracy: 0.85, goldenChance: 0.1,  roundTime: 30, pointMultiplier: 3,   shufflePower: { min: 88, max: 102}, shuffleAngleError: 3 }
};

// --- DOM ELEMENTS ---
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const shuffleGameScreen = document.getElementById('shuffleGameScreen');
const gameoverScreen = document.getElementById('gameoverScreen');
const highscoreScreen = document.getElementById('highscoreScreen');

// --- GENERIC GAME LOGIC ---

function selectGame(game: GameType) {
    selectedGame = game;
    startGame('medium');
}

function startGame(diff: string) {
  difficulty = diff;
  playerScore = 0;
  henryScore = 0;
  totalPlayerScore = 0;
  totalHenryScore = 0;
  gameActive = true;
  
  menuScreen?.classList.remove('active');

  if (selectedGame === GameType.BIER_BLITZ) {
    bierBlitzRound = 1;
    startKlickerGame();
  } else if (selectedGame === GameType.SCHIEBEN) {
    currentRound = 1;
    startShuffleGame();
  }
}

function backToMenu() {
  gameoverScreen?.classList.remove('active');
  highscoreScreen?.classList.remove('active');
  menuScreen?.classList.add('active');
  document.getElementById('newHighscore')!.style.display = 'none';
  (document.getElementById('playerNameInput') as HTMLInputElement).value = '';
  scoreToSave = 0;
  document.getElementById('gameSelection')!.style.display = 'block';
}

function endGame(gameType: GameType) {
    gameActive = false;
    
    if (gameType === GameType.BIER_BLITZ) {
        clearInterval(beerInterval);
        clearInterval(henryInterval);
        clearInterval(gameTimer);
    }

    gameScreen?.classList.remove('active');
    shuffleGameScreen?.classList.remove('active');
    gameoverScreen?.classList.add('active');

    const finalScore = totalPlayerScore;
    const won = totalPlayerScore > totalHenryScore;
    
    const gameoverTitleEl = document.getElementById('gameoverTitle');
    if (gameoverTitleEl) gameoverTitleEl.textContent = won ? '🏆 DU HAST GEWONNEN! 🏆' : '😢 HENRY GEWINNT! 😢';
    
    const finalQuoteEl = document.getElementById('finalQuote');
    if(finalQuoteEl) finalQuoteEl.textContent = won ? "Das war pures Glück! Revanche!" : "Haha! Gegen mich hast du keine Chance!";
    
    document.getElementById('finalPlayerScore')!.textContent = `${totalPlayerScore}`;
    document.getElementById('finalHenryScore')!.textContent = `${totalHenryScore}`;
    
    const finalRoundEl = document.getElementById('finalRound');
    const finalRoundLabelEl = document.getElementById('finalRoundLabel');
    if (finalRoundEl && finalRoundLabelEl) {
        if (gameType === GameType.BIER_BLITZ) {
            finalRoundEl.textContent = `${bierBlitzRound}`;
            finalRoundLabelEl.textContent = 'Runden';
        } else {
            finalRoundEl.textContent = `${currentRound}`;
            finalRoundLabelEl.textContent = 'Runden';
        }
    }
    
    const accuracyContainer = document.getElementById('finalAccuracyContainer');
    if(accuracyContainer) {
        if (gameType === GameType.BIER_BLITZ) {
            const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
            document.getElementById('finalAccuracy')!.textContent = accuracy + '%';
            accuracyContainer.style.display = 'block';
        } else {
            accuracyContainer.style.display = 'none';
        }
    }
    
    document.getElementById('roundResult')!.textContent = `Endergebnis nach ${gameType === GameType.BIER_BLITZ ? bierBlitzRound + ' Runden' : currentRound + ' Runden'}.`;
    
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

// --- BIER-BLITZ LOGIC ---

function startKlickerGame() {
  gamePaused = false;
  hits = 0;
  misses = 0;
  activeBears.clear();
  gameScreen?.classList.add('active');
  startKlickerRound();
}

function initGrid() {
  const grid: HTMLElement | null = document.getElementById('gameGrid');
  if (!grid) return;

  const roundConfig = bierBlitzRounds[bierBlitzRound];
  const gridSize = roundConfig.gridSize;

  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
  grid.style.maxWidth = roundConfig.maxWidth;

  for (let i = 0; i < gridSize * gridSize; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.index = `${i}`;
    cell.addEventListener('click', () => handleCellClick(i));
    grid.appendChild(cell);
  }
}

function startKlickerRound() {
  playerScore = 0;
  henryScore = 0;
  timeLeft = difficultySettings[difficulty].roundTime;
  combo = 0;
  streak = 0;
  maxCombo = 0; // Reset max combo per round
  gameActive = true;
  activeBears.clear();

  document.getElementById('bonusRoundIndicator')!.style.display = 'none';
  
  initGrid();
  updateKlickerStats();
  updateProgressBar();

  const quote = henryQuotes.start[Math.floor(Math.random() * henryQuotes.start.length)];
  const henryQuoteEl = document.getElementById('henryQuote');
  if (henryQuoteEl) henryQuoteEl.textContent = quote;

  startGameLoop();
}

function startGameLoop() {
  const settings = difficultySettings[difficulty];
  clearInterval(beerInterval);
  clearInterval(henryInterval);
  clearInterval(gameTimer);

  beerInterval = setInterval(() => { if (gameActive && !gamePaused) spawnBeer(); }, settings.spawnRate);
  henryInterval = setInterval(() => { if (gameActive && !gamePaused) henryTurn(); }, settings.henryReaction);
  gameTimer = setInterval(() => {
    if (!gamePaused) {
      timeLeft--;
      updateTimer();
      updateProgressBar();
      if (timeLeft <= 0) endKlickerRound();
    }
  }, 1000);

  setTimeout(() => spawnBeer(), 500);
  setTimeout(() => spawnBeer(), 1000);
}

function spawnBeer() {
  const emptyCells: number[] = [];
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach((cell, index) => { if (!cell.querySelector('.beer-mug')) emptyCells.push(index); });
  if (emptyCells.length === 0) return;

  const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const cell = cells[randomIndex];
  const beer = document.createElement('div');
  beer.className = 'beer-mug';

  const rand = Math.random();
  const settings = difficultySettings[difficulty];

  if (rand < settings.goldenChance) {
    beer.classList.add('golden');
    beer.textContent = '🍻';
    beer.dataset.points = '5';
  } else if (rand < settings.goldenChance + 0.05 && bierBlitzRound > 1) { // Penalties only from round 2
    beer.classList.add('penalty');
    beer.textContent = '☠️';
    beer.dataset.points = '-3';
  } else {
    beer.textContent = '🍺';
    beer.dataset.points = '1';
  }
  cell.appendChild(beer);

  const beerId = Date.now() + '_' + randomIndex;
  activeBears.set(beerId, { index: randomIndex, points: beer.dataset.points });

  const lifetime = settings.beerLifetime;
  setTimeout(() => {
    if (beer.parentElement) {
      beer.classList.add('beer-hit');
      setTimeout(() => beer.remove(), 400);
      activeBears.delete(beerId);
    }
  }, lifetime);
}

function handleCellClick(index: number) {
  if (!gameActive || gamePaused) return;
  const cell = document.querySelectorAll('.grid-cell')[index] as HTMLElement;
  const beer = cell.querySelector('.beer-mug') as HTMLElement;

  if (beer && !beer.classList.contains('beer-hit')) {
    const points = parseInt(beer.dataset.points || '0');

    const now = Date.now();
    if (now - lastHitTime < 1000) {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      if (combo >= 3) {
        showCombo(combo);
        playerScore += combo;
      }
      if (combo === 10) {
        showAchievement('🔥 10er Combo!');
        playerScore += 10;
      }
    } else {
      combo = 1;
    }
    lastHitTime = now;
    streak++;
    if (streak % 5 === 0) {
      showAchievement(`⚡ ${streak}er Serie!`);
      playerScore += 2;
    }

    const multiplier = difficultySettings[difficulty].pointMultiplier;
    const finalPoints = Math.round(points * multiplier);
    playerScore += finalPoints;
    totalPlayerScore += finalPoints;
    hits++;
    updateKlickerStats();

    beer.classList.add('beer-hit');
    showScorePopup(cell, `+${finalPoints}`);
    setTimeout(() => beer.remove(), 400);

    activeBears.forEach((value, key) => {
      if (value.index === index) activeBears.delete(key);
    });

    if (Math.random() < 0.2) {
      const quotes = henryScore > playerScore ? henryQuotes.winning : henryQuotes.losing;
      const quoteEl = document.getElementById('henryQuote');
      if (quoteEl) quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    }
  } else {
    cell.classList.add('miss-animation');
    setTimeout(() => cell.classList.remove('miss-animation'), 300);
    misses++;
    streak = 0;
    updateKlickerStats();
  }
}

function henryTurn() {
  if (activeBears.size === 0) return;
  const settings = difficultySettings[difficulty];
  const adjustedAccuracy = Math.min(settings.henryAccuracy + (bierBlitzRound * 0.03), 0.95);

  if (Math.random() < adjustedAccuracy) {
    const beersArray = Array.from(activeBears.values());
    const goldenBeers = beersArray.filter(b => parseInt(b.points) > 2);
    const targetArray = (goldenBeers.length > 0 && Math.random() < 0.7) ? goldenBeers : beersArray;
    if (targetArray.length === 0) return;
    const targetBeer = targetArray[Math.floor(Math.random() * targetArray.length)];

    const cell = document.querySelectorAll('.grid-cell')[targetBeer.index];
    const beer = cell.querySelector('.beer-mug') as HTMLElement;

    if (beer && !beer.classList.contains('beer-hit')) {
      const points = parseInt(beer.dataset.points || '0');
      const multiplier = difficultySettings[difficulty].pointMultiplier;
      const finalPoints = Math.round(points * multiplier * 0.8);

      henryScore += finalPoints;
      totalHenryScore += finalPoints;
      updateKlickerStats();

      beer.classList.add('beer-hit');
      showScorePopup(cell as HTMLElement, `Henry +${finalPoints}`, true);
      setTimeout(() => beer.remove(), 400);

      activeBears.forEach((value, key) => {
        if (value.index === targetBeer.index) activeBears.delete(key);
      });
    }
  }
}

function pauseGame() {
  if (!gameActive) return;
  gamePaused = !gamePaused;
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) pauseBtn.textContent = gamePaused ? 'Weiter' : 'Pause';
  if (gamePaused) {
    const quote = henryQuotes.pause[Math.floor(Math.random() * henryQuotes.pause.length)];
    const quoteEl = document.getElementById('henryQuote');
    if (quoteEl) quoteEl.textContent = quote;
  }
}

function updateKlickerStats() {
  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
  
  document.getElementById('playerScore')!.textContent = `${playerScore}`;
  document.getElementById('henryScore')!.textContent = `${henryScore}`;
  document.getElementById('roundNumber')!.textContent = `${bierBlitzRound}`;
  document.getElementById('comboMax')!.textContent = `${maxCombo}`;
  document.getElementById('streak')!.textContent = `${streak}`;
  document.getElementById('accuracy')!.textContent = accuracy + '%';
}

function endKlickerRound() {
  gameActive = false;
  clearInterval(beerInterval);
  clearInterval(henryInterval);
  clearInterval(gameTimer);

  gameScreen?.classList.remove('active');
  gameoverScreen?.classList.add('active');

  const won = playerScore > henryScore;
  
  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

  document.getElementById('gameoverTitle')!.textContent = `Runde ${bierBlitzRound} beendet!`;
  const quotes = won ? henryQuotes.roundLose : henryQuotes.roundWin;
  document.getElementById('finalQuote')!.textContent = quotes[Math.floor(Math.random() * quotes.length)];
  
  document.getElementById('finalPlayerScore')!.textContent = `${playerScore}`;
  document.getElementById('finalHenryScore')!.textContent = `${henryScore}`;
  document.getElementById('finalRound')!.textContent = `${bierBlitzRound}`;
  document.getElementById('finalRoundLabel')!.textContent = 'Runde';
  document.getElementById('finalAccuracy')!.textContent = accuracy + '%';
  document.getElementById('finalAccuracyContainer')!.style.display = 'block';

  const resultText = won
    ? `✅ Du gewinnst Runde ${bierBlitzRound}!`
    : `❌ Henry gewinnt Runde ${bierBlitzRound}!`;
  document.getElementById('roundResult')!.textContent = resultText;

  const nextRoundBtn = document.getElementById('nextRoundBtn') as HTMLButtonElement;
  const backToMenuBtn = document.getElementById('backToMenuBtn') as HTMLButtonElement;
  
  if (bierBlitzRound < 3) {
      nextRoundBtn.textContent = 'Nächste Runde';
      nextRoundBtn.style.display = 'inline-block';
      backToMenuBtn.style.display = 'inline-block';
  } else {
      endGame(GameType.BIER_BLITZ);
      // endGame will handle the button visibility
  }
}

function nextKlickerRound() {
  bierBlitzRound++;
  gameoverScreen?.classList.remove('active');
  gameScreen?.classList.add('active');
  startKlickerRound();
}

// --- KRUG-SCHIEBEN LOGIC ---

function startShuffleGame() {
    shuffleGameScreen?.classList.add('active');
    updateShuffleUI();
    
    const quote = henryQuotes.shuffleStart[Math.floor(Math.random() * henryQuotes.shuffleStart.length)];
    document.getElementById('shuffleHenryQuote')!.textContent = quote;

    setTimeout(startShuffleTurn, 1000);
}

function updateShuffleUI() {
    document.getElementById('shufflePlayerScore')!.textContent = `${totalPlayerScore}`;
    document.getElementById('shuffleHenryScore')!.textContent = `${totalHenryScore}`;
    document.getElementById('shuffleRoundDisplay')!.textContent = `Runde ${currentRound}/${SHUFFLE_MAX_ROUNDS}`;
}

function startShuffleTurn() {
    const turnIndicator = document.getElementById('turnIndicator')!;
    turnIndicator.innerHTML = '<span class="turn-indicator-icon player-icon">👤</span> Dein Zug';
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
        
        // Mappt auf einen Winkel, z.B. -30 bis 30 Grad
        const maxAngle = 30; 
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

    mug.style.transition = 'transform 2s cubic-bezier(0.2, 0.8, 0.4, 1)';
    
    const tableHeight = table.offsetHeight;
    const distance = (power / 100) * (tableHeight * 0.95);
    const angleRad = angle * (Math.PI / 180);

    const finalX = distance * Math.sin(angleRad);
    const finalY = -distance * Math.cos(angleRad);

    // Initial position is translateX(-50%). We add to that.
    mug.style.transform = `translateX(calc(-50% + ${finalX}px)) translateY(${finalY}px)`;

    setTimeout(() => {
        const score = calculateShuffleScore(mug, table);
        const turnIndicator = document.getElementById('turnIndicator')!;
        
        if (user === 'player') {
            playerScore = score;
            totalPlayerScore += score;
            showScorePopup(mug, `+${score}`);
            document.getElementById('shuffleHenryQuote')!.textContent = score >= 50 ? henryQuotes.shuffleLose[Math.floor(Math.random() * henryQuotes.shuffleLose.length)] : "Mein Zug!";
            
            turnIndicator.innerHTML = `<img src="./assets/henry.png" alt="Henry" class="turn-indicator-icon"> Henrys Zug`;
            turnIndicator.className = 'turn-indicator henry';
            
            setTimeout(henrySlide, 2000);
        } else {
            henryScore = score;
            totalHenryScore += score;
            showScorePopup(mug, `Henry +${score}`, true);
            document.getElementById('shuffleHenryQuote')!.textContent = score >= 50 ? henryQuotes.shuffleWin[Math.floor(Math.random() * henryQuotes.shuffleWin.length)] : "Nächste Runde!";
            setTimeout(endShuffleRound, 2000);
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

    const settings = difficultySettings[difficulty];
    
    // Henry's "thinking" - simulate power and angle
    const powerMin = settings.shufflePower.min;
    const powerMax = settings.shufflePower.max;
    const henryPower = powerMin + Math.random() * (powerMax - powerMin);
    
    const angleError = settings.shuffleAngleError;
    const henryAngle = (Math.random() - 0.5) * 2 * angleError;
    
    setTimeout(() => {
        animateMugSlide(henryPower, henryAngle, 'henry');
    }, 1000);
}

function endShuffleRound() {
    updateShuffleUI();
    if (currentRound < SHUFFLE_MAX_ROUNDS) {
        currentRound++;
        setTimeout(startShuffleTurn, 2000);
    } else {
        setTimeout(() => endGame(GameType.SCHIEBEN), 2000);
    }
}

// --- UI HELPER FUNCTIONS ---
function showCombo(combo: number) {
  const indicator = document.createElement('div');
  indicator.className = 'combo-indicator';
  indicator.textContent = `Combo x${combo}!`;
  document.body.appendChild(indicator);
  setTimeout(() => indicator.remove(), 800);
}

function showScorePopup(element: HTMLElement, text: string, isHenry = false) {
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = text;
  popup.style.color = isHenry ? '#e74c3c' : '#4CAF50';
  
  const rect = element.getBoundingClientRect();
  const containerRect = document.querySelector('.game-container')!.getBoundingClientRect();
  
  popup.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
  popup.style.top = `${rect.top - containerRect.top}px`;
  
  document.querySelector('.game-container')!.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

function showAchievement(text: string) {
  const popup = document.createElement('div');
  popup.className = 'achievement-popup';
  popup.textContent = text;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 3000);
}

function updateTimer() {
    const timerEl = document.getElementById('timeLeft');
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerEl) timerEl.textContent = `${timeLeft}`;
    if (timerDisplay) {
        timerDisplay.classList.remove('warning', 'danger');
        if (timeLeft <= 5) timerDisplay.classList.add('danger');
        else if (timeLeft <= 10) timerDisplay.classList.add('warning');
    }
}

function updateProgressBar() {
  const bar = document.getElementById('progressBar');
  if (!bar) return;
  const totalTime = difficultySettings[difficulty].roundTime;
  const percentage = (timeLeft / totalTime) * 100;
  bar.style.width = `${percentage}%`;
  bar.classList.remove('warning', 'danger');
  if (percentage <= 20) bar.classList.add('danger');
  else if (percentage <= 40) bar.classList.add('warning');
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
    difficulty,
    game: selectedGame!
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

function displayHighscores(game: GameType) {
    const container = document.getElementById('highscoreTableContainer');
    if (!container) return;

    const filteredScores = highscoresData.filter(hs => hs.game === game).sort((a, b) => b.score - a.score);

    if (filteredScores.length === 0) {
        container.innerHTML = '<p>Noch keine Highscores. Sei der Erste!</p>';
        return;
    }

    let html = `
        <div class="highscore-table">
            <div class="highscore-header highscore-rank">#</div>
            <div class="highscore-header">Name</div>
            <div class="highscore-header">Punkte</div>
            <div class="highscore-header">Modus</div>
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
                    <div class="highscore-difficulty">${score.difficulty}</div>
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
    document.querySelectorAll('.game-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const game = btn.getAttribute('data-game') as GameType;
            selectGame(game);
        });
    });

    document.getElementById('pauseBtn')?.addEventListener('click', pauseGame);
    document.getElementById('nextRoundBtn')?.addEventListener('click', nextKlickerRound);
    document.getElementById('backToMenuBtn')?.addEventListener('click', backToMenu);
    
    document.getElementById('shuffleActionBtn')?.addEventListener('click', handleShuffleAction);

    document.getElementById('showHighscoresBtn')?.addEventListener('click', () => {
        menuScreen?.classList.remove('active');
        highscoreScreen?.classList.add('active');
        displayHighscores(GameType.BIER_BLITZ); // Default view
    });

    document.getElementById('backToMenuFromHighscoresBtn')?.addEventListener('click', backToMenu);

    document.getElementById('saveHighscoreBtn')?.addEventListener('click', () => {
        const name = (document.getElementById('playerNameInput') as HTMLInputElement).value;
        if (name.trim() && scoreToSave > 0) {
            addHighscore(name, scoreToSave);
            scoreToSave = 0;
            document.getElementById('newHighscore')!.style.display = 'none';
            document.getElementById('backToMenuBtn')!.style.display = 'inline-block';
        }
    });
    
    document.querySelectorAll('.highscore-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.highscore-tab.active')?.classList.remove('active');
            tab.classList.add('active');
            const game = tab.getAttribute('data-game') as GameType;
            displayHighscores(game);
        });
    });
}

// --- INITIALIZATION ---
loadHighscores();
setupEventListeners();