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
    difficulty: string;
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

// --- KRUG-SCHIEBEN STATE ---
const SHUFFLE_MAX_ROUNDS = 5;
type ShuffleState = 'power' | 'angle' | 'sliding' | 'done';
let shuffleState: ShuffleState = 'done';
let selectedPower = 0;

// --- CONSTANTS ---
const HIGHSCORE_STORAGE_KEY = 'henrysBierolympiadeHighscores';
const henryQuotes = {
  shuffleStart: ["Zeig mir, was du drauf hast! Ein ruhiges Händchen und ein gutes Auge!", "Das wird eine klare Sache für mich.", "Konzentration!"],
  shuffleWin: ["Perfekt geschoben!", "Das ist die Technik eines Meisters!", "Ich hab's einfach im Gefühl."],
  shuffleLose: ["Glück gehabt!", "Nicht schlecht, aber das kannst du nicht wiederholen!", "Unerhört! Mein Krug hatte einen Drall!"]
};

const difficultySettings: any = {
  easy:    { shufflePower: { min: 60, max: 80 }, shuffleAngleError: 15 },
  medium:  { shufflePower: { min: 70, max: 90 }, shuffleAngleError: 10 },
  hard:    { shufflePower: { min: 80, max: 98 }, shuffleAngleError: 6 },
  extreme: { shufflePower: { min: 88, max: 102}, shuffleAngleError: 3 }
};

// --- DOM ELEMENTS ---
const menuScreen = document.getElementById('menuScreen');
const shuffleGameScreen = document.getElementById('shuffleGameScreen');
const gameoverScreen = document.getElementById('gameoverScreen');
const highscoreScreen = document.getElementById('highscoreScreen');

// --- GENERIC GAME LOGIC ---

function startGame(diff: string) {
  difficulty = diff;
  playerScore = 0;
  henryScore = 0;
  totalPlayerScore = 0;
  totalHenryScore = 0;
  currentRound = 1;
  gameActive = true;
  
  menuScreen?.classList.remove('active');
  startShuffleGame();
}

function backToMenu() {
  gameoverScreen?.classList.remove('active');
  highscoreScreen?.classList.remove('active');
  shuffleGameScreen?.classList.remove('active');
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
    
    const gameoverTitleEl = document.getElementById('gameoverTitle');
    if (gameoverTitleEl) gameoverTitleEl.textContent = won ? '🏆 DU HAST GEWONNEN! 🏆' : '😢 HENRY GEWINNT! 😢';
    
    const finalQuoteEl = document.getElementById('finalQuote');
    if(finalQuoteEl) finalQuoteEl.textContent = won ? "Das war pures Glück! Revanche!" : "Haha! Gegen mich hast du keine Chance!";
    
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
        setTimeout(() => endGame(), 2000);
    }
}

// --- UI HELPER FUNCTIONS ---

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
}

// --- INITIALIZATION ---
loadHighscores();
setupEventListeners();
