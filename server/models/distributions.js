// Probability distributions used by the hypothesis tests:
// CDFs, critical values (found by bisection) and density curves for plotting.
const { logGamma, incompleteBeta, tTwoSidedP, fUpperP } = require("./mathUtils");

// ---- Regularised lower incomplete gamma P(a, x) ---------------------------
function gammaP(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) {
        // series expansion
        let sum = 1 / a;
        let term = sum;
        for (let n = 1; n < 500; n++) {
            term *= x / (a + n);
            sum += term;
            if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
        }
        return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
    }
    // continued fraction (Lentz)
    const FPMIN = 1e-300;
    let b = x + 1 - a;
    let c = 1 / FPMIN;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 500; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = b + an / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        const delta = d * c;
        h *= delta;
        if (Math.abs(delta - 1) < 1e-14) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

const normalCdf = (x) => {
    const p = gammaP(0.5, (x * x) / 2);
    return x >= 0 ? 0.5 * (1 + p) : 0.5 * (1 - p);
};

const chiSquareCdf = (x, k) => gammaP(k / 2, x / 2);
const chiSquareUpperP = (x, k) => 1 - chiSquareCdf(x, k);

// Monotone-function bisection: find x in [lo, hi] where f(x) crosses target
function bisect(f, target, lo, hi, increasing = true) {
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const above = f(mid) > target;
        if (above === increasing) hi = mid;
        else lo = mid;
    }
    return (lo + hi) / 2;
}

// Upper-tail critical values
const normalCritical = (alphaTail) => bisect(normalCdf, 1 - alphaTail, 0, 40);
const chiSquareCritical = (alpha, k) => bisect((x) => chiSquareCdf(x, k), 1 - alpha, 0, 5000);
const fCritical = (alpha, df1, df2) => bisect((x) => fUpperP(x, df1, df2), alpha, 0, 1e6, false);

// t critical for a single tail probability
function tCriticalOneTail(alphaTail, df) {
    return bisect((x) => 1 - tTwoSidedP(x, df) / 2, 1 - alphaTail, 0, 1000);
}

// ---- Densities for plotting ----------------------------------------------
const normalPdf = (x) => Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);

const tPdf = (x, v) =>
    Math.exp(logGamma((v + 1) / 2) - logGamma(v / 2) - 0.5 * Math.log(v * Math.PI) - ((v + 1) / 2) * Math.log(1 + (x * x) / v));

const chiSquarePdf = (x, k) =>
    x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.log(2) - logGamma(k / 2));

const fPdf = (x, d1, d2) =>
    x <= 0
        ? 0
        : Math.exp(
              0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) -
                  Math.log(x) -
                  (logGamma(d1 / 2) + logGamma(d2 / 2) - logGamma((d1 + d2) / 2))
          );

module.exports = {
    gammaP,
    normalCdf,
    chiSquareCdf,
    chiSquareUpperP,
    normalCritical,
    chiSquareCritical,
    fCritical,
    tCriticalOneTail,
    incompleteBeta,
    normalPdf,
    tPdf,
    chiSquarePdf,
    fPdf,
};
