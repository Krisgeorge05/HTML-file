// esgSimple.js
const fs = require("fs");
const https = require("https");

const config = {
  indicators: {
    Environmental: [
      { code: "EN.ATM.CO2E.PC", weight: 2.0, direction: -1 },
      { code: "EN.ATM.PM25.MC.M3", weight: 1.5, direction: -1 },
      { code: "EN.ATM.GHGT.KT.CE", weight: 1.2, direction: -1 },
      { code: "EN.ATM.METH.KT.CE", weight: 1.0, direction: -1 },
      { code: "EG.FEC.RNEW.ZS", weight: 1.5, direction: 1 },
      { code: "EG.ELC.RNEW.ZS", weight: 1.2, direction: 1 },
      { code: "EG.CFT.ACCS.ZS", weight: 1.8, direction: 1 },
      { code: "EG.ELC.ACCS.ZS", weight: 1.2, direction: 1 },
    ],
    Governance: [
      { code: "CC.EST", weight: 1.5, direction: 1 },
      { code: "GE.EST", weight: 1.5, direction: 1 },
      { code: "RL.EST", weight: 1.5, direction: 1 },
      { code: "RQ.EST", weight: 1.2, direction: 1 },
      { code: "VA.EST", weight: 1.2, direction: 1 },
      { code: "PV.EST", weight: 1.2, direction: 1 },
    ],
    Social: [
      { code: "SH.H2O.BASW.ZS", weight: 1.5, direction: 1 },
      { code: "SH.STA.BASS.ZS", weight: 1.5, direction: 1 },
      { code: "SP.DYN.LE00.IN", weight: 1.0, direction: 1 },
      { code: "SL.UEM.TOTL.ZS", weight: 1.2, direction: -1 },
      { code: "SI.POV.GINI", weight: 1.2, direction: -1 },
      { code: "SE.SEC.ENRR", weight: 0.8, direction: 1 },
    ],
  },
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function fetchIndicator(code) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000`;
  const j = await fetchJson(url);
  const data = j[1] || [];
  const latest = new Map();
  for (const r of data) {
    const c = r.country && r.country.id;
    if (!c || r.value == null) continue;
    const y = +r.date;
    const prev = latest.get(c);
    if (!prev || y > prev.year)
      latest.set(c, {
        country: r.country.value,
        code: c,
        value: +r.value,
        year: y,
      });
  }
  return Array.from(latest.values());
}

function normalize(values) {
  const nums = values.map((v) => v.value).filter((v) => isFinite(v));
  if (nums.length === 0) return values.map((v) => ({ ...v, norm: NaN }));
  const min = Math.min(...nums),
    max = Math.max(...nums);
  if (max === min)
    return values.map((v) => ({ ...v, norm: isFinite(v.value) ? 50 : NaN }));
  return values.map((v) => ({
    ...v,
    norm: isFinite(v.value) ? ((v.value - min) / (max - min)) * 100 : NaN,
  }));
}

function average(a) {
  return a.reduce((p, c) => p + c, 0) / a.length;
}

function weightedAverage(values, weights) {
  const valid = values.filter(isFinite);
  if (!valid.length) return NaN;
  const w = values.map((v, i) => (isFinite(v) ? weights[i] : 0));
  const sumW = w.reduce((p, c) => p + c, 0);
  const total = values.reduce(
    (p, v, i) => (isFinite(v) ? p + v * weights[i] : p),
    0
  );
  return total / sumW;
}

async function getScores() {
  const pillars = ["Environmental", "Governance", "Social"];
  const byCountry = new Map();

  for (const pillar of pillars) {
    const indicators = config.indicators[pillar];
    for (const indicator of indicators) {
      const raw = await fetchIndicator(indicator.code);
      const normed = normalize(raw);
      for (const v of normed) {
        if (!isFinite(v.norm)) continue;
        const c = byCountry.get(v.code) || {
          CountryName: v.country,
          CountryCode: v.code,
          E: [],
          G: [],
          S: [],
        };
        // Apply direction and weight
        const adjustedScore =
          indicator.direction === -1 ? 100 - v.norm : v.norm;
        const weightedScore = adjustedScore * indicator.weight;

        if (pillar === "Environmental")
          c.E.push({ score: weightedScore, weight: indicator.weight });
        if (pillar === "Governance")
          c.G.push({ score: weightedScore, weight: indicator.weight });
        if (pillar === "Social")
          c.S.push({ score: weightedScore, weight: indicator.weight });
        byCountry.set(v.code, c);
      }
    }
  }

  const result = [];
  for (const c of byCountry.values()) {
    const calcPillar = (arr) => {
      if (!arr.length) return 0;
      const totalWeighted = arr.reduce((sum, item) => sum + item.score, 0);
      const totalWeight = arr.reduce((sum, item) => sum + item.weight, 0);
      return totalWeighted / totalWeight;
    };

    const e = calcPillar(c.E);
    const g = calcPillar(c.G);
    const s = calcPillar(c.S);
    const total = (e + g + s) / 3;

    result.push({
      CountryName: c.CountryName,
      CountryCode: c.CountryCode,
      E: e,
      G: g,
      S: s,
      Total: isFinite(total) ? total : 0,
      Ecount: c.E.length,
      Gcount: c.G.length,
      Scount: c.S.length,
    });
  }

  const ranked = result
    .sort((a, b) => b.Total - a.Total)
    .map((r, i) => ({ Rank: i + 1, ...r }));

  const csv =
    "Rank (Total ESG),Country Name,Country Code,Environmental (0-100),Governance (0-100),Social (0-100),Total ESG (0-100),Environmental Indicators Used,Governance Indicators Used,Social Indicators Used\n" +
    ranked
      .map(
        (r) =>
          `${r.Rank},${r.CountryName},${r.CountryCode},${r.E?.toFixed(
            6
          )},${r.G?.toFixed(6)},${r.S?.toFixed(6)},${r.Total?.toFixed(6)},${
            r.Ecount
          },${r.Gcount},${r.Scount}`
      )
      .join("\n");
  fs.writeFileSync("../Data/esg_scores.csv", csv);
  console.log("Saved esg_scores.csv to Data folder");
}

getScores();
