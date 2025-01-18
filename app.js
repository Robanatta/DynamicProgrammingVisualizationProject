// Import the Express framework for creating an HTTP server
const express = require('express');
// Import Body-Parser to parse JSON request bodies
const bodyParser = require('body-parser');
// Import Path utilities from Node.js for resolving file paths
const path = require('path');

////////////////////////////////////////////////////////////////////////////////
// Express & EJS Setup
////////////////////////////////////////////////////////////////////////////////

// Create a new Express application instance
const app = express();
// Define the port on which the server will run
const PORT = 3000;

// Set EJS as the templating/view engine
app.set('view engine', 'ejs');
// Configure the 'views' directory for EJS templates
app.set('views', path.join(__dirname, 'views'));
// Use body-parser middleware to parse JSON in request bodies
app.use(bodyParser.json());
// Serve static files from the 'public' directory
app.use(express.static('public'));

////////////////////////////////////////////////////////////////////////////////
// Parse the Ternary Formula: condition ? baseCase : expression
//    - Extract stopping condition, stopping value, recursive expression
////////////////////////////////////////////////////////////////////////////////
function parseRecursiveFormula(formula) {
    // Regex to capture three parts: condition?base:expression
  const conditionRegex = /(.*?)\?(.*?)\:(.*)/;
  // Execute the regex on the formula string
  const match = formula.match(conditionRegex);

  // If the regex doesn't match the expected structure
  if (!match) {
    return {
      error: 'Invalid formula. Expect something like: "n <= 1 ? n : F(n-1) + F(n-2)".'
    };
  }

   // Extract parts from the matching groups
  const stoppingCondition = match[1].trim();
  const stoppingValue = match[2].trim();
  const recursiveExpression = match[3].trim();

  // Identify variable names by scanning for calls like "F(...)"
  const variableRegex = /F\(([^)]+)\)/g; // Regex to find F(...) occurrences
  let variableMatch; // Temporary for storing matches
  const rawVariables = []; // Array for all unique variable names

  while ((variableMatch = variableRegex.exec(formula)) !== null) {
    // "variableMatch[1]" is the content inside F(...)
    const params = variableMatch[1].split(',').map((v) => v.trim());
    // Extract the variable name from the parameter
    params.forEach((p) => {
      const varName = p.replace(/[\d\-+*/\s]/g, '');
      // Add the variable name to the list if it's not already there
      if (varName && !rawVariables.includes(varName)) {
        rawVariables.push(varName);
      }
    });
  }

// If no variables are found, return an error
  if (rawVariables.length === 0) {
    return {
      error: 'No variables found. Use calls like F(n-1) or F(n,k-1).'
    };
  }
// Return the parsed parts
  return {
    stoppingCondition,
    stoppingValue,
    recursiveExpression,
    variables: rawVariables
  };
}

////////////////////////////////////////////////////////////////////////////////
// "createConcreteExpression" HELPER (Used by top-down)
// Replaces "n" with actual numeric values, so "F(n-1)" can become "F(5-1)" -> "F(4)".
////////////////////////////////////////////////////////////////////////////////
function createConcreteExpression(expr, argMap) {
 // Start with the original expression string
  let result = expr;
  // Sort variable names so that longer variables (e.g., "nn") are replaced before shorter (e.g., "n")
  const varNames = Object.keys(argMap).sort((a, b) => b.length - a.length);

  // Replace all occurrences of each varName with its numeric argument
  varNames.forEach((v) => {
    // Build a global regex for that variable
    const regex = new RegExp(v, 'g');
    // Replace all occurrences of the variable with its numeric argument
    result = result.replace(regex, argMap[v]);
  });

  // Convert "F(2-1)" => "F(1)" inside parentheses
  const parenRegex = /F\(\s*([^)]+)\s*\)/g;
  result = result.replace(parenRegex, (fullMatch, inner) => {
    // Split the inner part by commas and trim each part
    const subArgs = inner.split(',').map((s) => s.trim());
    // Replace each argument with its numeric value
    const numericArgs = subArgs.map((sa) => {
        // Try to evaluate the argument as a JavaScript expression
      try {
        return String(Function('"use strict";return (' + sa + ')')());
        // If the argument is not a valid expression, return the original argument
      } catch {
        return sa;
      }
    });
    // Return the updated expression with the numeric arguments
    return `F(${numericArgs.join(',')})`;
  });

  return result;
}

////////////////////////////////////////////////////////////////////////////////
// TOP-DOWN Solver (Already in your code)
////////////////////////////////////////////////////////////////////////////////
function solveTopDown(parsed, baseCases, parameters, maxRecursions, steps) {
  // 'parsed' has stoppingCondition, stoppingValue, recursiveExpression, variables
  // 'baseCases' is a string like "F(0)=0, F(1)=1"
  // 'parameters' is an object { n: 5 }, for example
  // 'maxRecursions' is an optional limit
  // 'steps' is an external array we'll push step objects into


  // This uses your existing top-down approach:
  //  - push/pop recursion
  //  - logs each step in "steps"

  const { stoppingCondition, stoppingValue, recursiveExpression, variables } = parsed;

  // Parse base cases => { "0":0, "1":1, ... }
  const parsedBaseCases = baseCases
    ? baseCases
        .split(',')
        // Split each base case into key-value pairs
        .map((c) => c.split('=').map((v) => v.trim()))
        // Convert each pair into an object entry
        .reduce((acc, [key, value]) => {
            // Convert the value to a number if it's a number
          const numVal = isNaN(value) ? value : parseInt(value, 10);
          // Remove the "F(" and ")" from the key
          const cleanedKey = key.replace(/^F\(|\)$/g, '');
            // Add the key-value pair to the accumulator object
          acc[cleanedKey] = numVal;
          // Return the updated accumulator
          return acc;
        }, {})
    : {};

    // Extract the parameter keys and values
  const parameterKeys = Object.keys(parameters);
  // Convert the parameter values into an array
  const parameterValues = Object.values(parameters);

    // Build the "recursiveFunction" string with "new Function(...)"
  const recursiveFunction = new Function(
    'stoppingCondition',
    'stoppingValue',
    'recursiveExpression',
    'parsedBaseCases',
    'maxRecursions',
    'steps',
    'createConcreteExpression',
    ...parameterKeys,
    `
    const memo = {};            // Memoization cache
    let recursionDepth = 0;     // Track recursion to avoid infinite loops
    const callStack = [];       // We'll store frames for push/pop steps

    // Helper function to record each step in the 'steps' array
    function recordStep(stackArray, action, resolvedValue, evaluationDetail) {
      steps.push({
        stack: stackArray.map(s => ({
          symbolic: s.symbolic,   // e.g. "F(n)"
          concrete: s.concrete    // e.g. "F(5)"
        })),
        action,                   // "push" or "pop"
        resolvedValue,           // numeric result after pop
        evaluationDetail         // extra detail string
      });
    }

    // Helper to update parent's partial expression
    function updateParentPartial(parentCall, childConcrete, childValue) {
      if (!parentCall || !parentCall.partialExp) return;
      parentCall.partialExp = parentCall.partialExp.replace(childConcrete, childValue);
    }

    // The main recursive function
    function F(${variables.join(',')}) {
      // Build a unique key, e.g. "5" or "5,2"
      const argsArr = [${variables.join(',')}];
      const argsKey = argsArr.join(',');

      // Symbolic vs. concrete representations
      const symbolicCall = 'F(${variables.join(",")})';
      const concreteCall = 'F(' + argsKey + ')';

      // The parent call is the last item in "callStack"
      const parentCall = callStack.length ? callStack[callStack.length - 1] : null;

      // Prepare an expression with replaced variables
      let replacedExpr = createConcreteExpression(recursiveExpression, {
        ${variables.map((v, i) => `${v}: argsArr[${i}]`).join(',')}
      });
      // e.g. "F(5) = F(4) + F(3)"
      let myPartialExp = \`\${concreteCall} = \${replacedExpr}\`;

      // PUSH: we are entering a new call
      callStack.push({
        symbolic: symbolicCall,
        concrete: concreteCall,
        partialExp: myPartialExp
      });
      recordStep(callStack, 'push', null, '');

      // Check recursion depth limit if given
      if (maxRecursions !== null && maxRecursions !== undefined) {
        if (recursionDepth >= maxRecursions) {
          throw new Error('Max recursion depth exceeded.');
        }
        recursionDepth++;
      }

      // 1) Check memo
      if (memo[argsKey] !== undefined) {
        const reusedVal = memo[argsKey];
        const thisCall = callStack[callStack.length - 1]; // top frame
        callStack.pop(); // pop the stack

        // Update parent's partial if we have one
        if (parentCall) {
          updateParentPartial(parentCall, thisCall.concrete, reusedVal);
        }

        // Record the pop step, showing a memo reuse
        recordStep(
          callStack,
          'pop',
          reusedVal,
          \`Reusing \${thisCall.concrete}=\${reusedVal}\`
        );
        return reusedVal;
      }

      // 2) Check stopping condition
      if (eval(stoppingCondition)) {
        // Evaluate the "stoppingValue", e.g. "n" or "1"
        const val = eval(stoppingValue);
        memo[argsKey] = val;
        const thisCall = callStack[callStack.length - 1];
        callStack.pop();

        if (parentCall) {
          updateParentPartial(parentCall, thisCall.concrete, val);
        }

        recordStep(
          callStack,
          'pop',
          val,
          \`Resolved \${thisCall.concrete} => [stopping condition] => \${val}\`
        );
        return val;
      }

      // 3) Check base cases from user-provided "F(x)=..."
      if (parsedBaseCases.hasOwnProperty(argsKey)) {
        const val = parsedBaseCases[argsKey];
        memo[argsKey] = val;
        const thisCall = callStack[callStack.length - 1];
        callStack.pop();

        if (parentCall) {
          updateParentPartial(parentCall, thisCall.concrete, val);
        }

        recordStep(
          callStack,
          'pop',
          val,
          \`Resolved \${thisCall.concrete} => [base case] => \${val}\`
        );
        return val;
      }

      // 4) Otherwise, evaluate the recursion expression
      const val = eval(replacedExpr);
      memo[argsKey] = val;
      const thisCall = callStack[callStack.length - 1];
      callStack.pop();

      if (parentCall) {
        updateParentPartial(parentCall, thisCall.concrete, val);
      }

      recordStep(
        callStack,
        'pop',
        val,
        \`Resolved \${myPartialExp} => \${val}\`
      );
      return val;
    }

    // Call F(...) with the user-supplied parameter values
    return F(...Object.values(arguments).slice(7));
  `
  );
// Call the recursive function with the stopping condition, stopping value, recursive expression, etc.
  const result = recursiveFunction(
    stoppingCondition,
    stoppingValue,
    recursiveExpression,
    parsedBaseCases,
    maxRecursions,
    steps,
    createConcreteExpression,
    ...Object.values(parameters)
  );
  // Return the result and the steps
  return { result, steps };
}

////////////////////////////////////////////////////////////////////////////////
// BOTTOM-UP Solver
//    - If 1 variable => 1D array (e.g. n in Fibonacci/Factorial)
//    - If 2 variables => 2D array (e.g. n,k in Pascal's Triangle)
////////////////////////////////////////////////////////////////////////////////
function solveBottomUp(parsed, baseCases, parameters, steps) {
  const { variables } = parsed;

  // Convert baseCases => { "0":0, "1":1 }, etc. Base cases are converted to an object.
  const parsedBaseCases = baseCases
    ? baseCases
        // Split the base cases by comma
        .split(',')
        // Split each base case into key-value pairs
        .map((c) => c.split('=').map((v) => v.trim()))
        // Convert each pair into an object entry
        .reduce((acc, [key, value]) => {
            // Convert the value to a number if it's a number
          const numVal = isNaN(value) ? value : parseInt(value, 10);
          // Remove the "F(" and ")" from the key
          const cleanedKey = key.replace(/^F\(|\)$/g, '');
          // Add the key-value pair to the accumulator object
          acc[cleanedKey] = numVal;
          return acc;
        }, {})
    : {};
// If there's only 1 variable, do a 1D bottom-up approach
  if (variables.length === 1) {
    // e.g. n
    return bottomUpSingleVar(parsed, parsedBaseCases, parameters, steps);
  } else if (variables.length === 2) {
    // e.g. n,k => do a 2D approach
    return bottomUpTwoVars(parsed, parsedBaseCases, parameters, steps);
  } else {
    // More than 2 variables not implemented
    throw new Error(
      'Bottom-up with more than 2 variables not implemented in this demo.'
    );
  }
}

// ------------------ Single Variable (1D) Bottom-Up ------------------
function bottomUpSingleVar(parsed, parsedBaseCases, parameters, steps) {
 
  const varName = parsed.variables[0];
  const n = parameters[varName]; 
  const dp = new Array(n + 1).fill(null);

  // Helper to record each fill
  function recordFill(index, explanation) {
    steps.push({
      action: 'fill', // action type "fill" on the front-end
      index, // which index was updated
      dpSnapshot: [...dp], // a copy of dp array at this moment
      explanation // explanation string
    });
  }

  // Fill base cases from parsedBaseCases
  for (let i = 0; i <= n; i++) {
    const key = i.toString();
    // If the base case exists, fill it
    if (parsedBaseCases.hasOwnProperty(key)) {
        // Fill the base case
      dp[i] = parsedBaseCases[key];
      // Record the fill step
      recordFill(i, `Base case: dp[${i}] = ${dp[i]}`);
    }
  }

  // If the expression is something like "F(n-1) + F(n-2)", it will do fib-like
  // If "n * F(n-1)", do factorial-like
  const expr = parsed.recursiveExpression;

  if (expr.includes('F(n-1) + F(n-2)')) {
    // We'll do a fib-like fill
    for (let i = 0; i <= n; i++) {
      if (dp[i] == null) {
        const left = i - 1 >= 0 ? dp[i - 1] : 0;
        const right = i - 2 >= 0 ? dp[i - 2] : 0;
        dp[i] = left + right;
        recordFill(
          i,
          `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] => ${left}+${right} => ${dp[i]}`
        );
      }
    }
    // If the expression is "n * F(n-1)", do a factorial-like fill
  } else if (expr.includes('n * F(n-1)') || expr.includes('n*F(n-1)')) {
    // Factorial-like
    for (let i = 0; i <= n; i++) {
      if (dp[i] == null) {
        if (i === 0) {
          dp[i] = 1;
          recordFill(i, `dp[0] = 1 (factorial base)`);
        } else {
          dp[i] = i * dp[i - 1];
          recordFill(
            i,
            `dp[${i}] = ${i} * dp[${i - 1}] => ${i}*${dp[i - 1]} => ${dp[i]}`
          );
        }
      }
    }
  } else {
    // Default fallback: do a fib-like approach
    for (let i = 0; i <= n; i++) {
      if (dp[i] == null) {
        const left = i - 1 >= 0 ? dp[i - 1] : 0;
        const right = i - 2 >= 0 ? dp[i - 2] : 0;
        dp[i] = left + right;
        recordFill(
          i, // index
          `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] => ${left}+${right} => ${dp[i]}` // explanation
        );
      }
    }
  }
// Return the result and the steps
  return { result: dp[n], steps };
}

// ------------------ Two Variables (2D) Bottom-Up ------------------
function bottomUpTwoVars(parsed, parsedBaseCases, parameters, steps) {
  
  const [var1, var2] = parsed.variables; 
  const n = parameters[var1]; 
  const k = parameters[var2]; 

  // Create a 2D array with dimensions [n+1][k+1]
  // n+1 is because we want to fill up to n, inclusive
  const size1 = n + 1; 
  const size2 = Math.max(n, k) + 1; // For Pascal's triangle, we might fill up to [n][n]
  // Create a 2D array filled with null values
  const dp = new Array(size1);
  for (let i = 0; i < size1; i++) {
    dp[i] = new Array(size2).fill(null);
  }
  // Helper to record each fill
  function recordFill(i, j, explanation) {
    // store a snapshot of dp
    const dpSnapshot = dp.map(row => [...row]);
    steps.push({
      action: 'fill2D', // action type "fill2D" on the front-end
      i,
      j,
      dpSnapshot,
      explanation
    });
  }

  // Fill base cases if they match "i,j"
  for (let i = 0; i < size1; i++) {
    for (let j = 0; j < size2; j++) {
      const key = `${i},${j}`;
      // If the base case exists, fill it
      if (parsedBaseCases.hasOwnProperty(key)) {
        dp[i][j] = parsedBaseCases[key];
        // Record the fill step
        recordFill(i, j, `Base case dp[${i}][${j}] = ${dp[i][j]}`);
      }
    }
  }

  // Pascal's logic it is assumed: 
  // if j==0 or j==i => dp[i][j]=1
  // else dp[i][j] = dp[i-1][j-1]+dp[i-1][j]
  // This covers "k == 0 || k == n ? 1 : F(n-1,k-1) + F(n-1,k)"

  // For i in [0..n], j in [0..i], fill
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= i && j < size2; j++) {
      if (dp[i][j] == null) {
        // If it's a Pascal's edge, fill with 1
        if (j === 0 || j === i) {
          dp[i][j] = 1;
          recordFill(i, j, `dp[${i}][${j}] = 1 (Pascal edge)`);
        } else {
            // Fill the cell with the sum of the two cells above
          const left = dp[i - 1][j - 1] || 0;
          // If the left cell is null, it means it's not filled yet
          const right = dp[i - 1][j] || 0;
          // Fill the cell with the sum of the two cells above
          dp[i][j] = left + right;
          recordFill(
            i, 
            j,
            // Explanation string
            `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + dp[${i - 1}][${j}] => ${left}+${right} => ${dp[i][j]}`
          );
        }
      }
    }
  }

  const result = dp[n][k];
  return { result, steps };
}

////////////////////////////////////////////////////////////////////////////////
// Master "solveRecursive" that picks top-down or bottom-up
////////////////////////////////////////////////////////////////////////////////
function solveRecursive(formula, baseCases, parameters, solvingMethod, maxRecursions) {
  // Parse formula
  const parsed = parseRecursiveFormula(formula);
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  const steps = [];

  // Decide
  if (solvingMethod === 'top-down') {
    const { result, steps: topDownSteps } = solveTopDown(
      parsed, baseCases, parameters, maxRecursions, steps
    );
    return { result, steps: topDownSteps };
  } else if (solvingMethod === 'bottom-up') {
    // handle 1 or 2 variables
    const { result, steps: bottomUpSteps } = solveBottomUp(
      parsed, baseCases, parameters, steps
    );
    return { result, steps: bottomUpSteps };
  } else {
    throw new Error('Invalid solving method chosen.');
  }
}

////////////////////////////////////////////////////////////////////////////////
// ROUTES
////////////////////////////////////////////////////////////////////////////////
const router = express.Router();

// Main page
router.get('/', (req, res) => {
  res.render('index', { variables: [], type: null });
});
// Parse the formula
router.post('/parse', (req, res) => {
  const { formula } = req.body;
  try {
    const parsed = parseRecursiveFormula(formula);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error parsing the formula.' });
  }
});

// Solve the formula
router.post('/solve', (req, res) => {
  const { formula, baseCases, parameters, solvingMethod, maxRecursions } =
    req.body;
  try {
    const recursionLimit = maxRecursions ? parseInt(maxRecursions, 10) : null;
    if (recursionLimit !== null && isNaN(recursionLimit)) {
      throw new Error('Invalid maximum recursion depth.');
    }

    const { result, steps } = solveRecursive(
      formula,
      baseCases,
      parameters,
      solvingMethod,
      recursionLimit
    );

    res.json({ result, steps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error solving formula.' });
  }
});
// Export the router
app.use('/', router);

// Launch server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
