
/*
 * IDEXIS — Analysis Service
 * Connects the existing frontend to the local Python backend.
 */

const CONFIG = {
  baseUrl: "http://127.0.0.1:8000/api",
};

let latestAnalysis = null;

const AnalysisService = {
  engineConnected: async () => {
    try {
      const response = await fetch(`${CONFIG.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  },

  async uploadEvidence(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${CONFIG.baseUrl}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: HTTP ${response.status}`);
    }

    return await response.json();
  },

  async runAnalysis(fileOrEvidence, onStep = () => {}) {
    if (!(fileOrEvidence instanceof File)) {
      throw new Error(
        "Analysis requires the selected image file. The UI must pass the File object to runAnalysis()."
      );
    }

    onStep(0);

    const formData = new FormData();
    formData.append("file", fileOrEvidence);

    const response = await fetch(`${CONFIG.baseUrl}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Analysis failed: HTTP ${response.status} — ${errorText}`
      );
    }

    latestAnalysis = await response.json();
    onStep(1);

    return latestAnalysis;
  },

  async getAnalysisStatus() {
    return latestAnalysis
      ? { state: "complete" }
      : { state: "not_started" };
  },

  async getMetrics() {
    if (!latestAnalysis) {
      throw new Error("Run an image analysis first.");
    }

    return latestAnalysis.metrics;
  },

  async getELAResult() {
    if (!latestAnalysis) throw new Error("Run an image analysis first.");

    return {
      mapUrl: latestAnalysis.maps.ela,
      score: latestAnalysis.metrics.elaMean,
    };
  },

  async getNoiseResult() {
    if (!latestAnalysis) throw new Error("Run an image analysis first.");

    return {
      mapUrl: latestAnalysis.maps.noise,
      score: latestAnalysis.metrics.noiseMean,
    };
  },

  async getFFTResult() {
    if (!latestAnalysis) throw new Error("Run an image analysis first.");

    return {
      mapUrl: latestAnalysis.maps.frequency,
      score: latestAnalysis.metrics.frequencyMean,
    };
  },

  async getCopyMoveResult() {
    return {
      matches: [],
      score: null,
      available: false,
      message: "Copy-move detection is not implemented yet.",
    };
  },

  async getHeatmap() {
    if (!latestAnalysis) throw new Error("Run an image analysis first.");

    return {
      imageUrl: latestAnalysis.maps.heatmap,
      regions: [],
    };
  },

  async getForensicReport() {
    if (!latestAnalysis) throw new Error("Run an image analysis first.");

    return {
      assessment: latestAnalysis.status,
      overall: null,
      metrics: latestAnalysis.metrics,
      note: latestAnalysis.note,
    };
  },

  async getDataset() {
    return {
      summary: null,
      rows: [],
      available: false,
      message: "Dataset statistics endpoint is not implemented yet.",
    };
  },
};
