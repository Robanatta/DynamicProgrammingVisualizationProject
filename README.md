# DynamicProgrammingVisualizationProject

An interactive web application designed to **visualize** common dynamic programming techniques—both **top-down (memoized recursion)** and **bottom-up (tabulation)**—for educational and demonstration purposes.

## Overview

- **Purpose**  
  This tool helps students or developers better **understand** how dynamic programming algorithms work step by step. Whether using a recursive (top-down) approach or a table-based (bottom-up) approach, you can see each subproblem call or array/table fill in **real time**.

- **Key Features**  
  1. **Custom Formulas**: Enter any **recursive formula** (in a ternary format like `n <= 1 ? n : F(n-1) + F(n-2)`) plus **base cases** (e.g. `F(0)=0, F(1)=1`).  
  2. **Parameter Setting**: Provide the **initial parameter values** (e.g., `n=5`) and optionally set a **maximum recursion limit**.  
  3. **Multiple Methods**: Choose **Top-down** (memoization) or **Bottom-up** (tabulation).  
  4. **Step-by-Step Visualization**: Watch each **recursive push/pop** call in top-down or each **array/table fill** in bottom-up.  
  5. **Auto-Play**: Let the system automatically iterate through all steps at adjustable speeds (0.5x, 1x, 2x, or 3x).  
  6. **Manual Step**: Instead of auto-play, step manually for finer control.  
  7. **Call Stack** or **DP Table**: The UI automatically shows either the call stack (top-down) or the DP table (bottom-up) at each step.

> **Important**:  
> **Bottom-up** is currently **implemented** only for **Fibonacci**, **Factorial**, and **Pascal’s Triangle**. Other custom formulas can still be done with **top-down**.
## Getting Started

Below are general instructions for installing and running the application locally.

1. **Clone or Download**  
   - Clone this repository or download the files into a local directory:
     ```bash
     git clone https://github.com/Robanatta/DynamicProgrammingVisualizationProject.git
     ```
   - Or [download the ZIP](https://github.com/Robanatta/DynamicProgrammingVisualizationProject/archive/refs/heads/main.zip) and extract it somewhere on your machine.

2. **Install Dependencies**  
   - In your local project directory, install Node.js dependencies by running:
     ```bash
     npm install
     ```
     *(Make sure you have Node.js and npm installed.)*

3. **Start the Server**  
     ```bash
     node app.js
     ```
   - The server will run on [http://localhost:3000](http://localhost:3000) unless you’ve configured a different port.

4. **Open the Web Application**  
   - Open your browser and navigate to [http://localhost:3000](http://localhost:3000).
   - You should see the **Dynamic Programming Visualization Tool** main page.

## Usage

1. **Enter a Recursive Formula**  
   - For example: `n <= 1 ? n : F(n-1) + F(n-2)` (Fibonacci).  
   - Provide base cases: `F(0)=0, F(1)=1`.

2. **Parse & Prepare**  
   - Click **"Parse & Prepare"** to identify the variables (e.g., `n`, or multiple variables like `(n,k)`).

3. **Set Parameters**  
   - For example, `n = 6`.  
   - Choose your solving method: **Top-down** or **Bottom-up**.  
     - **Bottom-up** is currently limited to:
       - **Fibonacci** (`n <= 1 ? n : F(n-1) + F(n-2)`)
       - **Factorial** (`n == 0 ? 1 : n * F(n-1)`)
       - **Pascal’s Triangle** (`k == 0 || k == n ? 1 : F(n-1,k-1) + F(n-1,k)`)
   - (Optional) Enter a **Max Recursions** limit to prevent infinite or too-deep recursion.

4. **Compute & View Result**  
   - Click **"Compute & View Result"** to generate the dynamic programming steps.  
   - A final numeric **Result** will appear, plus an empty space for the step-by-step breakdown.

5. **Step Through the Visualization**  
   - **"View Next Step"**: Click to see each subsequent step, showing the **call stack** changes (top-down) or the **DP array/table** updates (bottom-up).  
   - **Play/Pause**: Use the “Play” button to **auto-advance** through all steps at an adjustable speed.

6. **Restart**  
   - If you want to start over with fresh parameters or a new formula, click **"Restart"**. This clears the steps and final result, letting you enter new inputs.

## File Structure

- **app.js**  
  Main server logic with **Express** routes (`/parse` and `/solve`). Also contains the top-down and bottom-up dynamic programming logic on the server side.

- **public/js/script.js**  
  Client-side code to handle **UI** interactions, parse the user’s formula, retrieve steps, and show step-by-step or auto-play animations in the browser.

- **views/index.ejs**  
  Main EJS template for the front-end.

- **public/css/styles.css**  
  Basic styling for the page, transitions, highlights, etc.

## Customization
 **Port Configuration**  
   - By default, it listens on `PORT = 3000`. To change the port, modify `app.js`.



