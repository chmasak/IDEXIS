
from io import BytesIO
from pathlib import Path
import base64

import joblib
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, sobel
from scipy.fft import fft2, fftshift


# ============================================================
# IDEXIS CLASSIFIER
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "idexis_classifier.joblib"

_classifier_artifact = None


def load_classifier():
    """Load the saved classifier once, when first needed."""
    global _classifier_artifact

    if _classifier_artifact is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(
                f"IDEXIS classifier not found: {MODEL_PATH}. "
                "Run train_classifier.py first."
            )

        _classifier_artifact = joblib.load(MODEL_PATH)

        required_keys = {"model", "feature_names"}
        if not required_keys.issubset(_classifier_artifact):
            _classifier_artifact = None
            raise ValueError(
                "The saved classifier is missing required metadata."
            )

        expected_features = [
            "elaMean",
            "elaMax",
            "noiseMean",
            "noiseMax",
            "edgeDensity",
            "frequencyMean",
            "frequencyMax",
            "fusionMean",
            "fusionP95",
        ]

        if _classifier_artifact["feature_names"] != expected_features:
            _classifier_artifact = None
            raise ValueError(
                "Classifier feature order does not match the "
                "current IDEXIS analysis pipeline."
            )

    return _classifier_artifact


# ============================================================
# IMAGE UTILITIES
# ============================================================

def normalize_map(array: np.ndarray) -> np.ndarray:
    """Normalize an array to 0–1 safely."""
    array = np.asarray(array, dtype=np.float32)

    minimum = float(np.min(array))
    maximum = float(np.max(array))

    if maximum - minimum < 1e-12:
        return np.zeros_like(array, dtype=np.float32)

    return (array - minimum) / (maximum - minimum)


def encode_map_png(array: np.ndarray) -> str:
    """Encode a normalized evidence map as a base64 PNG data URL."""
    image_array = (
        np.clip(array, 0, 1) * 255
    ).astype(np.uint8)

    buffer = BytesIO()
    Image.fromarray(image_array).save(buffer, format="PNG")

    encoded = base64.b64encode(
        buffer.getvalue()
    ).decode("ascii")

    return f"data:image/png;base64,{encoded}"


# ============================================================
# MAIN FORENSIC ANALYSIS
# ============================================================

def analyze_image(image_bytes: bytes) -> dict:
    """
    Analyze an uploaded image and classify it using the
    experimental IDEXIS model.

    Results are forensic indicators, not proof of authenticity.
    """

    # 1. Decode and normalize to RGB.
    with Image.open(BytesIO(image_bytes)) as source:
        rgb_image = source.convert("RGB")
        rgb = np.asarray(rgb_image, dtype=np.uint8)

    # 2. Convert to grayscale.
    gray = (
        0.299 * rgb[:, :, 0]
        + 0.587 * rgb[:, :, 1]
        + 0.114 * rgb[:, :, 2]
    ).astype(np.float32) / 255.0

    # 3. Error Level Analysis (ELA).
    buffer = BytesIO()

    Image.fromarray(rgb).save(
        buffer,
        format="JPEG",
        quality=90,
    )
    buffer.seek(0)

    with Image.open(buffer) as compressed_image:
        recompressed = np.asarray(
            compressed_image.convert("RGB"),
            dtype=np.uint8,
        )

    difference = np.abs(
        rgb.astype(np.int16)
        - recompressed.astype(np.int16)
    ).astype(np.float32)

    ela_gray = (
        0.299 * difference[:, :, 0]
        + 0.587 * difference[:, :, 1]
        + 0.114 * difference[:, :, 2]
    )

    ela_mean = float(np.mean(ela_gray))
    ela_max = float(np.max(ela_gray))
    ela_map = normalize_map(ela_gray)

    # 4. Noise residual analysis.
    smoothed = gaussian_filter(gray, sigma=2)
    residual = gray - smoothed
    noise_magnitude = np.abs(residual)

    noise_mean = float(np.mean(noise_magnitude))
    noise_max = float(np.max(noise_magnitude))
    noise_map = normalize_map(noise_magnitude)

    # 5. Edge analysis using Sobel gradients.
    grad_x = sobel(gray, axis=1)
    grad_y = sobel(gray, axis=0)
    edge_strength = np.hypot(grad_x, grad_y)

    edge_threshold = float(np.mean(edge_strength))
    edge_mask = edge_strength > edge_threshold
    edge_density = float(np.mean(edge_mask))
    edge_map = normalize_map(edge_strength)

    # 6. Frequency analysis.
    spectrum = fftshift(fft2(gray))
    log_magnitude = np.log1p(np.abs(spectrum))
    frequency_map = normalize_map(log_magnitude)

    frequency_mean = float(np.mean(log_magnitude))
    frequency_max = float(np.max(log_magnitude))

    # 7. Fuse evidence maps.
    fused_map = (
        0.35 * ela_map
        + 0.25 * noise_map
        + 0.20 * edge_map
        + 0.20 * frequency_map
    )

    heatmap = normalize_map(fused_map)

    fusion_mean = float(np.mean(fused_map))
    fusion_p95 = float(np.percentile(fused_map, 95))

    # 8. Build features in exactly the training order.
    feature_names = [
        "elaMean",
        "elaMax",
        "noiseMean",
        "noiseMax",
        "edgeDensity",
        "frequencyMean",
        "frequencyMax",
        "fusionMean",
        "fusionP95",
    ]

    feature_values = [
        ela_mean,
        ela_max,
        noise_mean,
        noise_max,
        edge_density,
        frequency_mean,
        frequency_max,
        fusion_mean,
        fusion_p95,
    ]

    # 9. Predict with the trained Python classifier.
    artifact = load_classifier()
    model = artifact["model"]

    if artifact["feature_names"] != feature_names:
        raise ValueError(
            "Feature order differs from the saved model."
        )

    feature_vector = np.asarray(
        [feature_values],
        dtype=np.float64,
    )

    predicted_label = int(model.predict(feature_vector)[0])
    class_probabilities = model.predict_proba(feature_vector)[0]

    classes = list(model.classes_)
    class_probability_map = {
        int(label): float(probability)
        for label, probability in zip(
            classes,
            class_probabilities,
        )
    }

    if predicted_label == 0:
        predicted_class = "Original-like"
        review_status = "CONSISTENT_WITH_REFERENCE_DATA"
    else:
        predicted_class = "Edited-like"
        review_status = "FLAGGED_FOR_REVIEW"

    # These are model scores, not calibrated probabilities
    # of document authenticity or forgery.
    model_scores = {
        "originalLike": class_probability_map.get(0, 0.0),
        "editedLike": class_probability_map.get(1, 0.0),
    }

    # 10. Return metrics, evidence maps, and classifier output.
    return {
        "image": {
            "width": int(rgb.shape[1]),
            "height": int(rgb.shape[0]),
        },

        "metrics": {
            "elaMean": ela_mean,
            "elaMax": ela_max,
            "noiseMean": noise_mean,
            "noiseMax": noise_max,
            "edgeDensity": edge_density,
            "frequencyMean": frequency_mean,
            "frequencyMax": frequency_max,
            "fusionMean": fusion_mean,
            "fusionP95": fusion_p95,
        },

        "classification": {
            "label": predicted_label,
            "class": predicted_class,
            "status": review_status,
            "modelScores": model_scores,
            "note": (
                "Experimental dataset-trained classifier. "
                "Scores are not calibrated authenticity "
                "probabilities and do not prove forgery."
            ),
        },

        "maps": {
            "ela": encode_map_png(ela_map),
            "noise": encode_map_png(noise_map),
            "edges": encode_map_png(edge_map),
            "frequency": encode_map_png(frequency_map),
            "heatmap": encode_map_png(heatmap),
        },

        "status": "ANALYSIS_COMPLETE",

        "note": (
            "Experimental image-forensics evidence only. "
            "The classification and metrics do not establish "
            "whether an identity document is authentic."
        ),
    }
