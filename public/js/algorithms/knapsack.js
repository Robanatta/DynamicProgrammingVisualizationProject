export function knapsackExample() {
    return {
        recFormula: "i === 0 || w === 0 ? 0 : Math.max(f(i-1, w), wts[i-1] <= w ? vals[i-1] + f(i-1, w-wts[i-1]) : 0)",
        baseCases: ""
    };
}
