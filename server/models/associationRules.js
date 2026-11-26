// Apriori association rule mining.

const round = (v, d = 4) => (Number.isFinite(v) ? Number(v.toFixed(d)) : null);

const SEP = "␟";
const sortItems = (items) => [...items].sort((a, b) => a.localeCompare(b));
const keyOf = (items) => sortItems(items).join(SEP);

function subsetsOf(items) {
    const result = [];
    const total = 1 << items.length;
    for (let mask = 1; mask < total - 1; mask++) {
        result.push(items.filter((_, i) => mask & (1 << i)));
    }
    return result;
}

/**
 * @param {string[][]} transactions   each transaction is a list of unique items
 * @param {{minSupport:number, minConfidence:number, maxLength?:number}} options
 */
function apriori(transactions, { minSupport, minConfidence, maxLength = 4 }) {
    const total = transactions.length;
    const minCount = Math.max(1, Math.ceil(minSupport * total - 1e-9));
    const sets = transactions.map((t) => new Set(t));

    const supportCount = new Map();
    const levels = [];

    // L1: frequent single items
    const itemCounts = new Map();
    sets.forEach((s) => s.forEach((item) => itemCounts.set(item, (itemCounts.get(item) || 0) + 1)));

    let current = [...itemCounts.entries()]
        .filter(([, c]) => c >= minCount)
        .map(([item, c]) => {
            supportCount.set(keyOf([item]), c);
            return [item];
        })
        .sort((a, b) => a[0].localeCompare(b[0]));

    levels.push({ size: 1, candidates: itemCounts.size, frequent: current.length });

    const frequentSets = current.map((items) => ({ items, count: supportCount.get(keyOf(items)) }));

    let size = 1;
    while (current.length > 1 && size < maxLength) {
        size += 1;
        const currentKeys = new Set(current.map(keyOf));

        // Join step + prune step (Apriori property)
        const candidates = [];
        for (let i = 0; i < current.length; i++) {
            for (let j = i + 1; j < current.length; j++) {
                const a = current[i];
                const b = current[j];
                if (a.slice(0, size - 2).join(SEP) !== b.slice(0, size - 2).join(SEP)) continue;
                const merged = sortItems([...a, b[size - 2]]);
                const allSubsetsFrequent = merged.every((_, skip) =>
                    currentKeys.has(keyOf(merged.filter((__, idx) => idx !== skip)))
                );
                if (allSubsetsFrequent) candidates.push(merged);
            }
        }

        const next = [];
        candidates.forEach((candidate) => {
            const count = sets.filter((s) => candidate.every((item) => s.has(item))).length;
            if (count >= minCount) {
                supportCount.set(keyOf(candidate), count);
                next.push(candidate);
                frequentSets.push({ items: candidate, count });
            }
        });

        levels.push({ size, candidates: candidates.length, frequent: next.length });
        current = next.sort((x, y) => keyOf(x).localeCompare(keyOf(y)));
    }

    // Rule generation from every frequent itemset with 2+ items
    const rules = [];
    frequentSets
        .filter((fs) => fs.items.length >= 2)
        .forEach(({ items, count }) => {
            subsetsOf(items).forEach((antecedent) => {
                const consequent = items.filter((i) => !antecedent.includes(i));
                const antCount = supportCount.get(keyOf(antecedent));
                const conCount = supportCount.get(keyOf(consequent));
                if (!antCount || !conCount) return;

                const support = count / total;
                const confidence = count / antCount;
                if (confidence < minConfidence) return;

                const consequentSupport = conCount / total;
                rules.push({
                    antecedent: sortItems(antecedent),
                    consequent: sortItems(consequent),
                    supportCount: count,
                    support: round(support),
                    confidence: round(confidence),
                    lift: round(confidence / consequentSupport),
                    leverage: round(support - (antCount / total) * consequentSupport),
                    conviction:
                        confidence >= 1 ? null : round((1 - consequentSupport) / (1 - confidence)),
                });
            });
        });

    rules.sort(
        (a, b) => b.lift - a.lift || b.confidence - a.confidence || b.supportCount - a.supportCount
    );

    return {
        totalTransactions: total,
        minSupportCount: minCount,
        levels,
        itemsets: frequentSets
            .map(({ items, count }) => ({ items: sortItems(items), count, support: round(count / total) }))
            .sort((a, b) => b.count - a.count || a.items.length - b.items.length),
        rules,
    };
}

module.exports = { apriori };
