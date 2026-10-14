/**
 * Lempar Koin 3D – game logic.
 *
 * Two coins are tossed with a CSS-driven 3D rotation animation. Each coin is
 * represented by a Coin object that owns its DOM elements and animation state,
 * so the previous duplicated per-coin code (coin1/coin2, shadow1/shadow2,
 * result1/result2) is no longer needed.
 */
(() => {
    'use strict';

    const TOSS_DURATION_MS = 2500;
    const TOSS_EASING = 'cubic-bezier(0.17, 0.67, 0.83, 0.67)';
    const IDLE_TRANSITION = 'transform 0.1s linear';
    const RESULTS = Object.freeze({ HEAD: 'HEAD', TAIL: 'TAIL' });

    /** Flip a coin in mid-air: heads (even full turns) or tails (+180°). */
    function randomResult() {
        return Math.random() < 0.5 ? RESULTS.HEAD : RESULTS.TAIL;
    }

    /**
     * A single 3D coin: handles its own flip animation, resting transform and
     * hover effect.
     */
    class Coin {
        /**
         * @param {HTMLElement} element   The rotating `.coin` element.
         * @param {HTMLElement} shadowEl  The `.coin-shadow` element below it.
         * @param {HTMLElement} resultEl  Where the textual result is shown.
         */
        constructor(element, shadowEl, resultEl) {
            this.el = element;
            this.shadowEl = shadowEl;
            this.resultEl = resultEl;
            this.restAngle = 0; // final rotateY angle for the current face
            this.isAnimating = false;
            this.hovered = false;

            this.el.addEventListener('mouseenter', () => {
                this.hovered = true;
                this.#applyTransform();
            });
            this.el.addEventListener('mouseleave', () => {
                this.hovered = false;
                this.#applyTransform();
            });
        }

        /** Show a placeholder value (used while a toss is in flight). */
        resetResult() {
            this.resultEl.textContent = '-';
        }

        /**
         * Run the toss animation.
         * @returns {Promise<string>} 'HEAD' or 'TAIL' once the coin settles.
         */
        toss() {
            return new Promise((resolve) => {
                this.isAnimating = true;

                const result = randomResult();
                const rotations = 10 + Math.floor(Math.random() * 5); // 10–14 full turns
                const spinAngle =
                    result === RESULTS.HEAD ? rotations * 360 : rotations * 360 + 180;

                // Start from a clean resting position, then spin.
                this.el.style.transition = 'none';
                this.el.style.transform = `rotateY(${this.restAngle}deg)`;
                void this.el.offsetWidth; // force reflow so the reset applies first

                this.el.style.transition = `transform ${TOSS_DURATION_MS}ms ${TOSS_EASING}`;
                this.el.style.transform = `rotateY(${spinAngle}deg)`;
                this.shadowEl.classList.add('shadow-animate');

                window.setTimeout(() => {
                    this.shadowEl.classList.remove('shadow-animate');

                    // Snap to the exact resting face without a visible jump.
                    this.el.style.transition = 'none';
                    this.restAngle = result === RESULTS.HEAD ? 0 : 180;
                    this.#applyTransform();
                    void this.el.offsetWidth;
                    this.el.style.transition = IDLE_TRANSITION;

                    this.isAnimating = false;
                    this.resultEl.textContent = result;
                    resolve(result);
                }, TOSS_DURATION_MS);
            });
        }

        #applyTransform() {
            if (this.isAnimating) return;
            const scale = this.hovered ? ' scale(1.05)' : '';
            this.el.style.transform = `rotateY(${this.restAngle}deg)${scale}`;
        }
    }

    /** Aggregate stats across all coins and render them. */
    class Stats {
        constructor(totalEl, headsEl, tailsEl) {
            this.totalEl = totalEl;
            this.headsEl = headsEl;
            this.tailsEl = tailsEl;
            this.tosses = 0;
            this.heads = 0;
            this.tails = 0;
        }

        record(results) {
            this.tosses += 1;
            for (const result of results) {
                if (result === RESULTS.HEAD) this.heads += 1;
                else this.tails += 1;
            }
            this.render();
        }

        render() {
            this.totalEl.textContent = this.tosses;
            this.headsEl.textContent = this.heads;
            this.tailsEl.textContent = this.tails;
        }
    }

    /** App controller: wires coins, button, sound and keyboard input together. */
    class CoinTossGame {
        constructor() {
            this.button = document.getElementById('tossButton');
            this.sound = document.getElementById('coinSound');
            this.stats = new Stats(
                document.getElementById('totalTosses'),
                document.getElementById('headsCount'),
                document.getElementById('tailsCount')
            );
            this.coins = [
                new Coin(
                    document.getElementById('coin1'),
                    document.getElementById('shadow1'),
                    document.getElementById('result1')
                ),
                new Coin(
                    document.getElementById('coin2'),
                    document.getElementById('shadow2'),
                    document.getElementById('result2')
                ),
            ];
            this.isBusy = false;

            this.button.addEventListener('click', () => this.tossAll());
            document.addEventListener('keydown', (event) => {
                if ((event.code === 'Space' || event.code === 'Enter') && !this.isBusy) {
                    event.preventDefault();
                    this.tossAll();
                }
            });

            this.stats.render();
        }

        async tossAll() {
            if (this.isBusy) return;
            this.isBusy = true;
            this.#setButtonBusy(true);
            this.coins.forEach((coin) => coin.resetResult());
            this.#playSound();

            const results = await Promise.all(this.coins.map((coin) => coin.toss()));
            this.stats.record(results);

            this.#setButtonBusy(false);
            this.isBusy = false;
        }

        #setButtonBusy(busy) {
            this.button.disabled = busy;
            this.button.innerHTML = busy
                ? '<i class="fas fa-spinner fa-spin"></i> Melakukan Lemparan...'
                : '<i class="fas fa-hand-rock"></i> Lempar 2 Koin';
        }

        #playSound() {
            this.sound.currentTime = 0;
            this.sound.play().catch((error) => {
                console.log('Audio tidak dapat diputar: ', error);
            });
        }
    }

    function init() {
        new CoinTossGame();
        console.log('Permainan Lempar Koin 3D siap!');
        console.log('Tekan Spasi atau Enter untuk melempar koin.');
    }

    // The script is loaded with `defer`, so the DOM is usually ready already;
    // fall back to DOMContentLoaded when it is not.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
