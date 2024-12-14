const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Improved parsing logic
function parseRecursiveFormula(formula) {
    // Expecting a ternary operator format: condition ? baseValue : recursiveExpression
    const conditionRegex = /(.*?)\?(.*?)\:(.*)/;
    const match = formula.match(conditionRegex);

    if (!match) {
        return { error: 'Invalid formula format. Must include a condition, e.g., "n <= 1 ? n : F(n-1) + F(n-2)".' };
    }

    const stoppingCondition = match[1].trim();
    const stoppingValue = match[2].trim();
    const recursiveExpression = match[3].trim();

    // Use a global regex to find all occurrences of F(...)
    const variableRegex = /F\(([^)]+)\)/g;
    let variableMatch;
    const rawVariables = [];

    while ((variableMatch = variableRegex.exec(formula)) !== null) {
        // variableMatch[1] might be something like "n-1", "n-2", or "n,k-1"
        const params = variableMatch[1].split(',').map(v => v.trim());
        params.forEach(p => {
            // Remove digits and arithmetic operators
            const varName = p.replace(/[\d\-\+\*\/\s]/g, '');
            if (varName && !rawVariables.includes(varName)) {
                rawVariables.push(varName);
            }
        });
    }

    // If no variables found, return an error
    if (rawVariables.length === 0) {
        return { error: 'No variables could be extracted from the formula. Ensure you use a function call like F(n-1).' };
    }

    return {
        stoppingCondition,
        stoppingValue,
        recursiveExpression,
        variables: rawVariables
    };
}

// Solve recursive formula
function solveRecursive(formula, baseCases, parameters, solvingMethod, maxRecursions) {
    const parsed = parseRecursiveFormula(formula);

    if (parsed.error) {
        throw new Error(parsed.error);
    }

    const { stoppingCondition, stoppingValue, recursiveExpression, variables } = parsed;

    const recursiveFunction = new Function(
        'stoppingCondition',
        'stoppingValue',
        'recursiveExpression',
        'parsedBaseCases',
        'maxRecursions',
        ...Object.keys(parameters),
        `
        const memo = {};
        let recursionDepth = 0;

        return function F(${variables.join(',')}) {
            const key = \`${variables.join(',')}\`;

            if (maxRecursions !== null && maxRecursions !== undefined) {
                if (recursionDepth >= maxRecursions) {
                    throw new Error('Max recursion depth exceeded. Increase it or check your formula.');
                }
                recursionDepth++;
            }

            if (memo[key] !== undefined) return memo[key];

            // Check condition
            if (eval(stoppingCondition)) {
                return memo[key] = eval(stoppingValue);
            }

            // Check base cases
            if (parsedBaseCases.hasOwnProperty(key)) {
                return memo[key] = parsedBaseCases[key];
            }

            // Recursive calculation
            return memo[key] = eval(recursiveExpression);
        };
    `
    );

    const parsedBaseCases = baseCases
        ? baseCases
            .split(',')
            .map((c) => c.split('=').map((v) => v.trim()))
            .reduce((acc, [key, value]) => {
                const numVal = isNaN(value) ? value : parseInt(value, 10);
                acc[key] = numVal;
                return acc;
            }, {})
        : {};

    const F = recursiveFunction(
        stoppingCondition,
        stoppingValue,
        recursiveExpression,
        parsedBaseCases,
        maxRecursions || null,
        ...Object.values(parameters)
    );

    if (solvingMethod === 'top-down') {
        const result = F(...Object.values(parameters));
        return { result, steps: [] };
    } else if (solvingMethod === 'bottom-up') {
        // Implement bottom-up method if desired
        return { result: 'Bottom-up not implemented yet.' };
    }

    throw new Error('Invalid solving method chosen.');
}

// Serve the main page
app.get('/', (req, res) => {
    res.render('index', { variables: [], type: null });
});

// Parse endpoint
app.post('/parse', (req, res) => {
    const { formula } = req.body;

    try {
        const result = parseRecursiveFormula(formula);
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error parsing the formula.' });
    }
});

// Solve endpoint
app.post('/solve', (req, res) => {
    const { formula, baseCases, parameters, solvingMethod, maxRecursions } = req.body;

    try {
        const recursionLimit = maxRecursions ? parseInt(maxRecursions, 10) : null;
        if (recursionLimit !== null && isNaN(recursionLimit)) {
            throw new Error('Invalid maximum recursion depth.');
        }

        const result = solveRecursive(
            formula,
            baseCases,
            parameters,
            solvingMethod,
            recursionLimit
        );

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error solving the formula.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
