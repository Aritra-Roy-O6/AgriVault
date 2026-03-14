"""
Agri-Vault - ML Microservice (Flask)
Exposes two endpoints consumed by the Node.js backend:
  POST /grade      - Run YOLOv8 + OpenCV grading on uploaded image
  POST /receipt    - Generate PDF quality receipt from grading result
"""

import io
import logging
import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

from grading_engine import ProduceGradingEngine, GradingResult
from receipt_generator import ReceiptGenerator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("ml_service")

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

grading_engine = ProduceGradingEngine()
receipt_generator = ReceiptGenerator()

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_PRODUCE = {"wheat", "rice", "maize", "sorghum", "pulse"}


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "agrivault-ml",
        "model": "YOLOv8 + OpenCV (BIS IS 4333)",
        "model_loaded": grading_engine.model is not None,
        "model_path": grading_engine.MODEL_PATH,
    })


@app.route("/grade", methods=["POST"])
def grade_produce():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Key must be 'image'."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"Unsupported format: {ext}. Use JPEG/PNG."}), 415

    produce_type = request.form.get("produce_type", "wheat").lower().strip()
    if produce_type not in ALLOWED_PRODUCE:
        logger.warning("Unknown produce '%s' - defaulting to wheat.", produce_type)
        produce_type = "wheat"

    image_bytes = file.read()
    if len(image_bytes) < 1024:
        return jsonify({"error": "Image too small or corrupted."}), 400

    logger.info("Grading request: produce=%s, size=%s bytes", produce_type, len(image_bytes))
    result: GradingResult = grading_engine.grade(image_bytes, produce_type)

    if result.error:
        logger.error("Grading error: %s", result.error)
        return jsonify({"error": result.error, "details": "ML pipeline failure."}), 500
    response_payload = {
        "produce_type": result.produce_type,
        "grade": result.grade,
        "confidence": result.confidence,
        "defect_percentage": result.defect_percentage,
        "estimated_moisture_pct": result.estimated_moisture_pct,
        "foreign_matter_pct": result.foreign_matter_pct,
        "color_uniformity_score": result.color_uniformity_score,
        "size_uniformity_score": result.size_uniformity_score,
        "overall_quality_score": result.overall_quality_score,
        "detected_defects": result.detected_defects,
        "price_per_quintal": result.price_per_quintal,
        "standard_reference": result.standard_reference,
        "annotated_image_b64": result.annotated_image_b64
        if request.form.get("include_annotated_image") == "true"
        else None,
    }

    logger.info(
        "Grade assigned: %s | Quality: %s/100 | Price/quintal: Rs %s",
        result.grade,
        result.overall_quality_score,
        result.price_per_quintal,
    )
    return jsonify(response_payload), 200


@app.route("/receipt", methods=["POST"])
def generate_receipt():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "JSON body required."}), 400

    required_keys = ["grading_result", "farmer_info", "warehouse_info", "booking_info"]
    missing = [key for key in required_keys if key not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    gr_data = body["grading_result"]
    gr = GradingResult(
        produce_type=gr_data.get("produce_type", "unknown"),
        grade=gr_data.get("grade", "Ungraded"),
        confidence=gr_data.get("confidence", 0.0),
        defect_percentage=gr_data.get("defect_percentage", 0.0),
        estimated_moisture_pct=gr_data.get("estimated_moisture_pct", 0.0),
        foreign_matter_pct=gr_data.get("foreign_matter_pct", 0.0),
        color_uniformity_score=gr_data.get("color_uniformity_score", 0.0),
        size_uniformity_score=gr_data.get("size_uniformity_score", 0.0),
        overall_quality_score=gr_data.get("overall_quality_score", 0.0),
        detected_defects=gr_data.get("detected_defects", []),
        price_per_quintal=gr_data.get("price_per_quintal", 0.0),
    )

    logger.info(
        "Receipt generation: booking=%s | grade=%s",
        body["booking_info"].get("booking_id"),
        gr.grade,
    )

    pdf_bytes = receipt_generator.generate(
        grading_result=gr,
        farmer_info=body["farmer_info"],
        warehouse_info=body["warehouse_info"],
        booking_info=body["booking_info"],
    )

    booking_id = body["booking_info"].get("booking_id", "receipt")
    filename = f"AgriVault_QualityReceipt_{booking_id}.pdf"

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "Image exceeds 16 MB limit."}), 413


@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error.", "details": str(error)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("ML_SERVICE_PORT", 5001))
    debug = os.environ.get("FLASK_ENV") == "development"
    logger.info("Agri-Vault ML Service starting on port %s", port)
    app.run(host="0.0.0.0", port=port, debug=debug)

