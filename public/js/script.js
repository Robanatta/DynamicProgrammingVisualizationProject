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

    // Dynamic controls
    let playPauseButton = null;
    let speedSelect = null;

    let steps = [];
    let currentStepIndex = -1;
    let autoPlayInterval = null; // For auto-play

    // Disable "View Next Step" and "Play/Pause" until user clicks "Compute & View Result"
    // it will be re-enabled once we have steps to show
    viewStepButton.disabled = true;



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
            // Check if the response is not ok
            if (!response.ok) {
                const error = await response.json();
                alert(`Error: ${error.error}`);
                return;
            }
            // otherwise parse the response
            const result = await response.json();

            // Hide or reset the sections from previous attempts
            parametersSection.innerHTML = '';
            parametersSection.style.display = 'none';
            controlsSection.style.display = 'none';
            visualizationSection.style.display = 'none';
            visualizationContainer.innerHTML = '';
            // Check if the result has variables
            if (result.variables && result.variables.length > 0) {
                // Build dynamic param inputs
                const title = document.createElement('h2');
                // Set the title
                title.textContent = 'Set Parameters';
                // Append the title to the parameters section
                parametersSection.appendChild(title);
                // Create a paragraph element
                const info = document.createElement('p');
                // Set the text content
                info.textContent = 'Enter values for the identified variable(s) and choose a solving method.';
                // Append the paragraph to the parameters section
                parametersSection.appendChild(info);
                // For each variable, create a label & text input
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

                // add "Max Recursions" input
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

                // Show the sections now that we have variables
                parametersSection.style.display = 'block';
                controlsSection.style.display = 'block';
                visualizationSection.style.display = 'block';

                // Insert the play/pause controls (only once)
                insertPlayPauseControls();

                // Because we don't have steps yet, we disable "View Next Step" and "Play/Pause" until user clicks "Compute & View Result"
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
                <p>(Use "View Next Step" or "Play" to see each step in detail.)</p>
            `;

            // reset any auto-play
            clearAutoPlay();

            // now that we have steps, enable "View Next Step" and "Play/Pause" if they exist
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
    // "View Next Step"
    // ----------------------------------------------------------------------
    viewStepButton.addEventListener('click', () => {
        nextStep(); // display next step
    });

    // ----------------------------------------------------------------------
    // "Restart" => clear everything
    // ----------------------------------------------------------------------
    restartButton.addEventListener('click', () => {
        // stop auto-play
        clearAutoPlay();
        visualizationContainer.innerHTML = '';
        steps = [];
        currentStepIndex = -1;
        // disable step/pause
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
        // if no steps, show alert
        if (steps.length === 0) {
            alert('No steps recorded. Please compute first.');
            return false;
        }
        // increment step index
        currentStepIndex++;
        // if we're at the end, show alert and revert index
        if (currentStepIndex >= steps.length) {
            alert('No more steps.');
            currentStepIndex = steps.length - 1;
            return false;
        }
        // display the step
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
        if (!panel) return; // If there's no panel, do nothing

        const br = document.createElement('br');
        panel.appendChild(br);

        // Play/Pause button
        playPauseButton = document.createElement('button');
        playPauseButton.id = 'play-pause-button';
        playPauseButton.textContent = 'Play';
        playPauseButton.style.marginLeft = '5px';
        panel.appendChild(playPauseButton);

        // Initially disabled until we compute the steps
        playPauseButton.disabled = true;

        // Speed label + select
        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed:';
        speedLabel.style.marginLeft = '1rem';
        panel.appendChild(speedLabel);
        // Speed select
        speedSelect = document.createElement('select');
        speedSelect.id = 'speed-select';
        const speeds = [ '0.5x', '1x', '2x', '3x' ];
        // Add options
        speeds.forEach((s) => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = s;
            speedSelect.appendChild(option);
        });
        speedSelect.value = '1x';
        speedSelect.style.marginLeft = '0.5rem';
        panel.appendChild(speedSelect);

        // Add event listeners
        playPauseButton.addEventListener('click', handlePlayPause);
        speedSelect.addEventListener('change', handleSpeedChange);
    }

    // ----------------------------------------------------------------------
    // Play/Pause logic
    // ----------------------------------------------------------------------
    function handlePlayPause() {
        // If it's still disabled, do nothing
        if (playPauseButton.disabled) return;
        // If we're not playing yet, we start
        if (!autoPlayInterval) {
            // Start auto-play
            playPauseButton.textContent = 'Pause';
            startAutoPlay();
        } else {
            // If we are playing, we pause
            playPauseButton.textContent = 'Play';
            clearAutoPlay();
        }
    }
    // If user changes speed while playing, we reset the interval
    function handleSpeedChange() {
        if (autoPlayInterval) {
            clearAutoPlay();
            startAutoPlay();
        }
    }

    // startAutoPlay => sets an interval that calls nextStep based on speed
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
                // done steps
                clearAutoPlay();
                playPauseButton.textContent = 'Play';
            }
        }, msDelay);
    }
    // clearAutoPlay => clears the interval
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
        // Clear old content
        visualizationContainer.innerHTML = '';
        // Add step counter
        const stepCounter = document.createElement('p');
        stepCounter.innerHTML = `<strong>Step ${stepIndex + 1} of ${steps.length}</strong>`;
        visualizationContainer.appendChild(stepCounter);
        // Depending on step.action,it picks how to draw it
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

    // ----------------------------------------------------------------------
    // Top-Down Step
    // ----------------------------------------------------------------------
    function displayTopDownStep(step) {
        const explanation = document.createElement('p');
        explanation.classList.add('explanation');
        // If it's a push, we're calling a new frame
        if (step.action === 'push') {
            explanation.textContent = `PUSH: We are calling a new frame → ${topOfStackConcrete(step)}`;
        // If it's a pop, we're finishing evaluating a frame
        } else {
            explanation.textContent = `POP: Finished evaluating ${topOfStackConcrete(step)} = ${step.resolvedValue}`;
        }
        // If there's an evaluation detail, we show it
        if (step.evaluationDetail) {
            const detailDiv = document.createElement('div');
            detailDiv.classList.add('detail');
            detailDiv.textContent = `Evaluation: ${step.evaluationDetail}`;
            explanation.appendChild(document.createElement('br'));
            explanation.appendChild(detailDiv);
        }
        // Add the explanation to the visualization container
        explanation.classList.add('animate-fade');
        visualizationContainer.appendChild(explanation);
        // If there's a stack,it is showed
        const stackContainer = document.createElement('div');
        stackContainer.classList.add('stack-container', 'animate-fade');
        // For each frame in the stack,it creates a div
        if (step.stack) {
            step.stack.forEach((callFrame, idx) => {
                const frameDiv = document.createElement('div');
                frameDiv.classList.add('stack-frame');
                frameDiv.textContent = callFrame.concrete;
                // If it's the last frame,it is highlighted
                if (idx === step.stack.length - 1) {
                    frameDiv.classList.add('highlight-frame');
                }
                stackContainer.appendChild(frameDiv);
            });
        }
        // Add the stack container to the visualization container
        visualizationContainer.appendChild(stackContainer);
    }

    // ----------------------------------------------------------------------
    // Bottom-Up: fill (1D)
    // ----------------------------------------------------------------------
    // Display the bottom-up step for a 1D array
    function displayBottomUp1D(step) {
        const explanation = document.createElement('p');
        explanation.classList.add('explanation');
        explanation.textContent = `FILL: Updating dp[${step.index}]`;
        // If there's an explanation detail, we show it
        if (step.explanation) {
            const detailDiv = document.createElement('div');
            detailDiv.classList.add('detail');
            detailDiv.textContent = step.explanation;
            explanation.appendChild(document.createElement('br'));
            explanation.appendChild(detailDiv);
        }
        // Add the explanation to the visualization container
        explanation.classList.add('animate-fade');
        visualizationContainer.appendChild(explanation);
        //  Create a table to show the dp array
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
        // Add the row to the table
        dpTable.appendChild(row);
        // Add the table to the visualization container
        visualizationContainer.appendChild(dpTable);
    }

    // ----------------------------------------------------------------------
    // Bottom-Up: fill2D
    // ----------------------------------------------------------------------
    // Display the bottom-up step for a 2D array
    function displayBottomUp2D(step) {
        const explanation = document.createElement('p');
        explanation.classList.add('explanation');
        explanation.textContent = `FILL: Updating dp[${step.i}][${step.j}]`;
        // If there's an explanation detail, it is showed
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
        // For each row in the dp array, it creates a row
        step.dpSnapshot.forEach((rowArray, rowIndex) => {
            const rowTr = document.createElement('tr');
            rowArray.forEach((val, colIndex) => {
                const cell = document.createElement('td');
                cell.style.padding = '6px 12px';
                cell.style.border = '1px solid #ccc';
                cell.textContent = (val === null || val === undefined) ? '∅' : val;
                // If it's the cell we're updating, it is highlighted
                if (rowIndex === step.i && colIndex === step.j) {
                    cell.classList.add('highlight-frame');
                }
                // Add the cell to the row
                rowTr.appendChild(cell);
            });
            // Add the row to the table
            dpTable.appendChild(rowTr);
        });
        // Add the table to the visualization container
        visualizationContainer.appendChild(dpTable);
    }
    // Helper function to get the top of the stack
    function topOfStackConcrete(step) {
        if (!step.stack || step.stack.length === 0) return 'N/A';
        return step.stack[step.stack.length - 1].concrete;
    }
});
