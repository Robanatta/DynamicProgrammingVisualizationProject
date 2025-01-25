// This script handles the front-end logic for the dynamic programming visualizer.
document.addEventListener('DOMContentLoaded', () => {
    // grab elements
    const recursiveFormulaInput = document.getElementById('recursive-formula');
    const baseCasesInput = document.getElementById('base-cases');
    const submitFormulaButton = document.getElementById('submit-formula');
    const parametersSection = document.getElementById('parameters-section');
    const controlsSection = document.getElementById('controls');
    const visualizationSection = document.getElementById('visualization-section');
    const visualizationContainer = document.getElementById('visualization-container');

    // Existing buttons
    const viewFullButton = document.getElementById('view-full-button');
    const restartButton = document.getElementById('restart-button');
    const viewStepButton = document.getElementById('view-step-button');

    // Dynamic controls (play/pause, speed)
    let playPauseButton = null;
    let speedSelect = null;

    let steps = [];
    let currentStepIndex = -1;
    let autoPlayInterval = null; // For auto-play

    // Disable "View Next Step" (which we'll rename to "Next") until user clicks "Compute & View Result"
    viewStepButton.disabled = true;

    // ----------------------------------------------------------------------
    // 1) REORDER CONTROLS & RENAME "View Next Step" to "Next"
    // ----------------------------------------------------------------------
    // Rename the button text
    viewStepButton.textContent = 'Next';

    // Clear the #controls panel and manually re-append in desired order
    controlsSection.innerHTML = '';  
    // First line: Compute (view-full-button), Restart (restart-button)
    controlsSection.appendChild(viewFullButton);
    controlsSection.appendChild(restartButton);

    // Break, then second line: Next (viewStepButton), Play, Speed
    const brLine = document.createElement('br');
    controlsSection.appendChild(brLine);
    controlsSection.appendChild(viewStepButton);
    // The Play/Pause + Speed will be inserted dynamically by insertPlayPauseControls()

    // ----------------------------------------------------------------------
    // Parse the formula, display parameters
    // ----------------------------------------------------------------------
    submitFormulaButton.addEventListener('click', async () => {
        // Clear any existing steps
        const formula = recursiveFormulaInput.value.trim();
        // Check if the formula is empty
        if (!formula) {
            alert('Please enter a recursive formula, e.g., "n <= 1 ? n : F(n-1) + F(n-2)".');
            return;
        }
        // Check if the formula is valid
        try {
            const response = await fetch('/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formula }),
            });
            if (!response.ok) {
                const error = await response.json();
                alert(`Error: ${error.error}`);
                return;
            }
            const result = await response.json();

            // Hide or reset sections from previous attempts
            parametersSection.innerHTML = '';
            parametersSection.style.display = 'none';
            controlsSection.style.display = 'none';
            visualizationSection.style.display = 'none';
            visualizationContainer.innerHTML = '';

            // Check if we have identified variables
            if (result.variables && result.variables.length > 0) {
                // Build dynamic param inputs
                const title = document.createElement('h2');
                title.textContent = 'Set Parameters';
                parametersSection.appendChild(title);

                const info = document.createElement('p');
                info.textContent = 'Enter values for the identified variable(s) and choose a solving method.';
                parametersSection.appendChild(info);

                // For each variable, create an input
                result.variables.forEach((variable) => {
                    const div = document.createElement('div');
                    const label = document.createElement('label');
                    label.textContent = `Value for "${variable}":`;
                    const input = document.createElement('input');
                    input.id = `input-${variable}`;
                    input.placeholder = 'e.g., 10';
                    div.appendChild(label);
                    div.appendChild(input);
                    parametersSection.appendChild(div);
                });

                // Add "Max Recursions" input
                const maxRecDiv = document.createElement('div');
                const maxRecLabel = document.createElement('label');
                maxRecLabel.textContent = 'Max Recursions Allowed (Optional):';
                const maxRecInput = document.createElement('input');
                maxRecInput.type = 'number';
                maxRecInput.id = 'max-recursions';
                maxRecInput.placeholder = 'e.g., 100';
                maxRecDiv.appendChild(maxRecLabel);
                maxRecDiv.appendChild(maxRecInput);
                parametersSection.appendChild(maxRecDiv);

                // Build the radio buttons for "top-down" vs "bottom-up"
                const methodDiv = document.createElement('div');
                const methodLabel = document.createElement('label');
                methodLabel.textContent = 'Solving Method:';
                methodDiv.appendChild(methodLabel);
                methodDiv.appendChild(document.createElement('br'));

                const topDownRadio = document.createElement('input');
                topDownRadio.type = 'radio';
                topDownRadio.id = 'top-down';
                topDownRadio.name = 'solving-method';
                topDownRadio.value = 'top-down';
                topDownRadio.checked = true;
                const topDownLabel = document.createElement('label');
                topDownLabel.setAttribute('for', 'top-down');
                topDownLabel.textContent = 'Top-down';

                const bottomUpRadio = document.createElement('input');
                bottomUpRadio.type = 'radio';
                bottomUpRadio.id = 'bottom-up';
                bottomUpRadio.name = 'solving-method';
                bottomUpRadio.value = 'bottom-up';
                const bottomUpLabel = document.createElement('label');
                bottomUpLabel.setAttribute('for', 'bottom-up');
                bottomUpLabel.textContent = 'Bottom-up';

                methodDiv.appendChild(topDownRadio);
                methodDiv.appendChild(topDownLabel);
                methodDiv.appendChild(document.createElement('br'));
                methodDiv.appendChild(bottomUpRadio);
                methodDiv.appendChild(bottomUpLabel);

                parametersSection.appendChild(methodDiv);

                // Show the sections
                parametersSection.style.display = 'block';
                controlsSection.style.display = 'block';
                visualizationSection.style.display = 'block';

                // Insert the Play/Pause controls (only once)
                insertPlayPauseControls();

                // Disable "Next" and "Play/Pause" until user clicks "Compute & View Result"
                viewStepButton.disabled = true;
                if (playPauseButton) {
                    playPauseButton.disabled = true;
                }
            } else {
                alert('No variables found. Please check your formula.');
            }
        } catch (err) {
            console.error(err);
            alert('Error parsing formula.');
        }
    });

    // ----------------------------------------------------------------------
    // "Compute & View Result" => we fetch steps, re-enable step/pause
    // ----------------------------------------------------------------------
    viewFullButton.addEventListener('click', async () => {
        const formula = recursiveFormulaInput.value.trim();
        const baseCases = baseCasesInput.value.trim();
        const solvingMethod = document.querySelector('input[name="solving-method"]:checked')?.value || 'top-down';
        const maxRecursionsInput = document.getElementById('max-recursions');
        const maxRecursions = maxRecursionsInput?.value ? parseInt(maxRecursionsInput.value, 10) : null;

        // Build the parameters object from each variable input
        const parameters = {};
        document.querySelectorAll('[id^="input-"]').forEach((input) => {
            const variableName = input.id.replace('input-', '');
            parameters[variableName] = parseInt(input.value, 10);
        });

        try {
            const response = await fetch('/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formula, baseCases, parameters, solvingMethod, maxRecursions }),
            });

            if (!response.ok) {
                const error = await response.json();
                alert(`Error: ${error.error}`);
                return;
            }

            const result = await response.json();
            steps = result.steps || [];
            currentStepIndex = -1;
            visualizationContainer.innerHTML = `
                <p><strong>Final Result:</strong> ${result.result}</p>
                <p>(Use "Next" or "Play" to see each step in detail.)</p>
            `;

            // reset any auto-play
            clearAutoPlay();

            // now that we have steps, enable "Next" and "Play/Pause"
            viewStepButton.disabled = false;
            if (playPauseButton) {
                playPauseButton.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert('Error solving the formula.');
        }
    });

    // ----------------------------------------------------------------------
    // "Next" (formerly "View Next Step")
    // ----------------------------------------------------------------------
    viewStepButton.addEventListener('click', () => {
        nextStep(); // display next step
    });

    // ----------------------------------------------------------------------
    // "Restart" => clear everything
    // ----------------------------------------------------------------------
    restartButton.addEventListener('click', () => {
        clearAutoPlay();
        visualizationContainer.innerHTML = '';
        steps = [];
        currentStepIndex = -1;

        // disable Next and Play
        viewStepButton.disabled = true;
        if (playPauseButton) {
            playPauseButton.disabled = true;
            playPauseButton.textContent = 'Play'; // revert label
        }
    });

    // ----------------------------------------------------------------------
    // Next Step logic
    // ----------------------------------------------------------------------
    function nextStep() {
        if (steps.length === 0) {
            alert('No steps recorded. Please compute first.');
            return false;
        }
        currentStepIndex++;
        if (currentStepIndex >= steps.length) {
            alert('No more steps.');
            currentStepIndex = steps.length - 1;
            return false;
        }
        displayStep(currentStepIndex, steps[currentStepIndex]);
        return true;
    }

    // ----------------------------------------------------------------------
    // Insert the Play/Pause + Speed controls
    // ----------------------------------------------------------------------
    function insertPlayPauseControls() {
        // Add "Play/Pause" and "Speed" if not already inserted
        if (document.getElementById('play-pause-button')) {
            return; // already inserted
        }

        const panel = document.getElementById('controls');
        if (!panel) return;

        // Create and append the Play/Pause button
        playPauseButton = document.createElement('button');
        playPauseButton.id = 'play-pause-button';
        playPauseButton.textContent = 'Play';
        playPauseButton.style.marginLeft = '10px';
        panel.appendChild(playPauseButton);

        // Speed label + select
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed:';
        speedLabel.style.marginLeft = '1rem';
        panel.appendChild(speedLabel);

        speedSelect = document.createElement('select');
        speedSelect.id = 'speed-select';
        const speeds = [ '0.5x', '1x', '2x', '3x' ];
        speeds.forEach((s) => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = s;
            speedSelect.appendChild(option);
        });
        speedSelect.value = '1x';
        speedSelect.style.marginLeft = '0.5rem';
        panel.appendChild(speedSelect);

        // Initially disabled until we compute steps
        playPauseButton.disabled = true;

        // Add event listeners
        playPauseButton.addEventListener('click', handlePlayPause);
        speedSelect.addEventListener('change', handleSpeedChange);
    }

    // ----------------------------------------------------------------------
    // Play/Pause logic
    // ----------------------------------------------------------------------
    function handlePlayPause() {
        if (playPauseButton.disabled) return;
        if (!autoPlayInterval) {
            // Start auto-play
            playPauseButton.textContent = 'Pause';
            startAutoPlay();
        } else {
            // Pause auto-play
            playPauseButton.textContent = 'Play';
            clearAutoPlay();
        }
    }

    function handleSpeedChange() {
        if (autoPlayInterval) {
            clearAutoPlay();
            startAutoPlay();
        }
    }

    function startAutoPlay() {
        const speedVal = speedSelect?.value || '1x';
        let msDelay = 1000; // default
        if (speedVal === '0.5x') msDelay = 2000;
        else if (speedVal === '1x') msDelay = 1000;
        else if (speedVal === '2x') msDelay = 500;
        else if (speedVal === '3x') msDelay = 333;

        autoPlayInterval = setInterval(() => {
            const ok = nextStep();
            if (!ok) {
                clearAutoPlay();
                playPauseButton.textContent = 'Play';
            }
        }, msDelay);
    }

    function clearAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    // ----------------------------------------------------------------------
    // displayStep => draws a single step
    // ----------------------------------------------------------------------
    function displayStep(stepIndex, step) {
        visualizationContainer.innerHTML = '';

        // Step counter
        const stepCounter = document.createElement('p');
        stepCounter.innerHTML = `<strong>Step ${stepIndex + 1} of ${steps.length}</strong>`;
        visualizationContainer.appendChild(stepCounter);

        // Dispatch by action
        if (step.action === 'push' || step.action === 'pop') {
            displayTopDownStep(step);
        } else if (step.action === 'fill') {
            displayBottomUp1D(step);
        } else if (step.action === 'fill2D') {
            displayBottomUp2D(step);
        } else {
            const unknown = document.createElement('p');
            unknown.textContent = `Unknown step action: ${step.action}`;
            visualizationContainer.appendChild(unknown);
        }
    }

    // Top-Down Step
    function displayTopDownStep(step) {
        const explanation = document.createElement('p');
        explanation.classList.add('explanation');
        if (step.action === 'push') {
            explanation.textContent = `PUSH: We are calling a new frame → ${topOfStackConcrete(step)}`;
        } else {
            explanation.textContent = `POP: Finished evaluating ${topOfStackConcrete(step)} = ${step.resolvedValue}`;
        }
        if (step.evaluationDetail) {
            const detailDiv = document.createElement('div');
            detailDiv.classList.add('detail');
            detailDiv.textContent = `Evaluation: ${step.evaluationDetail}`;
            explanation.appendChild(document.createElement('br'));
            explanation.appendChild(detailDiv);
        }
        explanation.classList.add('animate-fade');
        visualizationContainer.appendChild(explanation);

        // Show stack
        const stackContainer = document.createElement('div');
        stackContainer.classList.add('stack-container', 'animate-fade');
        if (step.stack) {
            step.stack.forEach((callFrame, idx) => {
                const frameDiv = document.createElement('div');
                frameDiv.classList.add('stack-frame');
                frameDiv.textContent = callFrame.concrete;
                if (idx === step.stack.length - 1) {
                    frameDiv.classList.add('highlight-frame');
                }
                stackContainer.appendChild(frameDiv);
            });
        }
        visualizationContainer.appendChild(stackContainer);
    }

    // Bottom-Up (1D)
    function displayBottomUp1D(step) {
        const explanation = document.createElement('p');
        explanation.classList.add('explanation');
        explanation.textContent = `FILL: Updating dp[${step.index}]`;
        if (step.explanation) {
            const detailDiv = document.createElement('div');
            detailDiv.classList.add('detail');
            detailDiv.textContent = step.explanation;
            explanation.appendChild(document.createElement('br'));
            explanation.appendChild(detailDiv);
        }
        explanation.classList.add('animate-fade');
        visualizationContainer.appendChild(explanation);

        const dpTable = document.createElement('table');
        dpTable.classList.add('animate-fade');

        const row = document.createElement('tr');
        step.dpSnapshot.forEach((val, i) => {
            const cell = document.createElement('td');
            cell.style.padding = '6px 12px';
            cell.style.border = '1px solid #ccc';
            cell.textContent = (val === null || val === undefined) ? '∅' : val;
            if (i === step.index) {
                cell.classList.add('highlight-frame');
            }
            row.appendChild(cell);
        });
        dpTable.appendChild(row);
        visualizationContainer.appendChild(dpTable);
    }

    // Bottom-Up (2D)
    function displayBottomUp2D(step) {
        const explanation = document.createElement('p');
        explanation.classList.add('explanation');
        explanation.textContent = `FILL: Updating dp[${step.i}][${step.j}]`;
        if (step.explanation) {
            const detailDiv = document.createElement('div');
            detailDiv.classList.add('detail');
            detailDiv.textContent = step.explanation;
            explanation.appendChild(document.createElement('br'));
            explanation.appendChild(detailDiv);
        }
        explanation.classList.add('animate-fade');
        visualizationContainer.appendChild(explanation);

        const dpTable = document.createElement('table');
        dpTable.classList.add('animate-fade');
        step.dpSnapshot.forEach((rowArray, rowIndex) => {
            const rowTr = document.createElement('tr');
            rowArray.forEach((val, colIndex) => {
                const cell = document.createElement('td');
                cell.style.padding = '6px 12px';
                cell.style.border = '1px solid #ccc';
                cell.textContent = (val === null || val === undefined) ? '∅' : val;
                if (rowIndex === step.i && colIndex === step.j) {
                    cell.classList.add('highlight-frame');
                }
                rowTr.appendChild(cell);
            });
            dpTable.appendChild(rowTr);
        });
        visualizationContainer.appendChild(dpTable);
    }

    function topOfStackConcrete(step) {
        if (!step.stack || step.stack.length === 0) return 'N/A';
        return step.stack[step.stack.length - 1].concrete;
    }
});
