export function editDistanceExample() {
    return {
        recFormula: `i === 0 ? j : j === 0 ? i : Math.min(f(i-1, j-1) + (s1[i-1] === s2[j-1] ? 0 : 1), f(i-1, j) + 1, f(i, j-1) + 1)`,
        baseCases: ""
    };
}
