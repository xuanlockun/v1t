/**
 * Terminal Emulator display to look like commands are being typed and output is
 * being generated.
 *
 * Author: Dave Eddy <dave@daveeddy.com>
 * Date: April 05, 2025
 * License: MIT
 */

(() => {
    const TYPING_SPEED = 110;
    const INITIAL_DELAY = 2200;
    const SUBSEQUENT_DELAY = 5000;
    const CURSOR_BLINK_START = 1;
    const CURSOR_BLINK_END = 2;

    const terminalRoot = document.getElementById('main-terminal');
    const terminal = terminalRoot?.children[0];
    if (!terminal || typeof COMMANDS === 'undefined' || !Array.isArray(COMMANDS) || !COMMANDS.length) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timeoutId = null;
    let requestedActive = false;
    let completed = false;
    let generation = 0;
    let commandIndex = 0;

    function clearScheduledWork() {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        generation++;
    }

    function schedule(callback, delay, token) {
        timeoutId = setTimeout(() => {
            timeoutId = null;
            if (!requestedActive || document.hidden || token !== generation) return;
            callback();
        }, delay);
    }

    function blinkCursorStart() {
        terminal.classList.remove('no-animation');
    }

    function blinkCursorEnd() {
        terminal.classList.add('no-animation');
    }

    function renderCommandInstant(index = 0) {
        const command = COMMANDS[index];
        terminal.textContent = `$ ${command.cmd}\n${command.lines.join('\n')}\n$ `;
        blinkCursorEnd();
        completed = true;
    }

    function runCommand(index, onComplete, token) {
        const command = COMMANDS[index];
        const items = [].concat(
            CURSOR_BLINK_END,
            command.cmd.split(''),
            ['\n'],
            command.lines.map(line => `${line}\n`),
            '$ ',
            CURSOR_BLINK_START
        );
        let itemIndex = 0;

        blinkCursorStart();
        terminal.textContent = '$ ';

        function typeNext() {
            if (motionQuery.matches) {
                renderCommandInstant(index);
                return;
            }
            if (itemIndex === items.length) {
                onComplete();
                return;
            }

            const item = items[itemIndex++];
            if (item === CURSOR_BLINK_START) {
                blinkCursorStart();
            } else if (item === CURSOR_BLINK_END) {
                blinkCursorEnd();
            } else {
                terminal.textContent += item;
            }
            schedule(typeNext, TYPING_SPEED, token);
        }

        typeNext();
    }

    function runNext(delay) {
        if (!requestedActive || document.hidden || completed) return;
        if (motionQuery.matches) {
            renderCommandInstant(commandIndex);
            return;
        }

        const token = generation;
        schedule(() => {
            runCommand(commandIndex, () => {
                if (COMMANDS.length === 1) {
                    completed = true;
                    return;
                }
                commandIndex = (commandIndex + 1) % COMMANDS.length;
                runNext(SUBSEQUENT_DELAY);
            }, token);
        }, delay, token);
    }

    function start() {
        requestedActive = true;
        if (completed || timeoutId !== null || document.hidden) return;
        if (motionQuery.matches) {
            renderCommandInstant(commandIndex);
            return;
        }
        runNext(INITIAL_DELAY);
    }

    function pause() {
        requestedActive = false;
        clearScheduledWork();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearScheduledWork();
        } else if (requestedActive && !completed) {
            runNext(0);
        }
    });

    motionQuery.addEventListener('change', () => {
        clearScheduledWork();
        if (!requestedActive || completed) return;
        if (motionQuery.matches) {
            renderCommandInstant(commandIndex);
        } else {
            runNext(0);
        }
    });

    window.v1tTerminal = { start, pause };
})();
