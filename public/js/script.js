document.addEventListener('DOMContentLoaded', () => {
    const recursiveFormulaInput = document.getElementById('recursive-formula');
    const baseCasesInput = document.getElementById('base-cases');
    const submitFormulaButton = document.getElementById('submit-formula');
    const parametersSection = document.getElementById('parameters-section');
    const controlsSection = document.getElementById('controls');
    const visualizationSection = document.getElementById('visualization-section');
    const visualizationContainer = document.getElementById('visualization-container');
    const viewFullButton = document.getElementById('view-full-button');
    const restartButton = document.getElementById('restart-button');
    const viewStepButton = document.getElementById('view-step-button');

    // After user submits formula, parse it and dynamically display variable inputs
    submitFormulaButton.addEventListener('click', async () => {
        const formula = recursiveFormulaInput.value.trim();
        if (!formula) {
            alert('Please enter a recursive formula, e.g., "n <= 1 ? n : F(n-1) + F(n-2)".');
            return;
        }

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
            parametersSection.innerHTML = '';
            parametersSection.style.display = 'none';
            controlsSection.style.display = 'none';
            visualizationSection.style.display = 'none';

            if (result.variables && result.variables.length > 0) {
                // Create parameter inputs
                const title = document.createElement('h2');
                title.textContent = 'Set Parameters';
                parametersSection.appendChild(title);

                const info = document.createElement('p');
                info.textContent = 'Enter values for the identified variable(s) and choose a solving method.';
                parametersSection.appendChild(info);

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

                const methodDiv = document.createElement('div');
                const methodLabel = document.createElement('label');
                methodLabel.textContent = 'Solving Method:';
                methodDiv.appendChild(methodLabel);
                methodDiv.appendChild(document.createElement('br'));

                const bottomUpRadio = document.createElement('input');
                bottomUpRadio.type = 'radio';
                bottomUpRadio.id = 'bottom-up';
                bottomUpRadio.name = 'solving-method';
                bottomUpRadio.value = 'bottom-up';
                bottomUpRadio.checked = true;
                const bottomUpLabel = document.createElement('label');
                bottomUpLabel.setAttribute('for', 'bottom-up');
                bottomUpLabel.textContent = 'Bottom-up (Tabulation)';

                const topDownRadio = document.createElement('input');
                topDownRadio.type = 'radio';
                topDownRadio.id = 'top-down';
                topDownRadio.name = 'solving-method';
                topDownRadio.value = 'top-down';
                const topDownLabel = document.createElement('label');
                topDownLabel.setAttribute('for', 'top-down');
                topDownLabel.textContent = 'Top-down (Memoization)';

                methodDiv.appendChild(bottomUpRadio);
                methodDiv.appendChild(bottomUpLabel);
                methodDiv.appendChild(document.createElement('br'));
                methodDiv.appendChild(topDownRadio);
                methodDiv.appendChild(topDownLabel);

                parametersSection.appendChild(methodDiv);

                parametersSection.style.display = 'block';
                controlsSection.style.display = 'block';
                visualizationSection.style.display = 'block';
            } else {
                alert('No variables found. Please check your formula.');
            }
        } catch (error) {
            console.error(error);
            alert('Error parsing formula.');
        }
    });

    // Compute the full result immediately and display
    viewFullButton.addEventListener('click', async () => {
        const formula = recursiveFormulaInput.value.trim();
        const baseCases = baseCasesInput.value.trim();
        const solvingMethod = document.querySelector('input[name="solving-method"]:checked')?.value || 'top-down';
        const maxRecursionsInput = document.getElementById('max-recursions');
        const maxRecursions = maxRecursionsInput?.value ? parseInt(maxRecursionsInput.value, 10) : null;

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
            visualizationContainer.innerHTML = `<p>Final Result: ${result.result}</p><p>(Steps visualization not yet implemented)</p>`;
        } catch (error) {
            console.error(error);
            alert('Error solving the formula.');
        }
    });

    restartButton.addEventListener('click', () => {
        // Reset fields
        recursiveFormulaInput.value = '';
        baseCasesInput.value = '';
        parametersSection.style.display = 'none';
        controlsSection.style.display = 'none';
        visualizationSection.style.display = 'none';
        visualizationContainer.innerHTML = '';
    });

    viewStepButton.addEventListener('click', () => {
        // Placeholder for step-by-step visualization if implemented
        alert('Step-by-step visualization not yet implemented.');
    });
});
