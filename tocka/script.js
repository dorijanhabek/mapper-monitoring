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

// Store circle states
let circles = {
    main: {
        element: null,
        state: 'normal',
        errorCount: 0,
        normalCount: 0,
        internalErrorCount: 0
    }
};

function createSatelliteCircle(id, label) {
    const container = document.getElementById('satellite-container');
    
    // Create circle
    const circle = document.createElement('div');
    circle.id = `satellite-${id}`;
    circle.className = 'circle satellite normal';
    circle.innerHTML = `
        <div class="outer-ring"></div>
        <div class="middle-ring"></div>
        <div class="inner-circle"></div>
        <div class="satellite-label">${label}</div>
    `;
    container.appendChild(circle);

    // Add to circles object
    circles[id] = {
        element: circle,
        state: 'normal',
        errorCount: 0,
        normalCount: 0,
        internalErrorCount: 0
    };

    return circle;
}

function createInitialSatellites() {
    // Create exactly 5 satellites
    const satellites = ['api1', 'api2', 'api3', 'api4', 'api5'];
    satellites.forEach(id => {
        if (!circles[id]) {
            createSatelliteCircle(id, id);
        }
    });
    positionSatellites(satellites);
}

function positionSatellites(activeHosts) {
    if (activeHosts.length === 0) return;

    const radius = 35; // Reduced from 50 to bring satellites closer
    const offset = (2 * Math.PI) / activeHosts.length; // Even spacing between satellites
    
    // Sort hosts to ensure consistent ordering
    activeHosts.sort();
    
    activeHosts.forEach((id, index) => {
        // Calculate angle with offset, starting from top (-PI/2)
        const baseAngle = -Math.PI / 2; // Start from top
        const angle = baseAngle + (offset * index);
        
        // Calculate position
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        const circle = circles[id].element;
        
        // Position circle with transform translate from center
        // Account for the satellite's size (15vmin) to center it properly
        const satelliteOffset = 7.5; // Half of 15vmin
        circle.style.transform = `translate(calc(${x}vmin - ${satelliteOffset}vmin), calc(${y}vmin - ${satelliteOffset}vmin))`;
    });
}

function triggerGlitchEffect(circleId) {
    // Disabled
    return;
}

function setRandomGlitchDirections(element) {
    // Disabled
    return;
}

function triggerPulseEffect(circleId, delay = ANIMATION_DELAY) {
    const circle = circles[circleId];
    if (!circle || !circle.element) return;

    const innerCircle = circle.element.querySelector('.inner-circle');
    innerCircle.classList.remove('animate');

    setTimeout(() => {
        innerCircle.classList.add('animate');
    }, delay);
}

function setState(circleId, state) {
    const circle = circles[circleId];
    if (!circle || !circle.element) return;

    const element = circle.element;
    circle.state = state;

    // Clear any pending timeouts specific to this circle
    if (circle.stateTimeout) clearTimeout(circle.stateTimeout);
    if (circle.pulseTimeout) clearTimeout(circle.pulseTimeout);

    switch (state) {
        case 'normal':
            element.className = `circle ${circleId === 'main' ? 'main' : 'satellite'} normal`;
            circle.normalCount = 0;
            circle.stateTimeout = setTimeout(() => {
                setState(circleId, 'working');
            }, NORMAL_DURATION * POLL_INTERVAL);
            break;

        case 'working':
            element.className = `circle ${circleId === 'main' ? 'main' : 'satellite'} normal working`;
            break;

        case 'error':
            element.className = `circle ${circleId === 'main' ? 'main' : 'satellite'} error`;
            break;

        case 'error-working':
            element.className = `circle ${circleId === 'main' ? 'main' : 'satellite'} error working`;
            break;

        case 'internal-error':
            element.className = `circle ${circleId === 'main' ? 'main' : 'satellite'} internal-error`;
            break;

        case 'internal-error-working':
            element.className = `circle ${circleId === 'main' ? 'main' : 'satellite'} internal-error working`;
            break;
    }
}

function updateCircleState(circleId, hasActiveAlerts, hasInternalError) {
    const circle = circles[circleId];
    if (!circle) return;

    if (hasInternalError) {
        if (circle.state === 'internal-error') {
            circle.internalErrorCount++;
            if (circle.internalErrorCount >= ERROR_DURATION) {
                setState(circleId, 'internal-error-working');
            }
        } else if (circle.state === 'internal-error-working') {
            // Stay in this state
        } else {
            circle.internalErrorCount = 0;
            setState(circleId, 'internal-error');
        }
        
        if (['internal-error', 'internal-error-working'].includes(circle.state)) {
            triggerGlitchEffect(circleId);
        }
        return;
    }

    if (hasActiveAlerts) {
        if (circle.state === 'error') {
            circle.errorCount++;
            if (circle.errorCount >= ERROR_DURATION) {
                setState(circleId, 'error-working');
            }
        } else if (circle.state === 'error-working') {
            // Stay in this state
        } else {
            circle.errorCount = 0;
            setState(circleId, 'error');
        }
        
        if (['error', 'error-working'].includes(circle.state)) {
            triggerGlitchEffect(circleId);
        }
    } else {
        if (['error-working', 'error', 'internal-error', 'internal-error-working'].includes(circle.state)) {
            circle.errorCount = 0;
            circle.internalErrorCount = 0;
            setState(circleId, 'normal');
        } else if (circle.state === 'normal') {
            circle.normalCount++;
            if (circle.normalCount >= NORMAL_DURATION) {
                setState(circleId, 'working');
            }
        }
    }
}

async function checkAlerts() {
    console.log(`[ALERT CHECK] Checking for alerts...`);
    try {
        const internalRes = await fetch('/internal');
        const alertRes = await fetch('/alerts');
        const labelRes = await fetch('/label');
        
        if (!internalRes.ok || !alertRes.ok || !labelRes.ok) {
            throw new Error(`[HTTP ERROR] One or more endpoints failed`);
        }

        const internalData = await internalRes.json();
        const alertData = await alertRes.json();
        const labelData = await labelRes.json();

        // Update API labels
        updateAlertLabels();

        // Get hosts excluding 'main'
        const hosts = Object.keys(labelData).filter(host => host !== 'main');
        
        // Remove any satellites that no longer exist in labelData
        Object.keys(circles).forEach(id => {
            if (id !== 'main' && !hosts.includes(id)) {
                if (circles[id].element) circles[id].element.remove();
                delete circles[id];
            }
        });
        
        // Create/update satellite circles
        hosts.forEach(host => {
            if (!circles[host]) {
                createSatelliteCircle(host, host);
            }
        });
        
        // Position all satellites
        positionSatellites(hosts);

        // Update main circle (aggregate state)
        const mainHasAlerts = hosts.some(host => labelData[host] === 'ALERT_DETECTED');
        const mainHasInternalError = hosts.some(host => ['API_ERROR', 'SOURCE_ERROR'].includes(labelData[host]));
        updateCircleState('main', mainHasAlerts, mainHasInternalError);

        // Update individual circles
        hosts.forEach(host => {
            const hasAlerts = labelData[host] === 'ALERT_DETECTED';
            const hasInternalError = ['API_ERROR', 'SOURCE_ERROR'].includes(labelData[host]);
            updateCircleState(host, hasAlerts, hasInternalError);
        });

    } catch (error) {
        console.error('[INTERNAL ERROR] Error checking alerts:', error);
        // Set all circles to internal error state
        Object.keys(circles).forEach(circleId => {
            updateCircleState(circleId, false, true);
        });
    }
}

function updateAlertLabels() {
    fetch('/label')
      .then(res => res.json())
      .then(labels => {
        const container = document.getElementById('apiLabelContainer');
        container.innerHTML = '';
  
        const entries = Object.entries(labels);
  
        if (entries.length === 0) {
          container.style.display = 'none';
          return;
        }
  
        container.style.display = 'block';
  
        entries.forEach(([name, status]) => {
          if (!status) return;
  
          const div = document.createElement('div');
          div.classList.add('api-label');
  
          if (status === 'API_ERROR' || status === 'SOURCE_ERROR') {
            div.classList.add('internal');
          } else if (status === 'ALERT_DETECTED') {
            div.classList.add('alert');
          }
  
          div.textContent = `${name} : ${status}`;
          container.appendChild(div);
        });
    })
    .catch(err => {
        console.error('[LABEL FETCH ERROR]', err);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main circle
    circles.main.element = document.getElementById('main-tocka');
    
    // Start polling
    checkAlerts();
    alertPollInterval = setInterval(checkAlerts, POLL_INTERVAL);
});