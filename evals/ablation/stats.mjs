// 判定规则用到的统计：正态分布、二项检验、Holm 校正。都是标准公式，不依赖外部库。

/** 标准正态分布函数（Abramowitz–Stegun 7.1.26 的 erf 近似，误差 < 1.5e-7）。 */
export function normalCdf(z) {
	const t = 1 / (1 + 0.3275911 * Math.abs(z / Math.SQRT2));
	const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-((z / Math.SQRT2) ** 2));
	return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** 标准正态分位数（Acklam 的有理近似，误差 < 1.2e-9）。 */
export function normalQuantile(p) {
	const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
	const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
	const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
	const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
	const low = 0.02425;
	if (p < low) {
		const q = Math.sqrt(-2 * Math.log(p));
		return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
	}
	if (p > 1 - low) return -normalQuantile(1 - p);
	const q = p - 0.5;
	const r = q * q;
	return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** 双侧 z 检验的 p 值。 */
export const zTest = (z) => 2 * (1 - normalCdf(Math.abs(z)));

/** 双侧精确二项检验（p = 0.5）：k 次胜、n 局分出胜负。 */
export function binomialTest(k, n) {
	if (!n) return 1;
	const logChoose = (m) => {
		let sum = 0;
		for (let i = 1; i <= m; i++) sum += Math.log((n - m + i) / i);
		return sum;
	};
	const prob = (m) => Math.exp(logChoose(m) + n * Math.log(0.5));
	const observed = prob(k);
	let p = 0;
	for (let m = 0; m <= n; m++) if (prob(m) <= observed * (1 + 1e-9)) p += prob(m);
	return Math.min(1, p);
}

/** Holm 逐步校正：返回与输入同序的校正后 p 值。null 原样返回、不占名额。 */
export function holm(pValues) {
	const indexed = pValues.map((p, index) => ({ p, index })).filter((entry) => entry.p !== null && entry.p !== undefined);
	indexed.sort((a, b) => a.p - b.p);
	const out = pValues.map((p) => (p === null || p === undefined ? null : 1));
	let running = 0;
	indexed.forEach((entry, rank) => {
		running = Math.max(running, Math.min(1, (indexed.length - rank) * entry.p));
		out[entry.index] = running;
	});
	return out;
}

export const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
export const variance = (values) => {
	if (values.length < 2) return 0;
	const m = mean(values);
	return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
};
