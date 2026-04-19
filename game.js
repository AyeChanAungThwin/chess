// ===== Piece Constants =====
const EMPTY = null;
const W_KING = '♔', W_QUEEN = '♕', W_ROOK = '♖', W_BISHOP = '♗', W_KNIGHT = '♘', W_PAWN = '♙';
const B_KING = '♚', B_QUEEN = '♛', B_ROOK = '♜', B_BISHOP = '♝', B_KNIGHT = '♞', B_PAWN = '♟';

const WHITE_PIECES = [W_KING, W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT, W_PAWN];
const BLACK_PIECES = [B_KING, B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT, B_PAWN];

// ===== Game State =====
let board = [];
let currentTurn = 'white';
let selectedCell = null;
let validMoves = [];
let lastMove = null;
let capturedByWhite = [];
let capturedByBlack = [];
let gameOver = false;

// Castling rights
let castling = { whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true };

// En passant target [row, col] or null
let enPassantTarget = null;

// AI State
let playerColor = 'white';
let aiColor = 'black';
let difficulty = 'medium';
let aiThinking = false;

// ===== Helpers =====
function isWhite(piece) { return WHITE_PIECES.includes(piece); }
function isBlack(piece) { return BLACK_PIECES.includes(piece); }
function pieceColor(piece) {
  if (isWhite(piece)) return 'white';
  if (isBlack(piece)) return 'black';
  return null;
}
function isOwnPiece(piece) { return pieceColor(piece) === currentTurn; }
function isEnemyPiece(piece) {
  const c = pieceColor(piece);
  return c !== null && c !== currentTurn;
}
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function pieceType(piece) {
  const wp = { [W_KING]: 'king', [W_QUEEN]: 'queen', [W_ROOK]: 'rook', [W_BISHOP]: 'bishop', [W_KNIGHT]: 'knight', [W_PAWN]: 'pawn' };
  const bp = { [B_KING]: 'king', [B_QUEEN]: 'queen', [B_ROOK]: 'rook', [B_BISHOP]: 'bishop', [B_KNIGHT]: 'knight', [B_PAWN]: 'pawn' };
  return wp[piece] || bp[piece] || null;
}

function pieceValue(piece) {
  const vals = { queen: 9, rook: 5, bishop: 3, knight: 3, pawn: 1, king: 0 };
  return vals[pieceType(piece)] || 0;
}

// ===== Piece-Square Tables (from white's perspective, row 0 = rank 8) =====
const PST = {
  pawn: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [ 5,  5, 10, 25, 25, 10,  5,  5],
    [ 0,  0,  0, 20, 20,  0,  0,  0],
    [ 5, -5,-10,  0,  0,-10, -5,  5],
    [ 5, 10, 10,-20,-20, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
  ],
  knight: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  bishop: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  rook: [
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 0,  0,  0,  5,  5,  0,  0,  0],
  ],
  queen: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  king: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20],
  ],
};

// ===== Board Init =====
function initBoard() {
  board = [
    [B_ROOK, B_KNIGHT, B_BISHOP, B_QUEEN, B_KING, B_BISHOP, B_KNIGHT, B_ROOK],
    [B_PAWN, B_PAWN, B_PAWN, B_PAWN, B_PAWN, B_PAWN, B_PAWN, B_PAWN],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [W_PAWN, W_PAWN, W_PAWN, W_PAWN, W_PAWN, W_PAWN, W_PAWN, W_PAWN],
    [W_ROOK, W_KNIGHT, W_BISHOP, W_QUEEN, W_KING, W_BISHOP, W_KNIGHT, W_ROOK],
  ];
  currentTurn = 'white';
  selectedCell = null;
  validMoves = [];
  lastMove = null;
  capturedByWhite = [];
  capturedByBlack = [];
  gameOver = false;
  castling = { whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true };
  enPassantTarget = null;
  aiThinking = false;
}

// ===== Move Generation =====
function getPawnMoves(r, c, color) {
  const moves = [];
  const dir = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;

  if (inBounds(r + dir, c) && board[r + dir][c] === EMPTY) {
    moves.push([r + dir, c]);
    if (r === startRow && board[r + 2 * dir][c] === EMPTY) {
      moves.push([r + 2 * dir, c]);
    }
  }

  for (const dc of [-1, 1]) {
    const nr = r + dir, nc = c + dc;
    if (inBounds(nr, nc)) {
      if (board[nr][nc] !== EMPTY && isEnemyPiece(board[nr][nc])) {
        moves.push([nr, nc]);
      }
      if (enPassantTarget && enPassantTarget[0] === nr && enPassantTarget[1] === nc) {
        moves.push([nr, nc]);
      }
    }
  }

  return moves;
}

function getKnightMoves(r, c) {
  const moves = [];
  const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (const [dr, dc] of offsets) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && !isOwnPiece(board[nr][nc])) {
      moves.push([nr, nc]);
    }
  }
  return moves;
}

function getSlidingMoves(r, c, directions) {
  const moves = [];
  for (const [dr, dc] of directions) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc] === EMPTY) {
        moves.push([nr, nc]);
      } else {
        if (isEnemyPiece(board[nr][nc])) moves.push([nr, nc]);
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

function getBishopMoves(r, c) { return getSlidingMoves(r, c, [[-1, -1], [-1, 1], [1, -1], [1, 1]]); }
function getRookMoves(r, c) { return getSlidingMoves(r, c, [[-1, 0], [1, 0], [0, -1], [0, 1]]); }
function getQueenMoves(r, c) { return getSlidingMoves(r, c, [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]); }

function getKingMoves(r, c, color) {
  const moves = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && !isOwnPiece(board[nr][nc])) {
        moves.push([nr, nc]);
      }
    }
  }

  if (color === 'white' && r === 7 && c === 4) {
    if (castling.whiteKingSide && board[7][5] === EMPTY && board[7][6] === EMPTY && board[7][7] === W_ROOK) {
      if (!isSquareAttacked(7, 4, 'black') && !isSquareAttacked(7, 5, 'black') && !isSquareAttacked(7, 6, 'black')) {
        moves.push([7, 6]);
      }
    }
    if (castling.whiteQueenSide && board[7][3] === EMPTY && board[7][2] === EMPTY && board[7][1] === EMPTY && board[7][0] === W_ROOK) {
      if (!isSquareAttacked(7, 4, 'black') && !isSquareAttacked(7, 3, 'black') && !isSquareAttacked(7, 2, 'black')) {
        moves.push([7, 2]);
      }
    }
  }
  if (color === 'black' && r === 0 && c === 4) {
    if (castling.blackKingSide && board[0][5] === EMPTY && board[0][6] === EMPTY && board[0][7] === B_ROOK) {
      if (!isSquareAttacked(0, 4, 'white') && !isSquareAttacked(0, 5, 'white') && !isSquareAttacked(0, 6, 'white')) {
        moves.push([0, 6]);
      }
    }
    if (castling.blackQueenSide && board[0][3] === EMPTY && board[0][2] === EMPTY && board[0][1] === EMPTY && board[0][0] === B_ROOK) {
      if (!isSquareAttacked(0, 4, 'white') && !isSquareAttacked(0, 3, 'white') && !isSquareAttacked(0, 2, 'white')) {
        moves.push([0, 2]);
      }
    }
  }

  return moves;
}

function getRawMoves(r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = pieceColor(piece);
  const type = pieceType(piece);

  switch (type) {
    case 'pawn': return getPawnMoves(r, c, color);
    case 'knight': return getKnightMoves(r, c);
    case 'bishop': return getBishopMoves(r, c);
    case 'rook': return getRookMoves(r, c);
    case 'queen': return getQueenMoves(r, c);
    case 'king': return getKingMoves(r, c, color);
    default: return [];
  }
}

// ===== Attack Detection =====
function isSquareAttacked(r, c, byColor) {
  const savedTurn = currentTurn;
  currentTurn = byColor;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (!p || pieceColor(p) !== byColor) continue;

      const type = pieceType(p);
      if (type === 'pawn') {
        const dir = byColor === 'white' ? -1 : 1;
        for (const dc of [-1, 1]) {
          if (row + dir === r && col + dc === c) {
            currentTurn = savedTurn;
            return true;
          }
        }
        continue;
      }

      if (type === 'king') {
        if (Math.abs(row - r) <= 1 && Math.abs(col - c) <= 1 && !(row === r && col === c)) {
          currentTurn = savedTurn;
          return true;
        }
        continue;
      }

      const moves = getRawMoves(row, col);
      if (moves.some(([mr, mc]) => mr === r && mc === c)) {
        currentTurn = savedTurn;
        return true;
      }
    }
  }

  currentTurn = savedTurn;
  return false;
}

// ===== Check / Legal Moves =====
function findKing(color) {
  const king = color === 'white' ? W_KING : B_KING;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) return [r, c];
    }
  }
  return null;
}

function isInCheck(color) {
  const kPos = findKing(color);
  if (!kPos) return false;
  const enemy = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(kPos[0], kPos[1], enemy);
}

function getLegalMoves(r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = pieceColor(piece);
  const raw = getRawMoves(r, c);
  const legal = [];

  for (const [nr, nc] of raw) {
    const captured = board[nr][nc];
    const origPiece = board[r][c];

    let epCapturedPiece = null;
    let epCapturedRow = null;
    if (pieceType(piece) === 'pawn' && enPassantTarget && nr === enPassantTarget[0] && nc === enPassantTarget[1]) {
      epCapturedRow = r;
      epCapturedPiece = board[r][nc];
      board[r][nc] = EMPTY;
    }

    board[nr][nc] = origPiece;
    board[r][c] = EMPTY;

    let rookMoved = false;
    let rookFrom = null, rookTo = null, rookPiece = null;
    if (pieceType(piece) === 'king' && Math.abs(nc - c) === 2) {
      if (nc === 6) { rookFrom = [r, 7]; rookTo = [r, 5]; rookPiece = board[r][7]; board[r][5] = rookPiece; board[r][7] = EMPTY; }
      if (nc === 2) { rookFrom = [r, 0]; rookTo = [r, 3]; rookPiece = board[r][0]; board[r][3] = rookPiece; board[r][0] = EMPTY; }
      rookMoved = true;
    }

    const legal_ = !isInCheck(color);

    board[r][c] = origPiece;
    board[nr][nc] = captured;
    if (epCapturedPiece !== null) {
      board[epCapturedRow][nc] = epCapturedPiece;
    }
    if (rookMoved) {
      board[rookFrom[0]][rookFrom[1]] = rookPiece;
      board[rookTo[0]][rookTo[1]] = EMPTY;
    }

    if (legal_) legal.push([nr, nc]);
  }

  return legal;
}

function hasAnyLegalMoves(color) {
  const savedTurn = currentTurn;
  currentTurn = color;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && pieceColor(board[r][c]) === color) {
        if (getLegalMoves(r, c).length > 0) {
          currentTurn = savedTurn;
          return true;
        }
      }
    }
  }
  currentTurn = savedTurn;
  return false;
}

function getAllLegalMoves(color) {
  const savedTurn = currentTurn;
  currentTurn = color;
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && pieceColor(board[r][c]) === color) {
        const targets = getLegalMoves(r, c);
        for (const [tr, tc] of targets) {
          moves.push({ from: [r, c], to: [tr, tc] });
        }
      }
    }
  }
  currentTurn = savedTurn;
  return moves;
}

// ===== Make Move =====
function makeMove(fromR, fromC, toR, toC) {
  const piece = board[fromR][fromC];
  const type = pieceType(piece);
  const color = pieceColor(piece);
  const captured = board[toR][toC];

  if (type === 'pawn' && enPassantTarget && toR === enPassantTarget[0] && toC === enPassantTarget[1]) {
    const epRow = fromR;
    const epPiece = board[epRow][toC];
    if (epPiece) {
      if (color === 'white') capturedByWhite.push(epPiece);
      else capturedByBlack.push(epPiece);
    }
    board[epRow][toC] = EMPTY;
  }

  if (captured) {
    if (color === 'white') capturedByWhite.push(captured);
    else capturedByBlack.push(captured);
  }

  if (type === 'king' && Math.abs(toC - fromC) === 2) {
    if (toC === 6) { board[fromR][5] = board[fromR][7]; board[fromR][7] = EMPTY; }
    if (toC === 2) { board[fromR][3] = board[fromR][0]; board[fromR][0] = EMPTY; }
  }

  board[toR][toC] = piece;
  board[fromR][fromC] = EMPTY;

  if (type === 'pawn' && (toR === 0 || toR === 7)) {
    board[toR][toC] = color === 'white' ? W_QUEEN : B_QUEEN;
  }

  if (type === 'pawn' && Math.abs(toR - fromR) === 2) {
    enPassantTarget = [(fromR + toR) / 2, fromC];
  } else {
    enPassantTarget = null;
  }

  if (type === 'king') {
    if (color === 'white') { castling.whiteKingSide = false; castling.whiteQueenSide = false; }
    else { castling.blackKingSide = false; castling.blackQueenSide = false; }
  }
  if (type === 'rook') {
    if (color === 'white') {
      if (fromR === 7 && fromC === 7) castling.whiteKingSide = false;
      if (fromR === 7 && fromC === 0) castling.whiteQueenSide = false;
    } else {
      if (fromR === 0 && fromC === 7) castling.blackKingSide = false;
      if (fromR === 0 && fromC === 0) castling.blackQueenSide = false;
    }
  }
  if (captured) {
    if (toR === 0 && toC === 7) castling.blackKingSide = false;
    if (toR === 0 && toC === 0) castling.blackQueenSide = false;
    if (toR === 7 && toC === 7) castling.whiteKingSide = false;
    if (toR === 7 && toC === 0) castling.whiteQueenSide = false;
  }

  lastMove = { from: [fromR, fromC], to: [toR, toC] };

  currentTurn = currentTurn === 'white' ? 'black' : 'white';

  const inCheck = isInCheck(currentTurn);
  const hasMoves = hasAnyLegalMoves(currentTurn);

  if (inCheck && !hasMoves) {
    gameOver = true;
    setStatus(`Checkmate! ${currentTurn === 'white' ? 'Black' : 'White'} wins!`);
  } else if (!inCheck && !hasMoves) {
    gameOver = true;
    setStatus('Stalemate! Draw.');
  } else if (inCheck) {
    setStatus(`${currentTurn === 'white' ? 'White' : 'Black'} is in check!`);
  } else {
    setStatus('');
  }

  capturedByWhite.sort((a, b) => pieceValue(b) - pieceValue(a));
  capturedByBlack.sort((a, b) => pieceValue(b) - pieceValue(a));
}

// ===== AI: Evaluation =====
function evaluateBoard() {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const type = pieceType(piece);
      const color = pieceColor(piece);
      const val = pieceValue(piece);

      // Piece-square table: for black, mirror the row
      const pstRow = color === 'white' ? r : 7 - r;
      const pstVal = PST[type] ? PST[type][pstRow][c] : 0;

      const total = val * 100 + pstVal;

      if (color === 'white') {
        score += total;
      } else {
        score -= total;
      }
    }
  }

  return score;
}

// ===== AI: Minimax with Alpha-Beta =====
function minimax(depth, alpha, beta, isMaximizing) {
  if (depth === 0) return evaluateBoard();

  const color = isMaximizing ? 'white' : 'black';
  const moves = getAllLegalMoves(color);

  if (moves.length === 0) {
    if (isInCheck(color)) {
      return isMaximizing ? -99999 + (3 - depth) : 99999 - (3 - depth);
    }
    return 0; // stalemate
  }

  // Move ordering: captures first for better pruning
  moves.sort((a, b) => {
    const aCap = board[a.to[0]][a.to[1]] ? pieceValue(board[a.to[0]][a.to[1]]) : 0;
    const bCap = board[b.to[0]][b.to[1]] ? pieceValue(board[b.to[0]][b.to[1]]) : 0;
    return bCap - aCap;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      // Save state
      const savedBoard = board.map(row => [...row]);
      const savedCastling = { ...castling };
      const savedEnPassant = enPassantTarget;
      const savedCapturedW = [...capturedByWhite];
      const savedCapturedB = [...capturedByBlack];
      const savedTurn = currentTurn;

      currentTurn = color;
      makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);

      const eval_ = minimax(depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);

      // Restore state
      board = savedBoard;
      castling = savedCastling;
      enPassantTarget = savedEnPassant;
      capturedByWhite = savedCapturedW;
      capturedByBlack = savedCapturedB;
      currentTurn = savedTurn;
      gameOver = false;

      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const savedBoard = board.map(row => [...row]);
      const savedCastling = { ...castling };
      const savedEnPassant = enPassantTarget;
      const savedCapturedW = [...capturedByWhite];
      const savedCapturedB = [...capturedByBlack];
      const savedTurn = currentTurn;

      currentTurn = color;
      makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);

      const eval_ = minimax(depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);

      board = savedBoard;
      castling = savedCastling;
      enPassantTarget = savedEnPassant;
      capturedByWhite = savedCapturedW;
      capturedByBlack = savedCapturedB;
      currentTurn = savedTurn;
      gameOver = false;

      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// ===== AI: Get Best Move =====
function getBestMove() {
  const moves = getAllLegalMoves(aiColor);
  if (moves.length === 0) return null;

  let searchDepth;
  switch (difficulty) {
    case 'easy':   searchDepth = 1; break;
    case 'medium': searchDepth = 2; break;
    case 'hard':   searchDepth = 3; break;
    default:       searchDepth = 2;
  }

  const isMaximizing = aiColor === 'white';

  // Easy: add randomness — pick from top moves with jitter
  if (difficulty === 'easy') {
    // Evaluate each move with depth 1
    const evaluated = moves.map(move => {
      const savedBoard = board.map(row => [...row]);
      const savedCastling = { ...castling };
      const savedEnPassant = enPassantTarget;
      const savedCapturedW = [...capturedByWhite];
      const savedCapturedB = [...capturedByBlack];
      const savedTurn = currentTurn;

      currentTurn = aiColor;
      makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);

      const score = evaluateBoard() + (Math.random() - 0.5) * 150;

      board = savedBoard;
      castling = savedCastling;
      enPassantTarget = savedEnPassant;
      capturedByWhite = savedCapturedW;
      capturedByBlack = savedCapturedB;
      currentTurn = savedTurn;
      gameOver = false;

      return { move, score };
    });

    evaluated.sort((a, b) => isMaximizing ? b.score - a.score : a.score - b.score);

    // Pick randomly from top 3 moves
    const topN = Math.min(3, evaluated.length);
    return evaluated[Math.floor(Math.random() * topN)].move;
  }

  // Medium / Hard: full minimax
  let bestMove = null;
  let bestScore = isMaximizing ? -Infinity : Infinity;

  // Move ordering
  moves.sort((a, b) => {
    const aCap = board[a.to[0]][a.to[1]] ? pieceValue(board[a.to[0]][a.to[1]]) : 0;
    const bCap = board[b.to[0]][b.to[1]] ? pieceValue(board[b.to[0]][b.to[1]]) : 0;
    return bCap - aCap;
  });

  for (const move of moves) {
    const savedBoard = board.map(row => [...row]);
    const savedCastling = { ...castling };
    const savedEnPassant = enPassantTarget;
    const savedCapturedW = [...capturedByWhite];
    const savedCapturedB = [...capturedByBlack];
    const savedTurn = currentTurn;

    currentTurn = aiColor;
    makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);

    const score = minimax(searchDepth - 1, -Infinity, Infinity, !isMaximizing);

    board = savedBoard;
    castling = savedCastling;
    enPassantTarget = savedEnPassant;
    capturedByWhite = savedCapturedW;
    capturedByBlack = savedCapturedB;
    currentTurn = savedTurn;
    gameOver = false;

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return bestMove;
}

// ===== AI: Make AI Move =====
function aiMove() {
  if (gameOver || currentTurn !== aiColor) return;

  aiThinking = true;
  document.getElementById('ai-indicator').classList.add('visible');
  document.getElementById('board').classList.add('ai-turn');
  disableControls(true);
  renderBoard();

  const thinkTime = 1000 + Math.random() * 2000;

  setTimeout(() => {
    const move = getBestMove();

    if (move) {
      makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);
    }

    aiThinking = false;
    document.getElementById('ai-indicator').classList.remove('visible');
    document.getElementById('board').classList.remove('ai-turn');
    disableControls(false);
    renderBoard();

    // If it's still AI's turn (shouldn't happen, but safety check)
    if (!gameOver && currentTurn === aiColor) {
      aiMove();
    }
  }, thinkTime);
}

function disableControls(disabled) {
  document.getElementById('difficulty-select').classList.toggle('disabled', disabled);
  document.getElementById('color-select').classList.toggle('disabled', disabled);
}

// ===== UI =====
function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function updateTurnIndicator() {
  const el = document.getElementById('turn-indicator');
  if (gameOver) {
    el.textContent = 'Game Over';
    el.className = 'turn-indicator';
  } else if (aiThinking) {
    el.textContent = `AI (${difficulty})`;
    el.className = 'turn-indicator ' + (aiColor === 'white' ? 'white-turn' : 'black-turn');
  } else {
    const isPlayer = currentTurn === playerColor;
    el.textContent = isPlayer ? `${playerColor === 'white' ? "White's" : "Black's"} Turn (You)` : `AI's Turn`;
    el.className = 'turn-indicator ' + (currentTurn === 'white' ? 'white-turn' : 'black-turn');
  }
}

function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';

  const checkPos = isInCheck(currentTurn) ? findKing(currentTurn) : null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      const isLight = (r + c) % 2 === 0;
      cell.className = 'cell ' + (isLight ? 'light' : 'dark');
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (lastMove) {
        if ((lastMove.from[0] === r && lastMove.from[1] === c) ||
            (lastMove.to[0] === r && lastMove.to[1] === c)) {
          cell.classList.add('last-move');
        }
      }

      if (checkPos && checkPos[0] === r && checkPos[1] === c) {
        cell.classList.add('in-check');
      }

      if (selectedCell && selectedCell[0] === r && selectedCell[1] === c) {
        cell.classList.add('selected');
      }

      const isValid = validMoves.some(([mr, mc]) => mr === r && mc === c);
      if (isValid) {
        if (board[r][c] !== EMPTY) {
          cell.classList.add('valid-capture');
        } else {
          cell.classList.add('valid-move');
        }
      }

      const piece = board[r][c];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece ' + (isWhite(piece) ? 'white-piece' : 'black-piece');
        span.textContent = piece;
        cell.appendChild(span);
      }

      cell.addEventListener('click', () => handleCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }

  updateTurnIndicator();

  document.getElementById('captured-white').textContent = capturedByWhite.join(' ');
  document.getElementById('captured-black').textContent = capturedByBlack.join(' ');
}

function handleCellClick(r, c) {
  if (gameOver || aiThinking || currentTurn !== playerColor) return;

  const piece = board[r][c];

  if (selectedCell) {
    const isValid = validMoves.some(([mr, mc]) => mr === r && mc === c);
    if (isValid) {
      makeMove(selectedCell[0], selectedCell[1], r, c);
      selectedCell = null;
      validMoves = [];
      renderBoard();

      // Trigger AI move if it's AI's turn
      if (!gameOver && currentTurn === aiColor) {
        aiMove();
      }
      return;
    }

    if (piece && pieceColor(piece) === playerColor) {
      selectedCell = [r, c];
      validMoves = getLegalMoves(r, c);
      renderBoard();
      return;
    }

    selectedCell = null;
    validMoves = [];
    renderBoard();
    return;
  }

  if (piece && pieceColor(piece) === playerColor) {
    selectedCell = [r, c];
    validMoves = getLegalMoves(r, c);
    renderBoard();
  }
}

// ===== Controls =====
document.querySelectorAll('#difficulty-select .btn-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    if (aiThinking) return;
    document.querySelectorAll('#difficulty-select .btn-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.val;
  });
});

document.querySelectorAll('#color-select .btn-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    if (aiThinking) return;
    document.querySelectorAll('#color-select .btn-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerColor = btn.dataset.val;
    aiColor = playerColor === 'white' ? 'black' : 'white';
  });
});

const confirmModal = document.getElementById('confirm-modal');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

document.getElementById('btn-reset').addEventListener('click', () => {
  confirmModal.classList.add('visible');
});

modalCancel.addEventListener('click', () => {
  confirmModal.classList.remove('visible');
});

modalConfirm.addEventListener('click', () => {
  confirmModal.classList.remove('visible');
  initBoard();
  setStatus('');
  renderBoard();

  // If AI goes first
  if (currentTurn === aiColor) {
    aiMove();
  }
});

confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) {
    confirmModal.classList.remove('visible');
  }
});

// ===== Init =====
initBoard();
renderBoard();

// If AI plays white, AI goes first
if (currentTurn === aiColor) {
  aiMove();
}