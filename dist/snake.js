"use strict";
function initGame() {
    // init screen
    let screen = Array(24)
        .fill()
        .map(() => Array(24).fill("."));
    // randomly place the snake with length of 3 generally in the middle, 4 spaces away from the sides
    const snakeStartX = Math.floor(Math.random() * 16) + 4;
    const snakeStartY = Math.floor(Math.random() * 16) + 4;
    const snakeStartDirection = Math.floor(Math.random() * 4); // 0 = W, 1 = S, 2 = E, 3 = N
    // head of snake is @
    let snake = [];
    snake[0] = { x: snakeStartX, y: snakeStartY };
    if (snakeStartDirection === 0) {
        // W
        snake[1] = { x: snakeStartX, y: snakeStartY - 1 };
        snake[2] = { x: snakeStartX, y: snakeStartY - 2 };
    }
    if (snakeStartDirection === 1) {
        // S
        snake[1] = { x: snakeStartX - 1, y: snakeStartY };
        snake[2] = { x: snakeStartX - 2, y: snakeStartY };
    }
    if (snakeStartDirection === 2) {
        // E
        snake[1] = { x: snakeStartX, y: snakeStartY + 1 };
        snake[2] = { x: snakeStartX, y: snakeStartY + 2 };
    }
    if (snakeStartDirection === 3) {
        // N
        snake[1] = { x: snakeStartX + 1, y: snakeStartY };
        snake[2] = { x: snakeStartX + 2, y: snakeStartY };
    }
    // put the snake on the board to simplify apple placement
    screen[snake[0].x][snake[0].y] = "@";
    for (let s = 1; s < snake.length; s++) {
        // simply put the snake on the screen
        screen[snake[s].x][snake[s].y] = "S";
    }
    // put eight apples in the board randomly
    for (let i = 0; i < 8; i++) {
        const appleX = Math.floor(Math.random() * 24);
        const appleY = Math.floor(Math.random() * 24);
        // validate that there's not already an apple in the spot
        if (screen[appleX][appleY] === ".") {
            screen[appleX][appleY] = "a";
        }
        else {
            // try again
            i--;
        }
    }
    nextDirection = snakeStartDirection;
    return {
        screen: screen,
        snakeDirection: snakeStartDirection,
        snakeLength: 3,
        snake: snake,
        gameOver: false,
        speedFactor: 0,
    };
}
function printScreen(game) {
    console.clear();
    let out = `Points ${game.snakeLength}, Direction: ${game.snakeDirection === 0
        ? "E"
        : game.snakeDirection === 1
            ? "S"
            : game.snakeDirection === 2
                ? "W"
                : game.snakeDirection === 3
                    ? "N"
                    : ""}, Speed: ${game.speedFactor}\n`;
    // simply put the snake on the screen
    game.screen[game.snake[0].x][game.snake[0].y] = "@";
    for (let s = 1; s < game.snake.length; s++) {
        game.screen[game.snake[s].x][game.snake[s].y] = "S";
    }
    for (let i = 0; i < game.screen.length; i++) {
        for (let j = 0; j < game.screen[i].length; j++) {
            out = out.concat(game.screen[i][j]);
        }
        out = out.concat("\n");
    }
    console.log(out);
}
function moveSnake(game) {
    game.snakeDirection = nextDirection;
    // 0 = W, 1 = S, 2 = E, 3 = N
    if (game.snakeDirection === 0) {
        // E
        game.snake.unshift({ x: game.snake[0].x, y: game.snake[0].y + 1 });
    }
    else if (game.snakeDirection === 1) {
        // S
        game.snake.unshift({ x: game.snake[0].x + 1, y: game.snake[0].y });
    }
    else if (game.snakeDirection === 2) {
        // W
        game.snake.unshift({ x: game.snake[0].x, y: game.snake[0].y - 1 });
    }
    else if (game.snakeDirection === 3) {
        // N
        game.snake.unshift({ x: game.snake[0].x - 1, y: game.snake[0].y });
    }
    // boundary collision
    if (game.snake[0].x > 23 ||
        game.snake[0].x < 0 ||
        game.snake[0].y > 23 ||
        game.snake[0].y < 0) {
        game.gameOver = true;
    }
    // snake collision
    if (!game.gameOver && (game.screen[game.snake[0].x][game.snake[0].y] === "S" ||
        game.screen[game.snake[0].x][game.snake[0].y] === "@")) {
        game.gameOver = true;
    }
    // apple check
    if (!game.gameOver && game.screen[game.snake[0].x][game.snake[0].y] === "a") {
        game.snakeLength++;
        // add another apple
        const appleX = Math.floor(Math.random() * 24);
        const appleY = Math.floor(Math.random() * 24);
        // validate that there's not already an apple in the spot
        if (game.screen[appleX][appleY] === ".") {
            game.screen[appleX][appleY] = "a";
        }
        // increase the speed every 4 apples
        if (game.speedFactor < 140) {
            game.speedFactor = Math.floor(game.snake.length / 4) * 10;
        }
    }
    else {
        // if player doesn't get the apple, remove the tail
        let tail = game.snake.pop();
        game.screen[tail.x][tail.y] = ".";
    }
    return game;
}
function gameLoop(game) {
    printScreen(game);
    // move the snake
    game = moveSnake(game);
    if (!game.gameOver) {
        setTimeout(() => {
            gameLoop(game);
        }, 200 - game.speedFactor);
    }
    else {
        console.log(`You lose!\nYour snake had ${game.snakeLength} segments!`);
    }
}
process.stdin.setEncoding('utf8');
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', (key) => {
    // Exit on ctrl-c
    if (key === '\u0003') {
        process.exit();
    }
    // Arrow keys send a sequence of bytes
    // Up: \u001b[A
    // Down: \u001b[B
    // Right: \u001b[C
    // Left: \u001b[D
    // 0 = W, 1 = S, 2 = E, 3 = N
    switch (key) {
        case '\u001b[A':
            // up arrow
            nextDirection = 3;
            break;
        case '\u001b[B':
            // down arrow
            nextDirection = 1;
            break;
        case '\u001b[C':
            // right arrow
            nextDirection = 0;
            break;
        case '\u001b[D':
            // left arrow
            nextDirection = 2;
            break;
        default:
        // console.log('Other key pressed:', key);
    }
});
let nextDirection = "";
gameLoop(initGame());
