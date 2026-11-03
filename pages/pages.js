
/* =========================================================
   IDEXIS — Pages
   Connected to the Python image-analysis backend.
   ========================================================= */

const Pages = {
  /* -------------------------------------------------------
     OVERVIEW
     ------------------------------------------------------- */
  overview() {
    const metrics = S.metrics || MOCK.metrics;
    const currentCase = MOCK.case;

    return `
      <h1>Overview</h1>
      <p class="lede">
        Case summary and forensic findings. Metrics indicate visual
        characteristics for analyst review, not definitive authenticity.
      </p>

      <h2>Current case</h2>

      <div class="row g4">
        ${Stat(
          "Case ID",
          `<span class="mono" style="font-size:16px;color:var(--ink)">
            ${currentCase.caseId}
          </span>`
        )}

        ${Stat(
          "Evidence",
          `<span class="mono" style="font-size:16px;color:var(--ink)">
            ${S.evidence?.name || "—"}
          </span>`
        )}

        ${Stat(
          "Image",
          `<span style="font-size:16px">
            ${S.evidence?.name || "None uploaded"}
          </span>`
        )}

        ${Stat(
          "Status",
          `<span style="font-size:20px">
            ${
              S.running
                ? "Analysing"
                : S.analysisResult
                  ? "Analysis complete"
                  : S.evidence
                    ? "Ready for analysis"
                    : "Awaiting evidence"
            }
          </span>`
        )}
      </div>

      <p class="note mono">${new Date().toLocaleString()}</p>

      <section>
        <h2>Analysis overview</h2>

        ${
          S.analysisResult
            ? `
              <div class="row g3">
                ${[
                  ["ELA mean", S.metrics?.elaMean],
                  ["Noise mean", S.metrics?.noiseMean],
                  ["Edge density", S.metrics?.edgeDensity],
                  ["Frequency mean", S.metrics?.frequencyMean],
                  ["Fusion mean", S.metrics?.fusionMean],
                  ["Fusion P95", S.metrics?.fusionP95]
                ].map(([label, value]) =>
                  Stat(
                    label,
                    Number.isFinite(Number(value))
                      ? Number(value).toFixed(4)
                      : "—"
                  )
                ).join("")}
              </div>

              <p class="note">
                Measurements returned by the Python image-analysis pipeline.
              </p>
            `
            : `
              <p class="note">
                Upload an image and run analysis to display measured results.
              </p>
            `
        }
      </section>

      <section>
        ${
          S.evidence
            ? `<button class="btn" data-act="run">Run analysis</button>`
            : `<button class="btn" data-go="evidence">Add evidence</button>`
        }
      </section>
    `;
  },

  /* -------------------------------------------------------
     EVIDENCE
     ------------------------------------------------------- */
  evidence() {
    const evidence = S.evidence;

    return `
      <h1>Evidence</h1>
      <p class="lede">
        Upload an identity-document image to begin an examination.
      </p>

      <div class="drop" id="drop">
        <h2>Upload evidence</h2>
        <p>Drop an identity-document image here or browse your files.</p>

        <input
          type="file"
          id="file"
          accept=".jpg,.jpeg,.png,.tif,.tiff,.webp,.bmp"
          hidden
        >

        <button class="btn" data-act="pick">Select evidence</button>

        <div class="note mono" style="margin-top:18px">
          JPG · JPEG · PNG · TIFF · WEBP · BMP
        </div>
      </div>

      ${
        evidence
          ? `
            <section>
              <div class="row g2" style="grid-template-columns:1.4fr 1fr">
                <div style="padding:0">
                  ${
                    evidence.url
                      ? `
                        <img
                          src="${evidence.url}"
                          alt="Uploaded identity document"
                          style="display:block;width:100%;height:auto;max-height:520px;object-fit:contain;border:1px solid var(--line)"
                        >
                      `
                      : `<div class="stage">Image preview unavailable</div>`
                  }
                </div>

                <div>
                  <div class="k">Filename</div>
                  <div style="margin-bottom:14px;overflow-wrap:anywhere">
                    ${evidence.name}
                  </div>

                  <div class="k">Dimensions</div>
                  <div class="mono" style="color:var(--ink);margin-bottom:14px">
                    ${evidence.w} × ${evidence.h} px
                  </div>

                  <div class="k">File size</div>
                  <div class="mono" style="color:var(--ink);margin-bottom:14px">
                    ${(evidence.size / 1024).toFixed(1)} KB
                  </div>

                  <div class="k">Upload status</div>
                  <div style="margin-bottom:22px">
                    ${evidence.status || "Ready"}
                  </div>

                  <button
                    class="btn"
                    data-act="run"
                    ${S.running ? "disabled" : ""}
                  >
                    ${S.running ? "Analysing…" : "Run analysis"}
                  </button>
                </div>
              </div>
            </section>
          `
          : ""
      }
    `;
  },

  /* -------------------------------------------------------
     IMAGE ANALYSIS
     ------------------------------------------------------- */
  analysis() {
    const tabs = [
      ["original", "Original"],
      ["enhanced", "Enhanced"],
      ["edge", "Edge map"],
      ["ela", "ELA map"],
      ["noise", "Noise map"],
      ["fft", "Frequency spectrum"]
    ];

    const result = S.analysisResult;
    const maps = result?.maps || {};

    const mapByView = {
      ela: maps.ela,
      noise: maps.noise,
      edge: maps.edges,
      fft: maps.frequency,
      enhanced: maps.heatmap
    };

    const selectedMap = mapByView[S.view];

    const currentImage =
      S.view === "original"
         ? (S.evidence?.url || null)
         : (selectedMap || null);

    const imageMarkup = currentImage
      ? `
        <div class="stage" style="min-height:320px;display:grid;place-items:center">
          <img
            src="${currentImage}"
            alt="${S.view} analysis"
            style="display:block;width:100%;height:100%;max-height:560px;object-fit:contain"
          >
        </div>
      `
      : `
        <div class="stage" style="min-height:320px;display:grid;place-items:center">
          <p class="note">
            ${
              result
                ? "This visualization is not available."
                : "Upload an image and run analysis to view the results."
            }
          </p>
        </div>
      `;

    const comparisons = [
      ["enhanced", "Fused evidence heatmap"],
      ["ela", "Error Level Analysis"]
    ];

    return `
      <h1>Image analysis</h1>
      <p class="lede">
        Inspect the original image and the evidence maps generated by the
        Python processing pipeline.
      </p>

      <div class="tabs">
        ${tabs.map(([key, label]) => `
          <button
            class="tab ${S.view === key ? "on" : ""}"
            data-view="${key}"
          >
            ${label}
          </button>
        `).join("")}
      </div>

      ${imageMarkup}

      <p class="note mono">
        Source: ${S.view}
      </p>

      <section>
        <h2>Compare evidence maps</h2>

        <div class="row g2" style="grid-template-columns:1fr 1fr">
          ${comparisons.map(([key, label]) => {
            const src = mapByView[key];

            return `
              <div style="padding:0">
                <h3>${label}</h3>

                ${
                  src
                    ? `
                      <img
                        src="${src}"
                        alt="${label}"
                        style="display:block;width:100%;height:auto;max-height:400px;object-fit:contain;border:1px solid var(--line)"
                      >
                    `
                    : `
                      <div class="stage" style="min-height:220px">
                        <p class="note">Run analysis to generate this map.</p>
                      </div>
                    `
                }
              </div>
            `;
          }).join("")}
        </div>

        <p class="note">
          ELA and fused maps highlight image characteristics for review.
          Highlighted areas are not proof of manipulation.
        </p>
      </section>
    `;
  },

  /* -------------------------------------------------------
     TAMPERING ANALYSIS
     ------------------------------------------------------- */
  
tampering() {
    const result = S.analysisResult;
    const metrics = result?.metrics || S.metrics || {};
    const heatmap = result?.maps?.heatmap || S.heat?.imageUrl || null;
    const classification = result?.classification || S.classification || null;

    const metricCards = [
      ["ELA mean error", metrics.elaMean],
      ["ELA maximum", metrics.elaMax],
      ["Noise mean", metrics.noiseMean],
      ["Noise maximum", metrics.noiseMax],
      ["Edge density", metrics.edgeDensity],
      ["Frequency mean", metrics.frequencyMean],
      ["Frequency maximum", metrics.frequencyMax],
      ["Fusion mean", metrics.fusionMean],
      ["Fusion P95", metrics.fusionP95]
    ];

    const formatMetric = value =>
      value !== undefined && value !== null && Number.isFinite(Number(value))
        ? Number(value).toFixed(4)
        : "—";

    const scores = classification?.modelScores || {};

const verdict =
  typeof classification?.class === "string"
    ? classification.class
    : classification?.label === 1
      ? "Edited-like"
      : classification?.label === 0
        ? "Original-like"
        : "Not available";

const isEdited = verdict === "Edited-like";

const reviewStatus =
  classification?.status || "NOT_ASSESSED";

    const classificationPanel = classification
      ? `
        <section>
          <h2>Classification result</h2>
          <div class="card" style="padding:24px;border:1px solid ${isEdited ? "#c65b5b" : "#7c9b83"}">
            <p class="note">Experimental classifier assessment</p>
            <h3 style="font-size:30px;margin:8px 0">
              ${verdict}
            </h3>
            <p>
              Review status:
              <strong>${reviewStatus}</strong>
            </p>

            <div class="row g3" style="margin-top:16px">
              ${Object.entries(scores).map(([name, score]) => `
                <div class="card" style="padding:14px">
                  <p class="note">${name.replace(/_/g, " ")}</p>
                  <strong>${formatMetric(score)}</strong>
                </div>
              `).join("")}
            </div>

            <p class="note" style="margin-top:16px">
              ${classification.note || "Experimental dataset-trained classifier. Results do not prove authenticity or forgery."}
            </p>
          </div>
        </section>
      `
      : `
        <section>
          <h2>Classification result</h2>
          <p class="note">
            No classifier result is available. Run the analysis to obtain a prediction.
          </p>
        </section>
      `;

    return `
      <h1>Tampering analysis</h1>

      <p class="lede">
        Review image-forensics measurements, the classifier assessment,
        and the fused evidence map. This experimental system does not
        independently establish whether an identity document is genuine or forged.
      </p>

      ${
        heatmap
          ? `
            <div class="stage" style="aspect-ratio:16/9;position:relative">
              <img
                src="${heatmap}"
                alt="Fused forensic evidence heatmap"
                style="display:block;width:100%;height:100%;object-fit:contain"
              >
            </div>
          `
          : `
            <div class="stage" style="aspect-ratio:16/9;display:grid;place-items:center">
              <p class="note">Run analysis to generate the evidence heatmap.</p>
            </div>
          `
      }

      <div class="row g3" style="margin-top:24px">
        ${Stat("Analysis status", result ? "Complete" : "Not run")}
        ${Stat("Classifier result", verdict)}
        ${Stat("Copy-move detection", "Not implemented")}
      </div>

      ${classificationPanel}

      <section>
        <h2>Forensic metrics</h2>

        <div class="row g3">
          ${metricCards.map(([label, value]) =>
            Stat(label, formatMetric(value))
          ).join("")}
        </div>

        <p class="note">
          Metrics describe image characteristics. Model scores are not
          calibrated authenticity probabilities. Region localization and
          copy-move detection are not currently implemented.
        </p>
      </section>

      <section>
        <h2>Interpretation</h2>

        <p>
          ${
            result
              ? classification
                ? `The classifier assessed this image as "${verdict}". Review the original image, individual evidence maps, and measurements together.`
                : "The processing pipeline completed, but no classifier result was returned."
              : "No analysis result is available yet."
          }
        </p>

        <p class="note">
          ${result?.note || "Experimental evidence only; not proof of authenticity."}
        </p>
      </section>
    `;
  },


  /* -------------------------------------------------------
     DATASET
     ------------------------------------------------------- */
  dataset() {
    const dataset = S.ds || {
      summary: MOCK.dataset,
      rows: MOCK.rows
    };

    const summary = dataset.summary || {};
    const rows = (dataset.rows || []).filter((row) =>
      (S.f === "All" || row.label === S.f) &&
      `${row.id}${row.type}`.toLowerCase().includes(S.q.toLowerCase())
    );

    const total = Number(summary.total) || 0;
    const processed = Number(summary.processed) || 0;
    const genuine = Number(summary.genuine) || 0;
    const manipulated = Number(summary.manipulated) || 0;
    const progress = total ? Math.min(100, processed / total * 100) : 0;

    return `
      <h1>Dataset</h1>
      <p class="lede">
        Browse dataset statistics when a dataset service is configured.
      </p>

      <div class="row g4">
        ${Stat("Total images", total.toLocaleString())}
        ${Stat("Processed", processed.toLocaleString())}
        ${Stat("Genuine", genuine.toLocaleString())}
        ${Stat("Manipulated", manipulated.toLocaleString())}
      </div>

      <div class="bar">
        <i style="width:${progress}%"></i>
      </div>

      <p class="note mono">
        ${progress.toFixed(1)}% processed
      </p>

      <section style="display:flex;gap:12px;flex-wrap:wrap">
        <input id="q" placeholder="Search dataset…" value="${S.q}">
        <select id="f">
          ${["All", "Genuine", "Manipulated"].map((option) => `
            <option ${option === S.f ? "selected" : ""}>${option}</option>
          `).join("")}
        </select>
      </section>

      <table style="margin-top:16px">
        <tr>
          <th>Image</th>
          <th>Type</th>
          <th>Label</th>
          <th>Anomaly score</th>
          <th>Status</th>
        </tr>

        ${
          rows.length
            ? rows.slice(0, 15).map((row) => `
                <tr>
                  <td class="mono">${row.id}</td>
                  <td>${row.type}</td>
                  <td>${row.label}</td>
                  <td>
                    ${
                      row.score !== undefined && row.score !== null
                        ? Number(row.score).toFixed(4)
                        : "—"
                    }
                  </td>
                  <td class="k">${row.status || "—"}</td>
                </tr>
              `).join("")
            : `
              <tr>
                <td colspan="5" class="k">
                  Dataset statistics are not connected yet.
                </td>
              </tr>
            `
        }
      </table>
    `;
  },

  /* -------------------------------------------------------
     REPORTS
     ------------------------------------------------------- */
  reports() {
    const result = S.analysisResult;
    const metrics = result?.metrics || {};
    const evidence = S.evidence;

    const labels = {
      elaMean: "ELA mean error",
      elaMax: "ELA maximum error",
      noiseMean: "Noise mean",
      noiseMax: "Noise maximum",
      edgeDensity: "Edge density",
      frequencyMean: "Frequency mean",
      frequencyMax: "Frequency maximum",
      fusionMean: "Fusion mean",
      fusionP95: "Fusion 95th percentile"
    };

    return `
      <h1>Reports</h1>
      <p class="lede">
        Summary of the current image examination.
      </p>

      <div class="paper">
        <h1>IDEXIS FORENSIC ANALYSIS</h1>

        <div style="height:24px"></div>

        <dl>
          <dt>Case ID</dt>
          <dd>${MOCK.case.caseId}</dd>

          <dt>Image</dt>
          <dd>${evidence?.name || "No image uploaded"}</dd>

          <dt>Dimensions</dt>
          <dd>
            ${
              evidence
                ? `${evidence.w} × ${evidence.h} pixels`
                : "—"
            }
          </dd>

          <dt>Analysis status</dt>
          <dd>${result?.status || "Not run"}</dd>

          ${Object.entries(labels).map(([key, label]) => `
            <dt>${label}</dt>
            <dd>
              ${
                metrics[key] !== undefined
                  ? Number(metrics[key]).toFixed(4)
                  : "—"
              }
            </dd>
          `).join("")}
        </dl>

        <div class="verdict">
          ${result ? "Analysis complete — review required" : "Awaiting analysis"}
        </div>

        <p style="font-size:12px;color:#6b665c">
          ${
            result?.note ||
            "This report is an experimental image-analysis aid and does not establish document authenticity."
          }
        </p>
      </div>

      <section>
        <button class="btn" data-act="export">Export report</button>
        <span class="note" id="exp"></span>
      </section>
    `;
  },

  /* -------------------------------------------------------
     SETTINGS
     ------------------------------------------------------- */
  settings() {
    return `
      <h1>Settings</h1>
      <p class="lede">
        Backend connection and analysis configuration.
      </p>

      <div class="row g2">
        <div>
          <div class="k">Python API URL</div>
          <div class="mono" style="color:var(--ink)">
            http://127.0.0.1:8000/api
          </div>
        </div>

        <div>
          <div class="k">Analysis mode</div>
          <div>Python image-processing pipeline</div>
        </div>
      </div>

      <p class="note">
        Classifier integration and dataset-statistics endpoints are not
        connected yet. Evidence metrics should be interpreted as experimental.
      </p>
    `;
  }
};

/* Navigation entries used by app/main.js */
const NAV = [
  ["overview", "Overview"],
  ["evidence", "Evidence"],
  ["analysis", "Image analysis"],
  ["tampering", "Tampering analysis"],
  ["dataset", "Dataset"],
  ["reports", "Reports"],
  ["settings", "Settings"]
];
