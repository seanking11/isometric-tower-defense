const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const coinScoreElement = document.getElementById('coinScore');
let coins = 0;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gameLoop(); // Ensure the canvas is redrawn on resize
});

const tileImage = new Image();
tileImage.src = './assets/tile.png';

const towerImage = new Image();
towerImage.src = './assets/tower.png';

const enemyImage = new Image();
enemyImage.src = './assets/enemy.png';

const pathImage = new Image();
pathImage.src = './assets/path.png'; // Add the new cobblestone path image

const tileWidth = 64;
const tileHeight = 48;

// Adjust these values to scale the tower and enemy images
const towerWidth = 40;
const towerHeight = 40;
const enemyWidth = 40;
const enemyHeight = 40;

const mapWidth = 10;
const mapHeight = 10;
let path = generateRandomPath();

function isoToScreen(ix, iy) {
  const sx = ((ix - iy) * tileWidth) / 2;
  const sy = ((ix + iy) * tileHeight) / 2;
  return { x: sx, y: sy };
}

function screenToIso(sx, sy) {
  const ix = Math.floor((sy / (tileHeight / 2) + sx / (tileWidth / 2)) / 2);
  const iy = Math.floor((sy / (tileHeight / 2) - sx / (tileWidth / 2)) / 2);
  return { x: ix, y: iy };
}

function drawMap() {
  const mapPixelWidth = ((mapWidth + mapHeight) * tileWidth) / 2;
  const mapPixelHeight = ((mapWidth + mapHeight) * tileHeight) / 2;
  const offsetX = (canvas.width - mapPixelWidth) / 2;
  const offsetY = (canvas.height - mapPixelHeight) / 2;

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const screenPos = isoToScreen(x, y);
      ctx.drawImage(
        tileImage,
        screenPos.x + offsetX,
        screenPos.y + offsetY,
        tileWidth,
        tileHeight
      );
    }
  }
}

function drawPath() {
  const mapPixelWidth = ((mapWidth + mapHeight) * tileWidth) / 2;
  const mapPixelHeight = ((mapWidth + mapHeight) * tileHeight) / 2;
  const offsetX = (canvas.width - mapPixelWidth) / 2;
  const offsetY = (canvas.height - mapPixelHeight) / 2;

  path.forEach((segment) => {
    const screenPos = isoToScreen(segment.x, segment.y);
    ctx.drawImage(
      pathImage,
      screenPos.x + offsetX,
      screenPos.y + offsetY,
      tileWidth,
      tileHeight
    );
  });
}

function drawEnemies() {
  const mapPixelWidth = ((mapWidth + mapHeight) * tileWidth) / 2;
  const mapPixelHeight = ((mapWidth + mapHeight) * tileHeight) / 2;
  const offsetX = (canvas.width - mapPixelWidth) / 2;
  const offsetY = (canvas.height - mapPixelHeight) / 2;

  enemies.forEach((enemy) => {
    const screenPos = isoToScreen(enemy.x, enemy.y);
    ctx.drawImage(
      enemyImage,
      screenPos.x + offsetX + (tileWidth - enemyWidth) / 2,
      screenPos.y + offsetY - (enemyHeight - tileHeight) / 2,
      enemyWidth,
      enemyHeight
    );
  });
}

function drawTowers() {
  const mapPixelWidth = ((mapWidth + mapHeight) * tileWidth) / 2;
  const mapPixelHeight = ((mapWidth + mapHeight) * tileHeight) / 2;
  const offsetX = (canvas.width - mapPixelWidth) / 2;
  const offsetY = (canvas.height - mapPixelHeight) / 2;

  towers.forEach((tower) => {
    const screenPos = isoToScreen(tower.x, tower.y);
    ctx.drawImage(
      towerImage,
      screenPos.x + offsetX + (tileWidth - towerWidth) / 2 + 40, // Adjusted for 40px right
      screenPos.y + offsetY - (towerHeight - tileHeight) / 2 + 10, // Adjusted for 10px down
      towerWidth,
      towerHeight
    );
  });
}

function drawElements() {
  const mapPixelWidth = ((mapWidth + mapHeight) * tileWidth) / 2;
  const mapPixelHeight = ((mapWidth + mapHeight) * tileHeight) / 2;
  const offsetX = (canvas.width - mapPixelWidth) / 2;
  const offsetY = (canvas.height - mapPixelHeight) / 2;

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const screenPos = isoToScreen(x, y);
      ctx.drawImage(
        tileImage,
        screenPos.x + offsetX,
        screenPos.y + offsetY,
        tileWidth,
        tileHeight
      );

      // Draw path on top of tiles
      if (path.some((segment) => segment.x === x && segment.y === y)) {
        ctx.drawImage(
          pathImage,
          screenPos.x + offsetX,
          screenPos.y + offsetY,
          tileWidth,
          tileHeight
        );
      }

      // Draw towers on top of tiles and paths
      if (towers.some((tower) => tower.x === x && tower.y === y)) {
        ctx.drawImage(
          towerImage,
          screenPos.x + offsetX,
          screenPos.y + offsetY - towerHeight / 2,
          towerWidth,
          towerHeight
        );
      }
    }
  }

  // Draw enemies on top of everything
  enemies.forEach((enemy) => {
    const screenPos = isoToScreen(enemy.x, enemy.y);
    ctx.drawImage(
      enemyImage,
      screenPos.x + offsetX,
      screenPos.y + offsetY - enemyHeight / 2,
      enemyWidth,
      enemyHeight
    );
  });
}

const towers = [{ x: 0, y: 0, lastShotTime: 0 }];
let enemies = [];
let projectiles = [];
let enemyId = 0;

function addTower(x, y) {
  const towerExists = towers.some((tower) => tower.x === x && tower.y === y);
  const isPath = path.some((segment) => segment.x === x && segment.y === y);

  if (coins >= 3 && !towerExists && !isPath) {
    towers.push({ x, y, lastShotTime: 0 });
    coins -= 3;
    updateCoinScore();
  }
}

function addEnemy() {
  const start = path[0];
  enemies.push({
    id: enemyId++,
    x: start.x,
    y: start.y,
    pathIndex: 0,
    health: 1,
  });
}

function updateCoinScore() {
  coinScoreElement.innerText = `Coins: ${coins}`;
}

function moveEnemies() {
  enemies.forEach((enemy) => {
    const target = path[enemy.pathIndex + 1];
    if (target) {
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const moveX = (dx / distance) * 0.02; // Slow down enemy movement
      const moveY = (dy / distance) * 0.02;

      enemy.x += moveX;
      enemy.y += moveY;

      if (distance < 0.02) {
        enemy.pathIndex++;
      }
    } else {
      // Enemy reached the end of the path, remove it and decrease lives
      enemies = enemies.filter((e) => e.id !== enemy.id);
      lives--;
      updateLifeScore();
      if (lives <= 0) {
        alert('Game Over! Click OK to restart.');
        resetGame();
      }
    }
  });
}

function shootProjectile(tower, target) {
  const screenPos = isoToScreen(tower.x, tower.y);
  const mapPixelWidth = ((mapWidth + mapHeight) * tileWidth) / 2;
  const mapPixelHeight = ((mapWidth + mapHeight) * tileHeight) / 2;
  const offsetX = (canvas.width - mapPixelWidth) / 2;
  const offsetY = (canvas.height - mapPixelHeight) / 2;

  projectiles.push({
    x: screenPos.x + offsetX + towerWidth / 2,
    y: screenPos.y + offsetY - towerHeight / 2,
    targetId: target.id,
    speed: 1, // Speed of the projectile
  });
}

function drawProjectiles() {
  projectiles.forEach((projectile, index) => {
    // Find the target enemy by ID
    const targetEnemy = enemies.find(
      (enemy) => enemy.id === projectile.targetId
    );
    if (!targetEnemy) {
      projectiles.splice(index, 1);
      return;
    }

    const targetScreenPos = isoToScreen(targetEnemy.x, targetEnemy.y);
    const mapPixelWidth = ((mapWidth + mapHeight) * tileWidth) / 2;
    const mapPixelHeight = ((mapWidth + mapHeight) * tileHeight) / 2;
    const offsetX = (canvas.width - mapPixelWidth) / 2;
    const offsetY = (canvas.height - mapPixelHeight) / 2;

    const dx = targetScreenPos.x + offsetX - projectile.x;
    const dy = targetScreenPos.y + offsetY - projectile.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveX = (dx / distance) * projectile.speed;
    const moveY = (dy / distance) * projectile.speed;
    projectile.x += moveX;
    projectile.y += moveY;

    // Draw the projectile
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'black';
    ctx.fill();

    // Check if projectile hit the target
    if (distance < projectile.speed) {
      // Remove the projectile
      projectiles.splice(index, 1);

      // Damage the enemy
      targetEnemy.health -= 1;
      if (targetEnemy.health <= 0) {
        coins++;
        updateCoinScore();
        enemies = enemies.filter((e) => e.id !== targetEnemy.id); // Remove enemy
      }
    }
  });
}

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Calculate the offset to center the map
  const mapPixelWidth = ((mapWidth + mapHeight) * tileWidth) / 2;
  const mapPixelHeight = ((mapWidth + mapHeight) * tileHeight) / 2;
  const offsetX = (canvas.width - mapPixelWidth) / 2;
  const offsetY = (canvas.height - mapPixelHeight) / 2;

  // Convert screen coordinates to isometric coordinates
  const isoCoords = screenToIso(x - offsetX, y - offsetY);

  // Check if the clicked position is within the map bounds
  if (
    isoCoords.x >= 0 &&
    isoCoords.x < mapWidth &&
    isoCoords.y >= 0 &&
    isoCoords.y < mapHeight
  ) {
    let enemyClicked = false;
    enemies = enemies.filter((enemy) => {
      const screenPos = isoToScreen(enemy.x, enemy.y);
      const enemyRect = {
        left: screenPos.x + offsetX,
        top: screenPos.y + offsetY - enemyHeight / 2,
        right: screenPos.x + offsetX + enemyWidth,
        bottom: screenPos.y + offsetY - enemyHeight / 2 + enemyHeight,
      };
      if (
        x >= enemyRect.left &&
        x <= enemyRect.right &&
        y >= enemyRect.top &&
        y <= enemyRect.bottom
      ) {
        coins++;
        updateCoinScore();
        enemyClicked = true;
        return false; // Remove enemy
      }
      return true; // Keep enemy
    });

    // Add a tower if an enemy was not clicked, the position is not on a path, and there is no existing tower
    if (!enemyClicked) {
      addTower(isoCoords.x, isoCoords.y);
    }
  }
});

function updateTowers() {
  const currentTime = Date.now();
  towers.forEach((tower) => {
    if (currentTime - tower.lastShotTime > 2000) {
      // Tower shoots every 2 seconds
      // Find the nearest enemy within range
      let nearestEnemy = null;
      let nearestDistance = Infinity;
      enemies.forEach((enemy) => {
        const dx = enemy.x - tower.x;
        const dy = enemy.y - tower.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 3 && distance < nearestDistance) {
          // Tower range of 3 tiles
          nearestDistance = distance;
          nearestEnemy = enemy;
        }
      });

      if (nearestEnemy) {
        shootProjectile(tower, nearestEnemy);
        tower.lastShotTime = currentTime;
      }
    }
  });
}

function generateRandomPath() {
  const path = [];
  let currentX = Math.floor(Math.random() * mapWidth);
  let currentY = 0;

  path.push({ x: currentX, y: currentY });

  while (currentY < mapHeight - 1) {
    const direction = Math.floor(Math.random() * 3);
    if (direction === 0 && currentX > 0) {
      currentX--;
    } else if (direction === 1 && currentX < mapWidth - 1) {
      currentX++;
    } else {
      currentY++;
    }
    path.push({ x: currentX, y: currentY });
  }

  return path;
}

function gameLoop() {
  if (lives > 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawElements();
    drawProjectiles();
    moveEnemies();
    updateTowers();
    requestAnimationFrame(gameLoop);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '48px Arial';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
  }
}

// Spawn an enemy every few seconds
setInterval(addEnemy, 2000);

let lives = 10;
function resetGame() {
  coins = 0;
  lives = 10;
  enemies = [];
  towers.length = 0;
  projectiles.length = 0;
  path = generateRandomPath();
  updateCoinScore();
  updateLifeScore();
  gameLoop();
}

function updateLifeScore() {
  const lifeScoreElement = document.getElementById('lifeScore');
  lifeScoreElement.innerText = `Lives: ${lives}`;
}

updateLifeScore();
gameLoop();
