// Attribute-selection measures used when building decision trees:
// entropy, information gain, split info, gain ratio, and the Gini index.

const round = (v, d = 4) => (Number.isFinite(v) ? Number(v.toFixed(d)) : null);

function entropy(counts) {
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return 0;
    return counts.reduce((s, c) => (c > 0 ? s - (c / total) * Math.log2(c / total) : s), 0);
}

function gini(counts) {
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return 0;
    return 1 - counts.reduce((s, c) => s + (c / total) ** 2, 0);
}

/**
 * Evaluate every attribute against a class label.
 * @param {object[]} rows          dataset
 * @param {string[]} attributes    categorical attribute names (present on each row)
 * @param {string} target          class column
 */
function evaluateAttributes(rows, attributes, target) {
    const total = rows.length;
    const classes = [...new Set(rows.map((r) => r[target]))].sort();
    const classTotals = classes.map((c) => rows.filter((r) => r[target] === c).length);

    const parentEntropy = entropy(classTotals);
    const parentGini = gini(classTotals);

    const results = attributes.map((attribute) => {
        const groups = new Map();
        rows.forEach((row) => {
            const value = row[attribute];
            if (!groups.has(value)) groups.set(value, []);
            groups.get(value).push(row);
        });

        const partitions = [...groups.entries()]
            .map(([value, members]) => {
                const counts = classes.map((c) => members.filter((m) => m[target] === c).length);
                return {
                    value,
                    count: members.length,
                    weight: members.length / total,
                    classCounts: Object.fromEntries(classes.map((c, i) => [c, counts[i]])),
                    entropy: entropy(counts),
                    gini: gini(counts),
                };
            })
            .sort((a, b) => b.count - a.count);

        const expectedEntropy = partitions.reduce((s, p) => s + p.weight * p.entropy, 0);
        const weightedGini = partitions.reduce((s, p) => s + p.weight * p.gini, 0);
        const splitInfo = partitions.reduce(
            (s, p) => (p.weight > 0 ? s - p.weight * Math.log2(p.weight) : s),
            0
        );
        const infoGain = parentEntropy - expectedEntropy;

        return {
            attribute,
            distinctValues: partitions.length,
            expectedEntropy: round(expectedEntropy),
            infoGain: round(infoGain),
            splitInfo: round(splitInfo),
            gainRatio: splitInfo > 0 ? round(infoGain / splitInfo) : 0,
            weightedGini: round(weightedGini),
            giniGain: round(parentGini - weightedGini),
            partitions: partitions.map((p) => ({
                ...p,
                weight: round(p.weight),
                entropy: round(p.entropy),
                gini: round(p.gini),
            })),
        };
    });

    return {
        totalRecords: total,
        classes,
        classCounts: Object.fromEntries(classes.map((c, i) => [c, classTotals[i]])),
        parentEntropy: round(parentEntropy),
        parentGini: round(parentGini),
        attributes: results,
    };
}

module.exports = { entropy, gini, evaluateAttributes };
