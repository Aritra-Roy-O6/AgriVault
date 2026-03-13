"""
Agri-Vault — Digital Quality Receipt Generator
Produces a BIS IS 4333–compliant, digitally signed PDF
that is accepted as collateral (NWR) by NBFC partners.
"""

import io
import hashlib
import hmac
import base64
import json
from datetime import datetime, timezone
from dataclasses import asdict

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.platypus.flowables import Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from qrcode import QRCode, constants
import os

# ── Brand colours (Agri-Vault green palette) ──
DARK_GREEN   = colors.HexColor("#1B5E20")
MID_GREEN    = colors.HexColor("#2E7D32")
LIGHT_GREEN  = colors.HexColor("#E8F5E9")
ACCENT_GREEN = colors.HexColor("#4CAF50")
TEXT_DARK    = colors.HexColor("#212121")
TEXT_GRAY    = colors.HexColor("#616161")
BORDER_GRAY  = colors.HexColor("#BDBDBD")
WHITE        = colors.white

SIGNING_SECRET = os.environ.get("RECEIPT_SIGNING_SECRET", "agrivault-dev-secret-2024")


class ReceiptGenerator:
    """
    Generates a tamper-evident PDF quality receipt.

    The receipt includes:
      - Farmer & warehouse metadata
      - Full BIS IS 4333 grading breakdown
      - HMAC-SHA256 digital signature (verifiable via QR)
      - QR code linking to the online verification portal
    """

    PORTAL_VERIFY_URL = os.environ.get("VERIFY_PORTAL_URL", "https://agrivault.in/verify")

    def generate(
        self,
        grading_result,        # GradingResult dataclass from grading_engine
        farmer_info: dict,     # {name, aadhaar_last4, phone, village, district, state}
        warehouse_info: dict,  # {owner_name, address, vault_id, aadhaar_verified}
        booking_info: dict,    # {booking_id, quantity_quintals, crop_season, deposit_date}
    ) -> bytes:
        """
        Build and return the PDF as raw bytes.
        """
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=15 * mm,
            bottomMargin=15 * mm,
            leftMargin=15 * mm,
            rightMargin=15 * mm,
        )

        receipt_id = self._generate_receipt_id(booking_info["booking_id"])
        issued_at  = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
        signature  = self._sign_receipt(grading_result, farmer_info, booking_info, receipt_id)
        qr_image   = self._build_qr(receipt_id, signature)

        styles = self._build_styles()
        story  = []

        story += self._header(styles, receipt_id, issued_at)
        story.append(Spacer(1, 4 * mm))
        story += self._parties_section(styles, farmer_info, warehouse_info)
        story.append(Spacer(1, 4 * mm))
        story += self._grading_section(styles, grading_result)
        story.append(Spacer(1, 4 * mm))
        story += self._booking_section(styles, booking_info, grading_result)
        story.append(Spacer(1, 4 * mm))
        story += self._credit_eligibility_section(styles, grading_result, booking_info)
        story.append(Spacer(1, 6 * mm))
        story += self._signature_footer(styles, receipt_id, signature, qr_image, issued_at)

        doc.build(story)
        return buffer.getvalue()

    # ───────────────────────── Sections ──────────────────────────

    def _header(self, styles, receipt_id, issued_at):
        elems = []

        title = Paragraph(
            "<font color='#1B5E20'><b>AGRI-VAULT</b></font> "
            "<font color='#616161'>Digital Quality Receipt</font>",
            styles["Title"],
        )
        elems.append(title)

        subtitle = Paragraph(
            "Decentralized Micro-Warehousing &amp; AI Quality Grading Platform",
            styles["Subtitle"],
        )
        elems.append(subtitle)
        elems.append(HRFlowable(width="100%", thickness=2, color=DARK_GREEN, spaceAfter=4 * mm))

        meta_data = [
            [
                Paragraph(f"<b>Receipt ID:</b> {receipt_id}", styles["MetaLeft"]),
                Paragraph(f"<b>Issued:</b> {issued_at}", styles["MetaRight"]),
            ],
            [
                Paragraph("<b>Standard:</b> BIS IS 4333 (Food Grains)", styles["MetaLeft"]),
                Paragraph("<b>Status:</b> <font color='#2E7D32'>✓ AI Verified</font>", styles["MetaRight"]),
            ],
        ]
        meta_table = Table(meta_data, colWidths=["60%", "40%"])
        meta_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        elems.append(meta_table)
        return elems

    def _parties_section(self, styles, farmer_info, warehouse_info):
        elems = [Paragraph("PARTIES", styles["SectionHeader"])]

        data = [
            [
                self._info_card("FARMER", [
                    ("Name",     farmer_info.get("name", "—")),
                    ("Aadhaar",  f"XXXX-XXXX-{farmer_info.get('aadhaar_last4', '????')}"),
                    ("Phone",    farmer_info.get("phone", "—")),
                    ("Village",  farmer_info.get("village", "—")),
                    ("District", farmer_info.get("district", "—")),
                    ("State",    farmer_info.get("state", "—")),
                ], styles),
                self._info_card("MICRO-WAREHOUSE", [
                    ("Owner",      warehouse_info.get("owner_name", "—")),
                    ("Vault ID",   warehouse_info.get("vault_id", "—")),
                    ("Address",    warehouse_info.get("address", "—")),
                    ("Verified",   "✓ Aadhaar + Property Docs" if warehouse_info.get("aadhaar_verified") else "Pending"),
                    ("Guardian",   warehouse_info.get("guardian_name", "Assigned")),
                    ("Insurance",  "PMFBY Micro-Cover Included"),
                ], styles),
            ]
        ]
        t = Table(data, colWidths=["50%", "50%"])
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (0, -1), 3 * mm),
            ("RIGHTPADDING", (1, 0), (1, -1), 0),
        ]))
        elems.append(t)
        return elems

    def _grading_section(self, styles, gr):
        elems = [Paragraph("AI QUALITY GRADING — BIS IS 4333", styles["SectionHeader"])]

        grade_color = {
            "Grade A": "#2E7D32",
            "Grade B": "#1565C0",
            "Grade C": "#E65100",
            "Substandard": "#B71C1C",
            "Ungraded": "#616161",
        }.get(gr.grade, "#616161")

        grade_badge = Paragraph(
            f"<font size='22' color='{grade_color}'><b>{gr.grade}</b></font><br/>"
            f"<font size='9' color='#616161'>Overall Quality Score: {gr.overall_quality_score}/100</font>",
            styles["Center"],
        )

        metrics = [
            ["Metric",                  "Measured Value",           "BIS IS 4333 Limit"],
            ["Produce Type",            gr.produce_type.title(),     "—"],
            ["AI Confidence",           f"{gr.confidence * 100:.1f}%", "≥ 70%"],
            ["Defect Percentage",       f"{gr.defect_percentage:.2f}%", "≤ 6% (Grade C)"],
            ["Estimated Moisture",      f"{gr.estimated_moisture_pct:.1f}%", "≤ 14% (Grade A/B)"],
            ["Foreign Matter",          f"{gr.foreign_matter_pct:.2f}%", "≤ 2% (Grade C)"],
            ["Color Uniformity",        f"{gr.color_uniformity_score:.1f}/100", "—"],
            ["Size Uniformity",         f"{gr.size_uniformity_score:.1f}/100", "—"],
        ]

        col_w = ["45%", "27.5%", "27.5%"]
        metrics_table = Table(metrics, colWidths=col_w)
        metrics_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  DARK_GREEN),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
            ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, 0),  9),
            ("BACKGROUND",    (0, 1), (-1, -1), LIGHT_GREEN),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT_GREEN]),
            ("FONTSIZE",      (0, 1), (-1, -1), 9),
            ("GRID",          (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("ALIGN",         (1, 0), (-1, -1), "CENTER"),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))

        layout = Table([[grade_badge, metrics_table]], colWidths=["25%", "75%"])
        layout.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (0, -1), 4 * mm),
            ("RIGHTPADDING", (1, 0), (1, -1), 0),
        ]))
        elems.append(layout)

        if gr.detected_defects:
            defect_str = ", ".join(d.replace("_", " ").title() for d in gr.detected_defects)
            elems.append(Spacer(1, 2 * mm))
            elems.append(Paragraph(
                f"<b>Detected Issues:</b> <font color='#B71C1C'>{defect_str}</font>",
                styles["Body"],
            ))

        return elems

    def _booking_section(self, styles, booking_info, gr):
        elems = [Paragraph("STORAGE BOOKING DETAILS", styles["SectionHeader"])]

        qty = booking_info.get("quantity_quintals", 0)
        price_per_q = gr.price_per_quintal
        total_value = round(qty * price_per_q, 2)

        data = [
            ["Booking ID",       booking_info.get("booking_id", "—"),
             "Quantity",         f"{qty} Quintals"],
            ["Crop Season",      booking_info.get("crop_season", "—"),
             "Estimated Value",  f"₹{total_value:,.0f}"],
            ["Deposit Date",     booking_info.get("deposit_date", "—"),
             "Price / Quintal",  f"₹{price_per_q:,.0f} ({gr.grade})"],
            ["Storage Duration", booking_info.get("duration", "6 weeks"),
             "Payment Escrow",   "Razorpay (Secured)"],
        ]

        flat = [[Paragraph(f"<b>{cell}</b>" if i % 2 == 0 else str(cell), styles["TableCell"])
                 for i, cell in enumerate(row)]
                for row in data]

        t = Table(flat, colWidths=["25%", "25%", "25%", "25%"])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), LIGHT_GREEN),
            ("ROWBACKGROUNDS",(0, 0), (-1, -1), [WHITE, LIGHT_GREEN]),
            ("GRID",          (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ]))
        elems.append(t)
        return elems

    def _credit_eligibility_section(self, styles, gr, booking_info):
        elems = [Paragraph("MICRO-CREDIT ELIGIBILITY (NWR)", styles["SectionHeader"])]

        qty = booking_info.get("quantity_quintals", 0)
        collateral_value = round(qty * gr.price_per_quintal, 2)
        max_loan = round(collateral_value * 0.70, 2)   # 70% LTV — standard NBFC
        interest  = 12.0                                # vs 36–60% moneylender
        eligible  = gr.grade in ("Grade A", "Grade B", "Grade C")

        status_text = (
            "<font color='#2E7D32'><b>✓ ELIGIBLE — This receipt is accepted as NWR collateral</b></font>"
            if eligible else
            "<font color='#B71C1C'><b>✗ INELIGIBLE — Substandard produce does not qualify for NWR</b></font>"
        )
        elems.append(Paragraph(status_text, styles["Body"]))
        elems.append(Spacer(1, 2 * mm))

        if eligible:
            credit_data = [
                ["Collateral Value",    f"₹{collateral_value:,.0f}",
                 "Max Loan (70% LTV)",  f"₹{max_loan:,.0f}"],
                ["NBFC Interest Rate",  f"{interest:.1f}% p.a.",
                 "vs Moneylender Rate", "36–60% p.a."],
                ["Disbursement Mode",   "UPI (Instant)",
                 "Repayment Trigger",   "Post-sale proceeds"],
            ]
            flat = [[Paragraph(f"<b>{cell}</b>" if i % 2 == 0 else str(cell), styles["TableCell"])
                     for i, cell in enumerate(row)]
                    for row in credit_data]
            t = Table(flat, colWidths=["25%", "25%", "25%", "25%"])
            t.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), LIGHT_GREEN),
                ("ROWBACKGROUNDS",(0, 0), (-1, -1), [WHITE, LIGHT_GREEN]),
                ("GRID",          (0, 0), (-1, -1), 0.5, BORDER_GRAY),
                ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING",    (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING",   (0, 0), (-1, -1), 5),
            ]))
            elems.append(t)

        return elems

    def _signature_footer(self, styles, receipt_id, signature, qr_image, issued_at):
        elems = []
        elems.append(HRFlowable(width="100%", thickness=1, color=BORDER_GRAY, spaceAfter=3 * mm))

        sig_short = signature[:32] + "…"
        sig_block = Paragraph(
            f"<font size='7' color='#616161'>"
            f"<b>Digital Signature (HMAC-SHA256):</b> {sig_short}<br/>"
            f"Verify at: {self.PORTAL_VERIFY_URL}/{receipt_id}<br/>"
            f"This document is auto-generated by Agri-Vault AI and "
            f"constitutes a Negotiable Warehouse Receipt under the "
            f"Warehousing (Development &amp; Regulation) Act, 2007."
            f"</font>",
            styles["Body"],
        )

        qr_table = Table([[sig_block, qr_image]], colWidths=["80%", "20%"])
        qr_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (0, -1), 4 * mm),
        ]))
        elems.append(qr_table)
        return elems

    # ───────────────────────── Helpers ──────────────────────────

    def _info_card(self, title: str, rows: list, styles) -> Table:
        header = [Paragraph(f"<b>{title}</b>", styles["CardHeader"])]
        body   = [Paragraph(f"<b>{k}:</b> {v}", styles["TableCell"]) for k, v in rows]
        data   = [[h] for h in header] + [[b] for b in body]
        t = Table(data, colWidths=["100%"])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  DARK_GREEN),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
            ("BACKGROUND",    (0, 1), (-1, -1), LIGHT_GREEN),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT_GREEN]),
            ("GRID",          (0, 0), (-1, -1), 0.5, BORDER_GRAY),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ]))
        return t

    def _build_styles(self):
        base = getSampleStyleSheet()
        add  = {
            "Title": ParagraphStyle(
                "Title", fontName="Helvetica-Bold", fontSize=16,
                textColor=DARK_GREEN, alignment=TA_CENTER, spaceAfter=2,
            ),
            "Subtitle": ParagraphStyle(
                "Subtitle", fontName="Helvetica", fontSize=9,
                textColor=TEXT_GRAY, alignment=TA_CENTER, spaceAfter=4,
            ),
            "SectionHeader": ParagraphStyle(
                "SectionHeader", fontName="Helvetica-Bold", fontSize=9,
                textColor=WHITE, backColor=MID_GREEN,
                spaceAfter=3, spaceBefore=4,
                leftIndent=4, rightIndent=4, borderPad=3,
            ),
            "MetaLeft": ParagraphStyle(
                "MetaLeft", fontName="Helvetica", fontSize=8,
                textColor=TEXT_DARK, alignment=TA_LEFT,
            ),
            "MetaRight": ParagraphStyle(
                "MetaRight", fontName="Helvetica", fontSize=8,
                textColor=TEXT_DARK, alignment=TA_RIGHT,
            ),
            "Body": ParagraphStyle(
                "Body", fontName="Helvetica", fontSize=8.5,
                textColor=TEXT_DARK, spaceAfter=2,
            ),
            "Center": ParagraphStyle(
                "Center", fontName="Helvetica-Bold", fontSize=10,
                textColor=TEXT_DARK, alignment=TA_CENTER,
            ),
            "CardHeader": ParagraphStyle(
                "CardHeader", fontName="Helvetica-Bold", fontSize=9,
                textColor=WHITE,
            ),
            "TableCell": ParagraphStyle(
                "TableCell", fontName="Helvetica", fontSize=8,
                textColor=TEXT_DARK,
            ),
        }
        for name, style in add.items():
            base.add(style)
        return base

    def _generate_receipt_id(self, booking_id: str) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        return f"AV-{ts}-{booking_id[:6].upper()}"

    def _sign_receipt(self, gr, farmer_info, booking_info, receipt_id) -> str:
        payload = json.dumps({
            "receipt_id":   receipt_id,
            "farmer":       farmer_info.get("aadhaar_last4"),
            "booking_id":   booking_info.get("booking_id"),
            "grade":        gr.grade,
            "quality_score": gr.overall_quality_score,
            "produce":      gr.produce_type,
        }, sort_keys=True)
        sig = hmac.new(
            SIGNING_SECRET.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        return sig

    def _build_qr(self, receipt_id: str, signature: str) -> RLImage:
        qr_data = f"{self.PORTAL_VERIFY_URL}/{receipt_id}?sig={signature[:16]}"
        qr = QRCode(version=1, error_correction=constants.ERROR_CORRECT_M, box_size=3, border=2)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#1B5E20", back_color="white")

        buf = io.BytesIO()
        qr_img.save(buf, format="PNG")
        buf.seek(0)
        return RLImage(buf, width=20 * mm, height=20 * mm)
