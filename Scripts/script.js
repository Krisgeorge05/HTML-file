const CSV_PATH = "./Data/esg_scores.csv";

const colorScale = d3
  .scaleLinear()
  .domain([0, 50, 100])
  .range(["#c0392b", "#f1c40f", "#27ae60"]);

let dataMap = {};

const PILLAR_KEY = {
  environmental: "Environmental (0-100)",
  social: "Social (0-100)",
  governance: "Governance (0-100)",
};

let allRows = [];

function getSelectedPillars() {
  const p = [];
  if (document.getElementById("cb-env").checked) p.push("environmental");
  if (document.getElementById("cb-soc").checked) p.push("social");
  if (document.getElementById("cb-gov").checked) p.push("governance");
  return p;
}

function scoreForCountry(row, selected) {
  if (!row || selected.length === 0) return null;
  const vals = selected
    .map((k) => Number(row[k]))
    .filter((v) => Number.isFinite(v));
  if (!vals.length) return null;
  return d3.mean(vals);
}

function findCountryEl(svgDoc, iso3, name) {
  if (!svgDoc) return null;
  const tryIds = [
    iso3,
    iso3?.toLowerCase?.(),
    iso3?.toUpperCase?.(),
    name,
    name?.replace(/\s+/g, "_"),
    name?.toLowerCase?.().replace(/\s+/g, "_"),
  ].filter(Boolean);

  for (const id of tryIds) {
    const byId = svgDoc.getElementById(id);
    if (byId) return byId;
  }

  const qs = [
    `[data-iso3="${iso3}"]`,
    `[data-iso_a3="${iso3}"]`,
    `[data-ISO_A3="${iso3}"]`,
    `[title="${name}"]`,
    `[name="${name}"]`,
  ];

  for (const sel of qs) {
    const el = svgDoc.querySelector(sel);
    if (el) return el;
  }

  return null;
}

function paintMap(svgDoc) {
  const selected = getSelectedPillars();
  let found = 0,
    missing = 0;

  Object.entries(dataMap).forEach(([iso3, row]) => {
    const el = findCountryEl(svgDoc, iso3, row.name);
    const val = scoreForCountry(row, selected);

    if (!el) {
      missing++;
      return;
    }

    el.style.fill = val == null ? "#e0e0e0" : colorScale(val);
    el.style.stroke = "#333";
    el.style.strokeWidth = "0.3";
    el.style.cursor = "pointer";
    found++;
  });
}

document.getElementById("worldMap").addEventListener("load", async function () {
  const svgDoc = this.contentDocument;
  const rows = await d3.csv(CSV_PATH);

  allRows = rows;

  dataMap = {};
  rows.forEach((r) => {
    const iso3 = (r["Country Code"] || "").trim().toUpperCase();
    const name = (r["Country Name"] || "").trim();
    if (!iso3) return;
    dataMap[iso3] = {
      name,
      environmental: +r["Environmental (0-100)"],
      social: +r["Social (0-100)"],
      governance: +r["Governance (0-100)"],
    };
  });

  paintMap(svgDoc);

  ["cb-env", "cb-soc", "cb-gov"].forEach((id) => {
    document
      .getElementById(id)
      .addEventListener("change", () => paintMap(svgDoc));
  });

  if (rows.length >= 2) {
    const code1 = rows[0]["Country Code"]?.trim().toUpperCase();
    const code2 = rows[1]["Country Code"]?.trim().toUpperCase();
    const socialScore1 = parseFloat(rows[0]["Social (0-100)"]) || 0;
    const socialScore2 = parseFloat(rows[1]["Social (0-100)"]) || 0;

    const netherlandsRow = rows.find(
      (r) => r["Country Code"]?.trim().toUpperCase() === "NL"
    );
    const socialScoreNL = netherlandsRow
      ? parseFloat(netherlandsRow["Social (0-100)"]) || 0
      : 0;

    const phone1Opacity = (socialScoreNL / 100) * 0.8;
    const phone2Opacity = (socialScore1 / 100) * 0.8;
    const phone3Opacity = (socialScore2 / 100) * 0.8;

    const phone1 = document.querySelector(".phone1");
    if (phone1) {
      phone1.addEventListener("load", function () {
        const svg = this.contentDocument;
        const overlay = svg?.querySelector('g[filter*="filter1"] rect');
        if (overlay) {
          overlay.setAttribute("fill-opacity", phone1Opacity);
        }
      });
    }

    const phone2 = document.querySelector(".phone2");
    if (phone2 && code1) {
      phone2.addEventListener("load", function () {
        const svg = this.contentDocument;
        const img = svg?.querySelector("image");
        if (img) {
          const flagUrl = `https://flagsapi.com/${code1}/flat/64.png`;
          img.setAttribute("href", flagUrl);
          img.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            flagUrl
          );
        }
        const overlay = svg?.querySelector('g[filter*="filter1"] rect');
        if (overlay) {
          overlay.setAttribute("fill-opacity", phone2Opacity);
        }
      });
    }

    const phone3 = document.querySelector(".phone3");
    if (phone3 && code2) {
      phone3.addEventListener("load", function () {
        const svg = this.contentDocument;
        const img = svg?.querySelector("image");
        if (img) {
          const flagUrl = `https://flagsapi.com/${code2}/flat/64.png`;
          img.setAttribute("href", flagUrl);
          img.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            flagUrl
          );
        }
        const overlay = svg?.querySelector('g[filter*="filter1"] rect');
        if (overlay) {
          overlay.setAttribute("fill-opacity", phone3Opacity);
        }
      });
    }

    const governanceScoreNL = netherlandsRow
      ? parseFloat(netherlandsRow["Governance (0-100)"]) || 0
      : 0;

    const paper1 = document.querySelector(".paper1");
    if (paper1) {
      paper1.addEventListener("load", function () {
        const svg = this.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          const visiblePapers = Math.max(
            1,
            Math.min(33, 1 + Math.floor(governanceScoreNL / 3))
          );
          paths.forEach((path, index) => {
            if (index >= visiblePapers) {
              path.style.opacity = "0";
            } else {
              path.style.opacity = "1";
            }
          });
        }
      });

      if (paper1.contentDocument) {
        const svg = paper1.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          const visiblePapers = Math.max(
            1,
            Math.min(33, 1 + Math.floor(governanceScoreNL / 3))
          );
          paths.forEach((path, index) => {
            if (index >= visiblePapers) {
              path.style.opacity = "0";
            } else {
              path.style.opacity = "1";
            }
          });
        }
      }
    }

    const governanceScore1 = parseFloat(rows[0]["Governance (0-100)"]) || 0;
    const paper2 = document.querySelector(".paper2");
    if (paper2) {
      paper2.addEventListener("load", function () {
        const svg = this.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          const visiblePapers = Math.max(
            1,
            Math.min(33, 1 + Math.floor(governanceScore1 / 3))
          );
          paths.forEach((path, index) => {
            if (index >= visiblePapers) {
              path.style.opacity = "0";
            } else {
              path.style.opacity = "1";
            }
          });
        }
      });

      if (paper2.contentDocument) {
        const svg = paper2.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          const visiblePapers = Math.max(
            1,
            Math.min(33, 1 + Math.floor(governanceScore1 / 3))
          );
          paths.forEach((path, index) => {
            if (index >= visiblePapers) {
              path.style.opacity = "0";
            } else {
              path.style.opacity = "1";
            }
          });
        }
      }
    }

    const governanceScore2 = parseFloat(rows[1]["Governance (0-100)"]) || 0;
    const paper3 = document.querySelector(".paper3");
    if (paper3) {
      paper3.addEventListener("load", function () {
        const svg = this.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          const visiblePapers = Math.max(
            1,
            Math.min(33, 1 + Math.floor(governanceScore2 / 3))
          );
          paths.forEach((path, index) => {
            if (index >= visiblePapers) {
              path.style.opacity = "0";
            } else {
              path.style.opacity = "1";
            }
          });
        }
      });

      if (paper3.contentDocument) {
        const svg = paper3.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          const visiblePapers = Math.max(
            1,
            Math.min(33, 1 + Math.floor(governanceScore2 / 3))
          );
          paths.forEach((path, index) => {
            if (index >= visiblePapers) {
              path.style.opacity = "0";
            } else {
              path.style.opacity = "1";
            }
          });
        }
      }
    }
  }
});

d3.csv(CSV_PATH).then((rows) => {
  const netherlandsRow = rows.find(
    (r) => r["Country Code"]?.trim().toUpperCase() === "NL"
  );

  if (!netherlandsRow) return;

  const environmentalScoreNL =
    parseFloat(netherlandsRow["Environmental (0-100)"]) || 0;

  const lightGreenScale = d3
    .scaleLinear()
    .domain([0, 100])
    .range(["#3A170B", "#91CF96"]);

  const darkGreenScale = d3
    .scaleLinear()
    .domain([0, 100])
    .range(["#2A0F07", "#5ABA63"]);

  const newLightGreen = lightGreenScale(environmentalScoreNL);
  const newDarkGreen = darkGreenScale(environmentalScoreNL);

  const plant1 = document.querySelector(".plant1");
  if (plant1) {
    plant1.addEventListener("load", function () {
      const svg = this.contentDocument;
      const paths = svg?.querySelectorAll("path");
      if (paths) {
        paths.forEach((path) => {
          const currentFill = path.getAttribute("fill");
          if (currentFill === "#91CF96") {
            path.setAttribute("fill", newLightGreen);
          } else if (currentFill === "#5ABA63") {
            path.setAttribute("fill", newDarkGreen);
          }
        });
      }
    });

    if (plant1.contentDocument) {
      const svg = plant1.contentDocument;
      const paths = svg?.querySelectorAll("path");
      if (paths) {
        paths.forEach((path) => {
          const currentFill = path.getAttribute("fill");
          if (currentFill === "#91CF96") {
            path.setAttribute("fill", newLightGreen);
          } else if (currentFill === "#5ABA63") {
            path.setAttribute("fill", newDarkGreen);
          }
        });
      }
    }
  }

  if (rows.length >= 1) {
    const environmentalScore1 =
      parseFloat(rows[0]["Environmental (0-100)"]) || 0;
    const newLightGreen2 = lightGreenScale(environmentalScore1);
    const newDarkGreen2 = darkGreenScale(environmentalScore1);

    const plant2 = document.querySelector(".plant2");
    if (plant2) {
      plant2.addEventListener("load", function () {
        const svg = this.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          paths.forEach((path) => {
            const currentFill = path.getAttribute("fill");
            if (currentFill === "#91CF96") {
              path.setAttribute("fill", newLightGreen2);
            } else if (currentFill === "#5ABA63") {
              path.setAttribute("fill", newDarkGreen2);
            }
          });
        }
      });

      if (plant2.contentDocument) {
        const svg = plant2.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          paths.forEach((path) => {
            const currentFill = path.getAttribute("fill");
            if (currentFill === "#91CF96") {
              path.setAttribute("fill", newLightGreen2);
            } else if (currentFill === "#5ABA63") {
              path.setAttribute("fill", newDarkGreen2);
            }
          });
        }
      }
    }
  }

  if (rows.length >= 2) {
    const environmentalScore2 =
      parseFloat(rows[1]["Environmental (0-100)"]) || 0;
    const newLightGreen3 = lightGreenScale(environmentalScore2);
    const newDarkGreen3 = darkGreenScale(environmentalScore2);

    const plant3 = document.querySelector(".plant3");
    if (plant3) {
      plant3.addEventListener("load", function () {
        const svg = this.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          paths.forEach((path) => {
            const currentFill = path.getAttribute("fill");
            if (currentFill === "#91CF96") {
              path.setAttribute("fill", newLightGreen3);
            } else if (currentFill === "#5ABA63") {
              path.setAttribute("fill", newDarkGreen3);
            }
          });
        }
      });

      if (plant3.contentDocument) {
        const svg = plant3.contentDocument;
        const paths = svg?.querySelectorAll("path");
        if (paths) {
          paths.forEach((path) => {
            const currentFill = path.getAttribute("fill");
            if (currentFill === "#91CF96") {
              path.setAttribute("fill", newLightGreen3);
            } else if (currentFill === "#5ABA63") {
              path.setAttribute("fill", newDarkGreen3);
            }
          });
        }
      }
    }
  }

  if (rows.length >= 2) {
    const code1 = rows[0]["Country Code"]?.trim().toUpperCase();
    const code2 = rows[1]["Country Code"]?.trim().toUpperCase();

    const plant2 = document.querySelector(".plant2");
    if (plant2 && code1) {
      plant2.addEventListener("load", function () {
        const svg = this.contentDocument;
        const img = svg?.querySelector("image");
        if (img) {
          const flagUrl = `https://flagsapi.com/${code1}/flat/64.png`;
          img.setAttribute("href", flagUrl);
          img.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            flagUrl
          );
        }
      });

      if (plant2.contentDocument) {
        const svg = plant2.contentDocument;
        const img = svg?.querySelector("image");
        if (img) {
          const flagUrl = `https://flagsapi.com/${code1}/shiny/64.png`;
          img.setAttribute("href", flagUrl);
          img.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            flagUrl
          );
        }
      }
    }

    const plant3 = document.querySelector(".plant3");
    if (plant3 && code2) {
      plant3.addEventListener("load", function () {
        const svg = this.contentDocument;
        const img = svg?.querySelector("image");
        if (img) {
          const flagUrl = `https://flagsapi.com/${code2}/shiny/64.png`;
          img.setAttribute("href", flagUrl);
          img.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            flagUrl
          );
        }
      });

      if (plant3.contentDocument) {
        const svg = plant3.contentDocument;
        const img = svg?.querySelector("image");
        if (img) {
          const flagUrl = `https://flagsapi.com/${code2}/shiny/64.png`;
          img.setAttribute("href", flagUrl);
          img.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            flagUrl
          );
        }
      }
    }
  }
});

let popup = null;

function showPopupOver(targetEl, pillar) {
  // Remove any existing popup
  d3.select(".popup").remove();

  const data = makePopupData(pillar);
  const maxVal = d3.max(data, (d) => d.value) || 100;

  // Compute position beside the target element
  const rect = targetEl.getBoundingClientRect();
  const vpW = document.documentElement.clientWidth;
  const vpH = document.documentElement.clientHeight;

  const margin = 12; // gap between target and popup
  const preferredLeft = rect.right + margin;
  const fallbackLeft = rect.left - 240 - margin; // estimated width
  const left =
    preferredLeft + 260 < vpW ? preferredLeft : Math.max(8, fallbackLeft);

  const preferredTop = rect.top + rect.height / 2 - 80;
  const top = Math.min(Math.max(8, preferredTop), vpH - 160);

  popup = d3
    .select("body")
    .append("div")
    .attr("class", "popup")
    .style("left", `${left}px`)
    .style("top", `${top}px`)
    .style("display", "block");

  const title =
    {
      governance: "Governance Factor Score",
      social: "Social Factor Score",
      environmental: "Environmental Factor Score",
    }[pillar] || "ESG Score";

  popup.append("h4").text(title);

  const barsWrap = popup
    .append("div")
    .attr("class", "bars")
    .style("height", "160px")
    .style("display", "flex")
    .style("align-items", "flex-end")
    .style("justify-content", "space-around")
    .style("gap", "12px")
    .style("padding", "8px 4px");

  if (!data || !data.length) {
    barsWrap.append("p").text("No data available");
  } else {
    const minVal = d3.min(data, (d) => d.value) || 0;
    const maxVal = d3.max(data, (d) => d.value) || 100;

    const y = d3.scaleLinear().domain([minVal, maxVal]).range([30, 100]);

    const bars = barsWrap
      .selectAll(".bar")
      .data(data)
      .enter()
      .append("div")
      .attr("class", "bar")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("align-items", "center")
      .style("justify-content", "flex-end")
      .style("height", "100%")
      .style("flex", "1");

    bars
      .append("div")
      .attr("class", "col")
      .style("width", "clamp(20px, 3vw, 28px)")
      .style("height", (d) => `${y(d.value)}%`)
      .style("background-color", (d) => (d.isNL ? "#2196f3" : "#999"))
      .style("border-radius", "5px")
      .style("transition", "height 0.3s ease, background-color 0.3s ease");

    // Add numeric value above the bar
    bars
      .append("span")
      .text((d) => d.value.toFixed(0)) // round to whole number
      .style("font-size", "clamp(10px, 1vw, 12px)")
      .style("color", "#111")
      .style("margin-bottom", "4px")
      .style("font-weight", (d) => (d.isNL ? "600" : "400"));

    // Add country label below the bar
    bars
      .append("label")
      .text((d) => (d.isNL ? "Netherlands" : d.label))
      .style("font-size", "clamp(9px, 0.9vw, 11px)")
      .style("margin-top", "4px")
      .style("color", "#222")
      .style("text-align", "center")
      .style("max-width", "60px")
      .style("overflow", "hidden")
      .style("white-space", "nowrap")
      .style("text-overflow", "ellipsis");
  }

  const onDocClick = (e) => {
    const node = popup.node();
    if (node && !node.contains(e.target) && e.target !== targetEl) {
      d3.select(node).remove();
      document.removeEventListener("click", onDocClick);
    }
  };
  document.addEventListener("click", onDocClick, { capture: true });
}

const popupMap = [
  { sel: ".paper1", pillar: "governance" },
  { sel: ".paper2", pillar: "governance" },
  { sel: ".paper3", pillar: "governance" },
  { sel: ".phone1", pillar: "social" },
  { sel: ".phone2", pillar: "social" },
  { sel: ".phone3", pillar: "social" },
  { sel: ".plant1", pillar: "environmental" },
  { sel: ".plant2", pillar: "environmental" },
  { sel: ".plant3", pillar: "environmental" },
];

popupMap.forEach(({ sel, pillar }) => {
  const el = document.querySelector(sel);
  if (!el) return;

  const show = () => showPopupOver(el, pillar);
  const hide = () => d3.select(".popup").remove();

  const attachHover = (node) => {
    node.addEventListener("mouseenter", (e) => {
      e.stopPropagation();
      show();
    });

    node.addEventListener("mouseleave", (e) => {
      // Give user time to move into the popup before hiding
      setTimeout(() => {
        const popupEl = document.querySelector(".popup");
        if (popupEl && !popupEl.matches(":hover")) {
          hide();
        }
      }, 150);
    });
  };

  if (el.tagName.toLowerCase() === "object") {
    el.addEventListener("load", () => {
      const svgDoc = el.contentDocument;
      if (svgDoc) {
        const svgRoot = svgDoc.documentElement;
        svgRoot.addEventListener("mouseenter", (e) => {
          e.stopPropagation();
          show();
        });
        svgRoot.addEventListener("mouseleave", (e) => {
          setTimeout(() => {
            const popupEl = document.querySelector(".popup");
            if (popupEl && !popupEl.matches(":hover")) {
              hide();
            }
          }, 150);
        });
      }
    });
  } else {
    attachHover(el);
  }
});



function getNetherlandsScore(pillar) {
  const nl = allRows.find(
    (r) => (r["Country Code"] || "").trim().toUpperCase() === "NL"
  );
  return nl ? +nl[PILLAR_KEY[pillar]] || 0 : 0;
}

function top3ByPillar(pillar) {
  const col = PILLAR_KEY[pillar];
  const rows = allRows
    .filter((r) => Number.isFinite(+r[col]))
    .map((r) => ({ name: (r["Country Name"] || "").trim(), value: +r[col] }));

  rows.sort((a, b) => b.value - a.value);

  return rows.slice(0, 3);
}

function makePopupData(pillar) {
  const nlVal = getNetherlandsScore(pillar);

  const targetCountries = ["Denmark", "Switzerland", "New Zealand"];

  const col = PILLAR_KEY[pillar];
  const others = allRows
    .filter((r) => targetCountries.includes((r["Country Name"] || "").trim()))
    .map((r) => ({
      label: (r["Country Name"] || "").trim(),
      value: +r[col] || 0,
      isNL: false,
    }));

  return [{ label: "Netherlands", value: nlVal, isNL: true }, ...others];
}

const mapContainer = document.querySelector(".map-container");
const mapObject = document.getElementById("worldMap");

const lens = document.createElement("div");
lens.className = "map-zoom-lens";
mapContainer.appendChild(lens);

const zoomedImg = document.createElement("img");
zoomedImg.src = mapObject.getAttribute("data");
lens.appendChild(zoomedImg);

const zoomScale = 1.7;

mapContainer.addEventListener("mousemove", (e) => {
  const rect = mapContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  lens.style.opacity = "1";

  lens.style.left = x - lens.offsetWidth / 2 + "px";
  lens.style.top = y - lens.offsetHeight / 2 + "px";

  zoomedImg.style.width = rect.width * zoomScale + "px";
  zoomedImg.style.height = rect.height * zoomScale + "px";

  zoomedImg.style.left = -x * (zoomScale - 1) + "px";
  zoomedImg.style.top = -y * (zoomScale - 1) + "px";
});
