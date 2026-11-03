
/* =========================================================
   IDEXIS — Application Shell
   Connects the existing frontend to the Python API.
   ========================================================= */

let page = "overview";

const API_BASE = "http://127.0.0.1:8000/api";

function go(p) {
  page = p;
  render();
}

function render() {
  const nav = document.querySelector("#nav");

  if (nav) {
    nav.innerHTML = NAV.map(
      ([key, label]) =>
        `<a href="#${key}" class="${page === key ? "on" : ""}">${label}</a>`
    ).join("");
  }

  const view = document.querySelector("#view");
  const dot = document.querySelector("#mdot");
  const txt = document.querySelector("#mtxt");

  if (dot) dot.className = "dot";
  if (txt) txt.textContent = "Python Analysis API";

  if (view) {
    view.innerHTML = S.running
      ? `<h1>Analysing evidence…</h1>
         <p class="lede">Running image-forensics analysis through the Python backend.</p>
         ${Pipeline()}`
      : (typeof Pages !== "undefined" && Pages[page])
        ? Pages[page]()
        : `<h1>Page not found</h1>`;
  }

  if (!S.running) {
    if (typeof wireCompare === "function") {
      wireCompare("cmp1");
      wireCompare("cmp2");
    }
  }

  bind();
  updateBackendStatus();
}

async function updateBackendStatus() {
  const dot = document.querySelector("#mdot");
  const txt = document.querySelector("#mtxt");

  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error("Backend unavailable");

    if (dot) dot.className = "dot on";
    if (txt) txt.textContent = "Python API: Connected";
  } catch {
    if (dot) dot.className = "dot";
    if (txt) txt.textContent = "Python API: Offline";
  }
}

function bind() {
  document.querySelectorAll("[data-go]").forEach((button) => {
    button.onclick = () => go(button.dataset.go);
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.onclick = () => {
      S.view = button.dataset.view;
      render();
    };
  });

  document.querySelectorAll("[data-sel]").forEach((button) => {
    button.onclick = () => {
      S.sel = +button.dataset.sel;
      render();
    };
  });

  document.querySelectorAll("[data-act]").forEach((button) => {
    button.onclick = () => act(button.dataset.act);
  });

  const q = document.querySelector("#q");
  const f = document.querySelector("#f");

  if (q) {
    q.oninput = (event) => {
      S.q = event.target.value;
      render();

      const next = document.querySelector("#q");
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
    };
  }

  if (f) {
    f.onchange = (event) => {
      S.f = event.target.value;
      render();
    };
  }

  const drop = document.querySelector("#drop");
  const input = document.querySelector("#file");

  if (drop) {
    drop.ondragover = (event) => {
      event.preventDefault();
      drop.classList.add("hot");
    };

    drop.ondragleave = () => {
      drop.classList.remove("hot");
    };

    drop.ondrop = (event) => {
      event.preventDefault();
      drop.classList.remove("hot");

      const file = event.dataTransfer.files[0];
      if (file) take(file);
    };
  }

  if (input) {
    input.onchange = () => {
      const file = input.files[0];
      if (file) take(file);
    };
  }
}

/* =========================================================
   IMAGE UPLOAD
   ========================================================= */

async function take(file) {
  if (!file) return;

  const allowedExtensions = /\.(jpe?g|png|tiff?|webp|bmp)$/i;

  if (!allowedExtensions.test(file.name)) {
    alert("Unsupported file. Use JPG, JPEG, PNG, TIFF, WEBP, or BMP.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("The maximum upload size is 10 MB.");
    return;
  }

  const previousEvidence = S.evidence;

  const url = URL.createObjectURL(file);

  const dimensions = await new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      resolve([image.naturalWidth, image.naturalHeight]);
      //URL.revokeObjectURL(image.src);
    };

    image.onerror = () => {
      resolve(["—", "—"]);
      //URL.revokeObjectURL(image.src);
    };

    image.src = url;
  });

  S.evidence = {
    name: file.name,
    size: file.size,
    url,
    w: dimensions[0],
    h: dimensions[1],
    status: "Uploading…",
    file,
  };

  S.analysed = false;
  S.analysisResult = null;
  render();

  try {
    const uploadResult = await AnalysisService.uploadEvidence(file);

    S.evidence.status = "Received by Python backend";
    S.evidence.uploadResult = uploadResult;
    render();
  } catch (error) {
    console.error("IDEXIS upload failed:", error);

    S.evidence.status = "Upload failed";
    render();

    alert(`Image upload failed: ${error.message}`);
  }
}

/* =========================================================
   IMAGE ANALYSIS
   ========================================================= */

async function act(action) {
  if (action === "pick") {
    document.querySelector("#file")?.click();
    return;
  }

  if (action === "export") {
    const output = document.querySelector("#exp");

    if (output) {
      output.textContent =
        "Report export will be connected after the analysis report is implemented.";
    }

    return;
  }

  if (action !== "run") return;

  const file = S.evidence?.file;

  if (!file) {
    alert("Upload an image before running analysis.");
    return;
  }

  S.running = true;
  S.step = 0;
  render();

  try {
    const result = await AnalysisService.runAnalysis(file, (step) => {
      S.step = step;
      render();
    });

    S.analysisResult = result;
    S.classification = result.classification;
    S.metrics = result.metrics;

    S.heat = {
      imageUrl: result.maps.heatmap,
      regions: [],
    };

    S.cm = {
      matches: [],
      score: null,
      available: false,
      message: "Copy-move detection is not implemented yet.",
    };

    S.report = {
      assessment: result.classification?.status || result.status,
      classification: result.classification,
      overall: null,
      metrics: result.metrics,
      note: result.note,
    };

    S.running = false;
    S.analysed = true;

    go("tampering");
  } catch (error) {
    console.error("IDEXIS analysis failed:", error);

    S.running = false;
    render();

    alert(`Analysis failed: ${error.message}`);
  }
}

/* =========================================================
   NAVIGATION AND INITIALIZATION
   ========================================================= */

window.addEventListener("hashchange", () => {
  page = location.hash.slice(1) || "overview";
  render();
});

page = location.hash.slice(1) || "overview";

/* Keep the existing dataset view functional where possible. */
AnalysisService.getDataset()
  .then((dataset) => {
    S.ds = dataset;
    render();
  })
  .catch((error) => {
    console.warn("Dataset information unavailable:", error);
  });

render();
