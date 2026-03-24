const ASSET_PATH = "./assets/mvp_core_assets.json";

const state = {
  assets: null,
  datasetId: "abz_curated",
  familyId: "base_pair",
  parameterId: "shear",
};

function el(id) {
  return document.getElementById(id);
}

function formatDatasetCount(item) {
  if (item.count !== null && item.count !== undefined) {
    return `${item.count.toLocaleString()} entries`;
  }
  if (item.forms) {
    return `A ${item.forms.adna} / B ${item.forms.bdna} / Z ${item.forms.zdna}`;
  }
  return "Unknown";
}

function renderDatasetCards() {
  const root = el("datasetCards");
  root.innerHTML = "";
  for (const item of state.assets.dataset_catalog) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <span class="kind">${item.kind}</span>
      <h3>${item.display_name}</h3>
      <p class="meta">${formatDatasetCount(item)}</p>
      <p class="meta">Strictness: ${item.strictness}</p>
      <span class="tag ${item.plot_ready ? "" : "off"}">
        ${item.plot_ready ? "Plot-ready" : "Catalog-only"}
      </span>
    `;
    root.appendChild(card);
  }
}

function plotReadyDatasets() {
  return state.assets.dataset_catalog.filter((item) => item.plot_ready);
}

function currentPlotDataset() {
  return state.assets.plot_assets[state.datasetId];
}

function currentFamily() {
  return currentPlotDataset().families[state.familyId];
}

function currentParam() {
  return currentFamily().params[state.parameterId];
}

function fillSelect(select, items, valueKey, labelKey, currentValue) {
  select.innerHTML = "";
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    if (item[valueKey] === currentValue) {
      option.selected = true;
    }
    select.appendChild(option);
  }
}

function syncSelectors() {
  const datasetItems = plotReadyDatasets().map((item) => ({
    dataset_id: item.dataset_id,
    display_name: item.display_name,
  }));
  fillSelect(el("datasetSelect"), datasetItems, "dataset_id", "display_name", state.datasetId);

  const families = Object.entries(currentPlotDataset().families).map(([id, family]) => ({
    family_id: id,
    display_name: family.display_name,
  }));
  if (!families.find((item) => item.family_id === state.familyId)) {
    state.familyId = families[0].family_id;
  }
  fillSelect(el("familySelect"), families, "family_id", "display_name", state.familyId);

  const params = Object.entries(currentFamily().params).map(([id, param]) => ({
    parameter_id: id,
    display_name: param.display_name,
  }));
  if (!params.find((item) => item.parameter_id === state.parameterId)) {
    state.parameterId = params[0].parameter_id;
  }
  fillSelect(el("parameterSelect"), params, "parameter_id", "display_name", state.parameterId);
}

function makeTrace(values, label, color) {
  return {
    type: "histogram",
    x: values,
    name: label,
    opacity: 0.5,
    histnorm: "probability density",
    nbinsx: 50,
    marker: { color },
  };
}

function renderStats() {
  const param = currentParam();
  el("countA").textContent = param.forms.adna.length.toLocaleString();
  el("countB").textContent = param.forms.bdna.length.toLocaleString();
  el("countZ").textContent = param.forms.zdna.length.toLocaleString();
  el("countPdb").textContent = param.pdb_ids.length.toLocaleString();
}

function renderPlot() {
  const param = currentParam();
  const traces = [
    makeTrace(param.forms.adna, "A-DNA", "#8c3b2a"),
    makeTrace(param.forms.bdna, "B-DNA", "#174a7e"),
    makeTrace(param.forms.zdna, "Z-DNA", "#146c43"),
  ];

  const unit = param.unit === "A" ? "Å" : param.unit;
  const titleUnit = unit ? ` (${unit})` : "";
  Plotly.newPlot(
    el("plot"),
    traces,
    {
      title: `${param.display_name}${titleUnit}`,
      barmode: "overlay",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      margin: { l: 54, r: 20, t: 56, b: 52 },
      legend: { orientation: "h", y: 1.12 },
      xaxis: {
        title: `${param.display_name}${titleUnit}`,
        zeroline: false,
      },
      yaxis: {
        title: "Density",
        zeroline: false,
      },
    },
    { responsive: true, displaylogo: false }
  );
}

function renderAll() {
  syncSelectors();
  renderStats();
  renderPlot();
  el("statusNote").textContent =
    "MVP loaded: curated ABZ overlay for 18 core parameters. Dataset cards already include broader pure-DNA layers and future ABZ profiles.";
}

async function bootstrap() {
  const response = await fetch(ASSET_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load ${ASSET_PATH}`);
  }
  state.assets = await response.json();

  renderDatasetCards();
  renderAll();

  el("datasetSelect").addEventListener("change", (event) => {
    state.datasetId = event.target.value;
    renderAll();
  });
  el("familySelect").addEventListener("change", (event) => {
    state.familyId = event.target.value;
    renderAll();
  });
  el("parameterSelect").addEventListener("change", (event) => {
    state.parameterId = event.target.value;
    renderAll();
  });
}

bootstrap().catch((error) => {
  console.error(error);
  el("statusNote").textContent = `Load failed: ${error.message}`;
});
