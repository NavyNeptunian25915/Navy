const board = document.getElementById("board");
const turnIndicator = document.getElementById("turnIndicator");
const SIZE = 15;
let turn = "cyan";
let selected = null;
let gameOver = false;
let lastMove = { from: null, to: null }; // Tracks the last move

// Piece icons
const PIECES = {
  captain: "C",
  battleship: "B",
  tank: "T",
  submarine: "SU",
  jet: "J",
  helicopter: "H",
  soldier: "SO",
};

// Build board grid
const cells = {};
for (let row = SIZE; row >= 1; row--) {
  for (let col = 0; col < SIZE; col++) {
    const pos = String.fromCharCode(65 + col) + row;
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.pos = pos;
    cell.addEventListener("click", () => handleClick(pos));
    board.appendChild(cell);
    cells[pos] = cell;
  }
}

function setPiece(pos, piece, color) {
  const c = cells[pos];
  if (!c) return;
  c.textContent = piece || "";
  c.classList.remove("red", "cyan", "selected", "highlight");
  if (color) c.classList.add(color);
}

function getPiece(pos) {
  const c = cells[pos];
  if (!c) return { piece: null, color: null };
  return {
    piece: c.textContent || null,
    color: c.classList.contains("red") ? "red" :
           c.classList.contains("cyan") ? "cyan" : null
  };
}

// --- HELPER FUNCTIONS ---

function clearHighlights() {
  const highlighted = document.querySelectorAll(".highlight");
  highlighted.forEach(c => c.classList.remove("highlight"));
}

function clearLastMoveHighlights() {
  if (lastMove.from && cells[lastMove.from]) {
    cells[lastMove.from].classList.remove("last-move-origin");
  }
  if (lastMove.to && cells[lastMove.to]) {
    cells[lastMove.to].classList.remove("last-move-dest");
  }
}

function showValidMoves(fromPos) {
  const { piece, color } = getPiece(fromPos);
  if (!piece || color !== turn) return;

  for (const toPos in cells) {
    const targetInfo = getPiece(toPos);
    // Highlight if the move is valid and the target is not a friendly piece
    if (targetInfo.color !== color && isValidMove(fromPos, toPos, piece, color)) {
      cells[toPos].classList.add("highlight");
    }
  }
}

// Checks if a player has a soldier that can legally be promoted to captain.
function canPromoteToCaptain(color) {
  const promotionRow = color === "cyan" ? SIZE : 1;
  const promotionPos = `H${promotionRow}`;

  for (const fromPos in cells) {
    const { piece, color: pieceColor } = getPiece(fromPos);
    if (piece === PIECES.soldier && pieceColor === color) {
      if (isValidMove(fromPos, promotionPos, PIECES.soldier, color)) {
        return true;
      }
    }
  }
  return false;
}

function checkWin() {
  const redCaptain = isCaptainAlive("red");
  const cyanCaptain = isCaptainAlive("cyan");
  let winner = null;

  if (!redCaptain) {
    if (!canPromoteToCaptain("red")) winner = "Cyan";
  } else if (!cyanCaptain) {
    if (!canPromoteToCaptain("cyan")) winner = "Red";
  }

  if (winner) {
    gameOver = true;
    turnIndicator.textContent = `🏁 ${winner} Wins!`;
    alert(`${winner} wins the battle!`);
  }
}

function isCaptainAlive(color) {
  for (const pos in cells) {
    const { piece, color: pieceColor } = getPiece(pos);
    if (piece === PIECES.captain && pieceColor === color) {
      return true;
    }
  }
  return false;
}

// --- CLICK HANDLER ---
function handleClick(pos) {
  if (gameOver) return;
  const c = cells[pos];
  const { piece, color } = getPiece(pos);

  // --- 1. MOVE a selected piece to a highlighted square ---
  if (selected && c.classList.contains("highlight")) {
    clearLastMoveHighlights();
    const fromPos = selected;
    const toPos = pos;
    
    const sPiece = cells[selected].textContent;
    const sColor = turn;

    cells[selected].classList.remove("selected");
    clearHighlights();

    setPiece(selected, null, null);
    setPiece(pos, sPiece, sColor);

    // Add new highlights for the move just made
    cells[fromPos].classList.add("last-move-origin");
    cells[toPos].classList.add("last-move-dest");
    lastMove = { from: fromPos, to: toPos };

    if (sPiece === PIECES.soldier) checkPromotion(pos, sColor);
    selected = null;

    checkWin();
    if (gameOver) return;

    turn = turn === "cyan" ? "red" : "cyan";
    turnIndicator.textContent = `Turn: ${turn.charAt(0).toUpperCase() + turn.slice(1)}`;
    return;
  }

  // --- 2. SELECT/DESELECT a piece of the current player's color ---
  if (piece && color === turn) {
    if (selected === pos) {
      // Deselect if clicking the same piece again
      c.classList.remove("selected");
      selected = null;
      clearHighlights();
    } else {
      // Select a new piece
      if (selected) cells[selected].classList.remove("selected");
      clearHighlights();
      c.classList.add("selected");
      selected = pos;
      showValidMoves(pos);
    }
    return;
  }

  // --- 3. If clicking an invalid square, DESELECT everything ---
  if (selected) {
    cells[selected].classList.remove("selected");
    selected = null;
    clearHighlights();
  }
}

// --- MOVEMENT RULES ---
function isValidMove(from, to, piece, color) {
  const fx = from.charCodeAt(0) - 65;
  const fy = parseInt(from.slice(1)) - 1;
  const tx = to.charCodeAt(0) - 65;
  const ty = parseInt(to.slice(1)) - 1;
  const dx = tx - fx;
  const dy = ty - fy;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  const target = getPiece(to);
  const isCapture = target.color && target.color !== color;

  const isKnight = (adx === 1 && ady === 2) || (adx === 2 && ady === 1);
  const isRook = (adx === 0 || ady === 0) && (adx + ady > 0);
  const isBishop = adx === ady && adx > 0;
  const isQueen = isRook || isBishop;

  function pathClear(stepX, stepY) {
    let x = fx + stepX, y = fy + stepY;
    while (x !== tx || y !== ty) {
      const pos = String.fromCharCode(65 + x) + (y + 1);
      if (getPiece(pos).piece) return false;
      x += stepX;
      y += stepY;
    }
    return true;
  }

  switch (piece) {
    case "C":
      return isKnight;

    case "B":
      if (!isQueen) return false;
      return pathClear(dx === 0 ? 0 : dx / adx, dy === 0 ? 0 : dy / ady);

    case "T":
      if (isCapture) {
        return isRook && pathClear(dx === 0 ? 0 : dx / adx, dy === 0 ? 0 : dy / ady);
      }
      return isKnight;

    case "SU":
      if (isCapture) {
        return isBishop && pathClear(dx / adx, dy / ady);
      }
      return isKnight;

    case "J":
      if (isCapture) return isKnight;
      if (isRook) return pathClear(dx === 0 ? 0 : dx / adx, dy === 0 ? 0 : dy / ady);
      return false;

    case "H":
      if (isCapture) return isKnight;
      if (isBishop) return pathClear(dx / adx, dy / ady);
      return false;

    case "SO": {
      const toCol = to[0];
      const toRow = parseInt(to.slice(1));
      const lastRank = color === "cyan" ? SIZE : 1;
      if (toCol === 'H' && toRow === lastRank && isCaptainAlive(color)) {
        return false;
      }
      const dir = color === "cyan" ? 1 : -1;
      const forward = dy === dir || dy === 2 * dir;
      if (isCapture) {
        return adx === 0 && forward && pathClear(0, dir);
      }
      if (!isCapture && adx === ady && forward) {
        return pathClear(dx / adx, dy / ady);
      }
      return false;
    }
    default:
      return false;
  }
}

// --- PROMOTION ---
function checkPromotion(pos, color) {
  const col = pos[0];
  const row = parseInt(pos.slice(1));
  const lastRank = color === "cyan" ? 15 : 1;

  if (row === lastRank) {
    if (col === "H") {
      setPiece(pos, PIECES.captain, color);
      alert(`${color.toUpperCase()} Soldier promoted to Captain!`);
    } else {
      const choice = prompt(
        `${color.toUpperCase()} Soldier promotion! Choose piece: battleship, tank, submarine, jet, or helicopter?`
      )?.toLowerCase();
      const pieceKey = {
        battleship: PIECES.battleship,
        tank: PIECES.tank,
        submarine: PIECES.submarine,
        jet: PIECES.jet,
        helicopter: PIECES.helicopter,
      }[choice];
      if (pieceKey) {
        setPiece(pos, pieceKey, color);
        alert(`${color.toUpperCase()} Soldier promoted to ${choice}!`);
      } else {
        setPiece(pos, PIECES.battleship, color);
        alert(`${color.toUpperCase()} Invalid Choice; Soldier promoted to Battleship!`);
      }
    }
  }
}

// --- INITIAL SETUP ---
function setup() {
  Object.keys(cells).forEach((p) => setPiece(p, null, null));
  setPiece("H1", PIECES.captain, "cyan");
  setPiece("H15", PIECES.captain, "red");
  for (let c = 0; c < SIZE; c++) {
    const letter = String.fromCharCode(65 + c);
    if (letter !== "H") {
      setPiece(letter + "1", PIECES.battleship, "cyan");
      setPiece(letter + "15", PIECES.battleship, "red");
    }
    setPiece(letter + "2", PIECES.tank, "cyan");
    setPiece(letter + "14", PIECES.tank, "red");
    setPiece(letter + "3", PIECES.submarine, "cyan");
    setPiece(letter + "13", PIECES.submarine, "red");
    setPiece(letter + "4", PIECES.jet, "cyan");
    setPiece(letter + "12", PIECES.jet, "red");
    setPiece(letter + "5", PIECES.helicopter, "cyan");
    setPiece(letter + "11", PIECES.helicopter, "red");
    setPiece(letter + "6", PIECES.soldier, "cyan");
    setPiece(letter + "10", PIECES.soldier, "red");
  }
}

setup();
