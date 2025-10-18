# boop - Game Rules

## Overview
**boop** is a two-player abstract strategy game where players take turns placing pieces on a 6x6 grid. When a piece is placed, it "boops" (pushes) all adjacent pieces one space away. The objective is to graduate kittens into cats by forming lines of three, then win by aligning three cats.

## Game Specifications
- **Players:** 2
- **Game Duration:** ~20 minutes
- **Board:** 6x6 grid
- **Pieces per player:** 8 Kittens + 8 Cats (in reserve)

## Game Objective
1. Form a line of three kittens to graduate them into cats
2. Win by forming a line of three cats OR having all 8 cats on the board

## Initial Setup
- Each player starts with 8 kittens in their pool
- Each player has 8 cats in reserve (not yet in play)
- The board starts empty
- Players alternate turns, with one player chosen to go first

## Game Mechanics

### 1. Piece Placement
On each turn, a player must place one piece from their pool onto any empty square on the board.

### 2. Booping Mechanism
When a piece is placed on the board, it immediately "boops" all orthogonally and diagonally adjacent pieces, pushing them one square away from the placed piece.

#### Booping Rules:
- All 8 adjacent pieces (orthogonal and diagonal) are pushed simultaneously
- Pieces can be booped off the board and return to their owner's pool
- A booped piece does NOT cause secondary boops (no chain reactions)
- Booping is mandatory and automatic

### 3. Line Protection Rule
**Critical Rule:** When two or more pieces are already aligned in a straight line (horizontally, vertically, or diagonally), they cannot be pushed along that line's axis. This applies regardless of piece colors.

Example: If two pieces are horizontally adjacent, a third piece placed in that horizontal line cannot push them horizontally.

### 4. Graduation System

#### Graduation Trigger
After booping resolution, if a player has exactly 3 of their kittens in a straight line (horizontal, vertical, or diagonal), graduation occurs.

#### Graduation Process
1. Remove all three kittens from the board (permanently removed from game)
2. Add three cats from reserve to the player's pool
3. Player always maintains 8 active pieces total

#### Alternative Graduation
If all 8 of a player's pieces are on the board, they may graduate any single kitten:
- Remove one kitten from the board
- Add one cat from reserve to pool

#### Special Cases
- If more than 3 pieces form a line, choose exactly 3 to graduate
- If multiple separate lines of 3 are formed, choose one line to graduate
- Players may strategically choose to return a cat to their pool instead of graduating a kitten

### 5. Cat Properties
Cats function identically to kittens with one crucial exception:
- **Cats CANNOT be booped by kittens**
- Cats CAN boop other cats
- Cats CAN boop kittens

When forming lines with mixed cats and kittens:
- All pieces in the line are removed
- Kittens graduate to cats
- All cats (including newly graduated) go to the player's pool

## Victory Conditions
A player wins immediately by achieving either:
1. **Three cats in a row** - Form a straight line of 3 cats (horizontal, vertical, or diagonal)
2. **Full board domination** - Have all 8 cats on the board at the end of a turn

Victory is checked only after all booping effects are fully resolved.

## Technical Implementation Notes

### Board State
- 6x6 grid with 36 possible positions
- Each position can be: empty, contain a kitten (player 1 or 2), or contain a cat (player 1 or 2)

### Move Validation
1. Check if selected square is empty
2. Apply booping to all adjacent pieces
3. Check for graduations
4. Check for victory conditions

### Booping Algorithm
For each of the 8 adjacent squares:
1. If occupied, calculate push direction
2. If destination is valid (on board), move piece
3. If destination is invalid (off board), return piece to owner's pool
4. No recursive booping

### Line Detection
- Check all possible lines of 3 through each newly affected position
- Lines must be exactly 3 pieces of the same player
- Mixed kitten/cat lines are valid for graduation




Вот пример моего сайта. Нужно будет написать (index.html, script.js, styles.css) для игры Cats (смотри readme). Считай что в папке уже будут доступны common.css, common.js. Пока не нужно делать комнаты и мультиплеер, для начала нужно отладить правила и поведение сайта на фронте. Вместо котёнков и котов давай пока использовать символы (A, a, B, b). Пусть сейчас будет на одном экран доступен выбор для обоих игроков. Сначала выбирается что ставить, а потом по нажатию ставится. Пока не нужно делать никаких анимаций отталкивания котов. Основное нужно реализовать механики. Внешний вид должен быть приятным и современным. How to play пока можешь не делать, потом его сделаем. На экране не должно быть никакой прокрутки, все вполне может помещаться на одном экране.