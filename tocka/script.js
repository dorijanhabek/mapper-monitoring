// Configurable time variables (in milliseconds)
const POLL_INTERVAL = 10000; // How often to check for alerts
const NORMAL_DURATION = 3; // Number of intervals to stay in the normal state before transitioning to working
const ERROR_DURATION = 3; // Number of intervals to stay in the error state before transitioning to error-working
const ANIMATION_DELAY = 2000; // Delay for animations in working and error-working states

// State and timeout management
let stateTimeout;
let pulseTimeout;
let alertPollInterval;
let errorCount = 0; // Tracks how many intervals the error state has persisted
let normalCount = 0; // Tracks how many intervals the normal state has persisted
let internalErrorCount = 0; // Tracks internal-error intervals
let currentState = 'normal'; // Tracks the current state

function setRandomGlitchDirections() {
    const tocka = document.getElementById('tocka');
    const glitchIntensity = Math.random() * 400; // Randomize intensity dynamically (0 to 400px)

    // Randomize directions for each axis
    tocka.style.setProperty('--x1', `${(Math.random() - 0.5) * glitchIntensity}px`);
    tocka.style.setProperty('--y1', `${(Math.random() - 0.5) * glitchIntensity}px`);
    tocka.style.setProperty('--x2', `${(Math.random() - 0.5) * glitchIntensity}px`);
    tocka.style.setProperty('--y2', `${(Math.random() - 0.5) * glitchIntensity}px`);
    tocka.style.setProperty('--x3', `${(Math.random() - 0.5) * glitchIntensity}px`);
    tocka.style.setProperty('--y3', `${(Math.random() - 0.5) * glitchIntensity}px`);
    tocka.style.setProperty('--x4', `${(Math.random() - 0.5) * glitchIntensity}px`);
    tocka.style.setProperty('--y4', `${(Math.random() - 0.5) * glitchIntensity}px`);
}

function triggerGlitchEffect(
    duration = 2000,
    interval = Math.floor(200 + Math.random() * 400) // 200ms–500ms randomly
    ) {
    const tocka = document.getElementById('tocka');
    const innerCircle = tocka.querySelector('.inner-circle');

    // Remove pulse animation if present
    innerCircle.classList.remove('animate');

    // Activate glitch effect
    tocka.classList.add('glitch-active');

    const glitchEffect = setInterval(() => {
        setRandomGlitchDirections();
    }, interval);

    setTimeout(() => {
        clearInterval(glitchEffect);
        tocka.classList.remove('glitch-active');

        // Reapply pulse animation if we’re still in a working state
        if (tocka.classList.contains('working')) {
            innerCircle.classList.add('animate');
        }
    }, duration);
}

function triggerPulseEffect(delay = ANIMATION_DELAY) {
    const tocka = document.getElementById('tocka');
    const innerCircle = tocka.querySelector('.inner-circle');

    // Ensure animation is not stacked
    innerCircle.classList.remove('animate');

    // Add pulse effect after a short delay
    pulseTimeout = setTimeout(() => {
        innerCircle.classList.add('animate');
    }, delay);
}

async function checkAlerts() {
    console.log(`[ALERT CHECK] Checking for alerts...`);
    try {
        const response = await fetch('./alerts.json'); // Fetch alerts.json file in the same folder
        if (!response.ok) {
            throw new Error(`[HTTP ERROR] Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.internalError) {
            console.log(`[INTERNAL ERROR] Internal error reported.`);

            if (currentState === 'internal-error') {
                internalErrorCount++;
                console.log(
                    `[INTERNAL ERROR STATE] Staying in 'internal-error'. ${ERROR_DURATION - internalErrorCount} intervals before transitioning to 'internal-error-working'.`
                );
                if (internalErrorCount >= ERROR_DURATION) {
                    console.log(`[STATE TRANSITION] Changing state to 'internal-error-working'.`);
                    setState('internal-error-working');
                }
            } else if (currentState === 'internal-error-working') {
                console.log(`[INTERNAL-ERROR-WORKING STATE] Errors still present. Staying in 'internal-error-working' state.`);
            } else {
                console.log(`[STATE TRANSITION] Changing state to 'internal-error'.`);
                internalErrorCount = 0;
                setState('internal-error');
            }
            // Centralized glitch trigger
            if (['internal-error', 'internal-error-working'].includes(currentState)) {
                triggerGlitchEffect();
            }

            return;
        } else {
            console.log(`[NO INTERNAL ERRORS] No internal issues.`);
        }

        if (data.hasActiveAlerts) {
            console.log(`[ALERT FOUND] Active alerts detected.`);
            if (currentState === 'error') {
                errorCount++;
                console.log(
                    `[ERROR STATE] Staying in 'error' state. ${ERROR_DURATION - errorCount} intervals before transitioning to 'error-working'.`
                );
                if (errorCount >= ERROR_DURATION) {
                    console.log(`[STATE TRANSITION] Changing state to 'error-working'.`);
                    setState('error-working');
                }
            } else if (currentState === 'error-working') {
                console.log(`[ERROR-WORKING STATE] Alerts still present. Staying in 'error-working' state.`);
            } else {
                console.log(`[STATE TRANSITION] Changing state to 'error'.`);
                errorCount = 0; // Reset error counter
                setState('error');
            }
            // Centralized glitch trigger
            if (['error', 'error-working'].includes(currentState)) {
                triggerGlitchEffect();
            }

        } else {
            console.log(`[NO ALERTS] No active alerts detected.`);
            if (currentState === 'error-working' || currentState === 'error' || currentState === 'internal-error' || currentState === 'internal-error-working') {
                console.log(`[STATE TRANSITION] Changing state to 'normal'.`);
                errorCount = 0; // Reset error counter
                internalErrorCount = 0;
                setState('normal');
            } else if (currentState === 'normal') {
                normalCount++;
                console.log(
                    `[NORMAL STATE] Staying in 'normal' state. ${NORMAL_DURATION - normalCount} intervals before transitioning to 'working'.`
                );
                if (normalCount >= NORMAL_DURATION) {
                    console.log(`[STATE TRANSITION] Changing state to 'working'.`);
                    setState('working');
                }
            } else if (currentState === 'working') {
                console.log(`[WORKING STATE] Staying in 'working' state.`);
            }
        }
    } catch (error) {
        console.error('[INTERNAL ERROR] Error checking alerts:', error);
    }
}

window.setState = function (state) {
    const tocka = document.getElementById('tocka');
    const innerCircle = tocka.querySelector('.inner-circle');

    // Clear any pending timeouts
    clearTimeout(stateTimeout);
    clearTimeout(pulseTimeout);

    console.log(`[STATE TRANSITION] Transitioning from ${currentState} to ${state}`);
    currentState = state; // Update the current state

    switch (state) {
        case 'normal':
            tocka.className = 'circle normal';
            console.log(`[NORMAL STATE] Entering 'normal' state.`);
            normalCount = 0; // Reset normal state counter
            stateTimeout = setTimeout(() => {
                console.log(`[STATE TRANSITION] Changing state to 'working' state.`);
                setState('working');
            }, NORMAL_DURATION * POLL_INTERVAL);
            break;

        case 'working':
            tocka.className = 'circle normal working';
            console.log(`[WORKING STATE] Entering 'working' state.`);
            break;

        case 'error':
            console.log(`[ERROR STATE] Entering 'error' state.`);
            tocka.className = 'circle error';
            break;

        case 'error-working':
            tocka.className = 'circle error working';
            console.log(`[ERROR-WORKING STATE] Entering 'error-working' state.`);
            break;

        case 'internal-error':
            console.log(`[INTERNAL-ERROR STATE] Entering 'internal-error' state.`);
            tocka.className = 'circle internal-error';
            break;

        case 'internal-error-working':
            tocka.className = 'circle internal-error working';
            console.log(`[INTERNAL-ERROR-WORKING STATE] Entering 'internal-error-working' state.`);
            break;
    }

    if (['working', 'error-working', 'internal-error-working'].includes(state)) {
        triggerPulseEffect();
    }
};

//const circle = document.querySelector('.circle');

//document.addEventListener('mousemove', (event) => {
//    const rect = circle.getBoundingClientRect(); // Get the position of the circle
//    const circleCenterX = rect.left + rect.width / 2;
//    const circleCenterY = rect.top + rect.height / 2;
//
//    // Adjust the divisor to increase or decrease movement distance
//    const sensitivity = 10; // Lower this value to increase movement distance
//    const offsetX = (event.clientX - circleCenterX) / sensitivity;
//    const offsetY = (event.clientY - circleCenterY) / sensitivity;
//
//    // Apply the offset as a transform
//    circle.style.transition = 'transform 1s ease-out'; // Smooth start when following the cursor
//    circle.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
//});


// Reset the circle to the center slowly when the cursor leaves the screen
//document.addEventListener('mouseleave', () => {
//    circle.style.transition = 'transform 1s ease-out'; // Slow return to center
//    circle.style.transform = 'translate(0, 0)'; // Reset position
//});

// Initialize state
console.log(`[INIT] Initializing state to 'normal'.`);
setState('normal');

// Immediately check alerts once at startup
console.log(`[INIT] Performing initial alert check...`);
checkAlerts();

// Start polling for alerts based on the interval
console.log(`[INIT] Starting alert polling every ${POLL_INTERVAL / 1000} seconds.`);
alertPollInterval = setInterval(checkAlerts, POLL_INTERVAL);
