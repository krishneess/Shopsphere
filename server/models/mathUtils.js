// Small numerical toolkit shared by the analytics models.
// No external dependencies: everything is implemented from first principles.

const mean = (values) =>
    values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

function round(value, digits = 4) {
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    return Number(value.toFixed(digits));
}

// ---- Special functions (for p-values) ------------------------------------

// Natural log of the gamma function (Lanczos approximation)
function logGamma(x) {
    const c = [
        76.18009172947146, -86.50532032941677, 24.01409824083091,
        -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
    ];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// Continued fraction for the incomplete beta function
function betaContinuedFraction(a, b, x) {
    const MAX_ITER = 300;
    const EPS = 3e-12;
    const FPMIN = 1e-300;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= MAX_ITER; m++) {
        const m2 = 2 * m;
        let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        h *= d * c;
        aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        const delta = d * c;
        h *= delta;
        if (Math.abs(delta - 1) < EPS) break;
    }
    return h;
}

// Regularised incomplete beta function I_x(a, b)
function incompleteBeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(
        logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
    );
    return x < (a + 1) / (a + b + 2)
        ? (bt * betaContinuedFraction(a, b, x)) / a
        : 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

// Two-sided p-value for a t statistic with `df` degrees of freedom
function tTwoSidedP(t, df) {
    if (!Number.isFinite(t) || df <= 0) return null;
    return incompleteBeta(df / (df + t * t), df / 2, 0.5);
}

// Upper-tail p-value for an F statistic
function fUpperP(f, df1, df2) {
    if (!Number.isFinite(f) || df1 <= 0 || df2 <= 0) return null;
    return incompleteBeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2);
}

// Critical t value (two-sided) found by bisection on the p-value
function tCritical(df, alpha = 0.05) {
    let lo = 0;
    let hi = 1000;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (tTwoSidedP(mid, df) > alpha) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

// ---- Linear algebra -------------------------------------------------------

function transpose(m) {
    return m[0].map((_, j) => m.map((row) => row[j]));
}

function multiply(a, b) {
    const bt = transpose(b);
    return a.map((row) => bt.map((col) => row.reduce((s, v, k) => s + v * col[k], 0)));
}

// Gauss-Jordan inverse with partial pivoting. Returns null when singular.
function invert(matrix) {
    const n = matrix.length;
    const a = matrix.map((row, i) => [
        ...row,
        ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    ]);

    for (let col = 0; col < n; col++) {
        let pivot = col;
        for (let r = col + 1; r < n; r++) {
            if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
        }
        if (Math.abs(a[pivot][col]) < 1e-10) return null;
        [a[col], a[pivot]] = [a[pivot], a[col]];

        const div = a[col][col];
        for (let j = 0; j < 2 * n; j++) a[col][j] /= div;

        for (let r = 0; r < n; r++) {
            if (r === col) continue;
            const factor = a[r][col];
            if (factor === 0) continue;
            for (let j = 0; j < 2 * n; j++) a[r][j] -= factor * a[col][j];
        }
    }
    return a.map((row) => row.slice(n));
}

function correlation(xs, ys) {
    const mx = mean(xs);
    const my = mean(ys);
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    xs.forEach((x, i) => {
        sxy += (x - mx) * (ys[i] - my);
        sxx += (x - mx) ** 2;
        syy += (ys[i] - my) ** 2;
    });
    return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}

module.exports = {
    mean,
    round,
    tTwoSidedP,
    fUpperP,
    tCritical,
    transpose,
    multiply,
    invert,
    correlation,
};
