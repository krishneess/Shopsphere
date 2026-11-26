// Ordinary least squares regression (closed-form, no gradient descent).
const {
    mean,
    round,
    tTwoSidedP,
    fUpperP,
    tCritical,
    transpose,
    multiply,
    invert,
    correlation,
} = require("./mathUtils");

// ---------------------------------------------------------------------------
// Simple linear regression:  y = b0 + b1 * x
// ---------------------------------------------------------------------------
function simpleLinearRegression(xs, ys) {
    const n = xs.length;
    if (n < 3) throw new Error("At least 3 records are required for simple regression.");

    const meanX = mean(xs);
    const meanY = mean(ys);

    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        sxx += dx * dx;
        sxy += dx * dy;
        syy += dy * dy;
    }

    if (sxx === 0) throw new Error("The predictor has no variation (all values are identical).");
    if (syy === 0) throw new Error("The target has no variation (all values are identical).");

    const slope = sxy / sxx;
    const intercept = meanY - slope * meanX;
    const r = sxy / Math.sqrt(sxx * syy);

    const fitted = xs.map((x) => intercept + slope * x);
    const residuals = ys.map((y, i) => y - fitted[i]);
    const sse = residuals.reduce((s, e) => s + e * e, 0);
    const ssr = syy - sse;
    const df = n - 2;
    const mse = sse / df;
    const sigma = Math.sqrt(mse);

    const seSlope = sigma / Math.sqrt(sxx);
    const seIntercept = sigma * Math.sqrt(1 / n + (meanX * meanX) / sxx);
    const tSlope = slope / seSlope;
    const tIntercept = intercept / seIntercept;
    const r2 = ssr / syy;
    const fStat = mse > 0 ? ssr / mse : null;
    const tCrit = tCritical(df);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    return {
        n,
        degreesOfFreedom: df,
        means: { x: round(meanX), y: round(meanY) },
        sums: { sxx: round(sxx), sxy: round(sxy), syy: round(syy) },
        coefficients: {
            intercept: round(intercept, 6),
            slope: round(slope, 6),
        },
        standardErrors: { intercept: round(seIntercept, 6), slope: round(seSlope, 6) },
        tStatistics: { intercept: round(tIntercept), slope: round(tSlope) },
        pValues: {
            intercept: round(tTwoSidedP(tIntercept, df), 6),
            slope: round(tTwoSidedP(tSlope, df), 6),
        },
        slopeConfidenceInterval95: [
            round(slope - tCrit * seSlope, 6),
            round(slope + tCrit * seSlope, 6),
        ],
        metrics: {
            correlation: round(r),
            r2: round(r2),
            adjustedR2: round(1 - ((1 - r2) * (n - 1)) / df),
            rmse: round(Math.sqrt(sse / n)),
            standardError: round(sigma),
            mae: round(residuals.reduce((s, e) => s + Math.abs(e), 0) / n),
            sse: round(sse),
            ssr: round(ssr),
            sst: round(syy),
            fStatistic: round(fStat),
            fPValue: fStat === null ? null : round(fUpperP(fStat, 1, df), 6),
        },
        line: [
            { x: round(minX), y: round(intercept + slope * minX) },
            { x: round(maxX), y: round(intercept + slope * maxX) },
        ],
        points: xs.map((x, i) => ({
            x: round(x),
            y: round(ys[i]),
            predicted: round(fitted[i]),
            residual: round(residuals[i]),
        })),
    };
}

// ---------------------------------------------------------------------------
// Multiple linear regression:  y = b0 + b1*x1 + ... + bk*xk
// Solved with the normal equations  b = (X'X)^-1 X'y
// ---------------------------------------------------------------------------
function multipleLinearRegression(xMatrix, ys, predictorNames) {
    const n = ys.length;
    const k = predictorNames.length;
    if (k < 2) throw new Error("Select at least two predictors for multiple regression.");
    if (n <= k + 1) {
        throw new Error(`Need more than ${k + 1} records to fit ${k} predictors (found ${n}).`);
    }

    const design = xMatrix.map((row) => [1, ...row]); // add intercept column
    const xt = transpose(design);
    const xtxInv = invert(multiply(xt, design));
    if (!xtxInv) {
        throw new Error(
            "The selected predictors are perfectly collinear (one is a combination of the others). Remove one and try again."
        );
    }

    const xty = multiply(xt, ys.map((y) => [y]));
    const beta = multiply(xtxInv, xty).map((row) => row[0]);

    const fitted = design.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
    const residuals = ys.map((y, i) => y - fitted[i]);
    const meanY = mean(ys);
    const sse = residuals.reduce((s, e) => s + e * e, 0);
    const sst = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
    if (sst === 0) throw new Error("The target has no variation (all values are identical).");

    const ssr = sst - sse;
    const df = n - k - 1;
    const mse = sse / df;
    const sigma = Math.sqrt(mse);
    const r2 = ssr / sst;
    const fStat = mse > 0 ? ssr / k / mse : null;
    const tCrit = tCritical(df);

    const names = ["Intercept", ...predictorNames];
    const columns = predictorNames.map((_, j) => xMatrix.map((row) => row[j]));
    const sdY = Math.sqrt(sst / (n - 1));
    const sd = (col) => {
        const m = mean(col);
        return Math.sqrt(col.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
    };

    const coefficients = beta.map((b, j) => {
        const se = Math.sqrt(Math.max(mse * xtxInv[j][j], 0));
        const t = se > 0 ? b / se : null;
        return {
            name: names[j],
            coefficient: round(b, 6),
            standardError: round(se, 6),
            tStatistic: round(t),
            pValue: t === null ? null : round(tTwoSidedP(t, df), 6),
            ci95: [round(b - tCrit * se, 6), round(b + tCrit * se, 6)],
            // Standardised beta: effect size in units of standard deviations
            standardized: j === 0 ? null : round((b * sd(columns[j - 1])) / sdY),
            correlationWithTarget: j === 0 ? null : round(correlation(columns[j - 1], ys)),
        };
    });

    // Variance inflation factor for each predictor (regress it on the others)
    const vif = predictorNames.map((name, j) => {
        const target = columns[j];
        const others = columns.filter((_, idx) => idx !== j);
        const d = target.map((_, i) => [1, ...others.map((c) => c[i])]);
        const dt = transpose(d);
        const inv = invert(multiply(dt, d));
        if (!inv) return { name, vif: null };
        const b = multiply(inv, multiply(dt, target.map((v) => [v]))).map((row) => row[0]);
        const mt = mean(target);
        const sseJ = target.reduce(
            (s, v, i) => s + (v - d[i].reduce((a, x, c) => a + x * b[c], 0)) ** 2,
            0
        );
        const sstJ = target.reduce((s, v) => s + (v - mt) ** 2, 0);
        const r2j = sstJ === 0 ? 0 : 1 - sseJ / sstJ;
        return { name, vif: r2j >= 0.999999 ? null : round(1 / (1 - r2j), 3) };
    });

    return {
        n,
        degreesOfFreedom: df,
        coefficients,
        vif,
        metrics: {
            r2: round(r2),
            adjustedR2: round(1 - ((1 - r2) * (n - 1)) / df),
            rmse: round(Math.sqrt(sse / n)),
            standardError: round(sigma),
            mae: round(residuals.reduce((s, e) => s + Math.abs(e), 0) / n),
            sse: round(sse),
            ssr: round(ssr),
            sst: round(sst),
            fStatistic: round(fStat),
            fPValue: fStat === null ? null : round(fUpperP(fStat, k, df), 6),
        },
        points: ys.map((y, i) => ({
            actual: round(y),
            predicted: round(fitted[i]),
            residual: round(residuals[i]),
        })),
    };
}

module.exports = { simpleLinearRegression, multipleLinearRegression };
